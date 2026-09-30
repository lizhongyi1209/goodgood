import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
  SEEDREAM_MODEL_ID,
  SEEDREAM_PIXEL_SIZES,
  SEEDREAM_PROVIDER_MODEL_ID,
  getGenerationModelCapability,
  getSeedreamPixelSize,
  isExpectedGenerationOutputCount,
  isSupportedGenerationInput,
  normalizeGenerationModelOptions,
} from "../server/generation/capabilities.mjs";
import {
  createUsGatewayAdapter,
  getUsGatewayRoute,
  normalizeUsGatewayTask,
} from "../server/generation/us-gateway-adapter.mjs";
import { createGenerationProvider, generationProviderFallbackRoute, generationProviderRouteForModel } from "../server/generation/provider-router.mjs";
import { storeProviderOutputs } from "../server/generation/worker-service.mjs";

const seedreamJob = (overrides = {}) => ({
  model_id: SEEDREAM_MODEL_ID, requested_count: 1, aspect_ratio: "adaptive",
  resolution: "2K", prompt: "isolated Seedream contract fixture", reference_snapshot: [],
  provider_routing_policy: "canvas-image-v1", ...overrides,
});
const resultImage = (index, metadata = {}) => ({
  url: `https://provider.example.invalid/result-${index}.png`, mime_type: "image/png", ...metadata,
});
const success = (images) => ({ task_id: "fixture-task", status: "SUCCESS", data: { images } });
const normalizeSeedream = (payload, options = {}) => normalizeUsGatewayTask(payload, {
  productModelId: SEEDREAM_MODEL_ID, expectedOutputCount: 1, ...options,
});

test("Seedream returned layers retain one batch, sequential ordinals and decoded dimensions", async () => {
  const writes = [];
  let assetNumber = 0;
  const job = seedreamJob({ id: "fixture-job", batch_id: "fixture-batch", owner_id: "fixture-owner" });
  const outputs = Array.from({ length: 17 }, (_, index) => resultImage(index));
  const stored = await storeProviderOutputs({
    bucket: "test-only-no-storage", job, outputs, storage: {},
    createAssetId: () => `asset-${++assetNumber}`,
    downloadOutput: async () => ({ bytes: Buffer.from("test-only-image"), contentType: "image/png", width: 1408, height: 1780 }),
    store: async ({ key }) => { writes.push(key); },
  });
  assert.equal(writes.length, 17);
  assert.equal(stored.assets.length, 17);
  assert.deepEqual(stored.assets.map((asset) => asset.ordinal), Array.from({ length: 17 }, (_, index) => index + 1));
  assert.ok(stored.assets.every((asset) => asset.batchId === job.batch_id && asset.ownerId === job.owner_id && asset.pixelWidth === 1408 && asset.pixelHeight === 1780));
  let downloaded = false;
  await assert.rejects(storeProviderOutputs({
    bucket: "test-only-no-storage", job: { ...job, model_id: "nano-banana-2" }, outputs, storage: {},
    downloadOutput: async () => { downloaded = true; },
  }));
  assert.equal(downloaded, false);
});

test("a failed Seedream layer discards all staged output objects before completion", async () => {
  const writes = [];
  const discarded = [];
  await assert.rejects(storeProviderOutputs({
    bucket: "test-only-no-storage", storage: {},
    job: seedreamJob({ id: "fixture-job", batch_id: "fixture-batch", owner_id: "fixture-owner" }),
    outputs: [resultImage(0), resultImage(1)],
    downloadOutput: async () => ({ bytes: Buffer.from("test-only-image"), contentType: "image/png", width: 1024, height: 1024 }),
    store: async ({ key }) => { writes.push(key); if (writes.length === 2) throw new Error("fixture storage unavailable"); },
    discard: async ({ key }) => { discarded.push(key); },
  }), /fixture storage unavailable/);
  assert.deepEqual(discarded, writes);
});

test("Seedream capabilities contain only one requested image and documented 1K/2K ratios", () => {
  const capability = getGenerationModelCapability(SEEDREAM_MODEL_ID);
  assert.deepEqual(capability.resolutions, ["1K", "2K"]);
  assert.deepEqual(capability.outputCounts, [1]);
  assert.deepEqual(capability.aspectRatios, ["adaptive", "1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]);
  const input = { modelId: SEEDREAM_MODEL_ID, count: 1, aspectRatio: "adaptive", resolution: "2K" };
  assert.equal(isSupportedGenerationInput(input), true);
  for (const change of [{ count: 2 }, { resolution: "4K" }, { resolution: "1.5K" }, { aspectRatio: "1:8" }]) {
    assert.equal(isSupportedGenerationInput({ ...input, ...change }), false);
  }
  assert.deepEqual(normalizeGenerationModelOptions({ modelId: SEEDREAM_MODEL_ID }), {
    background: "auto", googleSearch: false, outputFormat: "png", quality: "auto", thinkingLevel: "low",
  });
  for (const change of [{ quality: "high" }, { background: "transparent" }, { outputFormat: "jpeg" }, { imageLine: "special" }]) {
    assert.equal(normalizeGenerationModelOptions({ modelId: SEEDREAM_MODEL_ID, ...change }), null);
  }
  for (const resolution of ["1K", "2K"]) {
    assert.equal(getSeedreamPixelSize("adaptive", resolution), resolution);
    for (const [ratio, sizes] of Object.entries(SEEDREAM_PIXEL_SIZES)) assert.equal(getSeedreamPixelSize(ratio, resolution), sizes[resolution]);
  }
  assert.equal(getSeedreamPixelSize("4:3", "2K"), "2368x1776");
  assert.equal(getSeedreamPixelSize("16:9", "1K"), "1424x800");
  assert.throws(() => getSeedreamPixelSize("adaptive", "4K"), /Unsupported/);
  assert.throws(() => getSeedreamPixelSize("4:5", "2K"), /Unsupported/);
});

test("Seedream route sends PNG and public URL strings without watermark or layer mode", async () => {
  const requests = [];
  const route = getUsGatewayRoute(SEEDREAM_MODEL_ID);
  assert.equal(route.providerModel, SEEDREAM_PROVIDER_MODEL_ID);
  assert.equal(generationProviderRouteForModel("o1key", SEEDREAM_MODEL_ID, undefined, seedreamJob()), route);
  assert.equal(generationProviderFallbackRoute("o1key", route, seedreamJob()), null);
  assert.equal(getUsGatewayRoute(SEEDREAM_MODEL_ID, "special"), null);
  const adapter = createUsGatewayAdapter({
    apiKey: "test-only-not-a-provider-key", baseUrl: "https://provider.example.invalid", route,
    fetchImplementation: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ task_id: "fixture-task", status: "SUBMITTED" }), { status: 200 });
    },
  });
  const uploadedReferences = [{ url: "https://uploads.example.invalid/reference.png", contentType: "image/png" }];
  await adapter.submitPrepared({ job: seedreamJob(), uploadedReferences });
  assert.deepEqual(requests[0], {
    model: SEEDREAM_PROVIDER_MODEL_ID, prompt: "isolated Seedream contract fixture",
    images: ["https://uploads.example.invalid/reference.png"], n: 1, size: "2K", output_format: "png",
  });
  await adapter.submitPrepared({ job: seedreamJob({ aspect_ratio: "9:16", resolution: "1K" }), uploadedReferences: [] });
  assert.equal(requests[1].size, "800x1424");
  for (const invalid of [{ requested_count: 2 }, { resolution: "4K" }, { output_format: "jpeg" }, { background: "transparent" }, { image_line: "special" }]) {
    await assert.rejects(adapter.submitPrepared({ job: seedreamJob(invalid), uploadedReferences }));
  }
  await assert.rejects(adapter.submitPrepared({ job: seedreamJob(), uploadedReferences: Array(11).fill(uploadedReferences[0]) }));
  await assert.rejects(adapter.submitPrepared({ job: seedreamJob(), uploadedReferences: [{ ...uploadedReferences[0], url: "http://127.0.0.1/private" }] }));
  assert.equal(requests.length, 2);
});

test("Seedream uncertain submission retains the existing no-automatic-resubmit policy", async () => {
  let submissions = 0;
  const route = getUsGatewayRoute(SEEDREAM_MODEL_ID);
  const adapter = createUsGatewayAdapter({
    apiKey: "test-only-not-a-provider-key", baseUrl: "https://provider.example.invalid", route,
    fetchImplementation: async () => { submissions += 1; throw new Error("transport lost after POST"); },
  });
  await assert.rejects(adapter.submitPrepared({ job: seedreamJob(), uploadedReferences: [] }), (error) => error.code === "SUBMISSION_UNKNOWN");
  assert.equal(submissions, 1);
  assert.equal(generationProviderFallbackRoute("o1key", route, seedreamJob()), null);
});

test("only Seedream permits one requested image to produce one through seventeen outputs", () => {
  for (const count of [1, 2, 17]) {
    const task = normalizeSeedream(success(Array.from({ length: count }, (_, index) => resultImage(index))));
    assert.equal(task.state, "succeeded");
    assert.equal(task.outputs.length, count);
    assert.equal(isExpectedGenerationOutputCount({ modelId: SEEDREAM_MODEL_ID, requestedCount: 1, actualCount: count }), true);
  }
  for (const count of [0, 18]) {
    assert.throws(() => normalizeSeedream(success(Array.from({ length: count }, (_, index) => resultImage(index)))));
  }
  assert.throws(() => normalizeSeedream(success([resultImage(0)]), { expectedOutputCount: 2 }));
  assert.throws(() => normalizeUsGatewayTask(success([resultImage(0), resultImage(1)]), { productModelId: "gpt-image-2", expectedOutputCount: 1 }));
  assert.equal(isExpectedGenerationOutputCount({ modelId: "gpt-image-2", requestedCount: 1, actualCount: 2 }), false);
  for (const actualCount of [0, 18, 1.5, "1", Number.NaN]) {
    assert.equal(isExpectedGenerationOutputCount({ modelId: SEEDREAM_MODEL_ID, requestedCount: 1, actualCount }), false);
  }
  assert.equal(isExpectedGenerationOutputCount({ modelId: SEEDREAM_MODEL_ID, requestedCount: 2, actualCount: 2 }), false);
});

test("Seedream layer ordering is stable and partial metadata preserves provider order", () => {
  const layers = [resultImage(2, { z_index: 2 }), resultImage(0, {
    z_index: 0, size: "2048x2048", output_format: "png", name: "base",
    bounding_box: { absolute: [0, 0, 2048, 2048], normalized: [0, 0, 1000, 1000] },
  }), resultImage(1, { z_index: 1 })];
  const task = normalizeSeedream(success(layers));
  assert.deepEqual(task.outputs.map((image) => image.url), [0, 1, 2].map((index) => resultImage(index).url));
  assert.deepEqual(task.outputs.map((image) => image.id), ["output-1", "output-2", "output-3"]);
  assert.equal(task.outputs[0].providerMetadata.zIndex, 0);
  assert.deepEqual(task.outputs[0].providerMetadata.boundingBox.normalized, [0, 0, 1000, 1000]);
  const partial = [resultImage(2, { z_index: 2 }), resultImage(0), resultImage(1, { z_index: 1 })];
  assert.deepEqual(normalizeSeedream(success(partial)).outputs.map((image) => image.url), partial.map((image) => image.url));
  const sameOrder = [resultImage(1, { z_index: 0 }), resultImage(2, { z_index: 0 })];
  assert.deepEqual(normalizeSeedream(success(sameOrder)).outputs.map((image) => image.url), sameOrder.map((image) => image.url));
});

test("Seedream retains empty loading and failure states and rejects malformed outputs", () => {
  for (const [status, state] of [["SUBMITTED", "queued"], ["IN_PROGRESS", "running"]]) {
    const task = normalizeSeedream({ task_id: "fixture-task", status, progress: "30%" });
    assert.equal(task.state, state);
    assert.deepEqual(task.outputs, []);
    assert.equal(task.terminal, false);
  }
  const failed = normalizeSeedream({ task_id: "fixture-task", status: "FAILURE", error: "upstream image generation failed" });
  assert.equal(failed.state, "failed");
  assert.deepEqual(failed.outputs, []);
  assert.equal(failed.failures.length, 1);
  for (const invalid of [resultImage(0, { url: "http://not-loopback.invalid/image.png" }), resultImage(0, { mime_type: "video/mp4" })]) {
    assert.throws(() => normalizeSeedream(success([invalid])));
  }
  assert.throws(() => normalizeSeedream({ task_id: "fixture-task", status: "FAILURE", data: { images: [resultImage(0)] } }));
});

test("Seedream stores a single task ID and recovers every returned layer without resubmission", async (context) => {
  let submissionCount = 0;
  const requests = [];
  const server = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.method === "POST" && request.url === "/async/v1/generateImage") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      requests.push(body);
      submissionCount += 1;
      response.end(JSON.stringify({ task_id: "fixture-task", status: "SUBMITTED" }));
      return;
    }
    if (request.method === "GET" && request.url === "/async/v1/tasks/fixture-task") {
      response.end(JSON.stringify(success(Array.from({ length: 17 }, (_, index) => ({
        ...resultImage(index), z_index: index,
      })))));
      return;
    }
    response.writeHead(404);
    response.end(JSON.stringify({ error: "not_found" }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const config = { provider: { kind: "mock", apiKey: "test-only-not-a-provider-key", allowInsecureLoopback: true,
    baseUrl: `http://127.0.0.1:${address.port}`, requestTimeoutMs: 1000, pollIntervalMs: 1, timeoutMs: 1000 },
    objectStorage: { bucket: "named-test-only" } };
  const job = seedreamJob();
  const route = generationProviderRouteForModel("mock", SEEDREAM_MODEL_ID, undefined, job);
  const provider = createGenerationProvider({ config, route, storage: {}, publicStorage: {} });
  const persistedTasks = [];
  const taskId = await provider.createTask({ job, onTaskCreated: async (id) => persistedTasks.push(id) });
  assert.equal(taskId, "fixture-task");
  assert.deepEqual(persistedTasks, ["fixture-task"]);
  assert.equal(provider.isTaskSubmissionComplete({ job, taskId }), true);
  assert.equal(await provider.createTask({ job, taskId }), "fixture-task");
  const outputs = await provider.pollTask({ job, expectedOutputCount: 1, onRefining: async () => {}, taskId });
  assert.equal(outputs.length, 17);
  assert.equal(submissionCount, 1);
  assert.equal(requests[0].n, 1);
  assert.equal(requests[0].layer_decomposition, undefined);
});
