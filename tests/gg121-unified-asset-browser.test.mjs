import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root, "next/image": `${root}node_modules/vinext/dist/shims/image.js` } },
  server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { AssetWorkspace, filterAssetFiles } = await vite.ssrLoadModule("/features/assets/asset-workspace.tsx");

const files = [
  { id: "g", kind: "generated", media: "image", name: "生成的海报" },
  { id: "r", kind: "reference", media: "image", name: "人物参考" },
  { id: "v", kind: "video", media: "video", name: "访谈视频" },
  { id: "a", kind: "audio", media: "audio", name: "音乐素材" },
];
const arrangements = new Map([
  ["reference:r", { folderId: "folder-1", tags: ["海报"] }],
  ["video:v", { folderId: "folder-1", tags: [] }],
]);

test("GG-121 filters a single asset collection by media, source, folder and tags", () => {
  const ids = (folder, query, media, source) => filterAssetFiles(files, arrangements, folder, query, media, source).map((item) => item.id);
  assert.deepEqual(ids(null, "", "all", "all"), ["g", "r", "v", "a"]);
  assert.deepEqual(ids(null, "", "image", "generated"), ["g"]);
  assert.deepEqual(ids(null, "", "image", "uploaded"), ["r"]);
  assert.deepEqual(ids("folder-1", "", "all", "all"), ["r", "v"]);
  assert.deepEqual(ids("folder-1", " 海报 ", "all", "uploaded"), ["r"]);
  assert.deepEqual(ids("folder-1", "", "audio", "all"), []);
});

test("GG-121 header exposes text media filters and source/view icon names while loading or failing", () => {
  const noop = () => {};
  const props = { workspaceId: null, enabled: true, generated: [], references: [], videos: [], audios: [],
    historyLoading: true, libraryLoading: false, historyError: null, libraryError: null,
    onRetry: noop, onRefresh: async () => {}, onDeleteGenerated: async () => {}, onOpenGenerated: noop,
    onUseReference: noop, onUseVideo: noop, onUseAudio: noop };
  const loading = renderToStaticMarkup(React.createElement(AssetWorkspace, props));
  assert.match(loading, /<h1>资产<\/h1>/);
  assert.match(loading, /全部[\s\S]*图片[\s\S]*视频[\s\S]*音频/);
  assert.match(loading, /aria-label="已上传"[\s\S]*aria-label="已生成"/);
  assert.match(loading, /aria-label="网格视图"[\s\S]*aria-label="列表视图"/);
  assert.match(loading, /正在读取资产/);
  assert.doesNotMatch(loading, /生成历史|个人资产库/);
  const failure = renderToStaticMarkup(React.createElement(AssetWorkspace, { ...props, historyLoading: false,
    historyError: "读取失败" }));
  assert.match(failure, /role="alert"[\s\S]*读取失败[\s\S]*重试/);
});
