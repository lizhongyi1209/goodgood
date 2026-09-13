import assert from "node:assert/strict";
import test from "node:test";
import { BANANA_LINES, isBananaLineReady } from "../shared/contracts/banana-lines.mjs";
import { calculateModelQuote } from "../shared/contracts/model-pricing.mjs";
import { validateManagedModel, archiveManagedModel, readManagedModels, requireEnabledImageModel } from "../server/admin/models.mjs";
import { generationProviderRouteForModel } from "../server/generation/provider-router.mjs";
import { createUsGatewayAdapter, getUsGatewayRoute, US_GATEWAY_MVP_ROUTE } from "../server/generation/us-gateway-adapter.mjs";
import { validateM3GenerationInput } from "../server/generation/api.mjs";

const prices = (amount) => Object.fromEntries(["1K", "2K", "4K"].map((resolution) => [resolution, { output: amount }]));
const model = { id: "nano-banana-2", name: "Nano Banana 2", description: "", mediaType: "image", adapterId: "nano-banana-2", enabled: true, version: 2,
  prices: prices(20), lines: { special: { enabled: true, prices: prices(20) }, quality: { enabled: true, prices: prices(40) }, dedicated: { enabled: true, prices: prices(72) } } };

test("Banana 2 exact owner mappings preserve special route and all independent count quotes", () => {
  assert.equal(getUsGatewayRoute("nano-banana-2"), US_GATEWAY_MVP_ROUTE);
  assert.equal(US_GATEWAY_MVP_ROUTE.routeVersion, "o1key-gemini-3.1-flash-image-c-sp-v4");
  assert.deepEqual(validateManagedModel(model).lines, model.lines);
  for (const [imageLine, providerModel, amount] of [
    ["special", "gemini-3.1-flash-image-c-sp", 20],
    ["quality", "gemini-3.1-flash-image-c-sd", 40],
    ["dedicated", "gemini-3.1-flash-image", 72],
  ]) {
    assert.equal(isBananaLineReady(model.id, imageLine), true);
    assert.equal(generationProviderRouteForModel("o1key", model.id, imageLine).providerModel, providerModel);
    assert.ok(generationProviderRouteForModel("mock", model.id, imageLine));
    for (const count of [1, 2, 4]) {
      const input = { modelId: model.id, imageLine, aspectRatio: "1:1", resolution: "1K", count, prompt: "synthetic", references: [] };
      assert.equal(validateM3GenerationInput(input).imageLine ?? "special", imageLine);
      assert.equal(calculateModelQuote(model, input), amount * count);
    }
  }
  assert.equal(isBananaLineReady(model.id, "unknown"), false);
  assert.equal(isBananaLineReady("nano-banana-pro", "unknown"), false);
});

test("Banana 2 routes send high thinking, search, long prompt and five references across every ratio/resolution", async () => {
  const uploadedReferences = Array.from({ length: 5 }, (_, index) => ({ url: `https://references.goodgood.invalid/${index}`, contentType: "image/png" }));
  let sent = 0;
  for (const { id: imageLine } of BANANA_LINES) {
    const route = getUsGatewayRoute(model.id, imageLine);
    const adapter = createUsGatewayAdapter({ apiKey: "synthetic", baseUrl: "https://gateway.goodgood.invalid", route,
      fetchImplementation: async (_url, options) => {
        const payload = JSON.parse(options.body);
        assert.equal(payload.model, route.providerModel);
        assert.equal(payload.thinking_level, "high");
        assert.equal(payload.google_search, true);
        assert.equal(payload.prompt.length, 5000);
        assert.deepEqual(payload.images.map(({ fileData }) => fileData.fileUri), uploadedReferences.map(({ url }) => url));
        assert.equal(payload.n, undefined);
        sent++;
        return Response.json({ task_id: `synthetic-${sent}` });
      } });
    for (const aspectRatio of route.aspectRatios) for (const resolution of route.resolutions) {
      await adapter.submitPrepared({ job: { model_id: model.id, image_line: imageLine, requested_count: 1, aspect_ratio: aspectRatio,
        resolution, prompt: "x".repeat(5000), thinking_level: "high", google_search: true }, uploadedReferences });
    }
    const before = sent;
    await assert.rejects(adapter.submitPrepared({ job: { model_id: model.id, image_line: "unknown", requested_count: 1,
      aspect_ratio: "1:1", resolution: "1K", prompt: "synthetic" }, uploadedReferences }));
    assert.equal(sent, before);
  }
  assert.equal(sent, 126);
});

test("archive permissions and malformed input reject before opening persistence", async () => {
  const resources = { pool: { connect() { throw new Error("Persistence must not be opened"); } } };
  for (const ownerContext of [null, { ownerId: "synthetic", systemRole: "member" }])
    await assert.rejects(archiveManagedModel({ ownerContext, input: { id: "test-model", version: 1 }, resources }),
      (error) => ["SESSION_EXPIRED", "ADMIN_ACCESS_DENIED"].includes(error.code));
  for (const input of [null, { id: "test-model", version: null }, { id: "../test", version: 1 }])
    await assert.rejects(archiveManagedModel({ ownerContext: { ownerId: "synthetic", systemRole: "site_owner" }, input, resources }),
      (error) => error.code === "MODEL_REQUEST_INVALID");
});

test("archived rows disappear from both catalogs and reject stale generation without credit access", async () => {
  const archived = { ...model, adapter_id: model.adapterId, media_type: "image", enabled: false, archived_at: new Date(), updated_at: new Date() };
  for (const publicDirectory of [false, true]) {
    assert.deepEqual(await readManagedModels({ ownerContext: { ownerId: "synthetic", systemRole: "site_owner" }, publicDirectory,
      resources: { pool: { query: async () => ({ rows: [archived] }) } } }), { models: [] });
  }
  let queries = 0;
  await assert.rejects(requireEnabledImageModel({ query: async () => { queries++; return { rows: [archived] }; } },
    { modelId: model.adapterId, catalogModelId: model.id, imageLine: "quality", resolution: "1K" }), (error) => error.code === "MODEL_DISABLED");
  assert.equal(queries, 1);
});
