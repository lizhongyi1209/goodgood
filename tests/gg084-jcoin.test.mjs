import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cappedJcoinReward, formatJcoinAtoms, normalizedPaidCredits } from '../shared/contracts/jcoin.mjs';
import { readJcoin, queryJcoinPlan, actOnJcoinPlan, validateJcoinQuery } from '../server/jcoin/api.mjs';
import { createJcoinNodeApiHandler } from '../server/jcoin/node-api.mjs';
import { jcoinApiError } from '../server/jcoin/errors.mjs';
import { parseWorkspaceRoute, workspaceRouteHref } from '../features/navigation/workspace-route.mjs';
const owner={ownerId:'84000000-0000-4000-8000-000000000002',accessStatus:'active',systemRole:'member'};
const administrator={...owner,systemRole:'site_owner'}, resources={pool:{}};
test('JCOIN exact small/large balances, legacy units and first batch consumption coefficient',()=>{
  assert.equal(formatJcoinAtoms(2000000n),'0.02');assert.equal(formatJcoinAtoms(-1n),'-0.00000001');assert.equal(formatJcoinAtoms(10000000000000000n),'100000000');
  assert.equal(normalizedPaidCredits('credit',-50n),100n);assert.equal(normalizedPaidCredits('credit-cny-cent',-50n),50n);assert.equal(normalizedPaidCredits('other',-1n),null);
  assert.equal(formatJcoinAtoms(cappedJcoinReward(50000000n,2000000n,100000000000000n)),'1000000');
  assert.equal(cappedJcoinReward(100n,2000000n,5000000n),5000000n);
  assert.equal(cappedJcoinReward(3n,2000000n,100000000n),cappedJcoinReward(1n,2000000n,100000000n)+cappedJcoinReward(2n,2000000n,100000000n));
});
test('personal service binds authenticated owner and drops supply/plan and source fields',async()=>{
  let called;
  const result=await readJcoin({ownerContext:owner,input:{ownerId:'someone-else'},resources,repository:{async readOwnJcoin(pool,input){called=input;return {balance:'2',earned:'2',reversed:'0',todayEarned:'2',nextCursor:null,supply:'100000000',budget:'1000000',items:[{id:'own-record',kind:'mining_reward',amount:'2',consumptionCredits:'100',occurredAt:'2026-09-18T00:00:00Z',sourceId:'secret',paymentReference:'secret'}]};}}});
  assert.equal(called.ownerId,owner.ownerId);assert.deepEqual(Object.keys(result).sort(),['balance','earned','items','nextCursor','reversed','todayEarned']);assert.doesNotMatch(JSON.stringify(result),/supply|budget|sourceId|paymentReference|secret/);
});
test('unauthenticated, inactive and non-owner administrator operations fail before repository',async()=>{
  for(const context of [null,{...owner,accessStatus:'pending'},{...owner,accessStatus:'suspended'}]) await assert.rejects(readJcoin({ownerContext:context,resources}),e=>[401,403].includes(e.status));
  await assert.rejects(queryJcoinPlan({ownerContext:owner,resources}),e=>e.status===403);
  await assert.rejects(actOnJcoinPlan({ownerContext:owner,input:{action:'start'},idempotencyKey:'gg084-valid',resources}),e=>e.status===403);
  await assert.rejects(actOnJcoinPlan({ownerContext:administrator,input:{action:'mint'},idempotencyKey:'gg084-valid',resources}),e=>e.status===400);
  await assert.rejects(actOnJcoinPlan({ownerContext:administrator,input:{action:'start'},idempotencyKey:'a',resources}),e=>e.status===400);
});
test('bounded keyset inputs reject malformed cursor, limits and non-object input',()=>{
  for(const input of [null,[],{limit:0},{limit:51},{limit:1.5},{cursor:'broken'}]) assert.throws(()=>validateJcoinQuery(input),e=>e.status===400);
  const cursor=Buffer.from(JSON.stringify({id:owner.ownerId,at:'2026-09-18T00:00:00Z'})).toString('base64url');
  assert.equal(validateJcoinQuery({limit:'20',cursor}).cursor.id,owner.ownerId);
  const failure=jcoinApiError(new Error('database password and SQL detail'));assert.equal(failure.status,503);assert.doesNotMatch(JSON.stringify(failure),/password|SQL detail/);
});
test('Node route has read-only own GET and protected bounded administrator POST',async()=>{
  const handle=createJcoinNodeApiHandler({authenticate:async()=>administrator,operations:{readJcoin:async()=>({balance:'0'}),queryJcoinPlan:async()=>({supply:'100000000'}),actOnJcoinPlan:async()=>({replayed:false})}});
  async function request(path,method='GET',headers={},body='{}') {const req=Readable.from([Buffer.from(body)]);Object.assign(req,{url:path,method,headers});let result;const response={writeHead(status,h){result={status,headers:h};},end(data){result.body=JSON.parse(data);}};await handle(req,response);return result;}
  assert.equal((await request('/api/jcoin')).status,200);assert.equal((await request('/api/jcoin','POST')).status,405);
  assert.equal((await request('/api/admin/jcoin/query','POST')).status,403);
  assert.equal((await request('/api/admin/jcoin/query','POST',{'x-goodgood-admin-action':'1'})).status,200);
  assert.equal((await request('/api/admin/jcoin/action','POST',{'x-goodgood-admin-action':'1'},'x'.repeat(4097))).status,400);
  assert.equal((await request('/api/jcoin')).headers['cache-control'],'no-store');
});
test('JCOIN user and owner routes stay in the resumable workspace',()=>{
  for(const path of ['/jcoin','/admin/jcoin']) assert.equal(workspaceRouteHref(parseWorkspaceRoute(path)),path);
  assert.deepEqual(parseWorkspaceRoute('/jcoin/'),{kind:'jcoin'});assert.deepEqual(parseWorkspaceRoute('/admin/jcoin'),{kind:'admin',tab:'jcoin'});
});
test('personal rendering shows only own values, exact decimals and empty/loading/login; owner sees plan',async()=>{
  const root=fileURLToPath(new URL('..',import.meta.url));const dir=new URL('../work/gg084-render/',import.meta.url);await mkdir(dir,{recursive:true});
  const bundle=await build({entryPoints:[`${root}/features/jcoin/jcoin-management-view.tsx`],bundle:true,platform:'node',format:'esm',packages:'external',alias:{'@':root},loader:{'.css':'empty'},write:false,logLevel:'silent'});
  const file=new URL('components.mjs',dir);await writeFile(file,bundle.outputFiles[0].text);const management=await import(pathToFileURL(fileURLToPath(file)));
  const ownBundle=await build({entryPoints:[`${root}/features/jcoin/own-jcoin-view.tsx`],bundle:true,platform:'node',format:'esm',packages:'external',alias:{'@':root},loader:{'.css':'empty'},write:false,logLevel:'silent'});
  const ownFile=new URL('own.mjs',dir);await writeFile(ownFile,ownBundle.outputFiles[0].text);const own=await import(ownFile.href);
  assert.equal(own.displayJcoin('1234567.12345678'),'1,234,567.12345678');
  const page={balance:'1.02',earned:'2',reversed:'0.98',todayEarned:'1',items:[{id:'own',kind:'mining_reward',amount:'0.02',consumptionCredits:'1',occurredAt:'2026-09-18T00:00:00Z'}],nextCursor:null};
  const html=renderToStaticMarkup(React.createElement(own.OwnJcoinContent,{page}));assert.match(html,/充值消费奖励/);assert.match(html,/0.02/);assert.doesNotMatch(html,/固定总量|限定额度|100万|50万元|人民币|剩余/);
  assert.match(renderToStaticMarkup(React.createElement(own.OwnJcoinContent,{page:{...page,items:[]}})),/暂无平台币记录/);
  assert.match(renderToStaticMarkup(React.createElement(own.OwnJcoinView,{session:undefined,onLogin(){}})),/正在确认账户/);
  assert.match(renderToStaticMarkup(React.createElement(own.OwnJcoinView,{session:null,onLogin(){}})),/登录 GoodGood/);
  const plan={supply:'100000000',userPool:'50000000',issued:'0',recovered:'0',unassigned:'49000000',excludedCount:'0',lastProcessedAt:null,actions:[],batch:{number:1,status:'draft',budget:'1000000',issued:'0',remaining:'1000000',recovered:'0',rewardPer100Credits:'2',startsAt:'2026-09-17T16:00:00Z',activatedAt:null}};
  const adminHtml=renderToStaticMarkup(React.createElement(management.JcoinManagementContent,{plan,busy:false,onAction(){}}));assert.match(adminHtml,/固定总量/);assert.match(adminHtml,/1,000,000/);assert.match(adminHtml,/开启第一期/);
  assert.match(adminHtml,/role="progressbar"/);assert.match(adminHtml,/aria-label="第1期发行进度"/);assert.match(adminHtml,/aria-valuenow="0"/);
  for(const [issued,remaining,progress] of [['250000','750000','25'],['1000000','0','100']]){
    const progressHtml=renderToStaticMarkup(React.createElement(management.JcoinManagementContent,{plan:{...plan,batch:{...plan.batch,issued,remaining,recovered:'100'}},busy:false,onAction(){}}));
    assert.match(progressHtml,new RegExp(`aria-valuenow="${progress}"`));assert.match(progressHtml,new RegExp(`aria-valuetext="${progress}%"`));
  }
  assert.doesNotMatch(html,/progressbar|发行进度/);
});
