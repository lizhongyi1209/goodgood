import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  prepareProviderReference,
  providerReferenceByteBudget,
  PROVIDER_REFERENCE_LIMITS,
} from "../server/generation/reference-inputs.mjs";
import { createUsGatewayAdapter } from "../server/generation/us-gateway-adapter.mjs";

test("small validated references pass through and ten references share a bounded budget", async () => {
  const original = await sharp({
    create: { width: 256, height: 256, channels: 3, background: "#876543" },
  }).png().toBuffer();
  const reference = { bytes: original, mimeType: "image/png", name: "sample.png" };
  assert.equal(await prepareProviderReference(reference, providerReferenceByteBudget(1)), reference);
  assert.equal(providerReferenceByteBudget(1), 10_000_000);
  assert.equal(providerReferenceByteBudget(10), 3_200_000);
  assert.equal(providerReferenceByteBudget(10) * 10, PROVIDER_REFERENCE_LIMITS.maxBytesPerRequest);
});

test("large reference becomes a model-sized WebP while retaining the original bytes", async () => {
  const pixels = Buffer.alloc(2_000 * 2_000 * 3);
  let seed = 123456789;
  for (let index = 0; index < pixels.length; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    pixels[index] = seed & 255;
  }
  const original = await sharp(pixels, {
    raw: { width: 2_000, height: 2_000, channels: 3 },
  }).png({ compressionLevel: 0 }).toBuffer();
  assert.ok(original.length > 10_000_000);
  const prepared = await prepareProviderReference(
    { bytes: original, mimeType: "image/png", name: "large.png" },
    providerReferenceByteBudget(10),
  );
  assert.equal(prepared.mimeType, "image/webp");
  assert.ok(prepared.bytes.length <= providerReferenceByteBudget(10));
  assert.ok(original.length > 10_000_000);
  const metadata = await sharp(prepared.bytes).metadata();
  assert.ok(metadata.width <= 2_000 && metadata.height <= 2_000);
  assert.ok(metadata.width >= 1_280 && metadata.height >= 1_280);
});

test("oversized transparent input is resized without losing alpha", async () => {
  const original = await sharp({
    create: { width: 5_000, height: 1_000, channels: 4, background: { r: 40, g: 90, b: 180, alpha: 0.35 } },
  }).png().toBuffer();
  const prepared = await prepareProviderReference(
    { bytes: original, mimeType: "image/png", name: "transparent.png" },
    providerReferenceByteBudget(1),
  );
  const metadata = await sharp(prepared.bytes).metadata();
  assert.equal(prepared.mimeType, "image/webp");
  assert.ok(metadata.hasAlpha);
  assert.ok(Math.max(metadata.width, metadata.height) <= PROVIDER_REFERENCE_LIMITS.maxEdge);
  assert.ok(metadata.width * metadata.height <= PROVIDER_REFERENCE_LIMITS.maxPixels);
});

test("invalid references fail before the paid provider submission", async () => {
  await assert.rejects(
    prepareProviderReference({ bytes: Buffer.from("bad"), mimeType: "image/png", name: "bad.png" }, providerReferenceByteBudget(1)),
    (error) => error.code === "REFERENCE_INPUT_INVALID" && error.retryable === false,
  );
  assert.throws(() => providerReferenceByteBudget(11), (error) => error.code === "REFERENCE_INPUT_INVALID");
});

test("gateway refuses a reference above ten megabytes before sending it", async () => {
  let requests = 0;
  const adapter = createUsGatewayAdapter({
    apiKey: "synthetic-key",
    baseUrl: "https://gateway.goodgood.invalid",
    fetchImplementation: async () => { requests += 1; throw new Error("Unexpected network request"); },
  });
  await assert.rejects(adapter.uploadReference({
    bytes: Buffer.alloc(PROVIDER_REFERENCE_LIMITS.maxBytesPerImage + 1),
    mimeType: "image/png",
    name: "too-large.png",
  }));
  assert.equal(requests, 0);
});
