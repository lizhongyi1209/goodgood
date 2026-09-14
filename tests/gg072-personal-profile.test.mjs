import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {Readable} from 'node:stream';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fileURLToPath} from 'node:url';
import {ProfileError,profileApiError,validateProfileInput,readPersonalProfile,updatePersonalProfile} from '../server/profile/api.mjs';
import {createProfileNodeApiHandler} from '../server/profile/node-api.mjs';
import {parseWorkspaceRoute,workspaceRouteHref} from '../features/navigation/workspace-route.mjs';

const id='00000000-0000-4000-8000-000000000072';
const input={displayName:' 我的名称 ',handle:' @JoNy ',avatarReferenceId:null,version:0};
test('GG-072 normalizes handles and rejects unsafe/unbounded profile changes',()=>{
 assert.deepEqual(validateProfileInput(input),{...input,displayName:'我的名称',handle:'jony'});
 for(const value of [null,[],{...input,ownerId:id},{...input,avatarUrl:'https://example.invalid'},{...input,displayName:' '},{...input,displayName:'a'.repeat(31)},{...input,displayName:'a\u202eb'},{...input,handle:'中文'},{...input,handle:'ab'},{...input,handle:'a'.repeat(25)},{...input,handle:'other/user'},{...input,version:-1},{...input,version:0.2},{...input,avatarReferenceId:'https://example.invalid'},{...input,avatarReferenceId:undefined}]) assert.throws(()=>validateProfileInput(value),ProfileError);
});
test('GG-072 unauthenticated profile access fails before resources and suppresses internal errors',async()=>{
 await assert.rejects(readPersonalProfile({ownerContext:null}),error=>error.status===401);
 await assert.rejects(updatePersonalProfile({ownerContext:null,input}),error=>error.status===401);
 assert.ok(!JSON.stringify(profileApiError(new Error('database password secret'))).includes('secret'));
});
test('GG-072 read defaults are owner-scoped and do not create profile rows',async()=>{
 let calls=0;const resources={pool:{async query(sql,values){calls++;assert.ok(!/INSERT|UPDATE/.test(sql));assert.equal(values[0],id);return {rows:sql.includes('FROM users')?[{workspace_id:id,kind:'personal',status:'active'}]:[]};}}};
 assert.deepEqual(await readPersonalProfile({ownerContext:{ownerId:id},resources}),{displayName:'GoodGood 用户',handle:null,avatarReferenceId:null,avatarUrl:null,version:0});assert.equal(calls,2);
});
function fakeResources({avatar=false,conflict=false,duplicate=false}={}) {
 const queries=[];let released=false;
 const client={async query(sql,values){queries.push(sql);if(sql.includes('FROM users')) return {rows:[{workspace_id:id,kind:'personal',status:'active'}]};if(sql.startsWith('SELECT id FROM reference_assets')) {assert.deepEqual(values,[id,id,id]);assert.match(sql,/creator_owner_id=\$2.*workspace_id=\$3.*moderation_state='accepted'/);return {rows:avatar?[{id}]:[]};}if(sql.startsWith('INSERT')||sql.startsWith('UPDATE')) {if(duplicate) throw Object.assign(new Error('private constraint'),{code:'23505'});return {rows:conflict?[]:[{owner_id:id}]};}if(sql.includes('FROM personal_profiles')) return {rows:[{display_name:'我的名称',handle:'jony',version:1}]};return {rows:[]};},release(){released=true;}};
 return {resources:{pool:{async connect(){return client;}}},queries,get released(){return released;}};
}
test('GG-072 saves transactionally, checks version, ownership, readiness and rolls back failures',async()=>{
 const ok=fakeResources();assert.equal((await updatePersonalProfile({ownerContext:{ownerId:id},input,resources:ok.resources})).handle,'jony');assert.equal(ok.queries.at(-1),'COMMIT');assert.ok(ok.released);
 for(const scenario of [{conflict:true},{duplicate:true},{}]) {const fake=fakeResources(scenario);await assert.rejects(updatePersonalProfile({ownerContext:{ownerId:id},input:{...input,avatarReferenceId:scenario.conflict||scenario.duplicate?null:id},resources:fake.resources}),error=>['PROFILE_CONFLICT','PROFILE_HANDLE_TAKEN','PROFILE_AVATAR_INVALID'].includes(error.code));assert.equal(fake.queries.at(-1),'ROLLBACK');assert.ok(fake.released);}
 const avatar=fakeResources({avatar:true});await updatePersonalProfile({ownerContext:{ownerId:id},input:{...input,avatarReferenceId:id},resources:avatar.resources});assert.ok(avatar.queries.findIndex(sql=>sql.includes('pg_advisory_xact_lock'))<avatar.queries.findIndex(sql=>sql.includes('FROM reference_assets')));
});
async function invoke(method,body='',headers={}) {
 const request=Readable.from([Buffer.from(body)]);Object.assign(request,{url:'/api/profile',method,headers});let status,payload,responseHeaders;
 const handler=createProfileNodeApiHandler({authenticate:async()=>({ownerId:id}),operations:{async readPersonalProfile({ownerContext}){assert.equal(ownerContext.ownerId,id);return {handle:'jony'};},async updatePersonalProfile({ownerContext,input:value}){assert.equal(ownerContext.ownerId,id);return validateProfileInput(value);}}});
 assert.equal(await handler(request,{writeHead(code,value){status=code;responseHeaders=value;},end(value){payload=JSON.parse(value);}}),true);return {status,payload,headers:responseHeaders};
}
test('GG-072 private HTTP read/update, action-header gate, invalid JSON/size and unsupported methods',async()=>{
 assert.equal((await invoke('GET')).payload.handle,'jony');
 assert.equal((await invoke('PATCH',JSON.stringify(input))).status,403);
 assert.equal((await invoke('PATCH',JSON.stringify(input),{'x-goodgood-profile-action':'1'})).payload.handle,'jony');
 for(const body of ['{','x'.repeat(4097)]) assert.equal((await invoke('PATCH',body,{'x-goodgood-profile-action':'1'})).status,400);
 assert.equal((await invoke('DELETE')).status,405);assert.equal((await invoke('GET')).headers['cache-control'],'no-store');
});
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false,ws:false}});after(()=>vite.close());
const view=await vite.ssrLoadModule('/features/profile/personal-profile.tsx');
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
test('GG-072 own profile route and accessible read/works states, image ratio and avatar crop',()=>{
 assert.deepEqual(parseWorkspaceRoute('/profile/'),{kind:'profile'});assert.equal(workspaceRouteHref({kind:'profile'}),'/profile');
 assert.match(render(view.ProfileReadState,{loading:true,onRetry(){}}),/role="status"/);assert.match(render(view.ProfileReadState,{loading:false,error:'读取失败',onRetry(){}}),/role="alert".*重试/s);
 const props={works:[],loading:false,onRetry(){},onOpen(){},onCreate(){}};
 assert.match(render(view.ProfileWorks,props),/还没有图片作品.*开始创作/s);assert.match(render(view.ProfileWorks,{...props,loading:true}),/正在读取作品/);assert.match(render(view.ProfileWorks,{...props,error:'作品读取失败'}),/role="alert"/);
 const html=render(view.ProfileWorks,{...props,works:[{key:id,url:'https://private.invalid/signed',ratio:1.5,alt:'作品'}]});assert.match(html,/aspect-ratio:1.5/);assert.match(html,/查看我的作品 1/);assert.ok(!html.includes('好友'));
 assert.match(render(view.ProfileAvatar,{url:'https://private.invalid/avatar',name:'Jony'}),/Jony的头像/);
});
