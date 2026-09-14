import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false,ws:false}});after(()=>vite.close());
const {CaseComparison}=await vite.ssrLoadModule('/features/inspiration/case-comparison.tsx');
const {InspirationCards}=await vite.ssrLoadModule('/features/inspiration/inspiration-board.tsx');
const item={id:'fixture',title:'效果',after:{url:'https://fixture.invalid/after',width:1024,height:768},before:{url:'https://fixture.invalid/before'},comparisonMode:'hover',author:{displayName:'作者'},liked:false,likes:0};
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
test('GG076 hover detail rests on processed image with hidden before and no seam',()=>{
 const html=render(CaseComparison,{...item,mode:'hover'});assert.match(html,/clip-path:inset\(0 100% 0 0\)/);assert.doesNotMatch(html,/case-wipe-divider/);assert.match(html,/type="range"/);assert.match(html,/value="0"/);
});
test('GG076 hover cards preview before/after without nesting interactive controls',()=>{
 const html=render(InspirationCards,{items:[item],onOpen(){},onLike(){},busy:[]});assert.match(html,/case-wipe is-compact/);assert.match(html,/fixture.invalid\/before/);assert.match(html,/划过对比/);assert.doesNotMatch(html,/type="range"/);assert.match(html,/查看案例：效果/);
 for(const change of [{comparisonMode:'side_by_side'},{before:null}])assert.doesNotMatch(render(InspirationCards,{items:[{...item,...change}],onOpen(){},onLike(){},busy:[]}),/case-wipe/);
});
