import assert from "node:assert/strict";
import test from "node:test";
import { validateManagedModel } from "../server/admin/models.mjs";
import { calculateModelQuote } from "../shared/contracts/model-pricing.mjs";
import {
  gptPricingQualities,
  modelQualityPriceContext,
  parseQualityPriceContext,
} from "../shared/contracts/gpt-quality-pricing.mjs";
import { normalizeGenerationModelOptions } from "../server/generation/capabilities.mjs";
const make = (adapterId = "gpt-image-2.5-flare") => ({
  id: adapterId,
  adapterId,
  name: "GPT",
  description: "",
  enabled: true,
  version: 1,
  prices: {},
  lines: {
    special: {
      enabled: true,
      prices: Object.fromEntries(
        ["1K", "2K", "4K"].map((key) => [
          key,
          {
            output: 280,
            qualities: Object.fromEntries(
              gptPricingQualities(adapterId).map((item, index) => [
                item.id,
                5 + index * 30,
              ]),
            ),
          },
        ]),
      ),
    },
    quality: { enabled: false, prices: {} },
    dedicated: { enabled: false, prices: {} },
  },
});
test("GG-063 model-owned quality prices validate completeness, enable and flat compatibility", () => {
  for (const id of [
    "gpt-image-2",
    "gpt-image-2.5-sunburst",
    "gpt-image-2.5-flare",
  ]) {
    const model = validateManagedModel(make(id));
    for (const { id: quality } of gptPricingQualities(id))
      assert.equal(
        calculateModelQuote(model, { resolution: "1K", count: 4, quality }),
        model.lines.special.prices["1K"].qualities[quality] * 4,
      );
    assert.equal(
      calculateModelQuote(model, { resolution: "1K", quality: "auto" }),
      Math.max(...Object.values(model.prices["1K"].qualities)),
    );
  }
  const incomplete = make();
  delete incomplete.lines.special.prices["2K"].qualities.max;
  assert.throws(
    () => validateManagedModel(incomplete),
    (e) => e.code === "MODEL_REQUEST_INVALID",
  );
  const unsupported = make("gpt-image-2");
  unsupported.lines.special.prices["1K"].qualities.max = 100;
  assert.throws(
    () => validateManagedModel(unsupported),
    (e) => e.code === "MODEL_REQUEST_INVALID",
  );
  const flat = make();
  for (const price of Object.values(flat.lines.special.prices))
    delete price.qualities;
  assert.equal(
    calculateModelQuote(validateManagedModel(flat), {
      resolution: "1K",
      quality: "high",
    }),
    280,
  );
  assert.equal(
    calculateModelQuote(make(), { resolution: "1K", quality: "unknown" }),
    null,
  );
});
test("GG-063 distinct quote contexts and 2.5-only xhigh/max never leak to GPT 2 or Banana", () => {
  const model = make();
  assert.equal(
    modelQualityPriceContext(model, "special", "high"),
    "standard:gpt-high",
  );
  assert.deepEqual(parseQualityPriceContext("banana-dedicated:gpt-max"), {
    imageLine: "dedicated",
    quality: "max",
  });
  for (const quality of ["xhigh", "max"]) {
    assert.equal(
      normalizeGenerationModelOptions({
        modelId: "gpt-image-2.5-flare",
        quality,
      }).quality,
      quality,
    );
    assert.equal(
      normalizeGenerationModelOptions({ modelId: "gpt-image-2", quality }),
      null,
    );
    assert.equal(
      normalizeGenerationModelOptions({ modelId: "nano-banana-2", quality }),
      null,
    );
  }
});
