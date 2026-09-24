import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { sessionExpiredError } from "../server/auth/errors.mjs";
import { createAssetNodeApiHandler } from "../server/assets/node-api.mjs";
import { presentGenerationJob } from "../server/generation/presenter.mjs";
import { addCloudCardPreviewProcessing, CARD_PREVIEW_PROCESS, readCardPreview, signCloudCardPreview } from "../server/generation/storage.mjs";
import { createReferenceNodeApiHandler } from "../server/references/node-api.mjs";

function request(url, owner = "owner-a") {
  const value = Readable.from([]);
  value.url = url;
  value.method = "GET";
  value.headers = { "x-owner": owner };
  return value;
}

function response() {
  return {
    headers: {},
    statusCode: 0,
    body: null,
    writeHead(status, headers) { this.statusCode = status; this.headers = headers; },
    end(body) { this.body = body; },
  };
}

test("legacy private images are streamed into bounded WebP cards", async () => {
  const original = await sharp({
    create: { width: 1600, height: 2400, channels: 3, background: "#dc9145" },
  }).jpeg({ quality: 95 }).toBuffer();
  const card = await readCardPreview({
    bucket: "private-local", key: "references/original.jpg",
    storage: { send: async () => ({ ContentLength: original.length, Body: Readable.from([original]) }) },
  });
  const metadata = await sharp(card.bytes).metadata();
  assert.equal(card.mimeType, "image/webp");
  assert.deepEqual([metadata.width, metadata.height, metadata.format], [341, 512, "webp"]);
  assert.ok(card.bytes.length < original.length);
});

test("private OSS card processing is signed, while the original URL remains separate", async () => {
  const options = {
    credentials: { accessKeyId: "test-id", secretAccessKey: "test-secret" },
    endpoint: "https://upload-dev.example.cn", bucketEndpoint: true,
    forcePathStyle: false, region: "cn-guangzhou",
  };
  const normal = new S3Client(options);
  const processed = new S3Client(options);
  addCloudCardPreviewProcessing(processed);
  try {
    const signed = new URL(await signCloudCardPreview({
      key: "local-dev/references/a/original.jpg",
      publicStorage: {
        cloudReferenceClient: normal,
        cloudReferencePreviewClient: processed,
        cloudReferenceBucketEndpoint: "https://upload-dev.example.cn",
      },
    }));
    assert.equal(signed.searchParams.get("x-oss-process"), CARD_PREVIEW_PROCESS);
    assert.ok(signed.searchParams.has("X-Amz-Signature"));
    assert.equal(signed.pathname, "/local-dev/references/a/original.jpg");
  } finally { normal.destroy(); processed.destroy(); }
});

test("a generation listing exposes only stable owner-checked image URLs", async () => {
  const job = await presentGenerationJob(null, {
    id: "job-a", assets: [{ id: "asset-a" }],
    reference_snapshot: [{ id: "reference-a", name: "reference" }],
    prompt: "test", model_id: "nano-banana-2", aspect_ratio: "1:1",
    resolution: "1K", requested_count: 1, state: "succeeded",
    submitted_at: new Date(0), updated_at: new Date(0),
  });
  assert.equal(job.outputs[0].previewUrl, "/api/assets/asset-a/preview");
  assert.equal(job.outputs[0].detailUrl, "/api/assets/asset-a/content");
  assert.equal(job.input.references[0].url, "/api/references/reference-a/content");
  assert.ok(!JSON.stringify(job).includes("X-Amz-Signature"));
});

test("preview routes require an owner and return only transformed bytes or a signed redirect", async () => {
  const authenticate = async (req) => {
    if (!req.headers["x-owner"]) throw sessionExpiredError();
    return { ownerId: req.headers["x-owner"] };
  };
  const asset = createAssetNodeApiHandler({
    authenticate,
    operations: {
      async getAssetDownloadUrl({ ownerContext }) {
        assert.equal(ownerContext.ownerId, "owner-a");
        return { url: "https://storage.invalid/original.png?signed=1" };
      },
      async readAssetPreview({ ownerContext }) {
        assert.equal(ownerContext.ownerId, "owner-a");
        return { bytes: Buffer.from("webp"), mimeType: "image/webp" };
      },
    },
  });
  const assetResponse = response();
  await asset(request("/api/assets/20000000-0000-4000-8000-000000000001/preview"), assetResponse);
  assert.equal(assetResponse.statusCode, 200);
  assert.equal(assetResponse.headers["content-type"], "image/webp");
  assert.deepEqual(assetResponse.body, Buffer.from("webp"));
  const assetOriginal = response();
  await asset(request("/api/assets/20000000-0000-4000-8000-000000000001/content"), assetOriginal);
  assert.equal(assetOriginal.statusCode, 302);
  assert.equal(assetOriginal.headers.location, "https://storage.invalid/original.png?signed=1");
  const anonymousAsset = response();
  await asset(request("/api/assets/20000000-0000-4000-8000-000000000001/preview", ""), anonymousAsset);
  assert.equal(anonymousAsset.statusCode, 401);

  const reference = createReferenceNodeApiHandler({
    authenticate,
    operations: {
      async readReferenceAssetPreview({ ownerContext }) {
        assert.equal(ownerContext.ownerId, "owner-a");
        return { redirectUrl: "https://upload-dev.example.cn/processed?signed=1" };
      },
    },
  });
  const referenceResponse = response();
  await reference(request("/api/references/20000000-0000-4000-8000-000000000001/preview"), referenceResponse);
  assert.equal(referenceResponse.statusCode, 302);
  assert.equal(referenceResponse.headers.location, "https://upload-dev.example.cn/processed?signed=1");
  const anonymousReference = response();
  await reference(request("/api/references/20000000-0000-4000-8000-000000000001/preview", ""), anonymousReference);
  assert.equal(anonymousReference.statusCode, 401);
});
