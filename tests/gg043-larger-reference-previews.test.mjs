import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const result = await build({ entryPoints: ["features/creation/video-reference-preview-dialog.tsx"], bundle: true, platform: "node", format: "cjs", write: false, external: ["react", "react-dom", "react-dom/*", "radix-ui", "lucide-react"], logLevel: "silent" });
const compiled = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
const { VideoReferencePreviewStage } = compiled.exports;
const reference = { id: "synthetic", name: "预览测试", url: "blob:synthetic-preview", role: "reference_image", size: 0 };
const noOp = () => {};
const render = (mediaType, state = "ready") => renderToStaticMarkup(React.createElement(VideoReferencePreviewStage, { reference: { ...reference, mediaType }, state, onReady: noOp, onError: noOp, onRetry: noOp }));

test("GG-043 shares larger square thumbnails without changing tray overflow or labels", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /--reference-preview-width: 96px;\s*--reference-preview-height: 96px;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*--reference-preview-width: 80px; --reference-preview-height: 80px;/);
  assert.match(css, /\.reference-thumbnail, \.reference-add-more \{[^}]*width: var\(--reference-preview-width\); height: var\(--reference-preview-height\);/);
  assert.match(css, /\.reference-thumbnails \{[^}]*overflow-x: auto;/);
  assert.match(css, /\.video-reference-preview-stage > img, \.video-reference-preview-stage > video \{[^}]*object-fit: contain;/);
});

test("GG-043 video mode previews direct images and controlled video/audio without autoplay", () => {
  const image = render("image");
  assert.match(image, /<img[^>]*src="blob:synthetic-preview"/);
  assert.doesNotMatch(image, /_vinext\/image|data-nimg|srcset=/);
  for (const mediaType of ["video", "audio"]) {
    const html = render(mediaType);
    assert.match(html, new RegExp(`<${mediaType}[^>]*controls=""[^>]*preload="metadata"`));
    assert.doesNotMatch(html, /autoplay|autoPlay/);
  }
});

test("GG-043 inspection has local loading, failure and retry without replacing references", async () => {
  for (const mediaType of ["image", "video", "audio"]) {
    assert.match(render(mediaType, "loading"), /aria-busy="true"[\s\S]*role="status"[\s\S]*正在加载预览/);
    assert.match(render(mediaType, "failed"), /role="alert"[\s\S]*素材已保留[\s\S]*重新加载/);
    assert.doesNotMatch(render(mediaType), /正在加载预览|加载失败|重新加载/);
  }
  const source = await read("features/creation/video-reference-preview-dialog.tsx");
  assert.match(source, /onLoad=\{onReady\} onError=\{onError\}/);
  assert.match(source, /onLoadedMetadata=\{onReady\} onError=\{onError\}/);
  assert.match(source, /key=\{attempt\}/);
  assert.match(source, /setState\("loading"\); setAttempt/);
  assert.doesNotMatch(source, /fetch\(|onGenerate|onCreate|onRemoveReference|onSave|createObjectURL|revokeObjectURL/);
});

test("GG-043 preserves image editor and adds isolated click/keyboard/close/focus in video mode", async () => {
  const image = await read("features/creation/creation-composer.tsx");
  const video = await read("features/creation/video-creation-composer.tsx");
  const dialog = await read("features/creation/video-reference-preview-dialog.tsx");
  assert.match(image, /previewReference\?\.status === "ready"[\s\S]*<ReferenceQuickEditor/);
  assert.match(video, /<button\s+type="button"\s+className="video-reference-preview-trigger"[\s\S]*aria-haspopup="dialog"/);
  assert.match(video, /useRef<HTMLButtonElement \| null>/);
  assert.match(video, /event.stopPropagation\(\); onRemoveReference\(reference\)/);
  assert.match(video, /onReturnFocus=\{\(\) => previewTriggerRef.current\?\.focus\(\)\}/);
  assert.match(dialog, /<Dialog open onOpenChange=/);
  assert.match(dialog, /onCloseAutoFocus=[\s\S]*onReturnFocus\(\)/);
  assert.match(dialog, /aria-label="关闭素材预览"/);
});
