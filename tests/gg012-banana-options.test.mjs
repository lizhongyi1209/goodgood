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
  count: 1,
  googleSearch: false,
  modelId: "nano-banana-2",
  prompt: "未来城市街景",
  projectId: null,
  references: [],
  resolution: "1K",
  thinkingLevel: "low",
});

test("Banana options default to hidden high thinking and reject model leakage", () => {
  assert.deepEqual(
    normalizeGenerationModelOptions({ modelId: "nano-banana-2" }),
    {
      background: "auto",
      googleSearch: false,
      outputFormat: "png",
      quality: "auto",
      thinkingLevel: "high",
    },
  );
  assert.deepEqual(
    normalizeGenerationModelOptions({
      googleSearch: false,
      modelId: "nano-banana-2",
      thinkingLevel: "low",
    }),
    {
      background: "auto",
      googleSearch: false,
      outputFormat: "png",
      quality: "auto",
      thinkingLevel: "low",
    },
  );
  assert.deepEqual(
    normalizeGenerationModelOptions({
      googleSearch: true,
      modelId: "nano-banana-2",
      thinkingLevel: "high",
    }),
    {
      background: "auto",
      googleSearch: true,
      outputFormat: "png",
      quality: "auto",
      thinkingLevel: "high",
    },
  );
  assert.equal(
    normalizeGenerationModelOptions({
      googleSearch: true,
      modelId: "gpt-image-2",
      thinkingLevel: "low",
    }),
    null,
  );
  assert.equal(
    normalizeGenerationModelOptions({
      googleSearch: false,
      modelId: "nano-banana-2",
      thinkingLevel: "medium",
    }),
    null,
  );
});

test("immutable generation identity includes thinking and Google Search", () => {
  assert.notEqual(
    hashGenerationInput(baseInput),
    hashGenerationInput({ ...baseInput, thinkingLevel: "high" }),
  );
  assert.notEqual(
    hashGenerationInput(baseInput),
    hashGenerationInput({ ...baseInput, googleSearch: true }),
  );

  const restored = generationInputFromRow({
    aspect_ratio: "1:1",
    google_search: true,
    model_id: "nano-banana-2",
    project_id: null,
    prompt: "未来城市街景",
    reference_snapshot: [],
    requested_count: 1,
    resolution: "1K",
    thinking_level: "high",
  });
  assert.equal(restored.thinkingLevel, "high");
  assert.equal(restored.googleSearch, true);
});

test("GG-012 migration persists compatible model-specific options", async () => {
  const [migration, schema, generationRepository, projectRepository, draftRepository] =
    await Promise.all([
      readFile(new URL("../migrations/0017_gg012_banana_thinking_search.sql", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/generation/repository.mjs", import.meta.url), "utf8"),
      readFile(new URL("../server/projects/repository.mjs", import.meta.url), "utf8"),
      readFile(new URL("../server/drafts/repository.mjs", import.meta.url), "utf8"),
    ]);

  for (const table of ["generation_batches", "projects", "creation_drafts"]) {
    assert.match(migration, new RegExp(`ALTER TABLE ${table}`));
  }
  assert.match(migration, /thinking_level text NOT NULL DEFAULT 'low'/);
  assert.match(migration, /google_search boolean NOT NULL DEFAULT false/);
  assert.match(migration, /model_id = 'nano-banana-2'/);
  assert.match(schema, /thinkingLevel: text\("thinking_level"\)\.default\("low"\)/);
  assert.match(schema, /googleSearch: boolean\("google_search"\)\.default\(false\)/);
  assert.match(generationRepository, /b\.thinking_level/);
  assert.match(projectRepository, /thinking_level, google_search/);
  assert.match(draftRepository, /thinking_level, google_search/);
});
