import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import pg from 'pg';
import { applyMigrations } from '../server/persistence/migrate.mjs';
import { grantCredits, runCreditTransaction } from '../server/billing/repository.mjs';
import { recordManualPayment } from '../server/billing/manual-payment.mjs';
import { createPaymentOrderInTransaction, settlePaymentOrderInTransaction } from '../server/billing/payment-repository.mjs';
import { changeJcoinPlan, processJcoinRewards, readJcoinPlan, readOwnJcoin } from '../server/jcoin/repository.mjs';
import { JCOIN_START } from '../shared/contracts/jcoin.mjs';

const expectedLatestMigration = (await readdir(new URL('../migrations', import.meta.url)))
  .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
  .sort()
  .at(-1);

test('GG084 disposable PostgreSQL proves issuance, provenance, rollback, refunds and fixed cap', {
  skip:process.env.GOODGOOD_GG084_INTEGRATION!=='1', timeout:60_000,
}, async()=>{
  const url=new URL(process.env.GOODGOOD_GG084_DATABASE_URL??'http://invalid');
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
  assert.equal(url.port,'54449');
  assert.match(url.pathname,/^\/goodgood_gg084_jcoin_test[a-z0-9_]*$/);
  assert.equal(process.env.GOODGOOD_GG084_NO_WORKER,'1');
  const pool=new pg.Pool({connectionString:url.href,max:8});
  try {
    assert.equal((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount,0);
    assert.equal((await pool.query('SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()')).rowCount,0,'No Worker or other clients may attach to fixtures');
    assert.equal((await applyMigrations({databaseUrl:url.href,logger:{log(){}}})).at(-1),expectedLatestMigration);
    const actor=randomUUID(), names=new Map();
    const addUser=async(name)=>{const id=randomUUID(),email=`gg084-${name}@example.invalid`;names.set(id,email);await pool.query("INSERT INTO users(id,email,status) VALUES ($1,$2,'active')",[id,email]);return id;};
    await pool.query("INSERT INTO users(id,email,status) VALUES ($1,'gg084-owner@example.invalid','active')",[actor]);
    await pool.query(`INSERT INTO system_role_assignments(id,owner_id,role,source,assigned_by_operator_id,reason,idempotency_key,operation_hash)
      VALUES ($1,$2,'site_owner','bootstrap','gg084-test','isolated test','gg084-owner-bootstrap',$3)`,[randomUUID(),actor,'a'.repeat(64)]);
    for(const [unit,factor] of [['credit-cny-cent',1],['credit',2]]) {
      await pool.query(`INSERT INTO payment_product_versions(id,product_id,version,currency,money_amount_minor,credit_unit,credit_amount,effective_from)
        VALUES ($1,$2,1,'CNY',$3,$4,60000000,'2026-09-01T00:00:00Z')`,[randomUUID(),`gg084-${unit}`,String(60000000*factor),unit]);
    }
    const fund=async(ownerId,unit='credit-cny-cent',fake=false)=>{
      if(!fake) return recordManualPayment(pool,{email:names.get(ownerId),operatorId:'gg084-test',paymentReference:`gg084-receipt-${randomUUID()}`,productId:`gg084-${unit}`});
      return runCreditTransaction(pool,async client=>{const {order}=await createPaymentOrderInTransaction(client,{ownerId,productId:`gg084-${unit}`,provider:'fake-sandbox',idempotencyKey:`gg084-fake-${randomUUID()}`});return settlePaymentOrderInTransaction(client,{order});});
    };
    const current=await addUser('current'), legacy=await addUser('legacy'), fake=await addUser('fake'), missing=await addUser('missing'), mixed=await addUser('mixed'), child=await addUser('child'), capOwner=await addUser('cap');
    await fund(current);await fund(legacy,'credit');await fund(fake,'credit-cny-cent',true);await fund(mixed);await fund(mixed,'credit-cny-cent',true);await fund(capOwner);
    await grantCredits(pool,{ownerId:missing,unit:'credit-cny-cent',amount:1000n,sourceClass:'payment_funded',relatedPaymentRef:`ord_${randomUUID().replaceAll('-','')}`,reason:'isolated-unproven-source',idempotencyKey:'gg084-missing-origin'});
    await grantCredits(pool,{ownerId:child,unit:'credit-cny-cent',amount:1n,reason:'isolated-child-account',idempotencyKey:'gg084-child-account'});
    const account=async(ownerId,unit)=> (await pool.query('SELECT id FROM credit_accounts WHERE owner_id=$1 AND unit=$2',[ownerId,unit])).rows[0].id;
    const insert=async({ownerId,type,amount,paid,at,prior=null,job=null,unit='credit-cny-cent'})=>{
      const id=randomUUID();await pool.query(`INSERT INTO credit_ledger_entries(id,account_id,owner_id,entry_type,amount,payment_funded_amount,idempotency_key,operation_hash,reason,related_job_id,prior_entry_id,actor,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'isolated GG084 source',$9,$10,'worker',$11)`,[id,await account(ownerId,unit),ownerId,type,String(amount),String(paid),`gg084-source-${id}`,'b'.repeat(64),job,prior,at]);return id;
    };
    const originMs=new Date(JCOIN_START).getTime(), at=(offset)=>new Date(originMs+offset);
    const settle=async(ownerId,amount,paid,offset,unit='credit-cny-cent')=>{
      const batch=randomUUID(),job=randomUUID();
      await pool.query(`INSERT INTO generation_batches(id,owner_id,prompt,reference_snapshot,model_id,aspect_ratio,resolution,requested_count,input_hash)
        VALUES ($1,$2,'isolated JCOIN fixture','[]','nano-banana-2','1:1','1K',1,'gg084-hash')`,[batch,ownerId]);
      await pool.query(`INSERT INTO generation_jobs(id,batch_id,owner_id,idempotency_key,state,completed_at) VALUES ($1,$2,$3,$4,'succeeded',$5)`,[job,batch,ownerId,`gg084-job-${job}`,at(offset)]);
      const reserve=await insert({ownerId,type:'reserve',amount:-amount,paid:-paid,at:at(offset-1),job,unit});
      return {id:await insert({ownerId,type:'settle',amount:-amount,paid:-paid,at:at(offset),prior:reserve,job,unit}),ownerId,amount,paid,job,unit};
    };
    const refund=async(source,offset)=>insert({ownerId:source.ownerId,type:'refund',amount:source.amount,paid:source.paid,at:at(offset),prior:source.id,job:source.job,unit:source.unit});
    // Direct synthetic sources never enqueue jobs or contact a provider. Transfer itself is not mining.
    const relationship=randomUUID();
    await pool.query(`INSERT INTO account_relationships(id,parent_owner_id,child_owner_id,created_by_owner_id,relationship_reason,created_idempotency_key,created_operation_hash,created_at)
      VALUES ($1,$2,$3,$2,'isolated historical relation','gg084-relation',$4,$5)`,[relationship,current,child,'c'.repeat(64),at(-10000)]);
    const outgoing=await insert({ownerId:current,type:'transfer_out',amount:-1000,paid:-1000,at:at(-9000)}),incoming=await insert({ownerId:child,type:'transfer_in',amount:1000,paid:1000,at:at(-9000)});
    await pool.query(`INSERT INTO credit_transfers(id,public_id,parent_owner_id,child_owner_id,relationship_id,unit,amount,parent_ledger_entry_id,child_ledger_entry_id,actor_owner_id,idempotency_key,operation_hash,created_at)
      VALUES ($1,$2,$3,$4,$5,'credit-cny-cent',1000,$6,$7,$3,'gg084-transfer',$8,$9)`,[randomUUID(),`trf_${randomUUID().replaceAll('-','')}`,current,child,relationship,outgoing,incoming,'d'.repeat(64),at(-9000)]);
    const before=await settle(current,100,100,-1), exact=await settle(current,1,1,0), partial=await settle(current,100,50,1000), old=await settle(legacy,25,25,2000,'credit');
    const gift=await settle(current,100,0,3000), sandbox=await settle(fake,100,100,4000), absent=await settle(missing,100,100,5000), tainted=await settle(mixed,100,100,6000);
    const transferred=await settle(child,100,100,7000), preRefund=await settle(current,100,100,8000);await refund(preRefund,9000);
    assert.deepEqual(await processJcoinRewards(pool,{at:at(10000)}),{processed:0,rewarded:0});
    assert.equal((await readOwnJcoin(pool,{ownerId:current,limit:10})).balance,'0','Draft and recharge alone do not mint');
    const start=()=>changeJcoinPlan(pool,{ownerId:actor,action:'start',idempotencyKey:'gg084-start-first'});
    assert.deepEqual((await Promise.all([start(),start()])).map(r=>r.replayed).sort(),[false,true]);
    await assert.rejects(changeJcoinPlan(pool,{ownerId:actor,action:'pause',idempotencyKey:'gg084-start-first'}),e=>e.code==='JCOIN_IDEMPOTENCY_CONFLICT');
    assert.deepEqual(await processJcoinRewards(pool,{at:at(-1)}),{processed:0,rewarded:0});
    const concurrent=await Promise.all([processJcoinRewards(pool,{at:at(10000)}),processJcoinRewards(pool,{at:at(10000)})]);
    assert.equal(concurrent.reduce((sum,r)=>sum+r.rewarded,0),4);
    const reward=async(source)=>(await pool.query('SELECT amount_atoms FROM jcoin_ledger_entries WHERE source_id=$1',[source.id])).rows[0]?.amount_atoms;
    assert.equal(await reward(exact),'2000000');assert.equal(await reward(partial),'100000000');assert.equal(await reward(old),'100000000');assert.equal(await reward(transferred),'200000000');
    for(const source of [before,gift,sandbox,absent,tainted,preRefund]) assert.equal(await reward(source),undefined);
    const outcomes=(await pool.query('SELECT source_id,outcome FROM jcoin_source_events')).rows;
    assert.equal(outcomes.find(s=>s.source_id===preRefund.id).outcome,'refunded_before_reward');
    assert.equal(outcomes.filter(s=>s.outcome==='not_paid').length,3);
    const own=await readOwnJcoin(pool,{ownerId:current,limit:1});assert.equal(own.balance,'1.02');assert.equal(own.items.length,1);assert.ok(own.nextCursor);
    const cursor=JSON.parse(Buffer.from(own.nextCursor,'base64url').toString('utf8'));
    const next=await readOwnJcoin(pool,{ownerId:current,limit:1,cursor});assert.equal(next.items[0].id===own.items[0].id,false);assert.equal(next.nextCursor,null);
    assert.equal(Object.hasOwn(own,'supply'),false);assert.equal((await readOwnJcoin(pool,{ownerId:fake,limit:10})).items.length,0);
    await changeJcoinPlan(pool,{ownerId:actor,action:'pause',idempotencyKey:'gg084-pause-first'});
    await refund(partial,11000);const pausedSource=await settle(current,100,100,12000);
    await processJcoinRewards(pool,{at:at(13000)});
    assert.equal((await readOwnJcoin(pool,{ownerId:current,limit:10})).balance,'0.02');assert.equal(await reward(pausedSource),undefined);
    assert.equal((await readJcoinPlan(pool,{ownerId:actor})).batch.issued,'4.02','Refund never reduces issuance highwater');
    await changeJcoinPlan(pool,{ownerId:actor,action:'resume',idempotencyKey:'gg084-resume-first'});
    // Fault the mint insert. All derived writes roll back, while settled billing stays intact.
    await pool.query(`CREATE FUNCTION gg084_reject_mint() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'GG084 injected insert failure'; END $$;
      CREATE TRIGGER gg084_reject_mint BEFORE INSERT ON jcoin_ledger_entries FOR EACH ROW EXECUTE FUNCTION gg084_reject_mint()`);
    await assert.rejects(processJcoinRewards(pool,{at:at(13000)}),/injected insert failure/);
    assert.equal((await pool.query('SELECT 1 FROM jcoin_source_events WHERE source_id=$1',[pausedSource.id])).rowCount,0);
    assert.equal((await pool.query('SELECT 1 FROM credit_ledger_entries WHERE id=$1',[pausedSource.id])).rowCount,1);
    assert.equal((await readJcoinPlan(pool,{ownerId:actor})).batch.issued,'4.02');
    await pool.query('DROP TRIGGER gg084_reject_mint ON jcoin_ledger_entries; DROP FUNCTION gg084_reject_mint()');
    await processJcoinRewards(pool,{at:at(13000)});assert.equal(await reward(pausedSource),'200000000');
    const last=await settle(capOwner,50000000,50000000,14000), afterCap=await settle(current,100,100,15000);
    await processJcoinRewards(pool,{at:at(16000)});
    const capped=await readJcoinPlan(pool,{ownerId:actor});assert.equal(capped.batch.status,'exhausted');assert.equal(capped.batch.issued,'1000000');assert.equal(capped.batch.remaining,'0');
    assert.equal(await reward(last),'99999398000000','Final reward is the exact remaining allocation');assert.equal(await reward(afterCap),undefined);
    await assert.rejects(changeJcoinPlan(pool,{ownerId:actor,action:'resume',idempotencyKey:'gg084-exhausted-resume'}),e=>e.code==='JCOIN_BATCH_CONFLICT');
    await refund(last,17000);await processJcoinRewards(pool,{at:at(18000)});
    assert.equal((await readOwnJcoin(pool,{ownerId:capOwner,limit:10})).balance,'0');assert.equal((await readJcoinPlan(pool,{ownerId:actor})).batch.status,'exhausted');
    assert.equal((await readJcoinPlan(pool,{ownerId:actor})).issued,'1000000');
    await assert.rejects(pool.query(`INSERT INTO jcoin_ledger_entries(id,owner_id,batch_id,source_id,kind,amount_atoms,consumption_credits,occurred_at)
      SELECT $1,$2,id,$3,'mining_reward',1,NULL,now() FROM jcoin_batches WHERE number=1`,[randomUUID(),current,afterCap.id]),/check constraint/);
    for(const table of ['jcoin_ledger_entries','jcoin_source_events','jcoin_administrative_actions']) await assert.rejects(pool.query(`DELETE FROM ${table}`),/immutable/);
    await assert.rejects(pool.query("UPDATE jcoin_treasury SET supply_atoms=1"),/check constraint/);
    await assert.rejects(readJcoinPlan(pool,{ownerId:current}),e=>e.status===403);
    await pool.query("UPDATE users SET status='suspended' WHERE id=$1",[actor]);await assert.rejects(start(),e=>e.status===403);
    await pool.query("UPDATE users SET status='suspended' WHERE id=$1",[current]);await assert.rejects(readOwnJcoin(pool,{ownerId:current,limit:10}),e=>e.status===403);
  } finally {await pool.end();}
});
