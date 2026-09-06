import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  GenerationRequestError,
  validateIdempotencyKey,
  validateM3GenerationInput,
} from "../server/generation/api.mjs";
import { createMockProviderServer } from "../server/generation/mock-provider-server.mjs";

const validInput = Object.freeze({
  aspectRatio: "1:1",
  count: 1,
  modelId: "nano-banana-2",
  prompt: "银灰色未来服装",
  references: [],
  resolution: "1K",
});

test("generation input keeps the M3 model slice while accepting validated reference IDs", () => {
  assert.deepEqual(validateM3GenerationInput(validInput), validInput);
  assert.equal(validateIdempotencyKey("web_12345678"), "web_12345678");
  assert.throws(
    () => validateM3GenerationInput({ ...validInput, prompt: "" }),
    (error) =>
      error instanceof GenerationRequestError && error.code === "INVALID_PROMPT",
  );
  assert.throws(
    () => validateM3GenerationInput({ ...validInput, count: 2 }),
    (error) =>
      error instanceof GenerationRequestError &&
      error.code === "M3_SLICE_UNSUPPORTED",
  );
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

test("mock provider is idempotent and exposes success, rejection, and timeout outcomes", async (context) => {
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

  async function create(prompt, idempotencyKey, retryOfJobId = null) {
    const response = await fetch(`${origin}/v1/generations`, {
      body: JSON.stringify({
        idempotencyKey,
        modelId: "nano-banana-2",
        prompt,
        retryOfJobId,
      }),
      headers,
      method: "POST",
    });
    assert.ok(response.ok);
    return response.json();
  }

  async function poll(taskId) {
    const response = await fetch(`${origin}/v1/generations/${taskId}`, {
      headers,
    });
    assert.ok(response.ok);
    return response.json();
  }

  const created = await create("success", "unit-success");
  const duplicate = await create("success", "unit-success");
  assert.equal(duplicate.taskId, created.taskId);
  assert.equal((await poll(created.taskId)).state, "processing");
  assert.equal((await poll(created.taskId)).state, "processing");
  const succeeded = await poll(created.taskId);
  assert.equal(succeeded.state, "succeeded");
  assert.deepEqual(
    { width: succeeded.output.width, height: succeeded.output.height },
    { width: 1122, height: 1402 },
  );
  assert.equal((await fetch(succeeded.output.url)).status, 200);

  const rejected = await create("模拟 error", "unit-failure");
  await poll(rejected.taskId);
  assert.equal((await poll(rejected.taskId)).error.code, "MODEL_REJECTED");
  const retry = await create("模拟 error", "unit-retry", "failed-job");
  await poll(retry.taskId);
  await poll(retry.taskId);
  assert.equal((await poll(retry.taskId)).state, "succeeded");

  const timeout = await create("模拟 timeout", "unit-timeout");
  for (let index = 0; index < 4; index += 1) {
    assert.equal((await poll(timeout.taskId)).state, "processing");
  }
});

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
