import assert from "node:assert/strict";
import test from "node:test";
import { validateManagedModel } from "../server/admin/models.mjs";
import { calculateModelQuote } from "../shared/contracts/model-pricing.mjs";
import {
  calculateTokenQuote,
  readSeedanceCompletionTokens,
  seedanceListPrices,
} from "../shared/contracts/seedance-token-pricing.mjs";

const model = (id = "seedance-2-0") => ({
  id,
  adapterId: id,
  name: id,
  description: "",
  enabled: true,
  version: 1,
  prices: seedanceListPrices(id),
});
test("GG-067 configured token rates remain exact and cannot mix billing units", () => {
  for (const id of [
    "seedance-2-0",
    "seedance-2-0-fast",
    "seedance-2-0-mini",
    "seedance-2-5",
  ])
    assert.deepEqual(validateManagedModel(model(id)).prices, model(id).prices);
  assert.equal(seedanceListPrices("seedance-2-0")["4K"].output, 2600);
  assert.deepEqual(seedanceListPrices("unknown"), {});
  for (const invalid of [
    {
      ...model(),
      prices: { "480p": { billing: "tokens", output: 4600, input: 0 } },
    },
    {
      ...model(),
      prices: { ...model().prices, "720p": { output: 4600, input: 2800 } },
    },
    {
      ...model(),
      prices: {
        ...model().prices,
        "720p": { billing: "bad", output: 4600, input: 2800 },
      },
    },
    {
      ...model(),
      prices: {
        ...model().prices,
        "720p": { billing: "tokens", output: 46.1, input: 2800 },
      },
    },
    { ...model(), prices: { "480p": model().prices["480p"] } },
  ])
    assert.throws(
      () => validateManagedModel(invalid),
      (e) => e.code === "MODEL_REQUEST_INVALID",
    );
  assert.equal(
    validateManagedModel({ ...model(), enabled: false, prices: {} }).enabled,
    false,
  );
  assert.throws(() =>
    validateManagedModel({
      ...model("seedance-2-5"),
      prices: {
        ...model("seedance-2-5").prices,
        "4K": { billing: "tokens", output: 7000, input: 4200 },
      },
    }),
  );
  assert.equal(
    calculateModelQuote(model(), { resolution: "1080p", outputSeconds: 5 }),
    null,
  );
});
test("GG-067 uses completion tokens, keeps malformed or absent usage unresolved", () => {
  const response = {
    status: "completed",
    metadata: { usage: { completion_tokens: 50638, total_tokens: 50638 } },
  };
  assert.equal(readSeedanceCompletionTokens(response), 50638);
  assert.equal(
    readSeedanceCompletionTokens({
      usage: { completion_tokens: 42, total_tokens: 100 },
    }),
    42,
  );
  for (const value of [
    undefined,
    null,
    0,
    -1,
    "50638",
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])
    assert.equal(
      readSeedanceCompletionTokens({
        metadata: { usage: { completion_tokens: value } },
      }),
      null,
    );
  assert.equal(
    readSeedanceCompletionTokens({
      metadata: { usage: { total_tokens: 50638 } },
    }),
    null,
  );
  assert.equal(
    readSeedanceCompletionTokens({
      metadata: { usage: { completion_tokens: -1 } },
      usage: { completion_tokens: 100 },
    }),
    null,
  );
});
test("GG-067 selects one mutually exclusive rate and rounds whole-task credits once", () => {
  const prices = model().prices;
  assert.deepEqual(
    calculateTokenQuote(prices, {
      resolution: "1080p",
      completionTokens: 826200,
      hasReferenceVideo: true,
    }),
    { credits: 2562, yuan: "25.6122" },
  );
  assert.deepEqual(
    calculateTokenQuote(model("seedance-2-0-mini").prices, {
      resolution: "720p",
      completionTokens: 50638,
      hasReferenceVideo: false,
    }),
    { credits: 117, yuan: "1.164674" },
  );
  assert.deepEqual(
    calculateTokenQuote(model("seedance-2-0-mini").prices, {
      resolution: "720p",
      completionTokens: 50638,
      hasReferenceVideo: true,
    }),
    { credits: 71, yuan: "0.708932" },
  );
  for (const input of [
    { resolution: "8K", completionTokens: 50638, hasReferenceVideo: false },
    { resolution: "720p", completionTokens: 0, hasReferenceVideo: false },
    { resolution: "720p", completionTokens: "50638", hasReferenceVideo: false },
    { resolution: "720p", completionTokens: 50638 },
  ])
    assert.equal(calculateTokenQuote(prices, input), null);
  assert.equal(
    calculateTokenQuote(
      { "720p": { output: 46, input: 28 } },
      { resolution: "720p", completionTokens: 50638, hasReferenceVideo: false },
    ),
    null,
  );
});
