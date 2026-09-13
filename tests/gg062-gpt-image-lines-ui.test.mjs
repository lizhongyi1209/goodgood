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
