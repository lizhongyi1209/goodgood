import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const { modelCardSummary, ModelPricingList } = await vite.ssrLoadModule(
  "/features/admin/model-pricing-list.tsx",
);
const image = {
  id: "test",
  name: "Test image",
  adapterId: "gpt-image-2.5-flare",
  mediaType: "image",
  enabled: true,
  prices: {},
  lines: {
    special: {
      enabled: false,
      prices: {
        "1K": { output: 100, qualities: { low: 5, medium: 50, max: 100 } },
        "4K": { output: 200 },
        unsupported: { output: 999 },
      },
    },
    quality: { enabled: true, prices: { "1K": { output: 1 } } },
    dedicated: { enabled: true, prices: { "1K": { output: 300 } } },
  },
};

test("GG-070 card ranges reflect supported default-line specifications and disclose disabled default", () => {
  const summary = modelCardSummary(image);
  assert.equal(summary.output, "¥0.05–2.00");
  assert.equal(summary.lineName, "特价");
  assert.equal(summary.lineEnabled, false);
  assert.equal(summary.lineCount, 3);
  const html = renderToStaticMarkup(
    React.createElement(ModelPricingList, {
      models: [image],
      busy: false,
      onEdit() {},
      onToggle() {},
    }),
  );
  assert.match(html, /未启用/);
  assert.match(html, /价格详情/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.doesNotMatch(html, /xhigh|质量价格|0.01|3.00|<input/);
});

test("GG-070 cards separate token reference rates, preserve legacy meaning and never invent empty prices", () => {
  const video = {
    id: "v",
    name: "Video",
    adapterId: "seedance-2-5",
    mediaType: "video",
    enabled: false,
    prices: {
      "480p": { billing: "tokens", output: 7000, input: 4200 },
      "1080p": { billing: "tokens", output: 7700, input: 4600 },
      "4K": { billing: "tokens", output: 1, input: 1 },
    },
  };
  const summary = modelCardSummary(video);
  assert.equal(summary.output, "¥70.00–77.00");
  assert.equal(summary.reference, "¥42.00–46.00");
  assert.equal(summary.unit, "元/百万token");
  const empty = modelCardSummary({ ...video, prices: {} });
  assert.equal(empty.output, "未定价");
  assert.equal(empty.reference, "未定价");
  const legacy = { ...video, prices: { "480p": { output: 40, input: 20 } } };
  const html = renderToStaticMarkup(
    React.createElement(ModelPricingList, {
      models: [legacy],
      busy: false,
      onEdit() {},
      onToggle() {},
    }),
  );
  assert.match(html, /待配置 token 价格/);
  assert.doesNotMatch(html, /¥0.40/);
});

test("GG-070 many models remain one compact card each and mutation loading disables both actions", () => {
  const models = Array.from({ length: 60 }, (_, i) => ({
    ...image,
    id: `model-${i}`,
    name: `Model ${i}`,
  }));
  const html = renderToStaticMarkup(
    React.createElement(ModelPricingList, {
      models,
      busy: true,
      onEdit() {},
      onToggle() {},
    }),
  );
  assert.equal((html.match(/<article/g) ?? []).length, 60);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 120);
  assert.equal((html.match(/价格详情/g) ?? []).length, 60);
  assert.doesNotMatch(html, /<table|<input|规格售价/);
  const empty = renderToStaticMarkup(
    React.createElement(ModelPricingList, {
      models: [],
      busy: false,
      onEdit() {},
      onToggle() {},
    }),
  );
  assert.doesNotMatch(empty, /<article|图片模型|视频模型/);
});
