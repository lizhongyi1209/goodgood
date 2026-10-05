import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { createReusableReferenceUpload } from "../server/references/upload-reuse.mjs";

const enabled = process.env.GOODGOOD_GG383_REFERENCE_REUSE_SQL_TESTS === "1";
// Dedicated disposable database only. This test has no jobs, queues, assets or provider calls.
test("identical original/retry/concurrent uploads reuse one row; copies, changed bytes and owners stay distinct", { skip: !enabled }, async () => {
  const connectionString = process.env.GOODGOOD_GG383_REFERENCE_REUSE_DATABASE_URL;
  assert.ok(connectionString, "Name the disposable database explicitly.");
  const url = new URL(connectionString);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/goodgood_gg383_reference_upload_reuse_test");
  const pool = new pg.Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  const schema = "gg383_" + randomUUID().replaceAll("-", "");
  const control = await pool.connect();
  let created = false;
  const ownerId = randomUUID(), workspaceId = randomUUID();
  const file = { clientId: "original", name: "sample.png", mimeType: "image/png", byteSize: 100, checksum: "a".repeat(64), reuseExisting: true };
  const args = (selected = file, overrides = {}) => ({ file: selected, ownerId, workspaceId, uploadTtlSeconds: 1800, newKey: (value) => value, ...overrides });
  const run = async (options) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN"); await client.query('SET LOCAL search_path TO "' + schema + '"');
      const result = await createReusableReferenceUpload(client, options);
      await client.query("COMMIT"); return result;
    } catch (cause) { await client.query("ROLLBACK"); throw cause; }
    finally { client.release(); }
  };
  try {
    assert.equal((await control.query("SELECT to_regclass('public.generation_jobs') AS jobs, to_regclass('public.generation_outbox') AS outbox")).rows[0].jobs, null);
    assert.equal((await control.query("SELECT count(*)::int AS workers FROM pg_stat_activity WHERE datname = current_database() AND application_name ILIKE '%worker%'")).rows[0].workers, 0);
    await control.query('CREATE SCHEMA "' + schema + '"'); created = true;
    await control.query('SET search_path TO "' + schema + '"');
    await control.query(`CREATE TABLE reference_assets (
      id uuid PRIMARY KEY, owner_id uuid, workspace_id uuid, creator_owner_id uuid, object_key text UNIQUE,
      original_file_name text, declared_mime_type text, detected_mime_type text, declared_byte_size bigint, byte_size bigint,
      checksum text, upload_state text DEFAULT 'pending', moderation_state text DEFAULT 'pending',
      object_deleted_at timestamptz, expires_at timestamptz, created_at timestamptz DEFAULT now())`);
    await control.query(await readFile(new URL("../migrations/0067_gg383_reference_upload_reuse.sql", import.meta.url), "utf8"));
    const [first, retry] = await Promise.all([run(args()), run(args({ ...file, clientId: "parallel" }))]);
    assert.equal(first.id, retry.id);
    assert.equal((await control.query("SELECT count(*)::int AS count FROM reference_assets")).rows[0].count, 1);
    await control.query("UPDATE reference_assets SET upload_state='ready', moderation_state='accepted', checksum=$2, detected_mime_type='image/png', byte_size=100 WHERE id=$1", [first.id, file.checksum]);
    const reused = await run(args({ ...file, clientId: "new-drop", name: "renamed.png" }));
    assert.equal(reused.id, first.id); assert.equal(reused.upload_state, "ready"); assert.equal(reused.original_file_name, "sample.png");
    const copyFile = { ...file, clientId: "edited-copy", reuseExisting: false };
    const copy = await run(args(copyFile)); assert.notEqual(copy.id, first.id);
    assert.equal((await run(args(copyFile))).id, copy.id);
    const otherOwner = await run(args(file, { ownerId: randomUUID() })); assert.notEqual(otherOwner.id, first.id);
    const otherWorkspace = await run(args(file, { workspaceId: randomUUID() })); assert.notEqual(otherWorkspace.id, first.id);
    assert.notEqual((await run(args({ ...file, checksum: "b".repeat(64) }))).id, first.id);
    await control.query("UPDATE reference_assets SET object_deleted_at=now() WHERE id=$1", [first.id]);
    const next = await run(args({ ...file, clientId: "after-delete" })); assert.notEqual(next.id, first.id);
    await control.query("UPDATE reference_assets SET upload_state='rejected', moderation_state='rejected' WHERE id=$1", [next.id]);
    const afterFailure = await run(args({ ...file, clientId: "after-failure" })); assert.notEqual(afterFailure.id, next.id);
    await control.query("UPDATE reference_assets SET expires_at=now()-interval '1 second' WHERE id=$1", [afterFailure.id]);
    assert.notEqual((await run(args({ ...file, clientId: "after-expiry" }))).id, afterFailure.id);
  } finally {
    if (created) await control.query('DROP SCHEMA "' + schema + '" CASCADE');
    control.release(); await pool.end();
  }
});
