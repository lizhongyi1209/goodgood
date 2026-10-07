import assert from "node:assert/strict";
import test from "node:test";
import { isBananaLineReady, isValidImageLine } from "../shared/contracts/banana-lines.mjs";
import { calculateModelQuote, MODEL_TEMPLATES } from "../shared/contracts/model-pricing.mjs";
import { getGenerationModelCapability, normalizeGenerationModelOptions } from "../server/generation/capabilities.mjs";
import { createUsGatewayAdapter, getUsGatewayRoute } from "../server/generation/us-gateway-adapter.mjs";
import { generationProviderRouteForModel, generationProviderFallbackRoute } from "../server/generation/provider-router.mjs";
import { validateProjectSaveRequest } from "../server/projects/validation.mjs";

const modelId = "nano-banana-2.1";
const providerModel = "gemini-nano-banana-2.1-sp";
const job = (overrides = {}) => ({
  model_id: modelId, requested_count: 1, aspect_ratio: "adaptive",
  resolution: "2K", prompt: "synthetic contract fixture", reference_snapshot: [],
  provider_routing_policy: "canvas-image-v1", thinking_level: "high",
  google_search: false, quality: "auto", background: "auto", output_format: "png",
  ...overrides,
});

test("2.1 has a separate special route and cannot select invented channels", () => {
  const route = getUsGatewayRoute(modelId);
  assert.equal(route.providerModel, providerModel);
  assert.equal(route.productModelId, modelId);
  assert.equal(getUsGatewayRoute(modelId, "special"), route);
  assert.equal(generationProviderRouteForModel("o1key", modelId, undefined, job()), route);
  assert.equal(generationProviderFallbackRoute("o1key", route, job({ resolution: "4K" })), null);
  for (const line of ["quality", "dedicated", "unknown"]) {
    assert.equal(isValidImageLine(modelId, line), false);
    assert.equal(isBananaLineReady(modelId, line), false);
    assert.equal(getUsGatewayRoute(modelId, line), null);
    assert.equal(normalizeGenerationModelOptions({ modelId, imageLine: line }), null);
  }
  assert.equal(getUsGatewayRoute("nano-banana-2").providerModel, "gemini-3.1-flash-image-c-sp");
});

test("2.1 options, saved projects and independent prices retain the model identity", () => {
  assert.deepEqual(getGenerationModelCapability(modelId), getGenerationModelCapability("nano-banana-2"));
  assert.equal(normalizeGenerationModelOptions({ modelId }).thinkingLevel, "high");
  assert.equal(MODEL_TEMPLATES.find((item) => item.id === modelId).ready, true);
  const state = { prompt: "", references: [], modelId, aspectRatio: "1:1", resolution: "2K", count: 4 };
  const saved = validateProjectSaveRequest({ name: "fixture", state, batchIds: [] });
  assert.equal(saved.state.modelId, modelId);
  assert.equal(saved.state.thinkingLevel, "high");
  const model = { id: modelId, adapterId: modelId, mediaType: "image", prices: { "2K": { output: 27 } } };
  assert.equal(calculateModelQuote(model, { resolution: "2K", count: 4 }), 108);
  assert.equal(calculateModelQuote(model, { resolution: "4K" }), null);
});

test("2.1 submission uses the exact ID and existing URL-reference contract", async () => {
  const requests = [];
  const route = getUsGatewayRoute(modelId);
  const adapter = createUsGatewayAdapter({
    route, apiKey: "synthetic-not-a-provider-key", baseUrl: "https://provider.example.invalid",
    fetchImplementation: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return new Response(JSON.stringify({ task_id: "fixture-task", status: "SUBMITTED" }), { status: 200 });
    },
  });
  const uploadedReferences = [{ url: "https://uploads.example.invalid/reference.png", contentType: "image/png" }];
  await adapter.submitPrepared({ job: job(), uploadedReferences });
  assert.equal(new URL(requests[0].url).pathname, "/async/v1/generateImage");
  assert.deepEqual(requests[0].body, {
    images: [{ fileData: { fileUri: uploadedReferences[0].url, mimeType: "image/png" } }],
    model: providerModel, prompt: "synthetic contract fixture", response_modalities: ["TEXT", "IMAGE"],
    size: "2K", thinking_level: "high",
  });
  for (const invalid of [{ model_id: "nano-banana-2" }, { image_line: "quality" }, { requested_count: 13 }]) {
    await assert.rejects(adapter.submitPrepared({ job: job(invalid), uploadedReferences }));
  }
  assert.equal(requests.length, 1);
});

test("an uncertain 2.1 POST never automatically consumes another request", async () => {
  let calls = 0;
  const adapter = createUsGatewayAdapter({
    route: getUsGatewayRoute(modelId), apiKey: "synthetic-not-a-provider-key", baseUrl: "https://provider.example.invalid",
    fetchImplementation: async () => { calls += 1; throw new Error("fixture transport lost after POST"); },
  });
  await assert.rejects(adapter.submitPrepared({ job: job(), uploadedReferences: [] }),
    (error) => error.code === "SUBMISSION_UNKNOWN");
  assert.equal(calls, 1);
});
