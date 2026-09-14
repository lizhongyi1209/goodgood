import { createHash, randomUUID } from 'node:crypto';
import { runCreditTransaction } from '../billing/repository.mjs';
import { JCOIN_START, cappedJcoinReward, formatJcoinAtoms, normalizedPaidCredits } from '../../shared/contracts/jcoin.mjs';
import { JcoinError } from './errors.mjs';

async function lock(client) { await client.query(`SELECT pg_advisory_xact_lock(hashtext('goodgood-jcoin-first-batch'))`); }
async function assertActive(client, ownerId, administrator = false) {
  const result = await client.query(`SELECT u.id FROM users u WHERE u.id=$1 AND u.status='active'
    ${administrator ? "AND EXISTS (SELECT 1 FROM system_role_assignments r WHERE r.owner_id=u.id AND r.role='site_owner')" : ''} FOR SHARE OF u`, [ownerId]);
  if (!result.rowCount) throw new JcoinError('JCOIN_ACCESS_DENIED', administrator ? '只有已启用的站长账户可以管理平台币。' : '当前账户不能查看平台币。', 403);
}
export async function readOwnJcoin(pool, {ownerId, limit, cursor}) {
  await assertActive(pool, ownerId);
  const [account, today, records] = await Promise.all([
    pool.query('SELECT balance_atoms,earned_atoms,reversed_atoms FROM jcoin_accounts WHERE owner_id=$1', [ownerId]),
    pool.query(`SELECT COALESCE(sum(amount_atoms),0)::text AS amount FROM jcoin_ledger_entries WHERE owner_id=$1 AND kind='mining_reward'
      AND (occurred_at AT TIME ZONE 'Asia/Shanghai')::date=(now() AT TIME ZONE 'Asia/Shanghai')::date`, [ownerId]),
    pool.query(`SELECT id,kind,amount_atoms,consumption_credits,occurred_at FROM jcoin_ledger_entries WHERE owner_id=$1
      AND ($2::timestamptz IS NULL OR (occurred_at,id)<($2::timestamptz,$3::uuid)) ORDER BY occurred_at DESC,id DESC LIMIT $4`, [ownerId,cursor?.at??null,cursor?.id??null,limit+1]),
  ]);
  const row = account.rows[0], items = records.rows.slice(0,limit), last = items.at(-1);
  return { balance:formatJcoinAtoms(row?.balance_atoms??0), earned:formatJcoinAtoms(row?.earned_atoms??0), reversed:formatJcoinAtoms(row?.reversed_atoms??0), todayEarned:formatJcoinAtoms(today.rows[0].amount),
    items:items.map(r=>({id:r.id,kind:r.kind,amount:formatJcoinAtoms(r.amount_atoms),consumptionCredits:r.consumption_credits,occurredAt:new Date(r.occurred_at).toISOString()})),
    nextCursor:records.rowCount>limit?Buffer.from(JSON.stringify({at:new Date(last.occurred_at).toISOString(),id:last.id})).toString('base64url'):null };
}
export async function readJcoinPlan(pool, {ownerId}) {
  await assertActive(pool, ownerId, true);
  const [treasury, batchResult, sources, audit] = await Promise.all([
    pool.query(`SELECT * FROM jcoin_treasury WHERE symbol='JCOIN'`), pool.query('SELECT * FROM jcoin_batches WHERE number=1'),
    pool.query(`SELECT count(*) FILTER (WHERE outcome NOT IN ('rewarded','refund_applied','zero_source','refunded_before_reward'))::text AS excluded,
      max(processed_at) AS last FROM jcoin_source_events`),
    pool.query(`SELECT a.id,a.action,u.email,a.created_at FROM jcoin_administrative_actions a JOIN users u ON u.id=a.actor_owner_id ORDER BY a.created_at DESC,a.id DESC LIMIT 10`),
  ]);
  const t=treasury.rows[0], b=batchResult.rows[0];
  if (!t||!b) throw new JcoinError('JCOIN_PLAN_UNAVAILABLE','平台币计划尚未准备好，请稍后重试。',503);
  return {supply:formatJcoinAtoms(t.supply_atoms),userPool:formatJcoinAtoms(t.user_pool_atoms),unassigned:formatJcoinAtoms(BigInt(t.user_pool_atoms)-BigInt(t.assigned_atoms)),issued:formatJcoinAtoms(t.issued_atoms),recovered:formatJcoinAtoms(t.recovered_atoms),
    batch:{number:b.number,status:b.status,budget:formatJcoinAtoms(b.budget_atoms),issued:formatJcoinAtoms(b.issued_atoms),remaining:formatJcoinAtoms(BigInt(b.budget_atoms)-BigInt(b.issued_atoms)),recovered:formatJcoinAtoms(b.recovered_atoms),rewardPer100Credits:formatJcoinAtoms(BigInt(b.reward_atoms_per_credit)*100n),startsAt:new Date(b.starts_at).toISOString(),activatedAt:b.activated_at?new Date(b.activated_at).toISOString():null},
    measuredAt:new Date().toISOString(),excludedCount:sources.rows[0].excluded,lastProcessedAt:sources.rows[0].last?new Date(sources.rows[0].last).toISOString():null,
    actions:audit.rows.map(r=>({id:r.id,action:r.action,actorEmail:r.email,occurredAt:new Date(r.created_at).toISOString()}))};
}
// Aggregate credit provenance cannot identify a paid batch after mixed test funding.
// Fail closed if any reachable funded grant lacks a matching real manual payment.
async function provenPaidOrigin(client, ownerId, at) {
  const result=await client.query(`WITH RECURSIVE lineage(id) AS (
      SELECT $1::uuid UNION SELECT t.parent_owner_id FROM credit_transfers t JOIN lineage l ON t.child_owner_id=l.id WHERE t.created_at<=$2
    ), origins AS (
      SELECT g.id,p.id AS paid FROM credit_ledger_entries g JOIN lineage l ON l.id=g.owner_id JOIN credit_accounts a ON a.id=g.account_id
      LEFT JOIN payment_orders p ON p.paid_ledger_entry_id=g.id AND p.public_id=g.related_payment_ref AND p.owner_id=g.owner_id
        AND p.credit_amount=g.payment_funded_amount AND g.amount=g.payment_funded_amount AND p.credit_unit=a.unit
        AND p.provider='manual' AND p.state='paid' AND p.currency='CNY' AND p.paid_at<=$2
      WHERE g.entry_type='grant' AND g.payment_funded_amount>0 AND g.created_at<=$2
    ) SELECT EXISTS(SELECT 1 FROM origins) AND NOT EXISTS(SELECT 1 FROM origins WHERE paid IS NULL) AS proven`,[ownerId,at]);
  return result.rows[0].proven;
}
async function recordSource(client,e,outcome) {
  await client.query('INSERT INTO jcoin_source_events(source_id,owner_id,outcome) VALUES ($1,$2,$3)',[e.id,e.owner_id,outcome]);
}
async function processInTransaction(client, {at = new Date(), limit = 200} = {}) {
  const batchResult=await client.query('SELECT * FROM jcoin_batches WHERE number=1 FOR UPDATE'), batch=batchResult.rows[0];
  if (!batch) return {processed:0,rewarded:0};
  const active=batch.status==='active' && new Date(batch.starts_at)<=at;
  const events=await client.query(`SELECT e.*,a.unit FROM credit_ledger_entries e JOIN credit_accounts a ON a.id=e.account_id
    WHERE e.created_at<=$1 AND NOT EXISTS(SELECT 1 FROM jcoin_source_events s WHERE s.source_id=e.id) AND (
      ($2 AND e.entry_type='settle' AND e.created_at>=$3)
      OR (e.entry_type='refund' AND EXISTS(SELECT 1 FROM jcoin_ledger_entries j WHERE j.source_id=e.prior_entry_id AND j.kind='mining_reward'))
    ) ORDER BY e.created_at,e.id LIMIT $4`,[at,active,JCOIN_START,limit]);
  let rewarded=0, issued=BigInt(batch.issued_atoms);
  for (const e of events.rows) {
    if (e.entry_type==='refund') {
      const original=(await client.query("SELECT * FROM jcoin_ledger_entries WHERE source_id=$1 AND kind='mining_reward'",[e.prior_entry_id])).rows[0];
      const amount=BigInt(original.amount_atoms);
      await recordSource(client,e,'refund_applied');
      await client.query(`UPDATE jcoin_accounts SET balance_atoms=balance_atoms-$2,reversed_atoms=reversed_atoms+$2,updated_at=now() WHERE owner_id=$1`,[e.owner_id,amount.toString()]);
      await client.query(`INSERT INTO jcoin_ledger_entries(id,owner_id,batch_id,source_id,prior_entry_id,kind,amount_atoms,occurred_at)
        VALUES ($1,$2,$3,$4,$5,'refund_reversal',$6,$7)`,[randomUUID(),e.owner_id,original.batch_id,e.id,original.id,(-amount).toString(),e.created_at]);
      await client.query('UPDATE jcoin_batches SET recovered_atoms=recovered_atoms+$2,updated_at=now() WHERE id=$1',[original.batch_id,amount.toString()]);
      await client.query("UPDATE jcoin_treasury SET recovered_atoms=recovered_atoms+$1,updated_at=now() WHERE symbol='JCOIN'",[amount.toString()]);
      continue;
    }
    const credits=normalizedPaidCredits(e.unit,e.payment_funded_amount);
    let excluded=credits===null?'unsupported_unit':credits===0n?'zero_source':issued>=BigInt(batch.budget_atoms)?'outside_batch':null;
    if (!excluded && (await client.query("SELECT 1 FROM credit_ledger_entries WHERE prior_entry_id=$1 AND entry_type='refund'",[e.id])).rowCount) excluded='refunded_before_reward';
    if (!excluded && !(await provenPaidOrigin(client,e.owner_id,e.created_at))) excluded='not_paid';
    if (excluded) {await recordSource(client,e,excluded);continue;}
    const amount=cappedJcoinReward(credits,BigInt(batch.reward_atoms_per_credit),BigInt(batch.budget_atoms)-issued);
    await recordSource(client,e,'rewarded');
    await client.query(`INSERT INTO jcoin_accounts(owner_id,balance_atoms,earned_atoms) VALUES ($1,$2,$2)
      ON CONFLICT(owner_id) DO UPDATE SET balance_atoms=jcoin_accounts.balance_atoms+$2,earned_atoms=jcoin_accounts.earned_atoms+$2,updated_at=now()`,[e.owner_id,amount.toString()]);
    await client.query(`INSERT INTO jcoin_ledger_entries(id,owner_id,batch_id,source_id,kind,amount_atoms,consumption_credits,occurred_at)
      VALUES ($1,$2,$3,$4,'mining_reward',$5,$6,$7)`,[randomUUID(),e.owner_id,batch.id,e.id,amount.toString(),credits.toString(),e.created_at]);
    issued+=amount;rewarded++;
    await client.query(`UPDATE jcoin_batches SET issued_atoms=$2,status=CASE WHEN $2=budget_atoms THEN 'exhausted' ELSE status END,
      exhausted_at=CASE WHEN $2=budget_atoms THEN now() ELSE NULL END,updated_at=now() WHERE id=$1`,[batch.id,issued.toString()]);
    await client.query("UPDATE jcoin_treasury SET issued_atoms=issued_atoms+$1,updated_at=now() WHERE symbol='JCOIN'",[amount.toString()]);
  }
  return {processed:events.rowCount,rewarded};
}
export function processJcoinRewards(pool, options = {}) {
  return runCreditTransaction(pool,async client=>{await lock(client);return processInTransaction(client,options);});
}
export function changeJcoinPlan(pool,{ownerId,action,idempotencyKey}) {
  return runCreditTransaction(pool,async client=>{
    await assertActive(client,ownerId,true);await lock(client);
    const hash=createHash('sha256').update(action).digest('hex');
    const existing=(await client.query('SELECT operation_hash,result FROM jcoin_administrative_actions WHERE actor_owner_id=$1 AND idempotency_key=$2',[ownerId,idempotencyKey])).rows[0];
    if (existing) {if(existing.operation_hash!==hash) throw new JcoinError('JCOIN_IDEMPOTENCY_CONFLICT','该提交标识已用于其他操作。',409);return {...existing.result,replayed:true};}
    let result;
    if(action==='process') result=await processInTransaction(client);
    else {
      const from={start:'draft',pause:'active',resume:'paused'}[action],to=action==='pause'?'paused':'active';
      const changed=await client.query(`UPDATE jcoin_batches SET status=$1,activated_at=COALESCE(activated_at,now()),updated_at=now() WHERE number=1 AND status=$2 RETURNING status`,[to,from]);
      if(!changed.rowCount) throw new JcoinError('JCOIN_BATCH_CONFLICT','本期状态已变化，请刷新后重试。',409);
      result={status:to};
    }
    await client.query('INSERT INTO jcoin_administrative_actions(id,actor_owner_id,action,idempotency_key,operation_hash,result) VALUES ($1,$2,$3,$4,$5,$6::jsonb)',[randomUUID(),ownerId,action,idempotencyKey,hash,JSON.stringify(result)]);
    return {...result,replayed:false};
  });
}
