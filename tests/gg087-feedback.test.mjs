import assert from 'node:assert/strict';
import test from 'node:test';
import {Readable} from 'node:stream';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {validateFeedback,validateFeedbackAction,validateFeedbackCursor,feedbackApiError} from '../server/feedback/api.mjs';
import {handleFeedbackHttp,createFeedbackNodeApiHandler} from '../server/feedback/http.mjs';
import {parseWorkspaceRoute,workspaceRouteHref} from '../features/navigation/workspace-route.mjs';
const owner={ownerId:'87000000-0000-4000-8000-000000000001'};
test('feedback validates types, meaningful text, five real-image inputs and bounded sizes',()=>{
  const file={mimeType:'image/png',bytes:Buffer.from('image')};
  assert.equal(validateFeedback({category:'generation',message:'  描述问题  '},Array(5).fill(file)).message,'描述问题');
  for(const [input,files] of [[{category:'__proto__',message:'x'},[]],[{category:'other',message:' '},[]],[{category:'other',message:'x'.repeat(4001)},[]],[{category:'other',message:'x'},Array(6).fill(file)],[{category:'other',message:'x'},[{...file,mimeType:'image/svg+xml'}]],[{category:'other',message:'x'},[{...file,bytes:Buffer.alloc(10485761)}]]])assert.throws(()=>validateFeedback(input,files),e=>e.status===400);
  assert.deepEqual(validateFeedbackAction({status:'resolved',message:'已修复',version:1}),{status:'resolved',message:'已修复',version:1});
  for(const input of [{status:'madeup',version:1},{status:'open',version:0},{status:'open',version:1,message:'x'.repeat(4001)}])assert.throws(()=>validateFeedbackAction(input));
  for(const cursor of ['invalid',Buffer.from(JSON.stringify({id:owner.ownerId,at:'invalid'})).toString('base64url')])assert.throws(()=>validateFeedbackCursor(cursor));
  assert.doesNotMatch(JSON.stringify(feedbackApiError(Error('SQL password secret'))),/SQL|password|secret/);
});
test('HTTP multipart binds session owner, blocks missing write headers and oversized/duplicate inputs',async()=>{
  let submitted;
  const options={authenticateSession:async()=>owner,operations:{createFeedback:async args=>{submitted=args;return {id:owner.ownerId};},listFeedback:async args=>({ownerId:args.ownerContext.ownerId})}};
  const form=new FormData();form.set('category','other');form.set('message','问题描述');form.append('images',new Blob(['png'],{type:'image/png'}),'test.png');
  const request=()=>new Request('http://local/api/feedback',{method:'POST',headers:{'x-goodgood-feedback-action':'1','idempotency-key':'gg087-test'},body:form});
  const result=await handleFeedbackHttp(request(),options);assert.equal(result.status,201);assert.equal(submitted.ownerContext.ownerId,owner.ownerId);assert.equal(submitted.files.length,1);assert.equal(submitted.files[0].bytes.toString(),'png');
  assert.equal((await handleFeedbackHttp(new Request('http://local/api/feedback',{method:'POST',body:form}),options)).status,403);
  form.append('message','duplicate');assert.equal((await handleFeedbackHttp(request(),options)).status,400);
  const huge=new Request('http://local/api/admin/feedback',{method:'POST',headers:{'x-goodgood-admin-action':'1'},body:'x'.repeat(8193)});assert.equal((await handleFeedbackHttp(huge,options)).status,413);
  assert.equal((await handleFeedbackHttp(new Request('http://local/api/feedback'),{...options,authenticateSession:async()=>{throw Object.assign(Error('expired'),{status:401});}})).status,503,'Unknown errors are sanitized');
});
test('Node and resumable routes wire personal and site-owner feedback without external transmission',async()=>{
  for(const path of ['/feedback','/admin/feedback'])assert.equal(workspaceRouteHref(parseWorkspaceRoute(path)),path);
  const handler=createFeedbackNodeApiHandler({authenticateSession:async()=>owner,operations:{listFeedback:async()=>({items:[],nextCursor:null})}});
  const request=Readable.from([]);Object.assign(request,{url:'/api/feedback',method:'GET',headers:{}});let status,headers,body;
  const handled=await handler(request,{writeHead(s,h){status=s;headers=h;},end(b){body=JSON.parse(b.toString());}});
  assert.equal(handled,true);assert.equal(status,200);assert.equal(headers['cache-control'],'no-store');assert.deepEqual(body.items,[]);
});
test('feedback SSR exposes labelled fields, limit, login/loading, private detail and escaped user text',async()=>{
  const root=fileURLToPath(new URL('..',import.meta.url)),dir=new URL('../work/gg087-render/',import.meta.url);await mkdir(dir,{recursive:true});
  const bundle=await build({entryPoints:[`${root}/features/feedback/feedback-view.tsx`],bundle:true,platform:'node',format:'esm',packages:'external',alias:{'@':root},loader:{'.css':'empty'},write:false,logLevel:'silent'});
  const file=new URL('feedback.mjs',dir);await writeFile(file,bundle.outputFiles[0].text);const views=await import(file.href);
  const form=renderToStaticMarkup(React.createElement(views.FeedbackForm,{onSubmitted(){}}));for(const text of ['问题类型','反馈信息','问题图片','单张10 MB','提交反馈'])assert.match(form,new RegExp(text));assert.match(form,/accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(renderToStaticMarkup(React.createElement(views.ProblemFeedbackView,{session:undefined,onLogin(){}})),/正在确认账户/);
  assert.match(renderToStaticMarkup(React.createElement(views.ProblemFeedbackView,{session:null,onLogin(){}})),/登录 GoodGood/);
  const html=renderToStaticMarkup(React.createElement(views.FeedbackDetailContent,{detail:{category:'generation',message:'<script>alert(1)</script>',status:'processing',createdAt:'2026-09-14T00:00:00Z'}}));assert.match(html,/处理中/);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});
