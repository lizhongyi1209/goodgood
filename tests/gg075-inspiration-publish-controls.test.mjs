import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false,ws:false}});after(()=>vite.close());
const {CaseComparisonSettings,casePublicationIssue}=await vite.ssrLoadModule('/features/inspiration/case-comparison-settings.tsx');
const render=(props)=>renderToStaticMarkup(React.createElement(CaseComparisonSettings,{options:[],selectedId:'',mode:'side_by_side',busy:false,onSelect(){},onMode(){},...props}));
test('GG075 empty reference comparison remains discoverable with explanatory disabled modes',()=>{
 const html=render({});assert.match(html,/效果对比/);assert.match(html,/没有可用于对比的参考图/);assert.match(html,/<fieldset[^>]*disabled/);assert.match(html,/左右并排/);assert.match(html,/鼠标划过/);
});
test('GG075 source reference thumbnails allow before selection or effect-only without losing mode selection',()=>{
 const options=[{id:'a',name:'before-a.png',url:'https://fixture.invalid/a'},{id:'b',name:'before-b.png',url:'https://fixture.invalid/b'}];
 const html=render({options,selectedId:'b',mode:'hover'});assert.match(html,/参考图 1 · before-a.png/);assert.match(html,/参考图 2 · before-b.png/);assert.match(html,/变化前/);assert.match(html,/仅展示效果图/);assert.match(html,/is-selected[^]*before-b.png/);assert.doesNotMatch(html,/<fieldset[^>]*disabled/);
 assert.match(render({options,selectedId:''}),/选中一张变化前参考图后/);
 assert.match(render({options,selectedId:'a',busy:true}),/disabled/);
});
test('GG075 publish validates explicit consent and required content before request',()=>{
 assert.match(casePublicationIssue({consent:false,title:'case',prompt:'preset'}),/请先勾选发布确认/);
 assert.match(casePublicationIssue({consent:true,title:' ',prompt:'preset'}),/案例名称/);
 assert.match(casePublicationIssue({consent:true,title:'case',prompt:' '}),/预设提示词/);
 assert.equal(casePublicationIssue({consent:true,title:'case',prompt:'preset'}),null);
});
