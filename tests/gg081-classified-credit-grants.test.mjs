import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { ADMIN_CREDIT_TYPES } from '../shared/contracts/admin-credit-types.mjs';
import { createAdminCreditGrant } from '../server/admin/api.mjs';
import { createAdminNodeApiHandler } from '../server/admin/node-api.mjs';
import { createPaymentOrder } from '../server/billing/payment-api.mjs';

const id='00000000-0000-4000-8000-000000000081';
const owner={ownerId:id,systemRole:'site_owner',accessStatus:'active'};
const base={ownerContext:owner,targetOwnerId:id,idempotencyKey:'gg081-test-key',resources:{pool:{}}};
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root,'next/image':`${root}node_modules/vinext/dist/shims/image.js`}},server:{middlewareMode:true,hmr:false,ws:false}});
after(()=>vite.close());

test('GG081 active owner and structured input are required before any grant',async()=>{
  const valid={amount:100,reason:'核对入账',creditGrantType:'test'};
  for(const ownerContext of [null,{...owner,systemRole:'member'},{...owner,accessStatus:'suspended'}]) {
    await assert.rejects(createAdminCreditGrant({...base,ownerContext,input:valid,repository:{}}),e=>[401,403].includes(e.status));
  }
  for(const input of [{...valid,creditGrantType:'充值'},{...valid,amount:true},{...valid,amount:'100'},{...valid,amount:0},{...valid,amount:5001},{...valid,amount:1.1},{...valid,reason:'x'},
    {...valid,creditGrantType:'paid_recharge'}, {...valid,creditGrantType:'paid_recharge',paymentConfirmed:'true',receiptReference:'receipt-081'},
    {...valid,creditGrantType:'paid_recharge',paymentConfirmed:true,receiptReference:'short'}, {...valid,receiptReference:'receipt-081'}]) {
    await assert.rejects(createAdminCreditGrant({...base,input,repository:{}}),e=>e.status===400);
  }
});

test('GG081 type and receipt enter the replay fingerprint; notes cannot choose sources',async()=>{
  const calls=[];
  const repository={async grantClassifiedCredits(pool,input){calls.push(input);return {created:true};}};
  for(const creditGrantType of ADMIN_CREDIT_TYPES) {
    await createAdminCreditGrant({...base,repository,input:{amount:100,reason:'备注写充值',creditGrantType,
      ...(creditGrantType==='paid_recharge'?{paymentConfirmed:true,receiptReference:'receipt-081'}:{})}});
  }
  assert.equal(new Set(calls.map(c=>c.operationHash)).size,6);
  assert.equal(new Set(calls.map(c=>c.ledgerIdempotencyKey)).size,1);
  assert.equal(calls.find(c=>c.creditGrantType==='test').receiptReference,null);
  const paid=calls[0];
  await createAdminCreditGrant({...base,repository,input:{amount:100,reason:'备注写充值',creditGrantType:'paid_recharge',paymentConfirmed:true,receiptReference:'  receipt-081  '}});
  assert.equal(calls.at(-1).operationHash,paid.operationHash);
  await createAdminCreditGrant({...base,repository,input:{amount:100,reason:'备注写充值',creditGrantType:'paid_recharge',paymentConfirmed:true,receiptReference:'receipt-082'}});
  assert.notEqual(calls.at(-1).operationHash,paid.operationHash);
});

test('GG081 Node route checks CSRF and propagates creation/replay status',async()=>{
  async function dispatch(headers,created=true){
    const request=Readable.from([Buffer.from(JSON.stringify({creditGrantType:'test',amount:100,reason:'测试入账'}))]);
    Object.assign(request,{method:'POST',url:`/api/admin/users/${id}/credit-grants`,headers});
    const response={writeHead(status){this.status=status;},end(body){this.body=JSON.parse(body);}};
    await createAdminNodeApiHandler({authenticate:async()=>owner,operations:{createAdminCreditGrant:args=>createAdminCreditGrant({...args,resources:{pool:{}},repository:{async grantClassifiedCredits(){return {created};}}})}})(request,response);
    return response;
  }
  assert.equal((await dispatch({})).status,403);
  const headers={'x-goodgood-admin-action':'1','idempotency-key':'gg081-node-key'};
  assert.equal((await dispatch(headers)).status,201);
  assert.equal((await dispatch(headers,false)).status,200);
});

test('GG081 client preserves the supplied replay key and typed payload on retry',async()=>{
  const {grantManagedAccountCredits}=await vite.ssrLoadModule('/features/admin/http-admin-boundary.ts');
  const original=globalThis.fetch, calls=[];
  const payload={ownerId:id,amount:100,creditGrantType:'paid_recharge',reason:'核对入账',paymentConfirmed:true,receiptReference:'receipt-081',idempotencyKey:'gg081-retry-key'};
  try {
    globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({created:true});};
    await grantManagedAccountCredits(payload);await grantManagedAccountCredits(payload);
    assert.equal(calls[0].url,`/api/admin/users/${id}/credit-grants`);
    assert.equal(calls[0].options.headers['idempotency-key'],calls[1].options.headers['idempotency-key']);
    assert.equal(JSON.parse(calls[0].options.body).creditGrantType,'paid_recharge');
    assert.ok(!calls[0].options.body.includes('idempotencyKey'));
    globalThis.fetch=async()=>Response.json({error:{message:'凭证已登记',requestId:'req-081'}},{status:409});
    await assert.rejects(grantManagedAccountCredits(payload),/凭证已登记.*req-081/);
  } finally {globalThis.fetch=original;}
});

test('GG081 recharge and concurrency views retain exact cash, unknown history and audit types',async()=>{
  const view=await vite.ssrLoadModule('/features/admin/site-operations-view.tsx');
  const day={day:'2026-09-14',peak:null,creators:'0',users:'0',succeeded:'0',failed:'0',cancelled:'0',settled:'0',released:'0',refunded:'0',rechargeAmountMinor:'9007199254740993',rechargeOrders:'2',rechargeUsers:'1',rechargeCredits:'500'};
  const html=renderToStaticMarkup(React.createElement(view.OperationsDashboardContent,{data:{days:[day],concurrent:'3',queued:'9',measuredAt:'2026-09-14T01:00:00Z'},selectedDay:day.day,onSelectDay(){}}));
  assert.match(html,/充值金额/);assert.match(html,/¥90071992547409.93/);assert.match(html,/当前生成并发 3 · 排队 9/);
  assert.match(html,/暂无统计/);assert.doesNotMatch(html,/提交任务数|提交任务<|<th>提交/);
  const {AuditLogContent}=await vite.ssrLoadModule('/features/admin/audit-log-view.tsx');
  const audit=renderToStaticMarkup(React.createElement(AuditLogContent,{actions:[{id,createdAt:'2026-09-14T01:00:00Z',actionType:'grant_credits',creditGrantType:'paid_recharge',actorEmail:'owner@example.invalid',targetEmail:'member@example.invalid',reason:'已核对',creditAmount:'100'}],loading:false,error:null,onReload(){}}));
  assert.match(audit,/增加积分/);assert.match(audit,/充值/);
});

test('GG081 internal recharge products are unavailable to customer payment requests',async()=>{
  await assert.rejects(createPaymentOrder({ownerContext:owner,paymentSandbox:{enabled:true},input:{productId:'site-owner-recharge-100-cny-cent'}}),e=>e.code==='PAYMENT_REQUEST_INVALID');
  const form=await readFile(new URL('../features/admin/account-management-page.tsx',import.meta.url),'utf8');
  assert.match(form,/setCreditGrantType\("test"\)/);assert.match(form,/grantRequest\.current\.key/);
  assert.match(form,/disabled=.*paymentConfirmed/);assert.equal((form.match(/<DialogContent\s/g)||[]).length,1);
});
