import assert from "node:assert/strict";
import test, { after } from "node:test";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const vite = await createServer({ configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => vite.close());

test("GG-425 shared shell keeps the approved responsive boundaries", async () => {
  const { resolveWorkspaceLayout } = await vite.ssrLoadModule("/features/workspace-shell/workspace-layout.ts");
  assert.equal(resolveWorkspaceLayout(390), "mobile");
  assert.equal(resolveWorkspaceLayout(1024), "rail");
  assert.equal(resolveWorkspaceLayout(1440), "desktop");
});

test("GG-425 image settings follow the design field order and keep price in the action", async () => {
  const source = await readFile(new URL("../features/create/image-create-page.tsx", import.meta.url), "utf8");
  const labels = ["模型", "参考图", "提示词", "画面比例", "分辨率", "数量", "质量"];
  let cursor = -1;
  for (const label of labels) {
    const next = source.indexOf(`label=\"${label}\"`, cursor + 1) >= 0 ? source.indexOf(`label=\"${label}\"`, cursor + 1) : source.indexOf(`>${label}<`, cursor + 1);
    assert.ok(next > cursor, `${label} should follow the previous field`);
    cursor = next;
  }
  assert.match(source, /className=\{styles\.generateButton\}[\s\S]*props\.billingLabel/);
});

test("GG-425 create page styling only uses design-system colors", async () => {
  const css = await readFile(new URL("../features/create/create-page.module.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /#[\da-f]{3,8}\b|rgba?\(/i);
  const tokens = await readFile(new URL("../app/design-tokens.css", import.meta.url), "utf8");
  const defined = new Set([...tokens.matchAll(/(--ds-[\w-]+):/g)].map((match) => match[1]));
  for (const match of css.matchAll(/var\((--ds-[\w-]+)/g)) assert.ok(defined.has(match[1]), match[1]);
  assert.doesNotMatch(css, /\.mediaTile[^}]*aspect-ratio:\s*1/);
  assert.match(css, /\.viewer \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--ds-control-field\) var\(--ds-panel-width\)/);
  assert.match(css, /\.failedTile p[^}]*overflow-wrap:\s*anywhere/);
});

test("GG-425 video settings expose only the currently submit-capable mode", async () => {
  const source = await readFile(new URL("../features/create/video-create-page.tsx", import.meta.url), "utf8");
  for (const label of ["模型", "提示词", "画面比例", "分辨率", "时长", "生成音频"]) assert.match(source, new RegExp(label));
  assert.doesNotMatch(source, />生成方式<|>素材</);
  assert.doesNotMatch(source, />视频编辑<|>视频延长</);
  assert.match(source, /SwitchPrimitive\.Root/);
  assert.doesNotMatch(source, /接口可用|暂不可用<\/strong>/);
});

test("GG-425 preserves image reference intake and makes video text-only", async () => {
  const image = await readFile(new URL("../features/create/image-create-page.tsx", import.meta.url), "utf8");
  const video = await readFile(new URL("../features/create/video-create-page.tsx", import.meta.url), "utf8");
  const home = await readFile(new URL("../features/home/home-composer.tsx", import.meta.url), "utf8");
  assert.match(image, /useComposerFileDrop\(props\.onDropFiles\)/);
  assert.match(image, /onPaste=\{handlePaste\}/);
  assert.match(image, /onReorderReference\(sourceId, reference\.id\)/);
  assert.match(image, /<ReferenceQuickEditor/);
  assert.doesNotMatch(video, /useComposerFileDrop|AddReferenceMenu|VideoReferencePreviewDialog/);
  assert.match(home, /视频暂只支持文字描述/);
  assert.match(home, /videoTextOnly/);
  assert.match(image, /aria-label=\{`\$\{label\}：\$\{value\}`\}/);
  assert.match(video, /aria-label=\{`\$\{label\}：\$\{value\}`\}/);
});

test("GG-425 correction follows panel, action, menu, and viewer specifications", async () => {
  const [image, video, css, systemCss, shell] = await Promise.all([
    readFile(new URL("../features/create/image-create-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/create/video-create-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/create/create-page.module.css", import.meta.url), "utf8"),
    readFile(new URL("../features/design-system/design-system.module.css", import.meta.url), "utf8"),
    readFile(new URL("../features/workspace-shell/workspace-shell.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(css, /\.selectTrigger[^}]*height:\s*var\(--ds-control-field\)[^}]*border:\s*0[^}]*background:\s*var\(--ds-soft\)/s);
  assert.match(css, /\.field textarea[^}]*resize:\s*none[^}]*background:\s*var\(--ds-soft\)/s);
  assert.match(css, /\.generateButton[^}]*border-radius:\s*var\(--ds-radius-pill\)/s);
  assert.match(image, /<span>生成<\/span><span className=\{styles\.generatePrice\}>/);
  assert.match(video, /<span>生成<\/span><\/button>/);
  assert.match(image, /showCloseButton=\{false\}/);
  assert.match(video, /showCloseButton=\{false\}/);
  assert.match(image, />做同款<\/button>/);
  assert.match(video, />做同款<\/button>/);
  assert.match(shell, /!creationArea \|\| layout !== "desktop"/);
  assert.match(systemCss, /\.navItem\[aria-current\][^}]*background:\s*var\(--ds-fill-active\)/s);
  assert.match(css, /\.viewerStage[^}]*background:\s*var\(--ds-white\)/s);
});

test("GG-425 media tiles preserve result aspect ratios and image detail keeps wheel navigation", async () => {
  const image = await readFile(new URL("../features/create/image-create-page.tsx", import.meta.url), "utf8");
  const video = await readFile(new URL("../features/create/video-create-page.tsx", import.meta.url), "utf8");
  assert.match(image, /style=\{\{ aspectRatio \}\}/);
  assert.match(image, /onWheel=\{handleWheel\}/);
  assert.match(video, /run\.outputRatio \?\?/);
  assert.match(video, /style=\{\{ aspectRatio \}\}/);
});
