import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {validateInspirationInput,inspirationOperation} from '../server/inspiration/api.mjs';
import {presetGenerationInput,readPresetParameters} from '../server/inspiration/private-parameters.mjs';
import {generationInputFromRow} from '../server/generation/repository.mjs';
import {inspirationRequestRoute} from '../server/inspiration/node-api.mjs';
const id='77000000-0000-4000-8000-000000000001';
test('GG077 three visibility choices map to consistent legacy prompt protection',()=>{
 for(const mode of ['public','prompt_hidden','hidden']) {
  const value=validateInspirationInput('publish',{assetId:id,title:'案例',consent:true,parameterVisibility:mode});
  assert.equal(value.parameterVisibility,mode);assert.equal(value.promptVisibility,mode==='public'?'public':'hidden');
 }
 for(const input of [{parameterVisibility:'bogus'},{parameterVisibility:'hidden',promptVisibility:'public'}])assert.throws(()=>validateInspirationInput('publish',{assetId:id,title:'案例',consent:true,...input}));
 assert.equal(validateInspirationInput('publish',{assetId:id,title:'案例',consent:true,promptVisibility:'hidden'}).promptVisibility,'hidden');
});
test('GG077 fixed parameter payload ignores forged settings and preserves only personal supplements/references/quote',()=>{
 const recipe={modelId:'gpt-image-2',resolution:'4K',aspectRatio:'16:9',count:1,prompt:'PRIVATE',references:[],quality:'max'};
 const input={modelId:'nano-banana-2',resolution:'1K',count:4,prompt:'supplement',references:[{id}],expectedPriceVersion:8};
 const result=presetGenerationInput({hidden:true,recipe},input);
 assert.equal(result.modelId,recipe.modelId);assert.equal(result.resolution,'4K');assert.equal(result.count,1);assert.equal(result.prompt,'supplement');assert.deepEqual(result.references,[{id}]);assert.equal(result.expectedPriceVersion,8);
 assert.equal(presetGenerationInput({hidden:false,recipe},input),input);
});
test('GG077 private generated input excludes actual settings and preserves user-owned references',()=>{
 const result=generationInputFromRow({parameters_hidden:true,model_id:'gpt-image-2',catalog_model_name:'SECRET MODEL',resolution:'4K',quality:'max',image_line:'dedicated',aspect_ratio:'16:9',prompt:'safe supplement',reference_snapshot:[{id,name:'自己的图'}]});
 assert.equal(result.parametersHidden,true);assert.equal(result.catalogModelName,'预设效果');assert.equal(result.prompt,'safe supplement');
 for(const secret of ['SECRET MODEL','gpt-image-2','4K','max','dedicated','16:9']) assert.ok(!JSON.stringify(result).includes(secret));
 assert.equal(result.references[0].name,'自己的图');
});
test('GG077 view/use actions validate identifiers and private preset rejects inaccessible source',async()=>{
 assert.deepEqual(inspirationRequestRoute(`/api/inspiration/${id}/view`,'POST'),{id,action:'view'});
 assert.equal(inspirationRequestRoute(`/api/inspiration/${id}/quote`,'POST').action,'quote');
 assert.throws(()=>validateInspirationInput('view',{interactionId:'bad'}));
 assert.throws(()=>validateInspirationInput('quote',{modelId:'forged'}));
 await assert.rejects(readPresetParameters({query:async()=>({rows:[]})},id),error=>error.status===404);
 await assert.rejects(inspirationOperation({action:'view',id,input:{interactionId:id}}),error=>error.status===401);
});
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false,ws:false}});after(()=>vite.close());
const {InspirationCards}=await vite.ssrLoadModule('/features/inspiration/inspiration-board.tsx');
const {CreationComposer}=await vite.ssrLoadModule('/features/creation/creation-composer.tsx');
test('GG077 cards expose view/use statistics without depending on opening details',()=>{
 const html=renderToStaticMarkup(React.createElement(InspirationCards,{items:[{id,title:'案例',after:{url:'https://fixture.invalid/after'},author:{displayName:'作者'},views:42,uses:7,likes:1}],onOpen(){},onLike(){},busy:[]}));
 assert.match(html,/aria-label="查看次数：42"/);assert.match(html,/aria-label="使用次数：7"/);assert.doesNotMatch(html,/42 查看|7 使用|点赞|case-like/);
});
test('GG077 fully hidden composer retains optional prompt/reference/send but removes parameter controls from DOM',()=>{
 const no=()=>{};
 const html=renderToStaticMarkup(React.createElement(CreationComposer,{parametersHidden:true,showModeSwitch:false,mode:'image',prompt:'',promptLabel:'补充提示词（选填）',references:[],modelId:'nano-banana-2',aspectRatio:'1:1',resolution:'1K',count:1,drawerOpen:false,isGenerating:false,billingLabel:'20 积分/批',billingDescription:'可用100积分',onPromptChange:no,onModeChange:no,onReferenceFiles:no,onRemoveReference:no,onModelChange:no,onAspectRatioChange:no,onResolutionChange:no,onCountChange:no,onDrawerOpenChange:no,onGenerate:no}));
 assert.match(html,/补充提示词（选填）/);assert.match(html,/生成图片/);assert.match(html,/20 积分\/批/);assert.doesNotMatch(html,/展开生成参数|parameter-drawer|model-options-drawer/);
});
