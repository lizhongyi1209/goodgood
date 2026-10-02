import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { describeViewerGeneration, ImageViewerDetails } = await vite.ssrLoadModule("/features/assets/image-viewer-details.tsx");
const { ImagePreviewCanvas } = await vite.ssrLoadModule("/features/assets/image-preview-canvas.tsx");
const input = { prompt: "portrait <script>example</script>", modelId: "gpt-image-2", catalogModelName: "真实模型名称",
  aspectRatio: "2:3", resolution: "2K", count: 4, references: [{ id: "ref-one" }], quality: "high", background: "transparent", outputFormat: "webp" };

test("generated detail uses actual catalog name, requested parameters and decoded pixels", () => {
  const metadata = describeViewerGeneration(input, { width: 900, height: 1190 });
  assert.equal(metadata.model, "真实模型名称");
  assert.equal(metadata.parameters.find((item) => item.label === "数量").value, "4 张");
  assert.equal(metadata.parameters.find((item) => item.label === "参考图").value, "1 张");
  assert.match(metadata.parameters.find((item) => item.label === "分辨率").value, /2K.*900.*1190/);
  const html = renderToStaticMarkup(React.createElement(ImageViewerDetails, { item: { name: "底图.png", metadata } }));
  assert.match(html, /<h2>底图.png<\/h2>/);
  assert.match(html, /真实模型名称/);
  assert.match(html, /输出格式/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("uploaded and empty details do not invent generation information; optional parameters stay optional", () => {
  for (const media of ["image", "video"]) {
    const html = renderToStaticMarkup(React.createElement(ImageViewerDetails, { item: { name: "上传素材", media, width: 900, height: 1190 } }));
    assert.match(html, /<h2>上传素材<\/h2>/);
    assert.match(html, /<dt>尺寸<\/dt><dd>900.*1190/);
    assert.doesNotMatch(html, /图片素材|视频素材|未提供生成模型与参数|Nano Banana|GPT IMAGE|<dt>模型/);
  }
  const unknownSize = renderToStaticMarkup(React.createElement(ImageViewerDetails, { item: { name: "上传素材" } }));
  assert.doesNotMatch(unknownSize, /<dl>|图片素材|视频素材|未提供生成模型与参数/);
  assert.match(renderToStaticMarkup(React.createElement(ImageViewerDetails, { item: null })), /请选择右侧素材/);
  const metadata = describeViewerGeneration({ ...input, catalogModelName: undefined, quality: undefined, background: undefined, outputFormat: undefined }, {});
  assert.equal(metadata.model, "GPT IMAGE 2");
  assert.ok(metadata.parameters.every((item) => !["质量", "背景", "输出格式"].includes(item.label)));
});

test("non-GPT images omit legacy GPT defaults and unused search, thinking and references", () => {
  for (const modelId of ["nano-banana-2", "nano-banana-pro", "seedream-5.0-pro"]) {
    const metadata = describeViewerGeneration({ ...input, modelId, catalogModelName: undefined,
      quality: "auto", background: "auto", outputFormat: "png", thinkingLevel: "low",
      googleSearch: false, references: [] }, { width: 900, height: 1190 });
    assert.deepEqual(metadata.parameters.map((item) => item.label), ["画面比例", "分辨率", "数量"], modelId);
    assert.match(metadata.parameters.find((item) => item.label === "分辨率").value, /2K.*900.*1190/);
    const html = renderToStaticMarkup(React.createElement(ImageViewerDetails, { item: { name: "生成图片", metadata } }));
    assert.doesNotMatch(html, /<dt>(质量|背景|输出格式|谷歌搜索|思考|参考图)<\/dt>/);
  }
});

test("only Nano Banana 2 displays its enabled provider switches and recorded references", () => {
  const enabled = { ...input, modelId: "nano-banana-2", imageLine: "dedicated", thinkingLevel: "high", googleSearch: true };
  const metadata = describeViewerGeneration(enabled, {});
  const parameters = new Map(metadata.parameters.map((item) => [item.label, item.value]));
  assert.equal(parameters.get("思考"), "高");
  assert.equal(parameters.get("谷歌搜索"), "开启");
  assert.equal(parameters.get("参考图"), "1 张");
  assert.equal(parameters.get("线路"), "专线");
  for (const label of ["质量", "背景", "输出格式"]) assert.ok(!parameters.has(label));
  for (const modelId of ["nano-banana-pro", "seedream-5.0-pro", "gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"]) {
    const unsupported = describeViewerGeneration({ ...enabled, modelId }, {});
    assert.ok(unsupported.parameters.every((item) => !["思考", "谷歌搜索"].includes(item.label)), modelId);
    if (modelId === "seedream-5.0-pro") assert.ok(unsupported.parameters.every((item) => item.label !== "线路"));
  }
});

test("GPT details retain recorded supported options and automatic provider values", () => {
  for (const modelId of ["gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"]) {
    const metadata = describeViewerGeneration({ ...input, modelId, thinkingLevel: "low", googleSearch: false }, {});
    const parameters = new Map(metadata.parameters.map((item) => [item.label, item.value]));
    assert.equal(parameters.get("质量"), "高", modelId);
    assert.equal(parameters.get("背景"), "透明", modelId);
    assert.equal(parameters.get("输出格式"), "WebP", modelId);
    assert.ok(!parameters.has("思考"));
    assert.ok(!parameters.has("谷歌搜索"));
    const automatic = describeViewerGeneration({ ...input, modelId, quality: "auto", background: "auto", outputFormat: "jpeg" }, {});
    const autoParameters = new Map(automatic.parameters.map((item) => [item.label, item.value]));
    assert.equal(autoParameters.get("质量"), "自动", modelId);
    assert.equal(autoParameters.get("背景"), "自动", modelId);
    assert.equal(autoParameters.get("输出格式"), "JPEG", modelId);
  }
});

test("quality capability is specific to the recorded GPT variant, without a fallback value", () => {
  const unsupported = describeViewerGeneration({ ...input, modelId: "gpt-image-2", quality: "max" }, {});
  assert.ok(unsupported.parameters.every((item) => item.label !== "质量"));
  for (const modelId of ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"]) {
    const supported = describeViewerGeneration({ ...input, modelId, quality: "max" }, {});
    assert.equal(supported.parameters.find((item) => item.label === "质量").value, "最高", modelId);
  }
});

test("image canvas starts fitted without covering controls and retains keyboard access and loading content", () => {
  const html = renderToStaticMarkup(React.createElement(ImagePreviewCanvas, { name: "底图.png" }, React.createElement("span", { role: "status" }, "正在读取图片…")));
  assert.match(html, /translate\(0px,\s*0px\) scale\(1\)/);
  assert.doesNotMatch(html, /<button|role="group"|图片缩放/);
  assert.match(html, /滚轮缩放；加减键缩放，0 适应画布，方向键移动/);
  assert.match(html, /正在读取图片/);
  assert.match(html, /tabindex="0"/);
});
