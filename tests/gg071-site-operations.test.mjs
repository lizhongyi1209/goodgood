import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {readSiteOperations,validateOperationsInput} from '../server/admin/operations.mjs';
import {jobDto,ledgerDto,queryOperationsLog,readOperationsDetail} from '../server/admin/operations-repository.mjs';
import {createAdminNodeApiHandler} from '../server/admin/node-api.mjs';
import {parseWorkspaceRoute,workspaceRouteHref} from '../features/navigation/workspace-route.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root,'next/image':`${root}node_modules/vinext/dist/shims/image.js`}},server:{middlewareMode:true,hmr:false,ws:false}});
after(()=>vite.close());
const view=await vite.ssrLoadModule('/features/admin/site-operations-view.tsx');
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
const id='00000000-0000-4000-8000-000000000071';
const owner={ownerId:id,systemRole:'site_owner'};
const time='2026-09-13T16:00:00.000Z';
const job={id,batchId:id,createdAt:time,completedAt:time,state:'succeeded',email:'person@example.invalid',fund:'organization',fundName:'测试企业',model:'Nano Banana 2',resolution:'2K',aspectRatio:'16:9',count:2,line:'special',quality:'auto',quote:'40',errorCode:null};
const credit=(type,credits)=>({id:`${id.slice(0,-1)}${type==='reserve'?'1':type==='settle'?'2':'3'}`,createdAt:time,type,credits,email:job.email,fund:'organization',fundName:'测试企业',jobId:id,priorId:id});

test('GG-071 owner gate rejects sessions before repository/resource access',async()=>{
  for(const ownerContext of [null,{ownerId:id,systemRole:'member'}]) await assert.rejects(readSiteOperations({ownerContext,repository:{},resources:{}}),error=>[401,403].includes(error.status));
  const result=await readSiteOperations({ownerContext:owner,resources:{pool:'read-pool'},input:{from:'2026-09-01',to:'2026-09-14'},repository:{async readOperations(pool,input){assert.equal(pool,'read-pool');assert.equal(input.from,'2026-09-01');return {days:[],pending:'0'};}}});
  assert.deepEqual(result,{days:[],pending:'0'});
});
test('GG-071 validation bounds dates, search, filters, pages and cursors',()=>{
  for(const input of [null,[],{from:'2026-02-30'},{from:'2026-09-14',to:'2026-09-13'},{from:'2026-01-01',to:'2026-09-14'},{query:'a'.repeat(101)},{query:'a\n'},{kind:'unknown'},{filter:'refund'},{kind:'credits',filter:'failed'},{limit:101},{limit:'30'},{cursor:'garbage'}]) assert.throws(()=>validateOperationsInput(input),error=>error.status===400);
  const cursor=Buffer.from(JSON.stringify({id,createdAt:time})).toString('base64url');
  assert.deepEqual(validateOperationsInput({cursor}).cursor,{id,createdAt:time});
  assert.throws(()=>validateOperationsInput({id:'x'},true));
  const historical='901780d9-de2d-bff6-b62f-8fdf569db2f2';
  assert.equal(validateOperationsInput({kind:'credits',id:historical},true).id,historical);
  assert.equal(validateOperationsInput({cursor:Buffer.from(JSON.stringify({id:historical,createdAt:time})).toString('base64url')}).cursor.id,historical);
});
test('GG-071 services provide opaque next cursor and missing detail recovery',async()=>{
  const result=await readSiteOperations({action:'logs',ownerContext:owner,resources:{pool:{}},repository:{async queryOperationsLog(){return {items:[job],next:{id,createdAt:time}};}}});
  assert.equal(JSON.parse(Buffer.from(result.nextCursor,'base64url')).id,id);
  await assert.rejects(readSiteOperations({action:'detail',input:{id},ownerContext:owner,resources:{pool:{}},repository:{async readOperationsDetail(){return null;}}}),error=>error.status===404);
});
test('GG-071 DTOs whitelist fields and suppress unsafe error payloads',()=>{
  const result=jobDto({id,created_at:time,quote:'9007199254740993',error_code:'https://private/key',prompt:'secret',error_message:'api_key=secret'});
  assert.equal(result.quote,'9007199254740993');assert.equal(result.errorCode,null);
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.equal(ledgerDto({id,created_at:time,credits:'-20',metadata:{secret:'key'}}).credits,'-20');
});
test('GG-071 keyset pages take limit+1, bind filters and return only page records',async()=>{
  const pool={async query(sql,values){assert.match(sql,/ORDER BY created_at DESC,id DESC LIMIT \$7/);assert.equal(values[2],"' OR 1=1");assert.equal(values[6],2);return {rows:[{id,created_at:time,credits:'-20'},{id,created_at:time,credits:'-40'}]};}};
  const result=await queryOperationsLog(pool,{kind:'credits',from:'2026-09-01',to:'2026-09-14',query:"' OR 1=1",limit:1});
  assert.equal(result.items.length,1);assert.equal(result.next.id,id);
  assert.equal(await readOperationsDetail({async query(){return {rows:[]};}},{kind:'tasks',id}),null);
});
test('GG-071 rendering distinguishes read states and exact settlement without double charging',()=>{
  assert.match(render(view.OperationsReadState,{loading:true,error:'',onRetry(){}}),/role="status"/);
  assert.match(render(view.OperationsReadState,{loading:false,error:'读取失败',onRetry(){}}),/role="alert"[\s\S]*重试/);
  assert.match(render(view.OperationsLogContent,{data:{items:[]},kind:'tasks',onOpen(){}}),/没有符合条件/);
  const html=render(view.OperationsDetailContent,{data:{job,selected:null,timeline:[credit('reserve','-40'),credit('settle','-40'),credit('refund','10')]}});
  assert.match(html,/最终实扣<\/dt><dd>30 积分 · ¥0.30/);assert.match(html,/测试企业/);assert.match(html,/特价/);
  assert.equal(view.creditRmb('9007199254740993'),'90071992547409.93');
  assert.equal(view.creditRmb('-1'),'-0.01');
  assert.match(render(view.OperationsDetailContent,{data:{job,selected:null,timeline:[credit('reserve','-40'),credit('release','40')]}}),/最终实扣<\/dt><dd>0 积分 · ¥0.00/);
});
test('GG-071 daily empty counts avoid fake success rate and charts remain keyboard controls',()=>{
  const day={day:'2026-09-14',peak:'0',rechargeAmountMinor:'0',rechargeOrders:'0',rechargeUsers:'0',rechargeCredits:'0',creators:'0',users:'0',succeeded:'0',failed:'0',cancelled:'0',settled:'0',refunded:'0',released:'0'};
  const html=render(view.OperationsDashboardContent,{data:{days:[day],concurrent:'0',queued:'0',measuredAt:time},selectedDay:day.day,onSelectDay(){}});
  assert.match(html,/成功率 —/);assert.match(html,/aria-pressed="true"/);assert.match(html,/¥0.00/);
});
test('GG-071 both views stay in owner shell and URLs round-trip',async()=>{
  const {SiteOwnerManagementView}=await vite.ssrLoadModule('/features/admin/site-owner-management-view.tsx');
  for(const tab of ['operations','logs']) {
    assert.deepEqual(parseWorkspaceRoute(workspaceRouteHref({kind:'admin',tab})),{kind:'admin',tab});
    const html=render(SiteOwnerManagementView,{session:{account:{role:'site_owner'},access:{status:'active'}},activeTab:tab,onLogin(){}});
    assert.match(html,new RegExp(`href="/admin/${tab}" aria-current="page"`));
    assert.equal((html.match(/<h1/g)||[]).length,1);
    assert.doesNotMatch(render(SiteOwnerManagementView,{session:{account:{role:'member'},access:{status:'active'}},activeTab:tab,onLogin(){}}),/运营看板|总日志/);
  }
});
test('GG-071 Node read routes enforce CSRF, authenticate and normalize errors',async()=>{
  async function dispatch({headers={'x-goodgood-admin-action':'1'},ownerContext=owner,input={},action='logs'}={}) {
    const request=Readable.from([Buffer.from(JSON.stringify(input))]);Object.assign(request,{method:'POST',url:`/api/admin/operations/${action}`,headers});
    const response={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=JSON.parse(body);}};
    const handle=createAdminNodeApiHandler({authenticate:async()=>ownerContext,operations:{readSiteOperations:args=>readSiteOperations({...args,resources:{pool:{}},repository:{async queryOperationsLog(){return {items:[],next:null};}}})}});
    assert.equal(await handle(request,response),true);return response;
  }
  assert.equal((await dispatch()).status,200);assert.equal((await dispatch()).headers['cache-control'],'no-store');
  assert.equal((await dispatch({headers:{}})).status,403);assert.equal((await dispatch({ownerContext:null})).status,401);
  assert.equal((await dispatch({ownerContext:{ownerId:id,systemRole:'member'}})).status,403);
  assert.equal((await dispatch({input:{query:'a'.repeat(101)}})).status,400);
});
test('GG-071 client keeps search in POST bodies and presents HTTP/network/JSON failures',async()=>{
  const {readOperations}=await vite.ssrLoadModule('/features/admin/http-operations-boundary.ts');
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/admin/operations/logs');assert.equal(options.method,'POST');assert.equal(options.cache,'no-store');assert.equal(JSON.parse(options.body).query,'user@example.invalid');return Response.json({items:[job],nextCursor:null});};
    assert.equal((await readOperations('logs',{query:'user@example.invalid'})).items[0].id,id);
    for(const status of [401,403,500]) {globalThis.fetch=async()=>Response.json({error:{message:'读取失败',requestId:'req-test'}},{status});await assert.rejects(readOperations('logs',{}),/读取失败.*req-test/);}
    globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};await assert.rejects(readOperations('logs',{}),/无法连接运营数据/);
    globalThis.fetch=async()=>new Response('gateway',{status:502});await assert.rejects(readOperations('logs',{}),/响应无效/);
  } finally {globalThis.fetch=original;}
});
