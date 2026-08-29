import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

test("declares the GoodGood visual and interaction invariants", async () => {
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  const creationPage = await readFile(path.join(root, "app/page.tsx"), "utf8");

  assert.match(css, /--accent:\s*#b52b30/);
  assert.match(css, /--control-md:\s*40px/);
  assert.match(css, /\.prompt-row textarea\.has-overflow[^}]*scrollbar-width:\s*thin/s);
  assert.match(css, /\.creation-masonry-frame[^}]*border-radius:\s*15px/s);
  assert.match(css, /\.creation-masonry[^}]*gap:\s*3px/s);
  assert.match(css, /\.generation-error-strip[^}]*min-height:\s*72px/s);
  assert.match(css, /mask:\s*url\("\/feihong-send\.png"\)/);
  assert.match(creationPage, /className="generation-task-frame"/);
  assert.match(creationPage, /renderCreationColumns\(generationItems, 4, "task"\)/);
  assert.match(creationPage, /renderCreationColumns\(creationItems, 4, "history"\)/);
  assert.match(creationPage, /onClick=\{retryFailedGeneration\}/);
  assert.match(creationPage, /onClick=\{restoreFailedGenerationSettings\}/);
  assert.doesNotMatch(creationPage, /className="generation-error-panel/);
});

test("keeps generation retries isolated from later composer edits", async () => {
  const {
    createGenerationInputSnapshot,
    restoreGenerationInputSnapshot,
  } = await vite.ssrLoadModule(
    "/features/creation/generation-snapshot.ts",
  );
  const originalReference = {
    id: "reference-1",
    url: "blob:reference-1",
    name: "服装.jpg",
  };
  const draft = {
    prompt: "  保留服装结构  ",
    references: [originalReference],
    modelId: "nano-banana-2",
    ratioIndex: 5,
    resolution: "2K",
    count: 4,
  };

  const snapshot = createGenerationInputSnapshot(draft);
  draft.prompt = "后续草稿";
  originalReference.name = "已修改.jpg";
  draft.references.length = 0;

  assert.equal(snapshot.prompt, "保留服装结构");
  assert.equal(snapshot.references.length, 1);
  assert.equal(snapshot.references[0].name, "服装.jpg");
  assert.equal(snapshot.count, 4);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.references));
  assert.ok(Object.isFrozen(snapshot.references[0]));

  const restored = restoreGenerationInputSnapshot(snapshot);
  assert.deepEqual(restored.references, [
    { id: "reference-1", url: "blob:reference-1", name: "服装.jpg" },
  ]);
  assert.notEqual(restored.references, snapshot.references);
  assert.notEqual(restored.references[0], snapshot.references[0]);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});
