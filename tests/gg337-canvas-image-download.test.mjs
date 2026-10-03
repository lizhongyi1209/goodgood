import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

// Isolated synthetic files and injected reads only. Never fetch an application
// API, private signed URL or real provider while exercising this boundary.
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(async () => { await vite.close(); });

function harness({ clickFails = false, prepareFails = false } = {}) {
  const calls = [], scheduled = [];
  let savedBlob;
  const link = { href: "", download: "", style: {}, remove: () => calls.push("remove"),
    click: () => { calls.push("click"); if (clickFails) throw new Error("blocked"); } };
  return { calls, scheduled, link, get savedBlob() { return savedBlob; }, dependencies: {
    documentObject: { createElement: () => { if (prepareFails) throw new Error("unavailable"); return link; },
      body: { appendChild: () => calls.push("append") } },
    urlObject: { createObjectURL: (blob) => { savedBlob = blob; calls.push("url"); return "blob:download"; },
      revokeObjectURL: () => calls.push("revoke") },
    schedule: (callback, delayMs) => scheduled.push({ callback, delayMs }),
  } };
}

test("the original Blob and metadata bytes reach the download manager unchanged", async () => {
  const { saveImageBlobToLocal } = await vite.ssrLoadModule("/features/assets/image-download.ts");
  const bytes = new Uint8Array([255, 216, 255, 235, 0, 11, 99, 50, 112, 97, 0, 1, 2, 255, 217]);
  const original = new Blob([bytes], { type: "image/jpeg" }), h = harness();
  assert.equal(await saveImageBlobToLocal(original, "清理副本.jpg", h.dependencies), "started");
  assert.equal(h.savedBlob, original);
  assert.deepEqual(new Uint8Array(await h.savedBlob.arrayBuffer()), bytes);
  assert.equal(h.link.download, "清理副本.jpg");
  assert.deepEqual(h.calls, ["url", "append", "click", "remove"]);
  assert.equal(h.scheduled[0].delayMs, 60_000);
  h.scheduled[0].callback(); assert.equal(h.calls.at(-1), "revoke");
});

test("empty files and preparation/start failure do not leak a prepared URL", async () => {
  const { ImageDownloadError, saveImageBlobToLocal } = await vite.ssrLoadModule("/features/assets/image-download.ts");
  const empty = harness();
  await assert.rejects(saveImageBlobToLocal(new Blob([]), "empty.png", empty.dependencies), (error) => error instanceof ImageDownloadError && error.stage === "validate");
  assert.deepEqual(empty.calls, []);
  const preparing = harness({ prepareFails: true });
  await assert.rejects(saveImageBlobToLocal(new Blob(["bytes"]), "original.png", preparing.dependencies), (error) => error.stage === "prepare");
  assert.deepEqual(preparing.calls, []);
  const starting = harness({ clickFails: true });
  await assert.rejects(saveImageBlobToLocal(new Blob(["bytes"]), "original.png", starting.dependencies), (error) => error.stage === "start");
  assert.equal(starting.calls.at(-1), "remove");
  starting.scheduled[0].callback(); assert.equal(starting.calls.at(-1), "revoke");
});

test("file extension follows original MIME rather than a display preview or renamed alias", async () => {
  const { originalImageDownloadFilename } = await vite.ssrLoadModule("/features/assets/image-download.ts");
  assert.equal(originalImageDownloadFilename("GoodGood_preview.webp", "image/png"), "GoodGood_preview.png");
  assert.equal(originalImageDownloadFilename("清理副本", "image/jpeg"), "清理副本.jpg");
  assert.equal(originalImageDownloadFilename(" ../坏:name.PNG ", "image/jpeg; charset=binary"), ".._坏_name.jpg");
  assert.equal(originalImageDownloadFilename("", "image/webp"), "GoodGood图片.webp");
});

test("saved source images select content even when previews have not loaded", async () => {
  const { canvasImageDownloadForNode } = await vite.ssrLoadModule("/features/canvas/canvas-image-download.ts");
  const source = { id: "source", type: "sourceImage", data: { name: "original.jpg", assetId: "private-reference", previewUrl: "/api/references/private-reference/preview", imageSized: false } };
  const image = canvasImageDownloadForNode(source);
  assert.equal(image.key, "reference:private-reference");
  assert.equal(image.contentUrl, "/api/references/private-reference/content");
  const generated = canvasImageDownloadForNode({ ...source, data: { ...source.data, assetKind: "generated" } });
  assert.equal(generated.key, "asset:private-reference");
});

test("pending/failed cleaned copies keep local original bytes, never a remote preview fallback", async () => {
  const { canvasImageDownloadForNode } = await vite.ssrLoadModule("/features/canvas/canvas-image-download.ts");
  for (const uploadState of ["uploading", "failed"]) {
    const image = canvasImageDownloadForNode({ id: "clean-copy", type: "sourceImage", data: { name: "photo_无元数据.jpg", uploadState, previewUrl: "blob:clean-original" } });
    assert.equal(image.key, "local:clean-copy"); assert.equal(image.contentUrl, "blob:clean-original");
  }
  assert.equal(canvasImageDownloadForNode({ id: "missing", type: "sourceImage", data: { name: "image", uploadState: "failed", previewUrl: "/preview" } }), null);
});

test("asset downloads route by stable image identity without using asset preview/source URLs", async () => {
  const { canvasImageDownloadForAsset } = await vite.ssrLoadModule("/features/canvas/canvas-image-download.ts");
  const item = { id: "asset", name: "copy", kind: "generated", media: "image", previewUrl: "https://expired.invalid/thumbnail.webp", sourceUrl: "https://expired.invalid/old" };
  assert.equal(canvasImageDownloadForAsset(item).contentUrl, "/api/assets/asset/content");
  assert.equal(canvasImageDownloadForAsset({ ...item, kind: "reference" }).contentUrl, "/api/references/asset/content");
  for (const media of ["video", "audio", "text"]) assert.equal(canvasImageDownloadForAsset({ ...item, media }), null);
});

test("a generator without an explicit clicked output cannot download a different batch image", async () => {
  const { canvasImageDownloadForNode } = await vite.ssrLoadModule("/features/canvas/canvas-image-download.ts");
  assert.equal(canvasImageDownloadForNode({ id: "generator", type: "imageGenerator", data: {} }), null);
  assert.equal(canvasImageDownloadForNode({ id: "text", type: "textEditor", data: {} }), null);
});

test("expanded batches and independent result nodes download their own output", async () => {
  const { canvasImageDownloadForNode } = await vite.ssrLoadModule("/features/canvas/canvas-image-download.ts");
  const job = { id: "job", state: "succeeded", createdAt: "2026-10-03T08:00:00Z", outputs: [
    { id: "first", previewUrl: "/first.webp" }, { id: "second", previewUrl: "/second.webp" },
  ] };
  const generator = { id: "generator", type: "imageGenerator", data: { jobs: [job] } };
  assert.equal(canvasImageDownloadForNode(generator, "second").contentUrl, "/api/assets/second/content");
  assert.equal(canvasImageDownloadForNode(generator, "missing"), null);
  assert.equal(canvasImageDownloadForNode({ ...generator, data: { slots: [{ job, outputIndex: 1 }] } }, "second").imageId, "second");
  assert.equal(canvasImageDownloadForNode({ id: "result", type: "imageResult", data: { job, index: 1 } }).imageId, "second");
  assert.equal(canvasImageDownloadForNode({ ...generator, data: { jobs: [{ ...job, state: "failed" }] } }, "first"), null);
});

test("original reads use the authorized boundary; local reads are Blob-only and cancellable", async () => {
  const { readCanvasDownloadBlob } = await vite.ssrLoadModule("/features/canvas/canvas-image-download.ts");
  const original = new Blob(["original"], { type: "image/png" });
  const remote = { key: "asset:id", imageId: "id", contentUrl: "/api/assets/id/content", name: "copy" };
  const controller = new AbortController();
  const result = await readCanvasDownloadBlob(remote, controller.signal, {
    readOriginal: async (image, signal) => { assert.equal(image, remote); assert.equal(signal, controller.signal); return original; },
    fetchImplementation: async () => { throw new Error("must not use display URL"); },
  });
  assert.equal(result, original);
  const local = { ...remote, key: "local:id", contentUrl: "blob:original" };
  assert.equal(await readCanvasDownloadBlob(local, controller.signal, { fetchImplementation: async (url, options) => {
    assert.equal(url, "blob:original"); assert.equal(options.signal, controller.signal); return { ok: true, blob: async () => original };
  } }), original);
  await assert.rejects(readCanvasDownloadBlob({ ...local, contentUrl: "/preview" }, controller.signal), /本地原图/);
  await assert.rejects(readCanvasDownloadBlob(local, controller.signal, { fetchImplementation: async () => ({ ok: false }) }), /读取失败/);
  await assert.rejects(readCanvasDownloadBlob(local, controller.signal, { fetchImplementation: async () => ({ ok: true, blob: async () => new Blob([]) }) }), /内容为空/);
  await assert.rejects(readCanvasDownloadBlob(local, controller.signal, { fetchImplementation: async () => ({ ok: true, blob: async () => { controller.abort(); return original; } }) }), { name: "AbortError" });
});
