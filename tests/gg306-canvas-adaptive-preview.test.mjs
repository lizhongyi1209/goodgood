import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import sharp from "sharp";
import { sessionExpiredError } from "../server/auth/errors.mjs";
import { createAssetNodeApiHandler } from "../server/assets/node-api.mjs";
import { createReferenceNodeApiHandler } from "../server/references/node-api.mjs";
import { readPrivateImagePreview } from "../server/images/private-preview.mjs";
import { privateCanvasImageUrls } from "../shared/private-image-urls.mjs";

const storageFor = (original) => ({ send: async () => ({ ContentLength: original.length, Body: Readable.from([original]) }) });

test("canvas detail is bounded to 2048 while the normal preview remains 512", async () => {
  const original = await sharp({ create: { width: 4096, height: 2048, channels: 4, background: { r: 32, g: 32, b: 32, alpha: .4 } } }).png().toBuffer();
  const unchanged = Buffer.from(original);
  const options = { bucket: "disposable-test", key: "test.png", storage: storageFor(original) };
  const detail = await readPrivateImagePreview({ ...options, canvasPreview: true });
  const card = await readPrivateImagePreview(options);
  const [detailSize, cardSize] = await Promise.all([sharp(detail.bytes).metadata(), sharp(card.bytes).metadata()]);
  assert.deepEqual([detailSize.width, detailSize.height, detailSize.format], [2048, 1024, "webp"]);
  assert.deepEqual([cardSize.width, cardSize.height], [512, 256]);
  assert.equal(detailSize.hasAlpha, true);
  assert.deepEqual(original, unchanged);
});

test("small images are not enlarged in the detail preview", async () => {
  const original = await sharp({ create: { width: 320, height: 480, channels: 3, background: "white" } }).png().toBuffer();
  const preview = await readPrivateImagePreview({ bucket: "disposable-test", key: "small.png", storage: storageFor(original), canvasPreview: true });
  const metadata = await sharp(preview.bytes).metadata();
  assert.deepEqual([metadata.width, metadata.height], [320, 480]);
});

test("canvas URLs select a bounded derivative and reject unknown image kinds", () => {
  assert.deepEqual(privateCanvasImageUrls("asset", "a/b"), { previewUrl: "/api/assets/a%2Fb/preview", detailPreviewUrl: "/api/assets/a%2Fb/canvas-preview" });
  assert.deepEqual(privateCanvasImageUrls("reference", "r"), { previewUrl: "/api/references/r/preview", detailPreviewUrl: "/api/references/r/canvas-preview" });
  assert.throws(() => privateCanvasImageUrls("other", "r"), TypeError);
});

for (const [route, createHandler, operation] of [
  ["assets", createAssetNodeApiHandler, "readAssetPreview"],
  ["references", createReferenceNodeApiHandler, "readReferenceAssetPreview"],
]) {
  test(`${route} canvas detail uses authenticated ownership and never reads the original route`, async () => {
    const optionsSeen = [];
    const handler = createHandler({ authenticate: async (request) => {
      if (!request.headers.owner) throw sessionExpiredError();
      return { ownerId: request.headers.owner };
    }, operations: { [operation]: async (options) => {
      optionsSeen.push(options); return { bytes: Buffer.from("bounded-webp"), mimeType: "image/webp" };
    } } });
    const makeRequest = (owner) => Object.assign(Readable.from([]), { method: "GET", url: `/api/${route}/20000000-0000-4000-8000-000000000001/canvas-preview`, headers: { owner } });
    const makeResponse = () => ({ status: 0, writeHead(status) { this.status = status; }, end() {} });
    const allowed = makeResponse();
    await handler(makeRequest("owner-a"), allowed);
    assert.equal(allowed.status, 200);
    assert.equal(optionsSeen[0].ownerContext.ownerId, "owner-a");
    assert.equal(optionsSeen[0].canvasPreview, true);
    const anonymous = makeResponse();
    await handler(makeRequest(""), anonymous);
    assert.equal(anonymous.status, 401);
    assert.equal(optionsSeen.length, 1);
  });
}
