import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {InspirationError,inspirationApiError,validateInspirationInput,inspirationOperation} from '../server/inspiration/api.mjs';
import {createInspirationNodeApiHandler} from '../server/inspiration/node-api.mjs';
import {inspirationParameters,inspirationRecipe} from '../shared/contracts/inspiration.mjs';
import {parseWorkspaceRoute,workspaceRouteHref} from '../features/navigation/workspace-route.mjs';

const id='00000000-0000-4000-8000-000000000073';
const parameters=inspirationParameters({model_id:'gpt-image-2.5-flare',catalog_model_id:'flare',catalog_model_name:'Flare',aspect_ratio:'16:9',resolution:'4K',requested_count:4,image_line:'dedicated',quality:'max',reference_snapshot:[{id,url:'private'}]});
test('GG-073 recipes whitelist reusable settings and remove source references, prices and project',()=>{
  const recipe=inspirationRecipe({prompt:'高质量放大',parameters:{...parameters,expectedPriceVersion:1,projectId:id,references:[{id,url:'private'}],secret:'provider'}});
  assert.equal(recipe.quality,'max');assert.equal(recipe.count,1);assert.deepEqual(recipe.references,[]);assert.equal(recipe.catalogModelId,'flare');
  for(const key of ['projectId','expectedPriceVersion','secret','referenceCount','catalogModelName']) assert.ok(!(key in recipe));
  for(const p of [{...parameters,modelId:'provider/private'},{...parameters,resolution:'8K'},{...parameters,imageLine:'private'},{...parameters,quality:'ultra'},{...parameters,aspectRatio:'unknown'}]) assert.equal(inspirationRecipe({parameters:p,prompt:'effect'}),null);
  assert.equal(inspirationRecipe({parameters,prompt:''}),null);
});
test('GG-073 validates consent, bounded text, filters, UUIDs and desired like state',()=>{
  assert.deepEqual(validateInspirationInput('publish',{assetId:id,title:'案例',consent:true}),{assetId:id,beforeReferenceId:null,prompt:undefined,promptVisibility:'public',comparisonMode:'side_by_side',title:'案例',description:''});
  for(const [action,input] of [['publish',{assetId:id,title:'case',consent:false}],['publish',{assetId:id,title:'a'.repeat(61),consent:true}],['publish',{assetId:id,title:'case',consent:true,parameters:{forged:true}}],['publish',{assetId:id,title:'case',consent:true,beforeReferenceId:'https://private'}],['publish',{assetId:id,title:'case',consent:true,description:'a'.repeat(1001)}],['prepare',{assetId:'not-id'}],['like',{liked:'true'}],['list',{query:'a'.repeat(101)}],['list',{cursor:'garbage'}],['list',null]]) assert.throws(()=>validateInspirationInput(action,input),InspirationError);
  assert.deepEqual(validateInspirationInput('like',{liked:false}),{liked:false});
});
test('GG-073 unauthenticated and unavailable cases fail safely before sharing/recipe access',async()=>{
  await assert.rejects(inspirationOperation({ownerContext:null}),error=>error.status===401);
  const pool={async query(sql){return {rows:sql.includes('FROM users')?[{workspace_id:id,kind:'personal',status:'active'}]:[]};}};
  await assert.rejects(inspirationOperation({action:'detail',id,ownerContext:{ownerId:id},resources:{pool}}),error=>error.status===404);
  assert.ok(!JSON.stringify(inspirationApiError(new Error('secret SQL'))).includes('secret'));
});
test('GG-073 shared DTO excludes owner/source IDs and unselected material while signed reads are explicit',async()=>{
  const row={id,title:'效果',description:'说明',prompt:'提示词',parameters,owner_id:'another-owner',author_snapshot:{displayName:'Jony',handle:'jony',avatarReferenceId:id,private:'never'},after_key:'shared/after',before_key:'shared/before',avatar_key:'shared/avatar',after_width:4096,after_height:2160,like_count:'2',liked:true,created_at:'2026-09-14T00:00:00Z',source_asset_id:id};
  const signed=[];const resources={pool:{async query(sql){return {rows:sql.includes('FROM users')?[{workspace_id:id,kind:'personal',status:'active'}]:[row]};}},async signRead(key){signed.push(key);return `https://private.invalid/${key}`;}};
  const result=await inspirationOperation({action:'detail',id,ownerContext:{ownerId:id,systemRole:'member'},resources});
  assert.equal(result.canWithdraw,false);assert.equal(result.liked,true);assert.deepEqual(signed,['shared/after','shared/before','shared/avatar']);
  for(const key of ['owner_id','source_asset_id','avatarReferenceId','private']) assert.ok(!JSON.stringify(result).includes(`"${key}"`));
  assert.equal((await inspirationOperation({action:'detail',id,ownerContext:{ownerId:id,systemRole:'site_owner'},resources})).canWithdraw,true);
});
async function invoke(path,method='POST',body='{}',headers={'x-goodgood-inspiration-action':'1'}) {
  const request=Readable.from([Buffer.from(body)]);Object.assign(request,{url:path,method,headers});let status,payload,responseHeaders;
  const handler=createInspirationNodeApiHandler({authenticate:async()=>({ownerId:id}),operation:async value=>{assert.equal(value.ownerContext.ownerId,id);validateInspirationInput(value.action,value.input);return {action:value.action};}});
  const handled=await handler(request,{writeHead(code,h){status=code;responseHeaders=h;},end(value){payload=JSON.parse(value);}});return {handled,status,payload,headers:responseHeaders};
}
test('GG-073 private HTTP routes enforce methods/action header/bounded JSON and route operations',async()=>{
  assert.equal((await invoke('/api/inspiration','GET')).payload.action,'list');assert.equal((await invoke('/api/inspiration/list')).payload.action,'list');
  assert.equal((await invoke(`/api/inspiration/${id}`,'GET')).payload.action,'detail');assert.equal((await invoke(`/api/inspiration/${id}/use`)).payload.action,'use');
  assert.equal((await invoke(`/api/inspiration/${id}/like`,'POST','{"liked":true}')).payload.action,'like');
  assert.equal((await invoke('/api/inspiration/list','POST','{}',{})).status,403);
  for(const body of ['{','x'.repeat(8193)]) assert.equal((await invoke('/api/inspiration/list','POST',body)).status,400);
  assert.equal((await invoke('/api/inspiration/prepare','GET')).status,405);assert.equal((await invoke('/outside')).handled,false);assert.equal((await invoke('/api/inspiration','GET')).headers['cache-control'],'no-store');
});

const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false,ws:false}});after(()=>vite.close());
const view=await vite.ssrLoadModule('/features/inspiration/inspiration-board.tsx');
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
test('GG-073 route and accessible empty/loading/error cards and complete original parameters',()=>{
  assert.deepEqual(parseWorkspaceRoute('/inspiration/'),{kind:'inspiration'});assert.equal(workspaceRouteHref({kind:'inspiration'}),'/inspiration');
  assert.match(render(view.InspirationReadState,{loading:true,onRetry(){}}),/role="status"/);assert.match(render(view.InspirationReadState,{loading:false,error:'失败',onRetry(){}}),/role="alert".*重试/s);
  assert.match(render(view.InspirationCards,{items:[],busy:[],onOpen(){},onLike(){}}),/还没有案例/);
  const item={id,title:'高清放大',after:{url:'https://fixture.invalid/after',width:4096,height:2160},before:{url:'https://fixture.invalid/before'},author:{displayName:'Jony',handle:'jony'},liked:true,likes:2};
  const html=render(view.InspirationCards,{items:[item],busy:[id],onOpen(){},onLike(){}});assert.match(html,/前后对比/);assert.match(html,/@jony/);assert.doesNotMatch(html,/case-like|点赞/);assert.match(html,/aspect-ratio:1.896/);
  assert.match(render(view.CaseComparison,{before:item.before,after:item.after,title:item.title}),/处理前.*处理后/s);assert.ok(!render(view.CaseComparison,{before:null,after:item.after,title:item.title}).includes('处理前'));
  const settings=render(view.CaseParametersList,{parameters});assert.match(settings,/最高/);assert.match(settings,/4K/);assert.match(settings,/专线/);
});
