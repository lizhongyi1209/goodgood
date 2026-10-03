import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const enabled = process.env.GOODGOOD_GG356_MODEL_CONSTRAINT_TESTS === "1";
const tables = ["generation_batches", "projects", "creation_drafts"];
const legacyModels = ["nano-banana-2", "nano-banana-pro", "gpt-image-2.5-sunburst", "gpt-image-2", "gpt-image-2.5-flare"];

// Never point this write test at the live local database/queue. Its schema has
// only model-ID columns: no jobs, outbox, credit accounts or provider Worker.
test("upgrade admits Seedream across batches, projects and drafts while preserving rows and rejecting malformed IDs", { skip: !enabled }, async () => {
  const connectionString = process.env.GOODGOOD_GG356_MODEL_CONSTRAINT_DATABASE_URL;
  assert.ok(connectionString, "An explicitly named disposable test database is required.");
  const url = new URL(connectionString);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/goodgood_gg356_model_constraints_test");
  const sql = await readFile(new URL("../migrations/0066_gg356_model_id_constraints.sql", import.meta.url), "utf8");
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    const schema = `gg356_${randomUUID().replaceAll("-", "")}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    const expectRejected = async (table, modelId) => {
      await client.query("SAVEPOINT invalid_model");
      try {
        await assert.rejects(client.query(`INSERT INTO ${table} (model_id) VALUES ($1)`, [modelId]),
          (error) => error.code === "23514" && error.constraint === `${table}_model_check`);
      } finally {
        await client.query("ROLLBACK TO SAVEPOINT invalid_model");
        await client.query("RELEASE SAVEPOINT invalid_model");
      }
    };
    const originalRows = new Map();
    for (const table of tables) {
      await client.query(`CREATE TABLE ${table} (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, model_id text NOT NULL,
        CONSTRAINT ${table}_model_check CHECK (model_id IN ('nano-banana-2','nano-banana-pro','gpt-image-2.5-sunburst','gpt-image-2','gpt-image-2.5-flare')))`);
      for (const model of legacyModels) await client.query(`INSERT INTO ${table} (model_id) VALUES ($1)`, [model]);
      originalRows.set(table, (await client.query(`SELECT * FROM ${table} ORDER BY id`)).rows);
      await expectRejected(table, "seedream-5.0-pro");
    }
    await client.query(sql);
    for (const table of tables) {
      assert.deepEqual((await client.query(`SELECT * FROM ${table} ORDER BY id`)).rows, originalRows.get(table));
      const inserted = await client.query(`INSERT INTO ${table} (model_id) VALUES ($1) RETURNING model_id`, ["seedream-5.0-pro"]);
      assert.equal(inserted.rows[0].model_id, "seedream-5.0-pro");
      for (const invalid of ["", "a", "Seedream 5.0 Pro", "seedream/5", "-seedream", "x".repeat(81)]) await expectRejected(table, invalid);
    }
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
