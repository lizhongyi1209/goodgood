import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import * as nodeModule from "node:module";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

// Node's native type stripping loads only this HTTP boundary; no Vite/build,
// database, provider, browser or storage connection is involved.
let readCanvasCropImageBlob;
if (typeof nodeModule.registerHooks === "function" && process.features.typescript) {
const aliases = nodeModule.registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const url = new URL(`../${specifier.slice(2)}`, import.meta.url);
      for (const suffix of ["", ".ts", ".mjs"]) {
        const candidate = new URL(url.href + suffix);
        if (existsSync(candidate)) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
({ readCanvasCropImageBlob } = await import("../features/canvas/canvas-image-crop-image.ts"));
aliases.deregister();
} else {
  // Keep the suite runnable on the project's older supported Node versions.
  const { createServer } = await import("vite");
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({ appType: "custom", configFile: false, root,
    resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
  after(() => vite.close());
  ({ readCanvasCropImageBlob } = await vite.ssrLoadModule("/features/canvas/canvas-image-crop-image.ts"));
}

const assetId = "11111111-1111-4111-8111-111111111111";
const asset = { imageId: assetId, key: `asset:${assetId}`, contentUrl: `/api/assets/${assetId}/content` };
const reference = { imageId: assetId, key: `reference:${assetId}`, contentUrl: `/api/references/${assetId}/content` };
const signedUrl = "https://storage.example.test/original.png?signature=temporary";
const imageResponse = () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } });
const urlResponse = () => Response.json({ url: signedUrl });

test("generated original resolves its authorized URL before fetching bytes directly", async (t) => {
  const signal = new AbortController().signal;
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    if (url === asset.contentUrl) throw new TypeError("Failed to fetch redirected original");
    return requests.length === 1 ? urlResponse() : imageResponse();
  });
  const blob = await readCanvasCropImageBlob(asset, signal);
  assert.equal(blob.size, 4);
  assert.equal(blob.type, "image/png");
  assert.deepEqual(requests.map(({ url }) => url), [`/api/assets/${assetId}/download-url`, signedUrl]);
  assert.equal(requests[0].options.cache, "no-store");
  assert.equal(requests[0].options.signal, signal);
  assert.equal(requests[1].options.credentials, "omit");
  assert.equal(requests[1].options.mode, "cors");
  assert.equal(requests[1].options.signal, signal);
});

test("uploaded originals remain on the owner-checked same-origin content route", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => { requests.push({ url, options }); return imageResponse(); });
  assert.equal((await readCanvasCropImageBlob(reference, new AbortController().signal)).size, 4);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, reference.contentUrl);
  assert.equal(requests[0].options.credentials, "same-origin");
});

test("authorization failure stops before a storage request", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: "未找到这张图片。" } }, { status: 404 }));
  await assert.rejects(readCanvasCropImageBlob(asset, new AbortController().signal), /未找到这张图片/);
  assert.equal(mock.mock.callCount(), 1);
});

test("cancel during signature resolution never starts the image request", async (t) => {
  const controller = new AbortController();
  const reason = new DOMException("Cancelled", "AbortError");
  const mock = t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.signal, controller.signal);
    controller.abort(reason);
    return urlResponse();
  });
  await assert.rejects(readCanvasCropImageBlob(asset, controller.signal), (cause) => cause === reason);
  assert.equal(mock.mock.callCount(), 1);
});

test("already cancelled sessions send no requests", async (t) => {
  const controller = new AbortController();
  controller.abort();
  const mock = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not fetch"); });
  await assert.rejects(readCanvasCropImageBlob(asset, controller.signal), { name: "AbortError" });
  assert.equal(mock.mock.callCount(), 0);
});

test("storage network failure becomes a readable crop error", async (t) => {
  const networkError = new TypeError("Failed to fetch");
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url === signedUrl) throw networkError;
    return urlResponse();
  });
  await assert.rejects(readCanvasCropImageBlob(asset, new AbortController().signal),
    (cause) => cause.message === "原图连接失败，请重试。" && cause.cause === networkError);
});

test("empty content and failed original responses never become crop images", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response(""));
  await assert.rejects(readCanvasCropImageBlob(reference, new AbortController().signal), /原图内容为空/);
  mock.mock.mockImplementation(async () => new Response("unavailable", { status: 503 }));
  await assert.rejects(readCanvasCropImageBlob(reference, new AbortController().signal), /原图读取失败/);
});
