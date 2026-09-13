import assert from "node:assert/strict";
import test from "node:test";
import { BANANA_LINES, supportsImageLines, isBananaModel, modelBananaLines } from "../shared/contracts/banana-lines.mjs";
import { calculateModelQuote } from "../shared/contracts/model-pricing.mjs";
import { validateManagedModel, requireEnabledImageModel } from "../server/admin/models.mjs";
import { validateM3GenerationInput } from "../server/generation/api.mjs";
import { hashGenerationInput, persistedGenerationInputFromRow } from "../server/generation/repository.mjs";
import { generationProviderRouteForModel } from "../server/generation/provider-router.mjs";
import { getUsGatewayRoute, createUsGatewayAdapter } from "../server/generation/us-gateway-adapter.mjs";
import { validateDraftMutation } from "../server/drafts/validation.mjs";
import { validateProjectSaveRequest } from "../server/projects/validation.mjs";

const models = ["gpt-image-2", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare"];
const prices = amount => Object.fromEntries(["1K", "2K", "4K"].map(resolution => [resolution, { output: amount }]));
const lines = () => ({ special: { enabled: true, prices: prices(20) }, quality: { enabled: true, prices: prices(40) }, dedicated: { enabled: true, prices: prices(90) } });
const input = (modelId, imageLine) => ({ modelId, ...(imageLine ? { imageLine } : {}), prompt: "synthetic GPT line fixture", references: [], aspectRatio: "1:1", resolution: "1K", count: 1 });

test("GG-062 maps nine exact GPT routes and retains immutable legacy no-line routes", () => {
  for (const modelId of models) {
    assert.equal(supportsImageLines(modelId), true);
    assert.equal(isBananaModel(modelId), false);
    const legacy = getUsGatewayRoute(modelId);
    assert.equal(legacy.providerModel, modelId);
    assert.equal(legacy.imageLine, undefined);
    for (const [line, suffix] of [["special", "-sp"], ["quality", "-sd"], ["dedicated", ""]]) {
      const route = generationProviderRouteForModel("o1key", modelId, line);
      assert.equal(route.providerModel, modelId + suffix);
      assert.equal(route.imageLine, line);
      assert.equal(generationProviderRouteForModel("mock", modelId, line).imageLine, line);
      assert.notEqual(route, legacy);
    }
    assert.equal(getUsGatewayRoute(modelId, "arbitrary"), null);
    assert.equal(getUsGatewayRoute(modelId), legacy);
  }
});

test("GG-062 defaults retain input hashes while all lines independently quote and restore", () => {
  for (const modelId of models) {
    const model = { id: modelId, adapterId: modelId, name: "GPT", description: "", version: 1, enabled: true, mediaType: "image", prices: prices(20), lines: lines() };
    assert.equal(hashGenerationInput(input(modelId)), hashGenerationInput(input(modelId, "special")));
    assert.equal(new Set(BANANA_LINES.map(({ id }) => hashGenerationInput(input(modelId, id)))).size, 3);
    assert.deepEqual(modelBananaLines({ adapterId: modelId, prices: prices(20) }), { special: { enabled: true, prices: prices(20) }, quality: { enabled: false, prices: {} }, dedicated: { enabled: false, prices: {} } });
    assert.deepEqual(validateManagedModel(model).lines, model.lines);
    for (const { id } of BANANA_LINES) {
      const state = input(modelId, id);
      assert.equal(validateM3GenerationInput(state).imageLine ?? "special", id);
      assert.equal(calculateModelQuote(model, { resolution: "4K", count: 4, imageLine: id }), model.lines[id].prices["4K"].output * 4);
      assert.equal(validateDraftMutation({ state, expectedVersion: null }).state.imageLine ?? "special", id);
      assert.equal(validateProjectSaveRequest({ state, name: "GPT line", batchIds: ["10000000-0000-4000-8000-000000000001"], idempotencyKey: "gg062-project" }).state.imageLine ?? "special", id);
      assert.equal(persistedGenerationInputFromRow({ model_id: modelId, image_line: id, aspect_ratio: "1:1", resolution: "1K", requested_count: 1, prompt: state.prompt }).imageLine ?? "special", id);
    }
  }
});

test("GG-062 disabled and unpriced GPT lines fail before credit operations", async () => {
  for (const modelId of models) {
    const row = { adapter_id: modelId, media_type: "image", enabled: true, prices: prices(20), lines: lines() };
    const client = { async query(sql) { assert.match(sql, /FROM managed_models/); return { rows: [row] }; } };
    assert.equal(await requireEnabledImageModel(client, input(modelId, "quality")), row);
    row.lines.quality.enabled = false;
    await assert.rejects(requireEnabledImageModel(client, input(modelId, "quality")), error => error.code === "MODEL_DISABLED");
    row.lines.quality.enabled = true;
    row.lines.quality.prices = {};
    await assert.rejects(requireEnabledImageModel(client, input(modelId, "quality")), error => error.code === "MODEL_DISABLED");
    assert.throws(() => validateManagedModel({ id: modelId, adapterId: modelId, name: "GPT", description: "", enabled: true, version: 1, prices: prices(20), lines: row.lines }), error => error.code === "MODEL_REQUEST_INVALID");
  }
});

test("GG-062 every GPT line preserves size, n, quality, format, long prompt and five references; wrong routes never POST", async () => {
  let requests = 0;
  for (const modelId of models) for (const { id } of BANANA_LINES) {
    const route = getUsGatewayRoute(modelId, id);
    const adapter = createUsGatewayAdapter({ apiKey: "synthetic-key", baseUrl: "https://gateway.goodgood.invalid", route,
      fetchImplementation: async (_url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.model, route.providerModel);
        assert.ok([1, 2, 4].includes(body.n));
        assert.equal(body.quality, "high");
        assert.equal(body.background, "transparent");
        assert.equal(body.output_format, "png");
        assert.equal(body.images.length, 5);
        assert.equal(body.prompt.length, 5000);
        assert.match(body.size, /^\d+x\d+$/);
        assert.equal(body.thinking_level, undefined);
        requests++;
        return new Response(JSON.stringify({ task_id: `synthetic-${requests}` }), { status: 200 });
      } });
    for (const aspect_ratio of route.aspectRatios) for (const resolution of route.resolutions) for (const requested_count of route.outputCounts) {
      const job = { model_id: modelId, image_line: id, aspect_ratio, resolution, requested_count, prompt: "x".repeat(5000), quality: "high", background: "transparent", output_format: "png" };
      await adapter.submitPrepared({ job, uploadedReferences: Array.from({ length: 5 }, () => ({ url: "https://objects.goodgood.invalid/ref.png", contentType: "image/png" })) });
      const before = requests;
      await assert.rejects(adapter.submitPrepared({ job: { ...job, image_line: "wrong" }, uploadedReferences: [] }));
      assert.equal(requests, before);
    }
  }
  assert.equal(requests, 567);
});
