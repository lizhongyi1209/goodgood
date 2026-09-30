import assert from "node:assert/strict";
import test from "node:test";
import { validateM3GenerationInput } from "../server/generation/api.mjs";
import { getGptImage2PixelSize, isSupportedGenerationInput, normalizeGenerationModelOptions } from "../server/generation/capabilities.mjs";
import { createUsGatewayAdapter, getCanvasImageRoute, getUsGatewayRoute } from "../server/generation/us-gateway-adapter.mjs";

const models = ["gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"];
const input = (modelId) => ({ modelId, aspectRatio: "adaptive", resolution: "2K", count: 1,
  routingPolicy: "canvas-image-v1", prompt: "isolated parameter fixture", references: [],
  quality: "auto", background: "auto", outputFormat: "jpeg" });

test("GPT adaptive is supported only for versioned canvas submission while legacy ratio choices stay fixed", () => {
  for (const modelId of models) {
    const draft = input(modelId);
    assert.equal(isSupportedGenerationInput(draft), true);
    assert.equal(isSupportedGenerationInput({ ...draft, routingPolicy: undefined }), false);
    assert.equal(validateM3GenerationInput(draft).aspectRatio, "adaptive");
    assert.throws(() => validateM3GenerationInput({ ...draft, routingPolicy: undefined }), /当前模型不支持/);
    assert.equal(getCanvasImageRoute(modelId, "2K").aspectRatios.includes("adaptive"), true);
    assert.equal(getUsGatewayRoute(modelId, "special").aspectRatios.includes("adaptive"), false);
  }
  for (const resolution of ["1K", "2K", "4K"]) assert.equal(getGptImage2PixelSize("adaptive", resolution), "auto");
  assert.equal(getGptImage2PixelSize("1:1", "2K"), "2048x2048");
  assert.throws(() => getGptImage2PixelSize("adaptive", "8K"), /Unsupported/);
});

test("adaptive GPT freezes provider auto size and auto quality, with transparent PNG only when enabled", async () => {
  for (const modelId of models) {
    const requests = [];
    const adapter = createUsGatewayAdapter({ apiKey: "test-only-not-a-provider-key", baseUrl: "https://provider.example.invalid",
      route: getCanvasImageRoute(modelId, "2K"), fetchImplementation: async (_url, options) => {
        requests.push(JSON.parse(options.body));
        return new Response(JSON.stringify({ task_id: `fixture-${requests.length}` }), { status: 200 });
      } });
    const job = { model_id: modelId, aspect_ratio: "adaptive", resolution: "2K", requested_count: 1,
      image_line: "special", provider_routing_policy: "canvas-image-v1", prompt: "isolated fixture",
      quality: "auto", background: "auto", output_format: "jpeg", reference_snapshot: [] };
    await adapter.submitPrepared({ job, uploadedReferences: [] });
    await adapter.submitPrepared({ job: { ...job, background: "transparent", output_format: "png" }, uploadedReferences: [] });
    assert.equal(requests[0].size, "auto");
    assert.equal(requests[0].quality, "auto");
    assert.equal(requests[0].background, "auto");
    assert.equal(requests[1].size, "auto");
    assert.equal(requests[1].quality, "auto");
    assert.equal(requests[1].background, "transparent");
    assert.equal(requests[1].output_format, "png");
    await assert.rejects(adapter.submitPrepared({ job: { ...job, background: "transparent" }, uploadedReferences: [] }));
    assert.equal(requests.length, 2);
  }
});

test("quality defaults remain auto and undocumented trans or GPT2 extra tiers fail before submission", () => {
  for (const modelId of models) {
    assert.equal(normalizeGenerationModelOptions({ modelId }).quality, "auto");
    assert.equal(normalizeGenerationModelOptions({ modelId, background: "trans" }), null);
    assert.equal(normalizeGenerationModelOptions({ modelId, background: "transparent", outputFormat: "png" }).background, "transparent");
  }
  for (const quality of ["xhigh", "max"]) {
    assert.equal(normalizeGenerationModelOptions({ modelId: "gpt-image-2", quality }), null);
    assert.equal(normalizeGenerationModelOptions({ modelId: "gpt-image-2.5-sunburst", quality }).quality, quality);
  }
});
