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

after(async () => {
  await vite.close();
});

const { ProjectLibrary } = await vite.ssrLoadModule(
  "/features/projects/project-library.tsx",
);
const noop = () => {};
const baseProps = {
  projects: [],
  canvasProjects: [],
  ownerKey: "project-card-test-owner",
  workspaceId: null,
  loading: false,
  error: null,
  restoringId: null,
  busyProjectId: null,
  onRetry: noop,
  onRestore: noop,
  onProjectUpdated: noop,
  onProjectDeleted: noop,
  onCanvasUpdated: noop,
  onCanvasDeleted: noop,
};
const canvasProject = {
  id: "canvas-one",
  name: "画布一",
  version: 1,
  updatedAt: "2026-10-01T00:00:00.000Z",
};
const creativeProject = {
  id: "creative-one",
  name: "创作一",
  state: {
    prompt: "",
    references: [],
    modelId: "nano-banana-2",
    aspectRatio: "1:1",
    resolution: "1K",
    count: 1,
  },
  batches: [],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

function renderProjects(props = {}) {
  return renderToStaticMarkup(
    React.createElement(ProjectLibrary, { ...baseProps, ...props }),
  );
}

function assertCreateCardFirst(html) {
  const cards = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];
  const createLinks = html.match(/<a\b[^>]*href="\/canvas"[^>]*>/g) ?? [];
  assert.equal(createLinks.length, 1);
  assert.match(createLinks[0], /aria-label="新建项目"/);
  assert.doesNotMatch(createLinks[0], /aria-disabled="true"|tabindex="-1"/);
  assert.ok(cards[0]?.includes(createLinks[0]), "the first card opens a new canvas");
  assert.match(cards[0], /<h2>新建项目<\/h2>/);
  const header = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0];
  assert.ok(header);
  assert.doesNotMatch(header, /<button\b/);
  return cards;
}

test("new-project card precedes existing canvas and creative projects", () => {
  const html = renderProjects({
    canvasProjects: [canvasProject],
    projects: [creativeProject],
  });
  const cards = assertCreateCardFirst(html);
  assert.equal(cards.length, 3);
  assert.match(cards[1], /href="\/canvas\/canvas-one"/);
  assert.match(cards[1], /aria-label="管理项目 画布一"/);
  assert.match(cards[2], /aria-label="打开项目 创作一"/);
  assert.match(cards[2], /aria-label="管理项目 创作一"/);
  assert.doesNotMatch(html, /还没有保存的项目|role="alert"/);
});

test("empty project list keeps its new-canvas entry and accurate empty state", () => {
  const html = renderProjects();
  assert.equal(assertCreateCardFirst(html).length, 1);
  assert.match(html, /还没有保存的项目/);
  assert.doesNotMatch(html, /正在读取项目|role="alert"/);
});

test("loading project list keeps new-canvas navigation without showing stale cards", () => {
  const html = renderProjects({ loading: true, canvasProjects: [canvasProject] });
  assert.equal(assertCreateCardFirst(html).length, 1);
  assert.match(html, /role="status"[^>]*>[\s\S]*?正在读取项目/);
  assert.doesNotMatch(html, /还没有保存的项目|打开画布项目 画布一/);
});

test("project read failure keeps new-canvas navigation, existing cards and retry", () => {
  for (const canvasProjects of [[], [canvasProject]]) {
    const html = renderProjects({ error: "项目暂时无法读取", canvasProjects });
    assert.equal(assertCreateCardFirst(html).length, 1 + canvasProjects.length);
    const alert = html.match(/<div\b[^>]*role="alert"[^>]*>[\s\S]*?<\/div>/)?.[0];
    assert.ok(alert);
    assert.match(alert, /项目暂时无法读取/);
    assert.match(alert, /<button\b[^>]*>[\s\S]*?重试<\/button>/);
    assert.doesNotMatch(html, /还没有保存的项目|正在读取项目/);
  }
});
