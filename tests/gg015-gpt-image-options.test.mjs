import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeGenerationModelOptions } from "../server/generation/capabilities.mjs";
import {
  generationInputFromRow,
  hashGenerationInput,
} from "../server/generation/repository.mjs";

const baseInput = Object.freeze({
  aspectRatio: "1:1",
  background: "auto",
  count: 1,
  googleSearch: false,
  modelId: "gpt-image-2",
  outputFormat: "png",
  prompt: "透明玻璃徽章",
  projectId: null,
  quality: "auto",
  references: [],
  resolution: "1K",
  thinkingLevel: "low",
});

test("GPT Image 2 options default, validate compatibility, and reject model leakage", () => {
  assert.deepEqual(normalizeGenerationModelOptions({ modelId: "gpt-image-2" }), {
    background: "auto",
    googleSearch: false,
    outputFormat: "png",
    quality: "auto",
    thinkingLevel: "low",
  });
  assert.deepEqual(normalizeGenerationModelOptions({
    background: "transparent",
    modelId: "gpt-image-2",
    outputFormat: "webp",
    quality: "high",
  }), {
    background: "transparent",
    googleSearch: false,
    outputFormat: "webp",
    quality: "high",
    thinkingLevel: "low",
  });
  assert.equal(normalizeGenerationModelOptions({
    background: "transparent",
    modelId: "gpt-image-2",
    outputFormat: "jpeg",
  }), null);
  assert.equal(normalizeGenerationModelOptions({
    modelId: "nano-banana-2",
    quality: "high",
  }), null);
});

test("immutable generation identity and restored rows preserve GPT Image 2 options", () => {
  for (const variation of [
    { quality: "high" },
    { outputFormat: "webp" },
    { background: "transparent" },
  ]) {
    assert.notEqual(
      hashGenerationInput(baseInput),
      hashGenerationInput({ ...baseInput, ...variation }),
    );
  }

  const restored = generationInputFromRow({
    aspect_ratio: "1:1",
    background: "transparent",
    google_search: false,
    model_id: "gpt-image-2",
    output_format: "webp",
    project_id: null,
    prompt: "透明玻璃徽章",
    quality: "high",
    reference_snapshot: [],
    requested_count: 1,
    resolution: "1K",
    thinking_level: "low",
  });
  assert.equal(restored.quality, "high");
  assert.equal(restored.background, "transparent");
  assert.equal(restored.outputFormat, "webp");
});

test("GG-015 migration and UI persist model-owned GPT Image 2 controls", async () => {
  const [migration, schema, composer, page, projectRepository, draftRepository] =
    await Promise.all([
      readFile(new URL("../migrations/0018_gg015_gpt_image_options.sql", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../features/creation/creation-composer.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../server/projects/repository.mjs", import.meta.url), "utf8"),
      readFile(new URL("../server/drafts/repository.mjs", import.meta.url), "utf8"),
    ]);

  for (const table of ["generation_batches", "projects", "creation_drafts"]) {
    assert.match(migration, new RegExp(`ALTER TABLE ${table}`));
  }
  assert.match(migration, /quality text NOT NULL DEFAULT 'auto'/);
  assert.match(migration, /background text NOT NULL DEFAULT 'auto'/);
  assert.match(migration, /output_format text NOT NULL DEFAULT 'png'/);
  assert.match(migration, /background <> 'transparent' OR output_format IN \('png', 'webp'\)/);
  assert.match(schema, /quality: text\("quality"\)\.default\("auto"\)/);
  assert.match(schema, /background: text\("background"\)\.default\("auto"\)/);
  assert.match(schema, /outputFormat: text\("output_format"\)\.default\("png"\)/);
  assert.match(composer, /modelId === "gpt-image-2"/);
  assert.match(composer, /GPT_IMAGE_QUALITY_OPTIONS/);
  assert.match(composer, /background === "transparent" && option\.value === "jpeg"/);
  assert.match(page, /setOutputFormat\("png"\)/);
  assert.match(page, /gptImageQualityLabel\(activeDetail\.batch\.quality\)/);
  assert.match(projectRepository, /quality, background, output_format/);
  assert.match(draftRepository, /quality, background, output_format/);
});
