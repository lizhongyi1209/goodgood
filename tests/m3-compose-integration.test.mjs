import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import pg from "pg";
import { createClient } from "redis";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { GENERATION_READY_QUEUE } from "../server/generation/config.mjs";

const enabled = process.env.GOODGOOD_M3_INTEGRATION === "1";
const webOrigin = process.env.GOODGOOD_M3_WEB_ORIGIN ?? "http://127.0.0.1:3000";
const databaseUrl =
  process.env.GOODGOOD_M3_DATABASE_URL ??
  "postgresql://goodgood:goodgood-local-only@127.0.0.1:5432/goodgood";
const redisUrl = process.env.GOODGOOD_M3_REDIS_URL ?? "redis://127.0.0.1:6379";
const execFileAsync = promisify(execFile);
const { Pool } = pg;

async function submit(prompt, idempotencyKey) {
  const response = await fetch(`${webOrigin}/api/generations`, {
    body: JSON.stringify({
      aspectRatio: "4:5",
      count: 1,
      modelId: "nano-banana-2",
      prompt,
      references: [],
      resolution: "2K",
    }),
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    method: "POST",
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function poll(jobId, predicate = (job) => ["succeeded", "failed"].includes(job.state), timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${webOrigin}/api/generations/${jobId}`);
    assert.equal(response.status, 200);
    const job = await response.json();
    if (predicate(job)) return job;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out polling ${jobId}`);
}

test(
  "Compose completes the durable M3 success, failure, timeout, duplicate, and restart paths",
  { skip: !enabled, timeout: 90_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl });
    const redis = createClient({ url: redisUrl });
    await redis.connect();
    context.after(async () => {
      await Promise.allSettled([pool.end(), redis.quit()]);
    });

    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    const migrationCount = await pool.query(
      "SELECT count(*)::int AS count FROM goodgood_schema_migrations WHERE version = '0001_m3_generation.sql'",
    );
    assert.equal(migrationCount.rows[0].count, 1);

    const suffix = `${Date.now()}-${process.pid}`;
    const successKey = `m3-success-${suffix}`;
    const submitted = await submit("M3 durable success", successKey);
    const duplicate = await submit("M3 durable success", successKey);
    assert.equal(duplicate.id, submitted.id);
    const conflictingResponse = await fetch(`${webOrigin}/api/generations`, {
      body: JSON.stringify({
        aspectRatio: "4:5",
        count: 1,
        modelId: "nano-banana-2",
        prompt: "different payload",
        references: [],
        resolution: "2K",
      }),
      headers: {
        "content-type": "application/json",
        "idempotency-key": successKey,
      },
      method: "POST",
    });
    assert.equal(conflictingResponse.status, 409);
    const succeeded = await poll(submitted.id);
    assert.equal(succeeded.state, "succeeded");
    assert.equal(succeeded.outputs.length, 1);
    const assetResponse = await fetch(succeeded.outputs[0].previewUrl);
    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get("content-type") ?? "", /^image\/png/);

    await redis.lPush(GENERATION_READY_QUEUE, submitted.id, submitted.id);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const duplicateEvidence = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM generation_jobs WHERE id = $1) AS jobs,
         (SELECT count(*)::int FROM generation_attempts WHERE job_id = $1) AS attempts,
         (SELECT count(*)::int FROM assets WHERE job_id = $1) AS assets`,
      [submitted.id],
    );
    assert.deepEqual(duplicateEvidence.rows[0], { jobs: 1, attempts: 1, assets: 1 });

    const failed = await poll((await submit("M3 模拟 error", `m3-fail-${suffix}`)).id);
    assert.equal(failed.state, "failed");
    assert.equal(failed.error.code, "MODEL_REJECTED");
    const retriedResponse = await fetch(
      `${webOrigin}/api/generations/${failed.id}/retry`,
      {
        headers: { "idempotency-key": `m3-retry-${suffix}` },
        method: "POST",
      },
    );
    if (!retriedResponse.ok) throw new Error(await retriedResponse.text());
    const retried = await poll((await retriedResponse.json()).id);
    assert.equal(retried.state, "succeeded");

    const timedOut = await poll(
      (await submit("M3 模拟 timeout", `m3-timeout-${suffix}`)).id,
    );
    assert.equal(timedOut.state, "failed");
    assert.equal(timedOut.error.code, "MODEL_TIMEOUT");

    const slow = await submit("M3 slow worker restart", `m3-restart-${suffix}`);
    await poll(
      slow.id,
      (job) => job.state === "running" || job.state === "refining",
      10_000,
    );
    await execFileAsync("docker", ["compose", "kill", "worker"], {
      cwd: new URL("..", import.meta.url),
    });
    await execFileAsync("docker", ["compose", "up", "--detach", "--wait", "worker"], {
      cwd: new URL("..", import.meta.url),
    });
    const recovered = await poll(slow.id, undefined, 35_000);
    assert.equal(recovered.state, "succeeded");
    const recoveryEvidence = await pool.query(
      "SELECT count(*)::int AS count FROM assets WHERE job_id = $1",
      [slow.id],
    );
    assert.equal(recoveryEvidence.rows[0].count, 1);
  },
);
