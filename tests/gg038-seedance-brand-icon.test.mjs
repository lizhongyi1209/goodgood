import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GG-038 shares a stable ByteDance mark across Seedance model surfaces", async () => {
  const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");
  const [icon, composer, page, css, svg, sourceSvg] = await Promise.all([
    read("features/models/seedance-model-icon.tsx"),
    read("features/creation/video-creation-composer.tsx"),
    read("features/creation/video-preview-detail.tsx"),
    read("app/globals.css"),
    read("public/model-icons/bytedance-color.svg"),
    read("node_modules/@lobehub/icons-static-svg/icons/bytedance-color.svg"),
  ]);
  assert.match(icon, /src="\/model-icons\/bytedance-color.svg"/);
  assert.match(icon, /alt="" width=\{26\} height=\{26\}/);
  assert.equal(composer.match(/<SeedanceModelIcon \/>/g)?.length, 2);
  assert.match(page, /<SeedanceModelIcon \/>/);
  assert.doesNotMatch(composer + page, /model-icon seedance.*<Film/);
  assert.match(composer, /<Film size=\{15\} \/>创建素材/);
  assert.match(css, /\.model-icon.seedance \{ background: transparent; \}/);
  assert.match(svg, /<title>ByteDance<\/title>/);
  assert.equal(svg, sourceSvg);
});
