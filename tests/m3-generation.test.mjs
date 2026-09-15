import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  GenerationRequestError,
  validateIdempotencyKey,
  validateM3GenerationInput,
} from "../server/generation/api.mjs";
import {
  GENERATION_MODEL_CAPABILITIES,
  SUPPORTED_GENERATION_RESOLUTIONS,
} from "../server/generation/capabilities.mjs";
import { createMockProviderServer } from "../server/generation/mock-provider-server.mjs";
import { createGenerationProvider } from "../server/generation/provider-router.mjs";

const validInput = Object.freeze({
  aspectRatio: "1:1",
  count: 1,
  modelId: "nano-banana-2",
  prompt: "银灰色未来服装",
  references: [],
  resolution: "1K",
  thinkingLevel: "low",
  googleSearch: false,
  quality: "auto",
  background: "auto",
  outputFormat: "png",
});

test("generation input accepts model-owned ratios, resolutions, and output counts", () => {
  assert.deepEqual(validateM3GenerationInput(validInput), validInput);
  for (const [modelId, capability] of Object.entries(GENERATION_MODEL_CAPABILITIES)) {
    for (const aspectRatio of capability.aspectRatios) {
      for (const resolution of SUPPORTED_GENERATION_RESOLUTIONS) {
        for (const count of capability.outputCounts) {
          const input = { ...validInput, aspectRatio, count, modelId, resolution };
          assert.deepEqual(validateM3GenerationInput(input), input);
        }
      }
    }
  }
  assert.equal(validateIdempotencyKey("web_12345678"), "web_12345678");
  assert.throws(
    () => validateM3GenerationInput({ ...validInput, prompt: "" }),
    (error) =>
      error instanceof GenerationRequestError && error.code === "INVALID_PROMPT",
  );
  assert.throws(
    () => validateM3GenerationInput({ ...validInput, count: 3 }),
    (error) =>
      error instanceof GenerationRequestError &&
      error.code === "M3_SLICE_UNSUPPORTED",
  );
  assert.equal(
    validateM3GenerationInput({ ...validInput, count: 4 }).count,
    4,
  );
  assert.deepEqual(
    validateM3GenerationInput({
      ...validInput,
      thinkingLevel: "high",
      googleSearch: true,
    }),
    { ...validInput, thinkingLevel: "high", googleSearch: true },
  );
  const nanoInputWithoutThinking = { ...validInput };
  delete nanoInputWithoutThinking.thinkingLevel;
  assert.equal(
    validateM3GenerationInput(nanoInputWithoutThinking).thinkingLevel,
    "high",
  );
  assert.deepEqual(
    validateM3GenerationInput({
      ...validInput,
      background: "transparent",
      modelId: "gpt-image-2",
      outputFormat: "webp",
      quality: "high",
    }),
    {
      ...validInput,
      background: "transparent",
      modelId: "gpt-image-2",
      outputFormat: "webp",
      quality: "high",
    },
  );
  const gptInputWithoutFormat = {
    ...validInput,
    modelId: "gpt-image-2",
  };
  delete gptInputWithoutFormat.outputFormat;
  assert.equal(
    validateM3GenerationInput(gptInputWithoutFormat).outputFormat,
    "jpeg",
  );
  for (const unsupportedInput of [
    { ...validInput, thinkingLevel: "medium" },
    { ...validInput, googleSearch: "true" },
    { ...validInput, modelId: "gpt-image-2", thinkingLevel: "high" },
    { ...validInput, modelId: "gpt-image-2", googleSearch: true },
    { ...validInput, modelId: "gpt-image-2", background: "transparent", outputFormat: "jpeg" },
    { ...validInput, quality: "high" },
  ]) {
    assert.throws(
      () => validateM3GenerationInput(unsupportedInput),
      (error) =>
        error instanceof GenerationRequestError &&
        error.code === "M3_SLICE_UNSUPPORTED",
    );
  }
  assert.deepEqual(
    validateM3GenerationInput({
      ...validInput,
      count: 4,
      modelId: "gpt-image-2",
    }).count,
    4,
  );
  for (const unsupportedInput of [
    { ...validInput, aspectRatio: "10:1" },
    { ...validInput, modelId: "nano-banana-pro", count: 2 },
    { ...validInput, resolution: "8K" },
    { ...validInput, aspectRatio: "4:5", modelId: "gpt-image-2" },
  ]) {
    assert.throws(
      () => validateM3GenerationInput(unsupportedInput),
      (error) =>
        error instanceof GenerationRequestError &&
        error.code === "M3_SLICE_UNSUPPORTED",
    );
  }
  assert.deepEqual(
    validateM3GenerationInput({
      ...validInput,
      references: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          name: "reference.png",
          url: "blob:test",
        },
      ],
    }).references,
    [{ id: "20000000-0000-4000-8000-000000000001" }],
  );
});

test("composer submits the selected ratio and resolution without a default-only guard", async () => {
  const workspace = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(workspace, /selectedRatio !== "1:1"/);
  assert.doesNotMatch(workspace, /resolution !== "1K"/);
  assert.match(workspace, /aspectRatio: selectedRatio/);
  assert.match(workspace, /resolution,/);
  assert.match(workspace, /supportsImageLines\(selectedModel\) \|\| isGptImageModelId\(selectedModel\)/);
  assert.match(workspace, /isGenerationCountSupported/);
});

test("mock provider serves the O1Key contract and exposes success, rejection, and timeout outcomes", async (context) => {
  const apiKey = "m3-unit-key";
  const mock = createMockProviderServer({
    apiKey,
    host: "127.0.0.1",
    port: 0,
  });
  await mock.listen();
  context.after(() => mock.close());
  const address = mock.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  const headers = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  const providerConfig = {
    allowInsecureLoopback: true,
    apiKey,
    baseUrl: origin,
    kind: "mock",
    pollIntervalMs: 1,
    requestTimeoutMs: 1_000,
    timeoutMs: 5_000,
  };
  function jobFor(prompt, count = 1) {
    return {
      aspect_ratio: "1:1",
      model_id: "nano-banana-2",
      prompt,
      requested_count: count,
      resolution: "1K",
    };
  }

  // Uploads must be real: the generation payload may only cite a fileUri the
  // upload endpoint actually issued, exactly as the real provider requires.
  const unregistered = await fetch(`${origin}/async/v1/generateImage`, {
    body: JSON.stringify({
      images: [
        { fileData: { fileUri: `${origin}/not-issued.png`, mimeType: "image/png" } },
      ],
      model: "gemini-3.1-flash-image-c-sp",
      prompt: "success",
      aspect_ratio: "1:1",
      response_modalities: ["TEXT", "IMAGE"],
      size: "1K",
    }),
    headers,
    method: "POST",
  });
  assert.equal(unregistered.status, 400);
  assert.equal((await unregistered.json()).error, "unregistered_reference");

  async function run(prompt, count = 1, expectedOutputCount = count) {
    const provider = createGenerationProvider({
      config: { objectStorage: { bucket: "goodgood-private" }, provider: providerConfig },
      publicStorage: null,
    });
    const attempt = {
      provider: provider.route.provider,
      provider_model: provider.route.providerModel,
      route_version: provider.route.routeVersion,
    };
    provider.assertAttempt(attempt);
    const taskId = await provider.createTask({
      attempt,
      job: jobFor(prompt, count),
    });
    return provider.pollTask({
      expectedOutputCount,
      onRefining: async () => {},
      taskId,
    });
  }

  const outputs = await run("success");
  assert.equal(outputs.length, 1);
  assert.ok(outputs[0].url.endsWith("/v1/assets/nano-fashion.png"));
  assert.equal((await fetch(outputs[0].url)).status, 200);

  await assert.rejects(
    () => run("模拟 error"),
    (error) => error.code === "MODEL_REJECTED",
  );

  await assert.rejects(
    () => run("模拟 timeout"),
    (error) => error.code === "MODEL_TIMEOUT",
  );

  const batch = await run("batch", 4);
  assert.equal(batch.length, 4);
});

test("mock provider rejects a generation payload the real adapter would not send", async (context) => {
  const apiKey = "m3-unit-key";
  const mock = createMockProviderServer({ apiKey, host: "127.0.0.1", port: 0 });
  await mock.listen();
  context.after(() => mock.close());
  const address = mock.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  const headers = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  const base = {
    aspect_ratio: "1:1",
    images: [],
    model: "gemini-3.1-flash-image-c-sp",
    prompt: "compose",
    response_modalities: ["TEXT", "IMAGE"],
    size: "1K",
  };

  async function submit(overrides) {
    const response = await fetch(`${origin}/async/v1/generateImage`, {
      body: JSON.stringify({ ...base, ...overrides }),
      headers,
      method: "POST",
    });
    return (await response.json()).error;
  }

  assert.equal(await submit({ model: "nano-banana-2-mock-v1" }), "unknown_model");
  assert.equal(await submit({ response_modalities: ["IMAGE"] }), "invalid_response_modalities");
  assert.equal(await submit({ aspect_ratio: "7:3" }), "invalid_aspect_ratio");
  assert.equal(await submit({ size: "1K " }), "invalid_resolution");
  assert.equal(await submit({ thinking_level: "low" }), "invalid_thinking_level");
  assert.equal(await submit({ prompt: "" }), "missing_prompt");
  assert.equal(await submit({ images: [{ fileData: { mimeType: "image/png" } }] }), "invalid_reference");
  const gptBase = {
    aspect_ratio: "1:1",
    background: "auto",
    images: [],
    model: "gpt-image-2-sd",
    n: 1,
    output_format: "jpeg",
    prompt: "compose",
    quality: "auto",
    size: "1024x1024",
  };
  async function submitGpt(overrides) {
    const response = await fetch(`${origin}/async/v1/generateImage`, {
      body: JSON.stringify({ ...gptBase, ...overrides }),
      headers,
      method: "POST",
    });
    return (await response.json()).error;
  }
  assert.equal(await submitGpt({ size: "1K" }), "invalid_size");
  assert.equal(await submitGpt({ aspect_ratio: "1:1", size: "2048x1024" }), "invalid_size");
  assert.equal(await submitGpt({ n: 3 }), "invalid_output_count");
  assert.equal(await submitGpt({ background: "transparent", output_format: "jpeg" }), "invalid_transparency_format");
  assert.equal(await submitGpt({ quality: "ultra" }), "invalid_quality");});

test("M3 migration is versioned while production removes local fixture identities", async () => {
  const [migration, cleanup, localSeeder, runner, runtime, schema] = await Promise.all([
    readFile(new URL("../migrations/0001_m3_generation.sql", import.meta.url), "utf8"),
    readFile(
      new URL("../migrations/0012_m8_remove_legacy_local_fixtures.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/persistence/seed-local-fixtures.mjs", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../server/persistence/migrate.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/runtime/migrate.mjs", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  for (const table of [
    "users",
    "generation_batches",
    "generation_jobs",
    "generation_attempts",
    "assets",
    "generation_job_events",
    "generation_queue_outbox",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /ON CONFLICT \(id\) DO NOTHING/);
  assert.match(runner, /goodgood_schema_migrations/);
  assert.match(runner, /different checksum/);
  assert.match(cleanup, /DELETE FROM users/);
  assert.match(cleanup, /m3-local@goodgood\.invalid/);
  assert.match(localSeeder, /export async function seedLocalFixtures/);
  assert.match(runtime, /GOODGOOD_ALLOW_LOCAL_AUTH === "true"/);
  assert.match(schema, /pgTable/);
  assert.doesNotMatch(migration, /goodgood-local-only/);
});
