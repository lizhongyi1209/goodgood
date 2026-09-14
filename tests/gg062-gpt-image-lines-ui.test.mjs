import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { BananaLineSelector } = await vite.ssrLoadModule("/features/creation/banana-line-selector.tsx");
const { ModelPricingList } = await vite.ssrLoadModule("/features/admin/model-pricing-list.tsx");
const { VideoTokenPricingEditor } = await vite.ssrLoadModule("/features/admin/video-token-pricing-editor.tsx");
test("GG-068 line prices remain distinct, 2.5 stays first and creation resolves 1080p", async () => {
  const { resolveVideoResolution, VIDEO_GENERATION_MODEL_CATALOG } = await vite.ssrLoadModule("/features/creation/video-generation-options.ts");
  const video={ id:"seedance-2-5", adapterId:"seedance-2-5", name:"Seedance 2.5",mediaType:"video", enabled:false,prices:{},videoLines:{standard:{enabled:true,prices:{"1080p":{billing:"tokens",output:7700,input:4600}}},backup:{enabled:true,prices:{"1080p":{billing:"tokens",output:6160,input:3680}}}}};
  const other={id:"seedance-2-0",adapterId:"seedance-2-0",name:"Seedance 2.0",mediaType:"video",enabled:false,prices:{}};
  const html=renderToStaticMarkup(React.createElement(ModelPricingList,{models:[other,video],busy:false,onEdit(){},onToggle(){}}));
  assert.ok(html.indexOf('aria-label="Seedance 2.5 价格"') < html.indexOf('aria-label="Seedance 2.0 价格"'));
  assert.match(html,/77.00/); assert.match(html,/61.60/); assert.match(html,/标准线路价格/); assert.match(html,/备用线路价格/);
  assert.doesNotMatch(html,/每百万 tokens 售价|人民币 \/ 百万 tokens/);
  assert.equal(resolveVideoResolution("seedance-2-5","1080p"),"1080p");
  assert.equal(resolveVideoResolution("seedance-2-5","4K"),"720p");
  assert.equal(resolveVideoResolution("seedance-2-0-fast","1080p"),"720p");
  assert.equal(VIDEO_GENERATION_MODEL_CATALOG[0].id,"seedance-2-5");
  const editor=renderToStaticMarkup(React.createElement(VideoTokenPricingEditor,{resolutions:["480p","720p","1080p"],prices:{},line:"backup",onLineChange(){},onChange(){}}));
  assert.match(editor,/启用备用/); assert.match(editor,/1080p 含参考视频 token 售价/);
});
test("GG-067 video prices disclose token units and editor keeps both rate inputs visible", () => {
  const video = { id: "seedance-2-0-mini", adapterId: "seedance-2-0-mini", name: "Seedance Mini", mediaType: "video", enabled: false, prices: { "480p": { billing: "tokens", output: 2300, input: 1400 } } };
  const html = renderToStaticMarkup(React.createElement(ModelPricingList, { models: [video], busy: false, onEdit() {}, onToggle() {} }));
  assert.match(html, /无参考视频/); assert.match(html, /含参考视频/); assert.match(html, /元\/百万token/); assert.doesNotMatch(html, /积分\/秒/);
  const editor = renderToStaticMarkup(React.createElement(VideoTokenPricingEditor, { resolutions: ["480p", "720p"], prices: { "480p": { billing: "tokens", output: "23.00", input: "14.00" } }, onChange() {} }));
  assert.match(editor, /117 积分/); assert.match(editor, /1.164674/); assert.match(editor, /Seedance 响应 JSON/); assert.match(editor, /720p 含参考视频 token 售价/);
  const empty = renderToStaticMarkup(React.createElement(VideoTokenPricingEditor, { resolutions: ["480p"], prices: {}, onChange() {} }));
  assert.match(empty, /填写有效价格/);
});
const models = ["gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].map(id => ({
  id, adapterId: id, name: id, mediaType: "image", enabled: true, version: 1,
  prices: { "1K": { output: 20 } }, lines: { special: { enabled: true, prices: { "1K": { output: 20 } } },
    quality: { enabled: true, prices: { "1K": { output: 40 } } }, dedicated: { enabled: false, prices: {} } },
}));
test("GG-062 GPT selector exposes three accessible lines and preserves unavailable selection", () => {
  for (const model of models) {
    const html = renderToStaticMarkup(React.createElement(BananaLineSelector, { modelId: model.id, model, resolution: "1K", value: "quality", onChange() {} }));
    assert.equal((html.match(/aria-pressed=/g) ?? []).length, 3);
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.equal((html.match(/disabled=""/g) ?? []).length, 1);
    const unavailable = renderToStaticMarkup(React.createElement(BananaLineSelector, { modelId: model.id, model, resolution: "1K", value: "dedicated", onChange() {} }));
    assert.match(unavailable, /请选择其他线路/);
  }
});
test("GG-062 GPT pricing list retains three independent line rows per model", () => {
  const html = renderToStaticMarkup(React.createElement(ModelPricingList, { models, busy: false, onEdit() {}, onToggle() {} }));
  for (const model of models) assert.ok(html.includes(model.name));
  for (const name of ["特价", "优质", "专线"]) assert.equal((html.match(new RegExp(`>${name}<`, "g")) ?? []).length, 3);
  assert.ok(html.includes("0.20"));
  assert.ok(html.includes("0.40"));
  assert.ok(html.includes("未定价"));
});

test("GG-063/GG-065 quality ranges stay compact while billing retains model-owned prices", async () => {
 const { findBillingQuote } = await vite.ssrLoadModule("/features/billing/http-billing-boundary.ts");
 const { getGptImageQualityOptions, resolveGptImageOptionsForModel } = await vite.ssrLoadModule("/features/creation/generation-options.ts");
 const qualityModel = {...models[2], lines: {...models[2].lines, dedicated:{ enabled:false, prices:{"1K":{output:148,qualities:{low:5,medium:10,high:37,xhigh:66,max:148}}}}}};
 const html=renderToStaticMarkup(React.createElement(ModelPricingList,{models:[qualityModel],busy:false,onEdit(){},onToggle(){}}));
 for (const value of ["0.05","1.48"]) assert.ok(html.includes(value));
 assert.doesNotMatch(html,/aria-label="专线质量价格"|xhigh|66 积分\/张/);
 assert.doesNotMatch(html,/<details|<summary/);
 assert.equal(getGptImageQualityOptions("gpt-image-2").length,4);
 assert.equal(getGptImageQualityOptions("gpt-image-2.5-flare").length,6);
 assert.equal(resolveGptImageOptionsForModel("gpt-image-2",{quality:"max"}).quality,"auto");
 assert.equal(resolveGptImageOptionsForModel("gpt-image-2.5-flare",{quality:"max"}).quality,"max");
 const quotes=["low","high","max"].map(quality=>({modelId:qualityModel.id,count:1,resolution:"1K",imageLine:"dedicated",quality,creditAmount:String(qualityModel.lines.dedicated.prices["1K"].qualities[quality])}));
 assert.equal(findBillingQuote({quotes},{modelId:qualityModel.id,count:1,resolution:"1K",imageLine:"dedicated",quality:"max"}).creditAmount,"148");
 assert.equal(findBillingQuote({quotes},{modelId:qualityModel.id,count:1,resolution:"1K",imageLine:"dedicated",quality:"auto"}),null);
});
