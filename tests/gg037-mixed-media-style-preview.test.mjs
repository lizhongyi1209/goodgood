import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const source = "features/creation/mixed-media-style-preview.tsx";
const result = await build({ entryPoints: [source], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic" });
const compiled = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
const { MixedMediaStylePreview, MIXED_MEDIA_STYLE_ITEMS } = compiled.exports;

test("GG-037 mixes ratio-correct image/video fixtures and compact task slots", () => {
  assert.equal(MIXED_MEDIA_STYLE_ITEMS.length, 8);
  assert.ok(MIXED_MEDIA_STYLE_ITEMS.some((item) => item.type === "image"));
  assert.ok(MIXED_MEDIA_STYLE_ITEMS.some((item) => item.type === "video"));
  for (const state of ["queued", "in_progress", "failed", "completed"]) assert.ok(MIXED_MEDIA_STYLE_ITEMS.some((item) => item.status === state));
  for (const item of MIXED_MEDIA_STYLE_ITEMS) {
    const [width, height] = item.ratioLabel.split(":").map(Number);
    assert.equal(item.ratio, width / height);
  }
  const html = renderToStaticMarkup(createElement(MixedMediaStylePreview));
  assert.match(html, /desktop-creation-masonry/);
  assert.match(html, /mobile-creation-masonry/);
  assert.match(html, /生成中 · 42%/);
  assert.match(html, /已排队/);
  assert.match(html, /生成失败/);
  assert.match(html, /mixed-preview-video-marker/);
  assert.doesNotMatch(html, /<video|video-preview-result/);
});

test("GG-037 uses shared detail layout with mixed navigation and honest mock playback", async () => {
  const code = await readFile(source, "utf8");
  for (const className of ["image-detail-stage", "image-detail-info", "image-detail-rail"]) assert.ok(code.includes(className));
  assert.match(code, /ArrowRight/);
  assert.match(code, /onWheel/);
  assert.match(code, /模拟预览 · 非真实视频/);
  assert.match(code, /setPlaying\(false\)/);
  assert.match(code, /clearInterval/);
  assert.doesNotMatch(code, /fetch\(|localStorage|submitLocalVideoPreview|saveProject|saveCreationDraft/);
  const page = await readFile("app/page.tsx", "utf8");
  assert.match(page, /if \(session\?\.preview\) \{\s*setMixedMediaStylePreview\(url.searchParams.get\("media-preview"\) === "1"\)/);
  assert.match(page, /authenticationSession\?\.preview && mixedMediaStylePreview/);
});
