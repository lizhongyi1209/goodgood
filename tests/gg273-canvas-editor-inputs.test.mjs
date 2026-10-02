import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { createServer } from "vite";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";
import { collectCanvasTextInputs, combineCanvasPrompt, isCanvasTextConnection, normalizeCanvasInputEdge } from "../features/canvas/canvas-text-input.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { InputAttachment } = await vite.ssrLoadModule("/components/ui/input-attachment.tsx");
const { CanvasGeneratorNode } = await vite.ssrLoadModule("/features/canvas/canvas-generator-node.tsx");
const { CanvasTextNode, CanvasTextFormatToolbar } = await vite.ssrLoadModule("/features/canvas/canvas-text-node.tsx");
const { snapshotCanvasProject, remoteCanvasProjectDocument } = await vite.ssrLoadModule("/features/canvas/canvas-project-snapshot.ts");
const nodes = [
  { id: "text", type: "textEditor", position: { x: 0, y: 0 }, data: { markdown: "# 提示词", text: "提示词" } },
  { id: "generator", type: "imageGenerator", position: { x: 400, y: 0 }, data: { sequence: 1 } },
  { id: "image", type: "sourceImage", position: { x: 0, y: 300 }, data: { assetId: "00000000-0000-4000-8000-000000000001", name: "reference.png" } },
];
const textEdge = { id: "text-edge", source: "text", target: "generator", sourceHandle: "text", targetHandle: "reference" };
const imageEdge = { id: "image-edge", source: "image", target: "generator", sourceHandle: "reference", targetHandle: "reference" };
const withFlow = (component, node, size = { width: 360, height: 260 }) => {
  const initialNodes = [{ ...node, ...size, style: { ...size } }];
  return React.createElement(ReactFlowProvider, { initialNodes }, React.createElement(ReactFlow, {
    nodes: initialNodes, nodeTypes: { [node.type]: component }, width: 800, height: 600,
  }));
};

test("generator renders exactly one receiving handle for image and text", () => {
  const html = renderToStaticMarkup(withFlow(CanvasGeneratorNode, nodes[1]));
  assert.equal((html.match(/data-handleid="reference"/g) ?? []).length, 1);
  assert.equal((html.match(/class="[^"]*react-flow__handle-left[^"]*target/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-handleid="text"/);
  assert.match(html, /连接图片或文本/);
});
test("text editor renders external metadata, a quiet writing area and an accessible corner grip", () => {
  const html = renderToStaticMarkup(withFlow(CanvasTextNode, nodes[0]));
  assert.match(html, /<header[^>]*>.*文本编辑 1/s);
  assert.match(html, /<header[^>]*imageMetadata/);
  assert.doesNotMatch(html, /<footer/);
  assert.match(html, /aria-label="调整文本编辑 1尺寸"/);
  assert.match(html, /双击或按 Enter 编辑/);
  assert.match(html, /react-flow__resize-control nodrag bottom right handle/);
  assert.match(html, /M7 17 17 7M13 19 19 13/);
  assert.equal((html.match(/react-flow__resize-control/g) ?? []).length, 1);
  assert.match(html, /data-handleid="text"/);
  assert.match(html, /referenceOutputHandle/);
});
test("text-node resizing keeps the same body font at minimum, default and large dimensions", () => {
  for (const size of [{ width: 180, height: 140 }, { width: 360, height: 260 }, { width: 720, height: 520 }]) {
    const html = renderToStaticMarkup(withFlow(CanvasTextNode, nodes[0], size));
    assert.match(html, /style="font-size:14px"/);
    assert.match(html, /aria-label="调整文本编辑 1尺寸"/);
  }
});
test("editor toolbar exposes retained formatting while removed controls are absent", () => {
  const html = renderToStaticMarkup(React.createElement(CanvasTextFormatToolbar, { editor: null }));
  for (const label of ["正文", "一级标题 H1", "二级标题 H2", "三级标题 H3", "粗体", "斜体", "无序列表", "有序列表", "撤销文本编辑", "重做文本编辑"]) {
    assert.ok(html.includes(`aria-label="${label}"`), label);
  }
  assert.doesNotMatch(html, /aria-label="(?:删除线|引用|代码块)"/);
  assert.match(html, /disabled=""/); // Editor loading keeps visible controls inert until Tiptap mounts.
});
test("H1, H2 and H3 roundtrip as distinct Markdown heading levels", () => {
  const manager = new MarkdownManager({ extensions: [StarterKit] });
  const document = manager.parse("# 一级\n\n## 二级\n\n### 三级");
  assert.deepEqual(document.content.map((node) => node.attrs.level), [1, 2, 3]);
  assert.deepEqual(manager.parse(manager.serialize(document)), document);
});
test("mixed image and text edges share the target while only text contributes to prompt", () => {
  assert.equal(isCanvasTextConnection(textEdge, nodes, [imageEdge]), true);
  assert.equal(isCanvasTextConnection(textEdge, nodes, [textEdge, imageEdge]), false);
  assert.equal(combineCanvasPrompt(collectCanvasTextInputs(nodes, [imageEdge, textEdge], "generator"), "附加"), "提示词\n\n附加");
  assert.equal(isCanvasTextConnection({ ...textEdge, source: "image" }, nodes, []), false);
});
test("legacy text-target edges normalize without mutating IDs, original data or image edges", () => {
  const legacy = { ...textEdge, targetHandle: "text" };
  assert.deepEqual(normalizeCanvasInputEdge(legacy), textEdge);
  assert.equal(legacy.targetHandle, "text");
  assert.equal(normalizeCanvasInputEdge(textEdge), textEdge);
  assert.equal(normalizeCanvasInputEdge(imageEdge), imageEdge);
  assert.equal(isCanvasTextConnection(textEdge, nodes, [legacy]), false);
});
test("snapshot and server save accept shared ports and preserve old text connections", () => {
  const document = remoteCanvasProjectDocument(snapshotCanvasProject({ nodes, edges: [imageEdge, { ...textEdge, targetHandle: "text" }],
    draftsByGenerator: {}, referencesByGenerator: {}, convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } }));
  assert.equal(document.edges[1].targetHandle, "reference");
  for (const targetHandle of ["reference", "text"]) {
    const copy = structuredClone(document); copy.edges[1].targetHandle = targetHandle;
    const saved = validateCanvasProjectSave({ expectedVersion: null, name: "画布", document: copy });
    assert.equal(saved.document.edges[1].targetHandle, "reference");
    assert.equal(saved.document.edges[0].sourceHandle, "reference");
    assert.equal(saved.document.nodes[0].text, "提示词");
  }
});
test("all input media use the same file-card shell, actions and consistent icon family", () => {
  let calls = 0;
  for (const media of ["image", "text", "video", "audio"]) {
    const html = renderToStaticMarkup(React.createElement(InputAttachment, { media, name: "示例", text: "内容", onRemove: () => calls++ }));
    assert.match(html, new RegExp(`data-media="${media}"`));
    assert.match(html, /data-slot="attachment-media"/);
    assert.match(html, /data-slot="attachment-title"/);
    assert.match(html, /预览/); assert.match(html, /移除/);
    assert.doesNotMatch(html, /autoplay/i);
  }
  assert.equal(calls, 0);
});
test("attachment loading, failure and disabled removal keep their existing recovery controls", () => {
  const props = { media: "video", name: "clip.mp4", onRemove() {}, onRetry() {} };
  const loading = renderToStaticMarkup(React.createElement(InputAttachment, { ...props, state: "uploading" }));
  assert.match(loading, /aria-busy="true"/); assert.match(loading, /上传中/);
  const failed = renderToStaticMarkup(React.createElement(InputAttachment, { ...props, state: "failed", disabled: true }));
  assert.match(failed, /上传失败/); assert.match(failed, /重试上传/); assert.match(failed, /disabled=""/);
});
