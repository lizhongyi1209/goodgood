import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { applyMigrations } from '../server/persistence/migrate.mjs';
import { createAdminCreditGrant, createAdminTestCreditGrant } from '../server/admin/api.mjs';
import { listRecentAdministrativeActions } from '../server/admin/repository.mjs';
import { listActivePaymentProducts } from '../server/billing/payment-repository.mjs';
import { recordManualPayment } from '../server/billing/manual-payment.mjs';
import { readOperations } from '../server/admin/operations-repository.mjs';

test('GG081 isolated full migrations, classified sources, receipt races and atomic audit',{
  skip:process.env.GOODGOOD_GG081_INTEGRATION!=='1',
},async()=>{
  const url=new URL(process.env.GOODGOOD_GG081_DATABASE_URL??'http://invalid');
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
  assert.match(url.pathname,/^\/goodgood_gg081_credits_test[a-z0-9_]*$/);
  assert.equal(process.env.GOODGOOD_GG081_NO_WORKER,'1');
  const pool=new pg.Pool({connectionString:url.href,max:8});
  try {
    const empty=await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
    assert.equal(empty.rowCount,0);
    const peers=await pool.query(`SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()`);
    assert.equal(peers.rowCount,0,'Disposable database must have no Worker/other clients');
    const migrations=await applyMigrations({databaseUrl:url.href,logger:{log(){}}});
    assert.ok(migrations.includes('0039_gg081_classified_credit_grants.sql'));
    const actor=randomUUID(), user=randomUUID(), other=randomUUID();
    await pool.query(`INSERT INTO users(id,email,status) VALUES ($1,'owner-081@example.invalid','active'),($2,'user-081@example.invalid','active'),($3,'other-081@example.invalid','active')`,[actor,user,other]);
    await pool.query(`INSERT INTO system_role_assignments(id,owner_id,role,source,assigned_by_operator_id,reason,idempotency_key,operation_hash)
      VALUES ($1,$2,'site_owner','bootstrap','gg081-test','isolated test','gg081-owner-bootstrap',$3)`,[randomUUID(),actor,'a'.repeat(64)]);
    const base={ownerContext:{ownerId:actor,systemRole:'site_owner',accessStatus:'active'},targetOwnerId:user,resources:{pool}};
    const grant=(key,type,amount=100,receipt='gg081-receipt-a',targetOwnerId=user)=>createAdminCreditGrant({...base,targetOwnerId,idempotencyKey:key,
      input:{creditGrantType:type,amount,reason:'备注写充值，不决定来源',...(type==='paid_recharge'?{paymentConfirmed:true,receiptReference:receipt}:{})}});
    for(const type of ['gift','promotion','test','service_compensation','other']) await grant(`gg081-${type}`,type);
    await createAdminTestCreditGrant({...base,idempotencyKey:'gg081-legacy-test',input:{amount:100,reason:'充值'}});
    const results=await Promise.all([grant('gg081-paid-a','paid_recharge',123),grant('gg081-paid-a','paid_recharge',123)]);
    assert.deepEqual(results.map(r=>r.created).sort(),[false,true]);
    const balance=await pool.query(`SELECT available_balance,payment_funded_available_balance FROM credit_accounts WHERE owner_id=$1 AND unit='credit-cny-cent'`,[user]);
    assert.deepEqual(balance.rows[0],{available_balance:'723',payment_funded_available_balance:'123'});
    const ledger=await pool.query(`SELECT amount,payment_funded_amount,related_payment_ref,metadata->>'grantKind' kind FROM credit_ledger_entries WHERE owner_id=$1 ORDER BY created_at,id`,[user]);
    assert.equal(ledger.rowCount,7);
    assert.equal(ledger.rows.filter(e=>BigInt(e.payment_funded_amount)>0n).length,1);
    assert.match(ledger.rows.find(e=>e.kind==='paid_recharge').related_payment_ref,/^ord_/);
    const orders=await pool.query(`SELECT state,currency,money_amount_minor,credit_amount,paid_ledger_entry_id FROM payment_orders WHERE owner_id=$1`,[user]);
    assert.equal(orders.rowCount,1);assert.equal(orders.rows[0].state,'paid');assert.equal(orders.rows[0].currency,'CNY');
    assert.equal(orders.rows[0].money_amount_minor,'123');assert.equal(orders.rows[0].credit_amount,'123');assert.ok(orders.rows[0].paid_ledger_entry_id);
    const actions=await listRecentAdministrativeActions(pool);
    assert.equal(actions.find(a=>a.actionType==='grant_test_credits').creditGrantType,'test');
    assert.equal(actions.filter(a=>a.actionType==='grant_credits').length,6);
    assert.equal(actions.find(a=>a.creditGrantType==='paid_recharge').creditAmount,'123');
    assert.ok((await listActivePaymentProducts(pool)).every(p=>!p.productId.startsWith('site-owner-recharge-')));
    await assert.rejects(grant('gg081-paid-a','gift',123),e=>e.code==='ADMIN_IDEMPOTENCY_CONFLICT');
    await assert.rejects(grant('gg081-paid-other-key','paid_recharge',123),e=>e.code==='ADMIN_PAYMENT_RECEIPT_CONFLICT');
    await assert.rejects(grant('gg081-paid-other-user','paid_recharge',123,'gg081-receipt-a',other),e=>e.code==='ADMIN_PAYMENT_RECEIPT_CONFLICT');
    const race=await Promise.allSettled([grant('gg081-race-a','paid_recharge',200,'gg081-race-receipt'),
      grant('gg081-race-b','paid_recharge',200,'gg081-race-receipt',other)]);
    assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(race.find(r=>r.status==='rejected').reason.code,'ADMIN_PAYMENT_RECEIPT_CONFLICT');
    await recordManualPayment(pool,{email:'user-081@example.invalid',operatorId:'gg081-test',paymentReference:'gg081-cli-receipt'});
    await assert.rejects(grant('gg081-duplicate-cli','paid_recharge',100,'gg081-cli-receipt'),e=>e.code==='ADMIN_PAYMENT_RECEIPT_CONFLICT');
    await assert.rejects(recordManualPayment(pool,{email:'user-081@example.invalid',operatorId:'gg081-test',paymentReference:'gg081-receipt-a'}),e=>e.code==='MANUAL_PAYMENT_REFERENCE_CONFLICT');
    // Missing targets and inconsistent price snapshots must roll back every write.
    await assert.rejects(grant('gg081-missing','paid_recharge',100,'gg081-missing-receipt',randomUUID()),e=>e.status===404);
    assert.equal((await pool.query(`SELECT 1 FROM payment_orders WHERE provider_order_id='gg081-missing-receipt'`)).rowCount,0);
    await pool.query(`INSERT INTO payment_product_versions(id,product_id,version,currency,money_amount_minor,credit_unit,credit_amount,effective_from)
      VALUES ($1,'site-owner-recharge-99-cny-cent',1,'CNY',1,'credit-cny-cent',99,'2026-09-14T00:00:00Z')`,[randomUUID()]);
    await assert.rejects(grant('gg081-bad-price','paid_recharge',99,'gg081-bad-price-receipt'),e=>e.code==='ADMIN_PAYMENT_PRODUCT_CONFLICT');
    assert.equal((await pool.query(`SELECT 1 FROM payment_orders WHERE provider_order_id='gg081-bad-price-receipt'`)).rowCount,0);
    const self=await Promise.all([grant('gg081-self-a','gift',100,null,actor),grant('gg081-self-b','gift',100,null,actor)]);
    assert.ok(self.every(r=>r.created));
    await pool.query(`UPDATE users SET status='suspended' WHERE id=$1`,[actor]);
    await assert.rejects(grant('gg081-inactive','test'),e=>e.status===403);
    await assert.rejects(grant('gg081-paid-a','paid_recharge',123),e=>e.status===403);
    await assert.rejects(pool.query(`UPDATE administrative_actions SET credit_grant_type='gift' WHERE actor_owner_id=$1`,[actor]),/immutable/);
    const today=(await pool.query(`SELECT (now() AT TIME ZONE 'Asia/Shanghai')::date::text AS day`)).rows[0].day;
    const dashboard=await readOperations(pool,{from:today,to:today});
    assert.equal(dashboard.days[0].rechargeAmountMinor,'1323');
    assert.equal(dashboard.days[0].rechargeOrders,'3');
    assert.equal(dashboard.days[0].rechargeCredits,'1323');
    assert.equal(dashboard.concurrent,'0');
  } finally {await pool.end();}
});
