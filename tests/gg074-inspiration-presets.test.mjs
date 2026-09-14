import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {hiddenPresetPrompt,lockHiddenPreset} from '../server/inspiration/preset.mjs';
import {inspirationOperation,validateInspirationInput} from '../server/inspiration/api.mjs';
import {parseWorkspaceRoute,workspaceRouteHref} from '../features/navigation/workspace-route.mjs';
import {Readable} from 'node:stream';
import {createInspirationNodeApiHandler} from '../server/inspiration/node-api.mjs';
test('GG074 preset submission preserves request safety error statuses',async()=>{
  for(const [body,headers,status] of [['{}',{},403],['{',{'x-goodgood-inspiration-action':'1'},400],['x'.repeat(32769),{'x-goodgood-inspiration-action':'1'},400]]) {
    const request=Readable.from([Buffer.from(body)]);Object.assign(request,{url:'/api/inspiration/74000000-0000-4000-8000-000000000001/generate',method:'POST',headers});
    let actual;await createInspirationNodeApiHandler({authenticate:async()=>({ownerId:'fixture'})})(request,{writeHead(code){actual=code;},end(){}});assert.equal(actual,status);
  }
});
const id='74000000-0000-4000-8000-000000000001';
const parameters={modelId:'nano-banana-2',catalogModelId:'nano-banana-2',aspectRatio:'1:1',resolution:'1K',count:1,referenceCount:1,imageLine:'special',quality:'auto',background:'auto',outputFormat:'png'};
test('GG074 hidden preset joins optional supplement without returning original strings in shared/use DTOs',async()=>{
  assert.equal(hiddenPresetPrompt(' PRIVATE PRESET ','   '),'PRIVATE PRESET');
  assert.equal(hiddenPresetPrompt('PRIVATE PRESET',' detail '),'PRIVATE PRESET\ndetail');
  assert.throws(()=>hiddenPresetPrompt('preset','x'.repeat(4001)));
  const row={id,owner_id:id,prompt:'PRIVATE PRESET',prompt_visibility:'hidden',comparison_mode:'hover',title:'效果',parameters,author_snapshot:{displayName:'作者'},after_key:'fixture/after',before_key:'fixture/before',created_at:'2026-09-14T00:00:00Z'};
  const resources={pool:{async query(sql){return {rows:sql.includes('FROM users')?[{workspace_id:id,kind:'personal',status:'active'}]:[row]};}},signRead:async key=>`https://fixture.invalid/${key}`};
  for(const systemRole of ['member','site_owner']){
    const ownerContext={ownerId:id,systemRole};
    const detail=await inspirationOperation({action:'detail',id,ownerContext,resources});assert.equal(detail.prompt,null);assert.equal(detail.comparisonMode,'hover');assert.ok(!JSON.stringify(detail).includes('PRIVATE PRESET'));
    const used=await inspirationOperation({action:'use',id,ownerContext,resources});assert.equal(used.promptVisibility,'hidden');assert.equal(used.recipe.prompt,'');assert.deepEqual(used.recipe.references,[]);assert.ok(!JSON.stringify(used).includes('PRIVATE PRESET'));
  }
  row.prompt_visibility='public';assert.equal((await inspirationOperation({action:'use',id,ownerContext:{ownerId:id},resources})).recipe.prompt,'PRIVATE PRESET');
});
test('GG074 editor validates custom prompts and modes while metadata remains server-owned',()=>{
  const input={assetId:id,title:'案例',consent:true,prompt:'可编辑预设',promptVisibility:'hidden',comparisonMode:'hover'};
  assert.equal(validateInspirationInput('publish',input).prompt,'可编辑预设');
  for(const change of [{prompt:''},{prompt:'x'.repeat(4001)},{promptVisibility:'secret'},{comparisonMode:'slider'},{parameters:{modelId:'forged'}}]) assert.throws(()=>validateInspirationInput('publish',{...input,...change}));
});
test('GG074 deleted, rejected or non-hidden preset prevents effective prompt lookup',async()=>{
  await assert.rejects(lockHiddenPreset({query:async()=>({rows:[]})},id,''),error=>error.code==='INSPIRATION_NOT_FOUND');
  assert.equal(await lockHiddenPreset({query:async()=>({rows:[{prompt:'preset'}]})},id,'more'),'preset\nmore');
});
test('GG074 editor and reproduction routes round trip without exposing prompts in URLs',()=>{
  for(const route of [{kind:'inspirationEdit',assetId:id},{kind:'inspirationUse',caseId:id}]) assert.deepEqual(parseWorkspaceRoute(workspaceRouteHref(route)),route);
});
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false,ws:false}});after(()=>vite.close());
const comparison=await vite.ssrLoadModule('/features/inspiration/case-comparison.tsx');
test('GG074 before/after pointer wipe has touch/keyboard range and preserves image framing',()=>{
  const props={before:{url:'https://fixture.invalid/before'},after:{url:'https://fixture.invalid/after',width:1024,height:768},title:'对比',mode:'hover'};
  const html=renderToStaticMarkup(React.createElement(comparison.CaseComparison,props));assert.match(html,/type="range"/);assert.match(html,/调整前后对比位置/);assert.match(html,/clip-path:inset\(0 50% 0 0\)/);assert.match(html,/aspect-ratio:1.333/);
  assert.ok(!renderToStaticMarkup(React.createElement(comparison.CaseComparison,{...props,before:null})).includes('type="range"'));
});
