import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("GG-042 keeps shared drawer out of result flow and raises only open composer", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /\.composer \{[^}]*position: sticky;[^}]*z-index: 24;[^}]*overflow: visible;/);
  assert.match(css, /\.composer\.drawer-open \{[^}]*z-index: 25;/);
  assert.match(css, /\.parameter-drawer \{[^}]*position: absolute;[^}]*top: 100%;[^}]*left: -1px;[^}]*right: -1px;[^}]*visibility: hidden;[^}]*pointer-events: none;[^}]*background: var\(--white\)/);
  assert.match(css, /\.drawer-open \.parameter-drawer \{[^}]*visibility: visible;[^}]*pointer-events: auto;/);
  assert.match(css, /\.drawer-overflow \{[^}]*min-height: 0;[^}]*max-height: var\(--parameter-drawer-max-height,/);
  assert.match(css, /\.drawer-open \.drawer-overflow \{[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;/);
});

test("GG-042 image and video share viewport binding and inert closed settings", async () => {
  for (const file of ["creation-composer.tsx", "video-creation-composer.tsx"]) {
    const source = await read(`features/creation/${file}`);
    assert.match(source, /useParameterDrawerViewport\(drawerOpen\)/);
    assert.match(source, /<section\s+ref=\{composerRef\}/);
    assert.match(source, /className="parameter-drawer" aria-hidden=\{!drawerOpen\} inert=\{!drawerOpen\}/);
  }
  const hook = await read("features/creation/use-parameter-drawer-viewport.ts");
  assert.match(hook, /if \(!open \|\| !composer\) return/);
  assert.match(hook, /observer\.observe\(composer\)/);
  assert.match(hook, /observer\.disconnect\(\)/);
  for (const event of ["resize", "scroll"]) {
    assert.match(hook, new RegExp(`addEventListener\\("${event}", updateHeight`));
    assert.match(hook, new RegExp(`removeEventListener\\("${event}", updateHeight`));
  }
});

test("GG-042 viewport limit follows composer growth, narrow screens and scrolling", async () => {
  const result = await build({ entryPoints: ["features/creation/use-parameter-drawer-viewport.ts"], bundle: true, platform: "node", format: "cjs", write: false, external: ["react"], logLevel: "silent" });
  const compiled = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
  const height = compiled.exports.parameterDrawerViewportHeight;
  assert.equal(height(900, 120), 768);
  assert.equal(height(844, 180), 652);
  assert.equal(height(844, 320), 512);
  assert.equal(height(844, 250), 582);
  assert.equal(height(300, 320), 0);
});
