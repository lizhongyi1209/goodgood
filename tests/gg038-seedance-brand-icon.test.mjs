import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GG-038 shares a stable compact Doubao mark across Seedance model surfaces", async () => {
  const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");
  const [icon, composer, page, css] = await Promise.all([
    read("features/models/seedance-model-icon.tsx"),
    read("features/creation/video-creation-composer.tsx"),
    read("features/creation/video-preview-detail.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(icon, /mask: 'url\("\/model-icons\/doubao\.svg"\) center \/ contain no-repeat'/);
  assert.match(icon, /WebkitMask: 'url\("\/model-icons\/doubao\.svg"\) center \/ contain no-repeat'/);
  assert.match(icon, /size = 16/);
  assert.equal(composer.match(/<SeedanceModelIcon \/>/g)?.length, 2);
  assert.match(page, /<SeedanceModelIcon \/>/);
  assert.doesNotMatch(composer + page, /model-icon seedance.*<Film/);
  assert.match(composer, /<Film size=\{15\} \/>创建素材/);
  assert.match(css, /\.model-icon.seedance \{ background: transparent; \}/);
});
