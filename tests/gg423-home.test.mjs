import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { homeDemoEnabled } from "../features/home/home-feature-flag.mjs";
import sharp from "sharp";

test("GG-423 unfinished home sections require an explicit development opt-in", () => {
  assert.equal(homeDemoEnabled(true, "true"), true);
  for (const development of [true, false, undefined]) {
    for (const value of [undefined, "false", "1", "TRUE", ""]) assert.equal(homeDemoEnabled(development, value), false);
  }
  assert.equal(homeDemoEnabled(false, "true"), false, "production ignores even an explicit opt-in");
});

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => vite.close());
const { resolveHomeLayout } = await vite.ssrLoadModule("/features/home/home-layout.ts");
test("GG-423 responsive layout switches at the documented token boundaries", () => {
  for (const width of [390, 767]) assert.equal(resolveHomeLayout(width), "mobile");
  for (const width of [768, 1024, 1199]) assert.equal(resolveHomeLayout(width), "rail");
  for (const width of [1200, 1440]) assert.equal(resolveHomeLayout(width), "desktop");
});

test("GG-423 gallery metadata preserves the actual sample image proportions", async () => {
  const { HOME_DISCOVERY } = await vite.ssrLoadModule("/features/home/home-demo-data.ts");
  for (const item of HOME_DISCOVERY) {
    const metadata = await sharp(fileURLToPath(new URL(`../public${item.src}`, import.meta.url))).metadata();
    assert.equal(item.width, metadata.width, item.id);
    assert.equal(item.height, metadata.height, item.id);
  }
});
