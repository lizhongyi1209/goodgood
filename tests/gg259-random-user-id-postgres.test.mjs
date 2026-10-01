import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { formatPublicUserId } from "../shared/profile-policy.mjs";

test("GG-259 isolated SQL random allocation preserves identities and capacity through duplicates, concurrency, rollback and exhaustion", { skip: process.env.GOODGOOD_GG259_INTEGRATION !== "1" }, async () => {
  const target = new URL(process.env.GOODGOOD_GG259_DATABASE_URL ?? "http://invalid");
  assert.ok(["127.0.0.1", "localhost"].includes(target.hostname));
  assert.match(target.pathname, /^\/goodgood_gg259_random_id_test[a-z0-9_]*$/);
  assert.equal(process.env.GOODGOOD_GG259_NO_WORKER, "1");
  const pool = new pg.Pool({ connectionString: target.href, max: 6 });
  const users = Array.from({ length: 4 }, (_, i) => ({ id: randomUUID(), email: `before-${i}@example.invalid` }));
  const state = async () => ({ count: (await pool.query("SELECT next_id FROM user_public_id_allocator WHERE singleton")).rows[0].next_id,
    swaps: (await pool.query("SELECT * FROM user_public_id_swaps ORDER BY slot")).rows });
  const insert = async (email, id = randomUUID(), client = pool) => client.query("INSERT INTO users(id,email) VALUES($1,$2) ON CONFLICT(email) DO NOTHING RETURNING public_user_id", [id, email]);
  try {
    assert.equal((await pool.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()")).rowCount, 0);
    assert.equal((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount, 0);
    await pool.query("CREATE TABLE users(id uuid PRIMARY KEY,email text UNIQUE NOT NULL,created_at timestamptz NOT NULL DEFAULT now()); CREATE TABLE personal_profiles(owner_id uuid PRIMARY KEY REFERENCES users(id),display_name text,handle text UNIQUE)");
    for (const user of users) await pool.query("INSERT INTO users(id,email) VALUES($1,$2)", [user.id, user.email]);
    await pool.query("INSERT INTO personal_profiles VALUES($1,'kept-name','kept_handle')", [users[0].id]);
    for (const file of ["0057_gg252_default_profile_handle.sql", "0058_gg254_public_user_ids.sql"]) await pool.query(await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
    await pool.query("DELETE FROM users WHERE id=$1", [users[3].id]);
    const old = (await pool.query("SELECT id,email FROM users ORDER BY id")).rows;
    const profiles = (await pool.query("SELECT * FROM personal_profiles")).rows;
    await pool.query("BEGIN");
    await pool.query(await readFile(new URL("../migrations/0059_gg259_random_public_user_ids.sql", import.meta.url), "utf8"));
    await pool.query("COMMIT");
    assert.deepEqual((await pool.query("SELECT id,email FROM users ORDER BY id")).rows, old);
    assert.deepEqual((await pool.query("SELECT * FROM personal_profiles")).rows, profiles);
    const migrated = (await pool.query("SELECT public_user_id FROM users")).rows.map(row => row.public_user_id);
    assert.equal(new Set(migrated).size, 3);
    for (const value of migrated) assert.match(formatPublicUserId(value), /^\d{6}$/);
    assert.equal((await state()).count, 4, "deleted-account capacity must remain consumed");

    const beforeDuplicate = await state();
    assert.equal((await insert(users[0].email)).rowCount, 0);
    await pool.query("INSERT INTO users(id,email) VALUES($1,'same-uuid@example.invalid') ON CONFLICT(id) DO NOTHING", [users[0].id]);
    assert.deepEqual(await state(), beforeDuplicate);
    const sameEmail = await Promise.all(Array.from({ length: 6 }, () => insert("concurrent-same@example.invalid")));
    assert.equal(sameEmail.reduce((sum, result) => sum + result.rowCount, 0), 1);
    assert.equal((await state()).count, 5);
    const distinct = await Promise.all(Array.from({ length: 24 }, (_, i) => insert(`concurrent-${i}@example.invalid`)));
    const allocated = distinct.flatMap(result => result.rows.map(row => row.public_user_id));
    assert.equal(new Set(allocated).size, 24);
    assert.ok(allocated.every(value => !migrated.includes(value)));
    assert.equal((await state()).count, 29);

    const beforeRollback = await state();
    const client = await pool.connect();
    try { await client.query("BEGIN"); await insert("rollback@example.invalid", randomUUID(), client); await client.query("ROLLBACK"); }
    finally { client.release(); }
    assert.deepEqual(await state(), beforeRollback);
    assert.equal((await pool.query("SELECT 1 FROM users WHERE email='rollback@example.invalid'")).rowCount, 0);
    await assert.rejects(pool.query("UPDATE users SET public_user_id=(public_user_id+1)%1000000 WHERE id=$1", [users[0].id]), error => error.code === "23514");
    await assert.rejects(pool.query("INSERT INTO users(id,email,public_user_id) VALUES($1,'forged@example.invalid',123456)", [randomUUID()]), error => error.code === "23514");
    assert.deepEqual(await state(), beforeRollback);

    const deleted = allocated[0];
    await pool.query("DELETE FROM users WHERE public_user_id=$1", [deleted]);
    const remaining = 1000000 - (await state()).count;
    assert.equal((await pool.query("SELECT EXISTS(SELECT 1 FROM user_public_id_swaps WHERE value=$1) OR ($1 < $2 AND NOT EXISTS(SELECT 1 FROM user_public_id_swaps WHERE slot=$1)) AS available", [deleted, remaining])).rows[0].available, false);

    // Construct a valid virtual pool with just three unused values. This checks
    // the millionth assignment without creating a million synthetic accounts.
    const tail = await pool.connect();
    const beforeTail = await state();
    try {
      await tail.query("BEGIN");
      const free = (await tail.query("SELECT n FROM generate_series(999999,0,-1) AS n WHERE NOT EXISTS(SELECT 1 FROM users WHERE public_user_id=n) LIMIT 3")).rows.map(row => row.n);
      await tail.query("DELETE FROM user_public_id_swaps; UPDATE user_public_id_allocator SET next_id=999997 WHERE singleton");
      for (const [slot, value] of free.entries()) await tail.query("INSERT INTO user_public_id_swaps(slot,value) VALUES($1,$2)", [slot, value]);
      const drawn = [];
      for (let i = 0; i < 3; i++) drawn.push((await insert(`tail-${i}@example.invalid`, randomUUID(), tail)).rows[0].public_user_id);
      assert.deepEqual(drawn.toSorted(), free.toSorted());
      assert.equal((await tail.query("SELECT next_id FROM user_public_id_allocator WHERE singleton")).rows[0].next_id, 1000000);
      assert.equal((await tail.query("SELECT * FROM user_public_id_swaps")).rowCount, 0);
      assert.equal((await insert(users[0].email, randomUUID(), tail)).rowCount, 0, "duplicates still work when the pool is full");
      await assert.rejects(insert("over-capacity@example.invalid", randomUUID(), tail), error => error.code === "54000");
    } finally { await tail.query("ROLLBACK"); tail.release(); }
    assert.deepEqual(await state(), beforeTail);
    const all = (await pool.query("SELECT public_user_id FROM users")).rows.map(row => row.public_user_id);
    assert.equal(new Set(all).size, all.length);
    assert.ok(all.every(value => /^\d{6}$/.test(formatPublicUserId(value))));
  } finally { await pool.end(); }
});
