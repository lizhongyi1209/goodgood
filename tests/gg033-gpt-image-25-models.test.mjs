import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GENERATION_MODEL_CAPABILITIES,
  GPT_IMAGE_MODEL_IDS,
  isGptImageModelId,
  normalizeGenerationModelOptions,
} from "../server/generation/capabilities.mjs";
import {
  US_GATEWAY_GPT_IMAGE_25_FLARE_ROUTE,
  US_GATEWAY_GPT_IMAGE_25_SUNBURST_ROUTE,
  US_GATEWAY_GPT_IMAGE_2_ROUTE,
  getUsGatewayRoute,
} from "../server/generation/us-gateway-adapter.mjs";

const GPT_MODELS = [
  "gpt-image-2.5-sunburst",
  "gpt-image-2",
  "gpt-image-2.5-flare",
];

test("GG-033 exposes one shared GPT image capability family", () => {
  assert.deepEqual(GPT_IMAGE_MODEL_IDS, GPT_MODELS);
  for (const modelId of GPT_MODELS) {
    assert.equal(isGptImageModelId(modelId), true);
    assert.deepEqual(GENERATION_MODEL_CAPABILITIES[modelId].outputCounts, [1, 2, 4]);
    assert.deepEqual(
      normalizeGenerationModelOptions({ modelId }),
      {
        background: "auto",
        googleSearch: false,
        outputFormat: "jpeg",
        quality: "auto",
        thinkingLevel: "low",
      },
    );
  }
  assert.equal(isGptImageModelId("nano-banana-2"), false);
});

test("GG-033 maps each product model to its exact immutable provider route", () => {
  const routes = [
    US_GATEWAY_GPT_IMAGE_25_SUNBURST_ROUTE,
    US_GATEWAY_GPT_IMAGE_2_ROUTE,
    US_GATEWAY_GPT_IMAGE_25_FLARE_ROUTE,
  ];
  assert.deepEqual(routes.map((route) => route.productModelId), GPT_MODELS);
  assert.deepEqual(routes.map((route) => route.providerModel), GPT_MODELS);
  for (const route of routes) {
    assert.equal(getUsGatewayRoute(route.productModelId), route);
  }
  assert.deepEqual(routes.map((route) => route.routeVersion), [
    "o1key-gpt-image-2.5-sunburst-v1",
    "o1key-gpt-image-2-v3",
    "o1key-gpt-image-2.5-flare-v1",
  ]);
});

test("GG-033 persists both new models and all immutable launch prices", async () => {
  const [migration, schema, catalog] = await Promise.all([
    readFile(new URL("../migrations/0028_gg033_gpt_image_25_models.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/models/catalog.ts", import.meta.url), "utf8"),
  ]);

  for (const modelId of GPT_MODELS) {
    assert.match(schema, new RegExp(modelId.replaceAll(".", "\\.")));
  }
  assert.ok(
    catalog.indexOf('id: "gpt-image-2.5-sunburst"') <
      catalog.indexOf('id: "gpt-image-2"'),
  );
  assert.ok(
    catalog.indexOf('id: "gpt-image-2"') <
      catalog.indexOf('id: "gpt-image-2.5-flare"'),
  );
  for (const modelId of ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"]) {
    assert.equal(
      [...migration.matchAll(new RegExp(`'${modelId.replaceAll(".", "\\.")}'`, "g"))]
        .filter((match) => migration.slice(match.index - 80, match.index).includes("65000000"))
        .length,
      9,
    );
  }
  for (const table of ["creation_drafts", "projects", "generation_batches", "price_versions"]) {
    assert.match(migration, new RegExp(`ALTER TABLE ${table}`));
  }
});
