import assert from "node:assert/strict";
import test from "node:test";
import {
  BANANA_LINES,
  imagePriceContext,
  modelBananaLines,
} from "../shared/contracts/banana-lines.mjs";
import { calculateModelQuote } from "../shared/contracts/model-pricing.mjs";
import {
  validateManagedModel,
  requireEnabledImageModel,
  saveManagedModel,
} from "../server/admin/models.mjs";
import { validateM3GenerationInput } from "../server/generation/api.mjs";
import {
  hashGenerationInput,
  generationInputFromRow,
  persistedGenerationInputFromRow,
} from "../server/generation/repository.mjs";
import { generationProviderRouteForModel } from "../server/generation/provider-router.mjs";
import {
  createUsGatewayAdapter,
  getUsGatewayRoute,
  US_GATEWAY_MVP_ROUTE,
} from "../server/generation/us-gateway-adapter.mjs";
import { readBillingSummary } from "../server/billing/api.mjs";
import { validateDraftMutation } from "../server/drafts/validation.mjs";
import { validateProjectSaveRequest } from "../server/projects/validation.mjs";
import { createComposerCheckpoint } from "../features/projects/unsaved-changes.mjs";

const prices = (amount) =>
  Object.fromEntries(
    ["1K", "2K", "4K"].map((key) => [key, { output: amount }]),
  );
const lines = () => ({
  special: { enabled: true, prices: prices(30) },
  quality: { enabled: true, prices: prices(42) },
  dedicated: { enabled: true, prices: prices(95) },
});
const model = (changes = {}) => ({
  id: "banana-line-lab",
  name: "Banana",
  description: "",
  adapterId: "nano-banana-pro",
  enabled: true,
  prices: prices(30),
  lines: lines(),
  version: 1,
  ...changes,
});
const row = (changes = {}) => ({
  id: "banana-line-lab",
  name: "Banana",
  description: "",
  media_type: "image",
  adapter_id: "nano-banana-pro",
  enabled: true,
  prices: prices(30),
  lines: lines(),
  version: 1,
  updated_at: "2026-09-13T00:00:00Z",
  ...changes,
});
const input = (changes = {}) => ({
  prompt: "synthetic banana line test",
  references: [],
  modelId: "nano-banana-pro",
  catalogModelId: "banana-line-lab",
  aspectRatio: "1:1",
  resolution: "1K",
  count: 1,
  ...changes,
});

test("Banana lines have stable product IDs, exact Pro mappings and a preserved legacy default", () => {
  assert.deepEqual(
    BANANA_LINES.map(({ name }) => name),
    ["特价", "优质", "专线"],
  );
  for (const [line, providerModel] of [
    ["special", "gemini-3-pro-image-c-sp"],
    ["quality", "gemini-3-pro-image-c-sd"],
    ["dedicated", "gemini-3-pro-image"],
  ]) {
    assert.equal(
      generationProviderRouteForModel("o1key", "nano-banana-pro", line)
        .providerModel,
      providerModel,
    );
    assert.equal(
      generationProviderRouteForModel("mock", "nano-banana-pro", line)
        .imageLine,
      line,
    );
  }
  assert.equal(getUsGatewayRoute("nano-banana-2"), US_GATEWAY_MVP_ROUTE);
  assert.equal(imagePriceContext(), "standard");
  assert.equal(imagePriceContext("special"), "standard");
  assert.equal(imagePriceContext("quality"), "banana-quality");
  assert.equal(imagePriceContext("dedicated"), "banana-dedicated");
  assert.equal(getUsGatewayRoute("nano-banana-pro", "arbitrary"), null);
  assert.equal(getUsGatewayRoute("gpt-image-2", "quality"), null);
  assert.equal(getUsGatewayRoute("nano-banana-2", "quality"), null);
});

test("line selection changes the input hash; omitted and explicit special preserve legacy idempotency", () => {
  assert.equal(
    hashGenerationInput(input()),
    hashGenerationInput(input({ imageLine: "special" })),
  );
  const hashes = BANANA_LINES.map(({ id }) =>
    hashGenerationInput(input({ imageLine: id })),
  );
  assert.equal(new Set(hashes).size, 3);
  for (const { id } of BANANA_LINES)
    assert.equal(
      validateM3GenerationInput(input({ imageLine: id })).imageLine ??
        "special",
      id,
    );
  for (const changes of [
    { imageLine: "arbitrary" },
    { imageLine: null },
    { modelId: "gpt-image-2", imageLine: "quality" },
    { count: 2 },
  ])
    assert.throws(() => validateM3GenerationInput(input(changes)));
});

test("three independent specification prices never inherit the special discount", () => {
  for (const [line, amount] of [
    ["special", 30],
    ["quality", 42],
    ["dedicated", 95],
  ])
    assert.equal(
      calculateModelQuote(
        { ...model(), mediaType: "image" },
        { resolution: "4K", imageLine: line },
      ),
      amount,
    );
  const empty = model({
    lines: { ...lines(), dedicated: { enabled: false, prices: {} } },
  });
  assert.equal(
    calculateModelQuote(
      { ...empty, mediaType: "image" },
      { resolution: "4K", imageLine: "dedicated" },
    ),
    null,
  );
  assert.equal(
    modelBananaLines({ adapterId: "nano-banana-2", prices: prices(21) }).special
      .prices["1K"].output,
    21,
  );
  assert.deepEqual(
    modelBananaLines({ adapterId: "nano-banana-2", prices: prices(21) }).quality
      .prices,
    {},
  );
});

test("enabled lines require complete prices, valid IDs and a confirmed provider mapping", () => {
  assert.equal(
    validateManagedModel(model()).lines.dedicated.prices["4K"].output,
    95,
  );
  for (const value of [
    model({
      lines: {
        ...lines(),
        quality: { enabled: true, prices: { "1K": { output: 42 } } },
      },
    }),
    model({
      lines: { ...lines(), dedicated: { enabled: true, prices: prices(0) } },
    }),
    model({
      lines: { ...lines(), arbitrary: { enabled: true, prices: prices(1) } },
    }),
    model({
      lines: Object.fromEntries(
        BANANA_LINES.map(({ id }) => [
          id,
          { enabled: false, prices: prices(1) },
        ]),
      ),
    }),
    model({ adapterId: "nano-banana-2" }),
  ])
    assert.throws(
      () => validateManagedModel(value),
      (error) => error.code === "MODEL_REQUEST_INVALID",
    );
  assert.equal(
    validateManagedModel(
      model({
        enabled: false,
        lines: { ...lines(), dedicated: { enabled: false, prices: {} } },
      }),
    ).enabled,
    false,
  );
});

test("line disable, missing price and adapter tampering reject new generation without touching credit", async () => {
  for (const value of [
    row({ enabled: false }),
    row({
      lines: { ...lines(), quality: { enabled: false, prices: prices(42) } },
    }),
    row({ lines: { ...lines(), quality: { enabled: true, prices: {} } } }),
    row({ adapter_id: "gpt-image-2" }),
  ]) {
    let queries = 0;
    await assert.rejects(
      requireEnabledImageModel(
        {
          async query() {
            queries++;
            return { rows: [value] };
          },
        },
        input({ imageLine: "quality" }),
      ),
      (error) => error.code === "MODEL_DISABLED",
    );
    assert.equal(queries, 1);
  }
  assert.equal(
    (
      await requireEnabledImageModel(
        {
          async query() {
            return { rows: [row()] };
          },
        },
        input({ imageLine: "dedicated" }),
      )
    ).id,
    "banana-line-lab",
  );
});

test("editing quality publishes only quality price versions and keeps special/dedicated intact", async () => {
  const calls = [],
    previous = row();
  const next = model({
    lines: { ...lines(), quality: { enabled: true, prices: prices(55) } },
  });
  await saveManagedModel({
    ownerContext: { ownerId: "synthetic-owner", systemRole: "site_owner" },
    input: next,
    resources: {
      pool: {
        async connect() {
          return {
            async query(sql, values) {
              calls.push({ sql, values });
              if (sql.startsWith("SELECT * FROM managed_models"))
                return { rows: [previous] };
              if (sql.startsWith("INSERT INTO managed_models"))
                return { rows: [row({ lines: next.lines, version: 2 })] };
              return { rows: [] };
            },
            release() {},
          };
        },
      },
    },
  });
  const published = calls.filter(({ sql }) =>
    sql.includes("INSERT INTO price_versions"),
  );
  assert.equal(published.length, 3);
  assert.ok(
    published.every(
      ({ values }) => values[5] === "55" && values[6] === "banana-quality",
    ),
  );
  assert.equal(
    calls.filter(({ sql }) => sql.includes("INSERT INTO managed_model_events"))
      .length,
    1,
  );
  assert.equal(calls.at(-1).sql, "COMMIT");
});

test("billing exposes enabled line scopes and omits disabled or removed specifications", async () => {
  const contexts = [],
    managed = row({
      lines: {
        ...lines(),
        dedicated: { enabled: false, prices: prices(95) },
        quality: { enabled: true, prices: { "1K": { output: 42 } } },
      },
    });
  const summary = await readBillingSummary({
    ownerContext: { ownerId: "synthetic-owner" },
    resources: {
      pool: {
        async query(sql, values) {
          if (sql.includes("FROM managed_models")) return { rows: [managed] };
          if (sql.includes("FROM credit_accounts"))
            return {
              rowCount: 1,
              rows: [
                {
                  id: "account",
                  owner_id: "synthetic-owner",
                  status: "active",
                  unit: "credit-cny-cent",
                  available_balance: "200",
                  reserved_balance: "0",
                  version: "1",
                },
              ],
            };
          if (sql.includes("FROM price_versions")) {
            contexts.push(values[3]);
            return {
              rowCount: 1,
              rows: [
                {
                  id: "price",
                  model_id: managed.id,
                  resolution: values[1],
                  output_count: 1,
                  plan_context: values[3],
                  version: 1,
                  credit_unit: "credit-cny-cent",
                  credit_amount: values[3] === "standard" ? "30" : "42",
                  effective_from: managed.updated_at,
                },
              ],
            };
          }
          throw new Error("Unexpected persistence call");
        },
      },
    },
  });
  assert.deepEqual([...new Set(contexts)], ["standard", "banana-quality"]);
  assert.deepEqual(
    summary.quotes.map((quote) => [
      quote.imageLine ?? "special",
      quote.resolution,
      quote.creditAmount,
    ]),
    [
      ["special", "1K", "30"],
      ["special", "2K", "30"],
      ["special", "4K", "30"],
      ["quality", "1K", "42"],
    ],
  );
});

test("every Pro line sends its exact model ID across supported ratios/resolutions; mismatched line fails before POST", async () => {
  const requests = [];
  for (const { id } of BANANA_LINES) {
    const route = getUsGatewayRoute("nano-banana-pro", id);
    const adapter = createUsGatewayAdapter({
      apiKey: "synthetic-key",
      baseUrl: "https://gateway.goodgood.invalid",
      route,
      fetchImplementation: async (url, options) => {
        requests.push({ url, body: JSON.parse(options.body) });
        return new Response(
          JSON.stringify({ task_id: `synthetic-${requests.length}` }),
          { status: 200 },
        );
      },
    });
    for (const aspectRatio of route.aspectRatios)
      for (const resolution of route.resolutions) {
        await adapter.submitPrepared({
          job: {
            model_id: "nano-banana-pro",
            image_line: id,
            prompt: "synthetic",
            aspect_ratio: aspectRatio,
            resolution,
            requested_count: 1,
            thinking_level: "low",
          },
          uploadedReferences: [],
        });
        const body = requests.at(-1).body;
        assert.equal(body.model, route.providerModel);
        assert.equal(body.aspect_ratio, aspectRatio);
        assert.equal(body.size, resolution);
        assert.deepEqual(body.response_modalities, ["TEXT", "IMAGE"]);
        assert.equal(body.n, undefined);
        assert.equal(body.quality, undefined);
      }
    const before = requests.length;
    await assert.rejects(
      adapter.submitPrepared({
        job: {
          model_id: "nano-banana-pro",
          image_line: id === "special" ? "quality" : "special",
          prompt: "synthetic",
          aspect_ratio: "1:1",
          resolution: "1K",
          requested_count: 1,
        },
        uploadedReferences: [],
      }),
    );
    assert.equal(requests.length, before);
  }
  assert.equal(requests.length, 90);
});

test("draft, project, history and unsaved checkpoints preserve the selected product line", () => {
  const state = input({ imageLine: "dedicated" });
  assert.equal(
    validateDraftMutation({ state, expectedVersion: null }).state.imageLine,
    "dedicated",
  );
  assert.equal(
    validateProjectSaveRequest({
      state,
      name: "synthetic",
      batchIds: ["10000000-0000-4000-8000-000000000001"],
    }).state.imageLine,
    "dedicated",
  );
  const record = {
    ...state,
    model_id: state.modelId,
    image_line: "dedicated",
    reference_snapshot: [],
    requested_count: 1,
    aspect_ratio: "1:1",
  };
  assert.equal(generationInputFromRow(record).imageLine, "dedicated");
  assert.equal(persistedGenerationInputFromRow(record).imageLine, "dedicated");
  assert.notEqual(
    createComposerCheckpoint(state),
    createComposerCheckpoint({ ...state, imageLine: "special" }),
  );
  assert.equal(
    createComposerCheckpoint(input()),
    createComposerCheckpoint(input({ imageLine: "special" })),
  );
});
