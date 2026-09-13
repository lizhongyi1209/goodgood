import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import {
  calculateModelQuote,
  creditsToYuan,
  currentCreditAmount,
  yuanToCredits,
} from "../shared/contracts/model-pricing.mjs";
import {
  readManagedModels,
  requireEnabledImageModel,
  saveManagedModel,
  validateManagedModel,
} from "../server/admin/models.mjs";
import { createAdminNodeApiHandler } from "../server/admin/node-api.mjs";
import {
  generationApiError,
  validateM3GenerationInput,
} from "../server/generation/api.mjs";
import { AdministrationError } from "../server/admin/errors.mjs";

const ownerContext = { ownerId: "owner-a", systemRole: "site_owner" };
const draft = (overrides = {}) => ({
  id: "banana-studio",
  name: "Banana Studio",
  description: "",
  adapterId: "nano-banana-2",
  enabled: true,
  version: null,
  prices: { "1K": { output: 21 }, "2K": { output: 32 }, "4K": { output: 53 } },
  ...overrides,
});
const row = (overrides = {}) => ({
  id: "banana-studio",
  name: "Banana Studio",
  description: "",
  media_type: "image",
  adapter_id: "nano-banana-2",
  enabled: true,
  version: 1,
  prices: draft().prices,
  updated_at: "2026-09-13T00:00:00Z",
  ...overrides,
});

test("RMB converts exactly to cent credits and rejects excessive precision or unsafe notation", () => {
  for (const [yuan, credits] of [
    ["0.01", 1],
    ["0.20", 20],
    ["1", 100],
    ["12.35", 1235],
  ]) {
    assert.equal(yuanToCredits(yuan), credits);
    assert.equal(yuanToCredits(creditsToYuan(credits)), credits);
  }
  for (const invalid of ["", "1.001", "-1", "1e4", "Infinity", "01.2"])
    assert.throws(() => yuanToCredits(invalid));
  assert.equal(currentCreditAmount("190", "credit"), "380");
  assert.equal(currentCreditAmount("190", "credit-cny-cent"), "190");
});
test("image specification and video output/reference seconds yield predictable fixed quotes", () => {
  assert.equal(
    calculateModelQuote(
      { mediaType: "image", prices: draft().prices },
      { resolution: "4K", count: 4 },
    ),
    212,
  );
  const video = {
    mediaType: "video",
    prices: { "4K": { output: 100, input: 15 } },
  };
  assert.equal(
    calculateModelQuote(video, {
      resolution: "4K",
      outputSeconds: 5,
      referenceSeconds: 0,
    }),
    500,
  );
  assert.equal(
    calculateModelQuote(video, {
      resolution: "4K",
      outputSeconds: 5,
      referenceSeconds: 1.01,
      count: 2,
    }),
    1031,
  );
  assert.equal(
    calculateModelQuote(video, { resolution: "4K", outputSeconds: 0 }),
    null,
  );
  assert.equal(
    calculateModelQuote(video, { resolution: "8K", outputSeconds: 5 }),
    null,
  );
  assert.equal(
    calculateModelQuote(video, {
      resolution: "4K",
      outputSeconds: 5,
      referenceSeconds: -1,
    }),
    null,
  );
});
test("enable requires supported adapter and complete positive specification prices", () => {
  assert.equal(validateManagedModel(draft()).mediaType, "image");
  for (const input of [
    draft({ adapterId: "arbitrary-model" }),
    draft({ prices: { "1K": { output: 1 } } }),
    draft({ prices: { ...draft().prices, "2K": { output: 0 } } }),
    draft({ id: "../../secret" }),
    draft({ version: 0 }),
  ]) {
    assert.throws(
      () => validateManagedModel(input),
      (error) => error.code === "MODEL_REQUEST_INVALID",
    );
  }
  assert.equal(
    validateManagedModel(draft({ enabled: false, prices: {} })).enabled,
    false,
  );
  assert.equal(validateManagedModel(draft({ adapterId: "nano-banana-pro" })).enabled, true);
  assert.throws(
    () =>
      validateManagedModel(
        draft({
          adapterId: "seedance-2-5",
          prices: { "480p": { output: 100, input: -1 } },
        }),
      ),
    /参考/,
  );
});
test("model administration rejects anonymous and ordinary callers before touching persistence", async () => {
  let queries = 0;
  const resources = {
    pool: {
      query() {
        queries++;
      },
    },
  };
  for (const context of [null, { ownerId: "user-a", systemRole: "member" }]) {
    await assert.rejects(
      readManagedModels({ ownerContext: context, resources }),
    );
    await assert.rejects(
      saveManagedModel({ ownerContext: context, resources, input: draft() }),
    );
  }
  assert.equal(queries, 0);
});
test("public directory exposes enabled entries and has a real empty state", async () => {
  const resources = {
    pool: {
      async query() {
        return { rows: [row(), row({ id: "disabled", enabled: false })] };
      },
    },
  };
  assert.equal(
    (
      await readManagedModels({
        ownerContext,
        resources,
        publicDirectory: true,
      })
    ).models.length,
    1,
  );
  assert.equal(
    (await readManagedModels({ ownerContext, resources })).models.length,
    2,
  );
  resources.pool.query = async () => ({
    rows: [
      row({ id: "gpt-image-2.5-flare" }),
      row({ id: "gpt-image-2" }),
      row({ id: "gpt-image-2.5-sunburst" }),
      row({ id: "nano-banana-2" }),
      row(),
    ],
  });
  assert.deepEqual(
    (
      await readManagedModels({
        ownerContext,
        resources,
        publicDirectory: true,
      })
    ).models.map((model) => model.id),
    [
      "nano-banana-2",
      "gpt-image-2.5-sunburst",
      "gpt-image-2",
      "gpt-image-2.5-flare",
      row().id,
    ],
  );
  resources.pool.query = async () => ({ rows: [] });
  assert.deepEqual(await readManagedModels({ ownerContext, resources }), {
    models: [],
  });
});
test("saving publishes all image counts and specifications with immutable insert versions and one audit", async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith("SELECT * FROM managed_models")) return { rows: [] };
      if (sql.startsWith("INSERT INTO managed_models"))
        return { rows: [row()] };
      return { rows: [], rowCount: 1 };
    },
    release() {
      released = true;
    },
  };
  const result = await saveManagedModel({
    ownerContext,
    input: draft(),
    resources: {
      pool: {
        async connect() {
          return client;
        },
      },
    },
  });
  assert.equal(result.model.name, "Banana Studio");
  const prices = calls.filter((call) =>
    call.sql.includes("INSERT INTO price_versions"),
  );
  assert.equal(prices.length, 9);
  assert.deepEqual(
    prices.map((call) => call.values[5]),
    ["21", "42", "84", "32", "64", "128", "53", "106", "212"],
  );
  assert.ok(prices.every((call) => call.values[4] === "credit-cny-cent"));
  assert.equal(
    calls.filter((call) =>
      call.sql.includes("INSERT INTO managed_model_events"),
    ).length,
    1,
  );
  assert.equal(calls.at(-1).sql, "COMMIT");
  assert.equal(released, true);
});
test("stale edits and persistence failures roll back without losing the stored model", async () => {
  for (const failure of ["conflict", "database"]) {
    const calls = [];
    const client = {
      async query(sql) {
        calls.push(sql);
        if (sql.startsWith("SELECT * FROM managed_models"))
          return { rows: failure === "conflict" ? [row({ version: 2 })] : [] };
        if (sql.startsWith("INSERT INTO managed_models"))
          throw new Error("database unavailable");
        return { rows: [] };
      },
      release() {},
    };
    await assert.rejects(
      saveManagedModel({
        ownerContext,
        input: draft(),
        resources: {
          pool: {
            async connect() {
              return client;
            },
          },
        },
      }),
    );
    assert.equal(calls.at(-1), "ROLLBACK");
    assert.ok(!calls.includes("COMMIT"));
  }
});
test("disabled model, adapter tampering and unavailable specification prevent new generation", async () => {
  for (const model of [
    null,
    row({ enabled: false }),
    row({ adapter_id: "gpt-image-2" }),
    row({ prices: {} }),
  ]) {
    await assert.rejects(
      requireEnabledImageModel(
        {
          async query() {
            return { rows: model ? [model] : [] };
          },
        },
        {
          catalogModelId: "banana-studio",
          modelId: "nano-banana-2",
          resolution: "1K",
        },
      ),
      (error) => error.code === "MODEL_DISABLED",
    );
  }
  const result = await requireEnabledImageModel(
    {
      async query() {
        return { rows: [row()] };
      },
    },
    {
      catalogModelId: "banana-studio",
      modelId: "nano-banana-2",
      resolution: "1K",
    },
  );
  assert.equal(result.id, "banana-studio");
  assert.equal(
    generationApiError(
      new AdministrationError("MODEL_DISABLED", "disabled", 409),
    ).status,
    409,
  );
});
test("catalog model and expected quote version survive the provider-independent request boundary", () => {
  const input = {
    prompt: "test",
    references: [],
    modelId: "nano-banana-2",
    catalogModelId: "banana-studio",
    expectedPriceVersion: 3,
    aspectRatio: "1:1",
    resolution: "1K",
    count: 1,
  };
  assert.equal(
    validateM3GenerationInput(input).catalogModelId,
    "banana-studio",
  );
  assert.equal(validateM3GenerationInput(input).expectedPriceVersion, 3);
  assert.throws(() =>
    validateM3GenerationInput({ ...input, catalogModelId: "../test" }),
  );
});
test("Node model mutations enforce CSRF and dispatch the same authenticated operations", async () => {
  let saves = 0;
  const handler = createAdminNodeApiHandler({
    authenticate: async () => ownerContext,
    operations: {
      saveManagedModel: async () => {
        saves++;
        return { model: row() };
      },
    },
  });
  for (const csrf of [null, "1"]) {
    const request = Readable.from([Buffer.from(JSON.stringify(draft()))]);
    request.url = "/api/admin/models/save";
    request.method = "POST";
    request.headers = csrf ? { "x-goodgood-admin-action": csrf } : {};
    const response = {
      writeHead(status) {
        this.status = status;
      },
      end() {},
    };
    assert.equal(await handler(request, response), true);
    assert.equal(response.status, csrf ? 200 : 403);
  }
  assert.equal(saves, 1);
});
