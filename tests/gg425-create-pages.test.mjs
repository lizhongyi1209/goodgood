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
});
