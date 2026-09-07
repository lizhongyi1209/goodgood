import assert from "node:assert/strict";
import test from "node:test";
import { NormalizedProviderError } from "../server/generation/provider.mjs";
import { storeProviderOutputs } from "../server/generation/worker-service.mjs";

function multiJob(count = 4) {
  return {
    aspect_ratio: "1:1",
    batch_id: "batch-1",
    id: "job-1",
    owner_id: "owner-1",
    requested_count: count,
  };
}

function decodedOutput(index) {
  return {
    bytes: Buffer.from(`image-${index}`),
    contentType: "image/png",
    height: 1024,
    width: 1024,
  };
}

test("worker stores every requested output with a stable positive ordinal", async () => {
  const stored = [];
  let nextAsset = 0;
  const result = await storeProviderOutputs({
    bucket: "private-assets",
    createAssetId: () => `asset-${++nextAsset}`,
    discard: async () => assert.fail("successful output must not be discarded"),
    downloadOutput: async (output) => decodedOutput(output.index),
    job: multiJob(),
    outputs: [1, 2, 3, 4].map((index) => ({ index })),
    storage: {},
    store: async (input) => stored.push(input),
  });

  assert.deepEqual(
    result.assets.map((asset) => [asset.id, asset.ordinal, asset.objectKey]),
    [
      ["asset-1", 1, "generated/owner-1/job-1-1.png"],
      ["asset-2", 2, "generated/owner-1/job-1-2.png"],
      ["asset-3", 3, "generated/owner-1/job-1-3.png"],
      ["asset-4", 4, "generated/owner-1/job-1-4.png"],
    ],
  );
  assert.deepEqual(stored.map((item) => item.key), result.objectKeys);
});

test("worker discards the whole staged batch when one output cannot be stored", async () => {
  const discarded = [];
  await assert.rejects(
    storeProviderOutputs({
      bucket: "private-assets",
      discard: async ({ key }) => discarded.push(key),
      downloadOutput: async (output) => decodedOutput(output.index),
      job: multiJob(),
      outputs: [1, 2, 3, 4].map((index) => ({ index })),
      storage: {},
      store: async ({ key }) => {
        if (key.endsWith("-3.png")) throw new Error("storage unavailable");
      },
    }),
    /storage unavailable/,
  );
  assert.deepEqual(discarded, [
    "generated/owner-1/job-1-1.png",
    "generated/owner-1/job-1-2.png",
    "generated/owner-1/job-1-3.png",
  ]);
});

test("worker rejects a short provider result before writing private objects", async () => {
  let stores = 0;
  await assert.rejects(
    storeProviderOutputs({
      bucket: "private-assets",
      downloadOutput: async () => decodedOutput(1),
      job: multiJob(4),
      outputs: [{ index: 1 }, { index: 2 }],
      storage: {},
      store: async () => {
        stores += 1;
      },
    }),
    (error) =>
      error instanceof NormalizedProviderError &&
      error.code === "INTERNAL_ERROR",
  );
  assert.equal(stores, 0);
});
