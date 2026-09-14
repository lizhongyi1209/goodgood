import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import pg from "pg";

// Only the named, disposable PostgreSQL databases below receive fixtures.
// This runner never starts a Worker, accesses object storage, or calls a provider.
const selections = {
  gg091: {
    database: "goodgood_gg091_invitation_test_checkpoint",
    file: "tests/gg091-account-invitations-postgres.test.mjs",
    urlFlag: "GOODGOOD_GG091_DATABASE_URL",
    flags: { GOODGOOD_GG091_INTEGRATION: "1", GOODGOOD_GG091_NO_WORKER: "1" },
  },
  gg029: {
    database: "gg029_email_auth_test",
    file: "tests/gg029-email-auth-postgres.test.mjs",
    urlFlag: "GOODGOOD_EMAIL_AUTH_TEST_DATABASE_URL",
    flags: {},
  },
  gg031: {
    database: "gg031_email_enterprise_test",
    file: "tests/gg031-email-enterprise-integration.test.mjs",
    urlFlag: "GOODGOOD_GG031_DATABASE_URL",
    flags: {},
  },
};
const selection = selections[process.argv[2]];
assert.ok(selection && process.argv.length === 3, "Expected gg091, gg029, or gg031");
const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1", "Only the preserved local mock stack is supported");
assert.equal(url.port, "54449");
assert.equal(url.pathname, "/goodgood");
assert.equal(process.env.GENERATION_PROVIDER_KIND, "mock");
const target = new URL(url);
target.pathname = "/" + selection.database;
url.pathname = "/postgres";
const admin = new pg.Pool({ connectionString: url.href, max: 1 });
let created = false;
try {
  assert.equal(
    (await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [selection.database])).rowCount,
    0,
    "Refusing an occupied test database; inspect it manually instead of resetting it",
  );
  // Names are fixed code constants, never interpolated from external input.
  await admin.query("CREATE DATABASE " + selection.database);
  created = true;
  assert.equal(
    (await admin.query("SELECT 1 FROM pg_stat_activity WHERE datname=$1", [selection.database])).rowCount,
    0,
    "Unexpected client attached to the disposable database",
  );
  const result = spawnSync(process.execPath, ["--test", selection.file], {
    env: {
      ...process.env,
      ...selection.flags,
      [selection.urlFlag]: target.href,
    },
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) process.exitCode = 1;
} finally {
  try {
    if (created) {
      assert.equal(
        (await admin.query("SELECT 1 FROM pg_stat_activity WHERE datname=$1", [selection.database])).rowCount,
        0,
        "Test clients remain: leave the named database intact for inspection",
      );
      await admin.query("DROP DATABASE " + selection.database);
      console.log("Removed only the named disposable database: " + selection.database);
    }
  } finally {
    await admin.end();
  }
}
