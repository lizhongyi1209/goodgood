import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateModelQuote,
  MODEL_TEMPLATES,
} from "../shared/contracts/model-pricing.mjs";
import {
  isSeedreamModel,
  seedreamQuoteCreditAmount,
} from "../shared/contracts/seedream-pricing.mjs";
import {
  saveManagedModel,
  validateManagedModel,
} from "../server/admin/models.mjs";
import {
  previewBillingSummary,
  readBillingSummary,
} from "../server/billing/api.mjs";

// Definitions only. No database, queue or provider is attached to these stubs.
const timestamp = "2026-09-30T00:00:00Z";
const modelId = "seedream-5.0-pro";
const ownerContext = { ownerId: "owner-seedream", systemRole: "site_owner" };
const draft = (overrides = {}) => ({
  id: modelId,
  name: "Seedream 5.0 Pro",
  description: "",
  adapterId: modelId,
  enabled: true,
  version: null,
  prices: { "1K": { output: 30 }, "2K": { output: 60 } },
  ...overrides,
});
const modelRow = (overrides = {}) => ({
  id: modelId,
  name: "Seedream 5.0 Pro",
  description: "",
  adapter_id: modelId,
  media_type: "image",
  enabled: true,
  archived_at: null,
  prices: draft().prices,
  lines: {},
  version: 1,
  updated_at: timestamp,
  ...overrides,
});

test("Seedream template admits only 1K/2K fixed image prices, without GPT quality or image lines", () => {
  assert.equal(isSeedreamModel(modelId), true);
  assert.equal(isSeedreamModel("gpt-image-2"), false);
  assert.deepEqual(MODEL_TEMPLATES.find((item) => item.id === modelId), {
    id: modelId,
    mediaType: "image",
    resolutions: ["1K", "2K"],
    ready: true,
  });
  assert.deepEqual(validateManagedModel(draft()).prices, draft().prices);
  for (const input of [
    draft({ prices: { "1K": { output: 30 } } }),
    draft({ prices: { ...draft().prices, "4K": { output: 100 } } }),
    draft({ prices: { ...draft().prices, "1.5K": { output: 40 } } }),
    draft({ prices: { ...draft().prices, "1K": { output: 30, qualities: { low: 10 } } } }),
    draft({ lines: { special: { enabled: true, prices: draft().prices } } }),
  ])
    assert.throws(() => validateManagedModel(input), (error) => error.code === "MODEL_REQUEST_INVALID");
});

test("Seedream single-output quote adds two current credits from the second reference", () => {
  const model = { ...draft(), mediaType: "image" };
  for (const [resolution, base] of [["1K", 30], ["2K", 60]]) {
    for (const [referenceCount, supplement] of [[0, 0], [1, 0], [2, 2], [10, 18]])
      assert.equal(calculateModelQuote(model, { resolution, referenceCount }), base + supplement);
  }
  for (const count of [0, 2, 4, 12, 13, 1.5])
    assert.equal(calculateModelQuote(model, { resolution: "1K", count }), null);
  for (const referenceCount of [-1, 11, 1.5, "2", NaN])
    assert.equal(calculateModelQuote(model, { resolution: "1K", referenceCount }), null);
  for (const resolution of ["1.5K", "4K", "auto"])
    assert.equal(calculateModelQuote(model, { resolution }), null);
  assert.equal(calculateModelQuote({ ...model, adapterId: "nano-banana-2" }, {
    resolution: "1K", count: 12, referenceCount: 10,
  }), 360);
});

test("frozen Seedream quote converts an old base unit before adding reference cents and rejects ambiguous amounts", () => {
  assert.equal(seedreamQuoteCreditAmount("30", "credit-cny-cent", 0), "30");
  assert.equal(seedreamQuoteCreditAmount(30n, "credit-cny-cent", 4), "36");
  assert.equal(seedreamQuoteCreditAmount("30", "credit", 4), "66");
  assert.equal(seedreamQuoteCreditAmount("9007199254740993", "credit-cny-cent", 10), "9007199254741011");
  for (const [amount, unit, references] of [
    ["0", "credit-cny-cent", 0], ["-30", "credit-cny-cent", 0],
    ["30.1", "credit-cny-cent", 0], [30, "unknown-credit", 0],
    [Number.MAX_SAFE_INTEGER + 1, "credit-cny-cent", 0],
    [30, "credit-cny-cent", 11], [30, "credit-cny-cent", -1],
  ])
    assert.equal(seedreamQuoteCreditAmount(amount, unit, references), null);
});

test("Seedream preview has exactly its two single-output base quotes", () => {
  assert.deepEqual(previewBillingSummary.quotes.filter((quote) => quote.modelId === modelId)
    .map((quote) => [quote.resolution, quote.count, quote.creditAmount, quote.creditUnit]), [
    ["1K", 1, "30", "credit-cny-cent"], ["2K", 1, "60", "credit-cny-cent"],
  ]);
});

test("managed Seedream saves publish only single-output versioned base prices", async () => {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith("SELECT * FROM managed_models")) return { rows: [] };
      if (sql.startsWith("INSERT INTO managed_models")) return { rows: [modelRow()] };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  await saveManagedModel({ ownerContext, input: draft(), resources: {
    pool: { async connect() { return client; } },
  } });
  const prices = calls.filter(({ sql }) => sql.includes("INSERT INTO price_versions"));
  assert.deepEqual(prices.map(({ values }) => values.slice(1)), [
    [modelId, "1K", 1, "credit-cny-cent", "30", "standard"],
    [modelId, "2K", 1, "credit-cny-cent", "60", "standard"],
  ]);
  assert.equal(calls.filter(({ sql }) => sql.includes("INSERT INTO managed_model_events")).length, 1);
  assert.equal(calls.at(-1).sql, "COMMIT");
});

function summaryPool({ disabled = false, missingPrice = false } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes("FROM managed_models")) return { rows: [modelRow({
        enabled: !disabled,
        prices: { "1K": { output: 40 }, "2K": { output: 80 } },
      })] };
      if (sql.includes("FROM credit_accounts")) return { rowCount: 1, rows: [{
        id: "account-seedream", owner_id: ownerContext.ownerId,
        available_balance: "1000", reserved_balance: "0", status: "active",
        payment_funded_available_balance: "1000", payment_funded_reserved_balance: "0",
        unit: "credit-cny-cent", version: "1", created_at: timestamp, updated_at: timestamp,
      }] };
      if (sql.includes("FROM price_versions")) {
        const [catalogId, resolution, count, context] = values;
        assert.equal(count, 1);
        assert.ok(["1K", "2K"].includes(resolution));
        if (missingPrice) return { rowCount: 0, rows: [] };
        return { rowCount: 1, rows: [{
          id: `seedream-${resolution}-price`, model_id: catalogId, resolution,
          output_count: count, plan_context: context, version: 3,
          credit_unit: "credit-cny-cent", credit_amount: resolution === "1K" ? "40" : "80",
          effective_from: timestamp, effective_until: null, created_at: timestamp,
        }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test("billing reads active Seedream prices, preserves operator values and never requests 4K or multiple outputs", async () => {
  const pool = summaryPool();
  const summary = await readBillingSummary({ ownerContext, resources: { pool } });
  assert.deepEqual(summary.quotes.map((quote) => [quote.modelId, quote.resolution, quote.count, quote.creditAmount, quote.priceVersion]), [
    [modelId, "1K", 1, "40", 3], [modelId, "2K", 1, "80", 3],
  ]);
  assert.equal(pool.calls.filter(({ sql }) => sql.includes("FROM price_versions")).length, 2);
});

test("disabled Seedream exposes no quotes and missing active price fails closed", async () => {
  const disabledPool = summaryPool({ disabled: true });
  const summary = await readBillingSummary({ ownerContext, resources: { pool: disabledPool } });
  assert.deepEqual(summary.quotes, []);
  assert.equal(disabledPool.calls.filter(({ sql }) => sql.includes("FROM price_versions")).length, 0);
  await assert.rejects(readBillingSummary({ ownerContext, resources: { pool: summaryPool({ missingPrice: true }) } }),
    (error) => error.code === "PRICE_NOT_AVAILABLE");
});
