import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import {
  createAccountDeletionRegisterExport,
  parseAccountDeletionRegisterExport,
  serializeAccountDeletionRegisterExport,
} from "../server/account-deletion/register-export-contract.mjs";
import {
  readAccountDeletionRegisterForExport,
} from "../server/account-deletion/register-export-repository.mjs";
import {
  exportAccountDeletionRegister,
  replayAccountDeletionRegister,
} from "../server/account-deletion/register-recovery-service.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";

const { Pool } = pg;
const EXPORTED_AT = new Date("2026-09-07T12:00:00.000Z");
const REPLAYED_AT = new Date("2026-09-07T12:30:00.000Z");
const REQUEST_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TARGET_OWNER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function completedRecord(overrides = {}) {
  return {
    auditRetentionUntil: "2027-09-05T10:00:00.000Z",
    completedAt: "2026-09-05T10:00:00.000Z",
    createdAt: "2026-09-01T10:00:00.000Z",
    deadlineAt: "2026-10-01T10:00:00.000Z",
    requestId: REQUEST_ID,
    state: "completed",
    targetOwnerId: TARGET_OWNER_ID,
    updatedAt: "2026-09-05T10:00:00.000Z",
    ...overrides,
  };
}

function processingRecord(overrides = {}) {
  return completedRecord({
    auditRetentionUntil: null,
    completedAt: null,
    requestId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    state: "processing",
    targetOwnerId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    updatedAt: "2026-09-06T10:00:00.000Z",
    ...overrides,
  });
}

function captureLogger() {
  const errors = [];
  const infos = [];
  return {
    errors,
    infos,
    logger: {
      error(message) { errors.push(message); },
      info(message) { infos.push(message); },
    },
  };
}

test("deletion-register export is deterministic, versioned, strict, and digest-bound", () => {
  const first = createAccountDeletionRegisterExport({
    exportedAt: EXPORTED_AT.toISOString(),
    records: [processingRecord(), completedRecord()],
  });
  const second = createAccountDeletionRegisterExport({
    exportedAt: EXPORTED_AT.toISOString(),
    records: [completedRecord(), processingRecord()],
  });

  assert.equal(first.format, "goodgood.account-deletion-register");
  assert.equal(first.version, 1);
  assert.equal(first.recordCount, 2);
  assert.equal(first.sha256, second.sha256);
  assert.deepEqual(first.records, second.records);
  assert.equal(first.records[0].requestId, REQUEST_ID);
  assert.equal(parseAccountDeletionRegisterExport(
    serializeAccountDeletionRegisterExport(first),
  ).sha256, first.sha256);

  const tampered = JSON.parse(JSON.stringify(first));
  tampered.records[0].deadlineAt = "2026-10-02T10:00:00.000Z";
  assert.throws(
    () => parseAccountDeletionRegisterExport(tampered),
    /digest differs/i,
  );
  assert.throws(
    () => createAccountDeletionRegisterExport({
      exportedAt: EXPORTED_AT.toISOString(),
      records: [{ ...completedRecord(), email: "private@example.invalid" }],
    }),
    /unexpected fields/i,
  );
  assert.throws(
    () => createAccountDeletionRegisterExport({
      exportedAt: EXPORTED_AT.toISOString(),
      records: [completedRecord(), completedRecord()],
    }),
    /must be unique/i,
  );
  assert.throws(
    () => createAccountDeletionRegisterExport({
      exportedAt: "2026-09-04T10:00:00.000Z",
      records: [completedRecord()],
    }),
    /postdate/i,
  );
});

test("register export repository selects processing and unexpired completed tombstones only", async () => {
  let captured;
  const rows = await readAccountDeletionRegisterForExport(
    {
      async query(sql, parameters) {
        captured = { sql, parameters };
        return {
          rows: [{
            audit_retention_until: new Date("2027-09-05T10:00:00.000Z"),
            completed_at: new Date("2026-09-05T10:00:00.000Z"),
            created_at: new Date("2026-09-01T10:00:00.000Z"),
            deadline_at: new Date("2026-10-01T10:00:00.000Z"),
            request_id: REQUEST_ID,
            state: "completed",
            target_owner_id: TARGET_OWNER_ID,
            updated_at: new Date("2026-09-05T10:00:00.000Z"),
          }],
        };
      },
    },
    { exportedAt: EXPORTED_AT },
  );

  assert.deepEqual(rows, [completedRecord()]);
  assert.match(captured.sql, /state = 'processing'/);
  assert.match(captured.sql, /audit_retention_until > \$1/);
  assert.match(captured.sql, /ORDER BY request_id/);
  assert.deepEqual(captured.parameters, [EXPORTED_AT]);
  assert.doesNotMatch(captured.sql, /email|object_key|subject|mail_reference/i);
});

test("register recovery service returns and logs aggregate-only export/replay evidence", async () => {
  const captured = captureLogger();
  const repository = {
    async readAccountDeletionRegisterForExport() {
      return [completedRecord()];
    },
    async applyAccountDeletionRegisterReplay(_pool, input) {
      assert.equal(input.records.length, 1);
      assert.equal(input.sha256.length, 64);
      return {
        alreadyApplied: 0,
        completedApplied: 1,
        deletedCreativeRecords: 3,
        deletedIdentities: 1,
        deletedSessions: 1,
        expiredCredits: "100",
        leakedOwnerId: TARGET_OWNER_ID,
        missingOwners: 0,
        processingBlocked: 0,
      };
    },
  };
  const artifact = await exportAccountDeletionRegister({}, {
    exportedAt: EXPORTED_AT,
    logger: captured.logger,
    repository,
  });
  const result = await replayAccountDeletionRegister({}, artifact, {
    expectedSha256: artifact.sha256,
    logger: captured.logger,
    replayedAt: REPLAYED_AT,
    repository,
  });

  assert.equal(result.ready, true);
  assert.equal(result.completedApplied, 1);
  assert.equal(result.expiredCredits, "100");
  assert.equal("leakedOwnerId" in result, false);
  assert.equal(captured.errors.length, 0);
  assert.equal(captured.infos.length, 2);
  assert.doesNotMatch(
    captured.infos.join("\n"),
    new RegExp(`${REQUEST_ID}|${TARGET_OWNER_ID}`),
  );

  const blocked = await replayAccountDeletionRegister(
    {},
    createAccountDeletionRegisterExport({
      exportedAt: EXPORTED_AT.toISOString(),
      records: [processingRecord()],
    }),
    {
      expectedSha256: createAccountDeletionRegisterExport({
        exportedAt: EXPORTED_AT.toISOString(),
        records: [processingRecord()],
      }).sha256,
      logger: captureLogger().logger,
      replayedAt: REPLAYED_AT,
      repository: {
        ...repository,
        async applyAccountDeletionRegisterReplay() {
          return {
            alreadyApplied: 0,
            completedApplied: 0,
            deletedCreativeRecords: 0,
            deletedIdentities: 0,
            deletedSessions: 0,
            expiredCredits: "0",
            missingOwners: 0,
            processingBlocked: 1,
          };
        },
      },
    },
  );
  assert.equal(blocked.ready, false);
  assert.equal(blocked.processingBlocked, 1);
});

test("register recovery failures expose fixed codes without source details", async () => {
  const captured = captureLogger();
  const artifact = createAccountDeletionRegisterExport({
    exportedAt: EXPORTED_AT.toISOString(),
    records: [completedRecord()],
  });
  await assert.rejects(
    replayAccountDeletionRegister({}, artifact, {
      logger: captured.logger,
      replayedAt: REPLAYED_AT,
      repository: {
        async readAccountDeletionRegisterForExport() { return []; },
        async applyAccountDeletionRegisterReplay() {
          assert.fail("an unbound artifact must not reach the repository");
        },
      },
    }),
    (error) => error.code === "ACCOUNT_DELETION_REGISTER_REPLAY_FAILED",
  );
  await assert.rejects(
    replayAccountDeletionRegister({}, artifact, {
      expectedSha256: artifact.sha256,
      logger: captured.logger,
      replayedAt: REPLAYED_AT,
      repository: {
        async readAccountDeletionRegisterForExport() { return []; },
        async applyAccountDeletionRegisterReplay() {
          throw new Error(`database exposed ${TARGET_OWNER_ID}`);
        },
      },
    }),
    (error) => error.code === "ACCOUNT_DELETION_REGISTER_REPLAY_FAILED",
  );
  assert.match(captured.errors[0], /ACCOUNT_DELETION_REGISTER_REPLAY_FAILED/);
  assert.doesNotMatch(captured.errors.join("\n"), new RegExp(TARGET_OWNER_ID));

  await assert.rejects(
    replayAccountDeletionRegister({}, artifact, {
      expectedSha256: artifact.sha256,
      logger: captured.logger,
      replayedAt: REPLAYED_AT,
      repository: {
        async readAccountDeletionRegisterForExport() { return []; },
        async applyAccountDeletionRegisterReplay() {
          return {
            alreadyApplied: 0,
            completedApplied: 0,
            deletedCreativeRecords: 0,
            deletedIdentities: 0,
            deletedSessions: 0,
            expiredCredits: "0",
            missingOwners: 0,
            processingBlocked: 0,
          };
        },
      },
    }),
    (error) => error.code === "ACCOUNT_DELETION_REGISTER_REPLAY_FAILED",
  );
});

test("restore replay implementation is transactional, local-only, and fail-closed", async () => {
  const source = await readFile(
    new URL(
      "../server/account-deletion/restore-replay-repository.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE/);
  assert.match(source, /REGISTER_REPLAY_STATE_REGRESSION/);
  assert.match(source, /DELETE FROM auth_sessions/);
  assert.match(source, /DELETE FROM auth_identities/);
  assert.match(source, /purgeOwnerCreativeGraphInTransaction/);
  assert.doesNotMatch(
    source,
    /fetch\(|https?:\/\/|process\.env|setInterval|setTimeout|child_process/,
  );
});

const integrationEnabled =
  process.env.GOODGOOD_M8_REGISTER_REPLAY_INTEGRATION === "1";
const baseDatabaseUrl =
  process.env.GOODGOOD_M8_DELETION_DATABASE_URL ??
  "postgresql://goodgood:goodgood-local-only@127.0.0.1:5432/goodgood";

function databaseUrl(databaseName) {
  const value = new URL(baseDatabaseUrl);
  value.pathname = `/${databaseName}`;
  return value.toString();
}

async function dropDatabase(adminPool, name) {
  await adminPool.query(
    `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [name],
  );
  await adminPool.query(`DROP DATABASE IF EXISTS "${name}"`);
}

async function insertRestoreFixture(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (id, email, locale, status, account_tier)
       VALUES ($1, 'restored-private@example.invalid', 'zh-CN', 'active', 'seed')`,
      [TARGET_OWNER_ID],
    );
    await client.query(
      `INSERT INTO auth_identities (id, owner_id, issuer, subject)
       VALUES ('11111111-1111-4111-8111-111111111111', $1,
               'https://restore-fake.invalid/oidc', 'restored-private-subject')`,
      [TARGET_OWNER_ID],
    );
    await client.query(
      `INSERT INTO auth_sessions (
         id, owner_id, auth_identity_id, token_hash, expires_at
       ) VALUES (
         '22222222-2222-4222-8222-222222222222', $1,
         '11111111-1111-4111-8111-111111111111', $2,
         '2026-10-01T00:00:00.000Z'
       )`,
      [TARGET_OWNER_ID, "e".repeat(64)],
    );
    await client.query(
      `INSERT INTO credit_accounts (
         id, owner_id, unit, available_balance, reserved_balance, version, status
       ) VALUES (
         '33333333-3333-4333-8333-333333333333', $1,
         'credit', 100, 0, 1, 'active'
       )`,
      [TARGET_OWNER_ID],
    );
    await client.query(
      `INSERT INTO credit_ledger_entries (
         id, account_id, owner_id, entry_type, amount, idempotency_key,
         operation_hash, reason, actor, metadata
       ) VALUES (
         '44444444-4444-4444-8444-444444444444',
         '33333333-3333-4333-8333-333333333333', $1, 'grant', 100,
         'restore-fixture-grant', $2, 'restore_fixture', 'system', '{}'::jsonb
       )`,
      [TARGET_OWNER_ID, "f".repeat(64)],
    );
    await client.query(
      `INSERT INTO projects (
         id, owner_id, create_idempotency_key, create_input_hash, name, prompt,
         model_id, aspect_ratio, resolution, generation_count
       ) VALUES (
         '55555555-5555-4555-8555-555555555555', $1,
         'restore-fixture-project', $2, 'restore', 'private prompt',
         'nano-banana-2', '1:1', '1K', 1
       )`,
      [TARGET_OWNER_ID, "f".repeat(64)],
    );
    await client.query(
      `INSERT INTO creation_drafts (
         owner_id, prompt, model_id, aspect_ratio, resolution, generation_count,
         expires_at
       ) VALUES (
         $1, 'private draft', 'nano-banana-2', '1:1', '1K', 1,
         '2026-10-01T00:00:00.000Z'
       )`,
      [TARGET_OWNER_ID],
    );
    await client.query(
      `INSERT INTO reference_assets (
         id, owner_id, object_key, original_file_name, declared_mime_type,
         declared_byte_size, upload_state, moderation_state, expires_at
       ) VALUES (
         '66666666-6666-4666-8666-666666666666', $1,
         'private/restored-owner/reference.png', 'reference.png', 'image/png',
         128, 'ready', 'accepted', '2026-10-01T00:00:00.000Z'
       )`,
      [TARGET_OWNER_ID],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

test(
  "isolated PostgreSQL restore replay removes completed local identity and content without network access",
  { skip: !integrationEnabled, timeout: 30_000 },
  async () => {
    const suffix = randomUUID().replaceAll("-", "");
    const sourceName = `goodgood_c62k_source_${suffix}`;
    const restoreName = `goodgood_c62k_restore_${suffix}`;
    const adminPool = new Pool({ connectionString: baseDatabaseUrl, max: 1 });
    let sourcePool;
    let restorePool;
    try {
      await adminPool.query(`CREATE DATABASE "${sourceName}"`);
      await adminPool.query(`CREATE DATABASE "${restoreName}"`);
      await applyMigrations({
        databaseUrl: databaseUrl(sourceName),
        logger: { log() {} },
      });
      await applyMigrations({
        databaseUrl: databaseUrl(restoreName),
        logger: { log() {} },
      });
      sourcePool = new Pool({ connectionString: databaseUrl(sourceName), max: 2 });
      restorePool = new Pool({ connectionString: databaseUrl(restoreName), max: 2 });
      await sourcePool.query(
        `INSERT INTO account_deletion_register (
           request_id, target_owner_id, state, deadline_at, completed_at,
           audit_retention_until, created_at, updated_at
         ) VALUES ($1, $2, 'completed', $3, $4, $5, $6, $4)`,
        [
          REQUEST_ID,
          TARGET_OWNER_ID,
          completedRecord().deadlineAt,
          completedRecord().completedAt,
          completedRecord().auditRetentionUntil,
          completedRecord().createdAt,
        ],
      );
      await insertRestoreFixture(restorePool);

      const artifact = await exportAccountDeletionRegister(sourcePool, {
        exportedAt: EXPORTED_AT,
        logger: { error() {}, info() {} },
      });
      const first = await replayAccountDeletionRegister(restorePool, artifact, {
        expectedSha256: artifact.sha256,
        logger: { error() {}, info() {} },
        replayedAt: REPLAYED_AT,
      });
      assert.deepEqual(first, {
        alreadyApplied: 0,
        artifactSha256: artifact.sha256,
        completedApplied: 1,
        deletedCreativeRecords: 3,
        deletedIdentities: 1,
        deletedSessions: 1,
        expiredCredits: "100",
        missingOwners: 0,
        processingBlocked: 0,
        ready: true,
        recordCount: 1,
      });

      const state = await restorePool.query(
        `SELECT
           (SELECT email FROM users WHERE id = $1) AS email,
           (SELECT status FROM users WHERE id = $1) AS status,
           (SELECT anonymized_at FROM users WHERE id = $1) AS anonymized_at,
           (SELECT count(*)::int FROM auth_identities WHERE owner_id = $1)
             AS identities,
           (SELECT count(*)::int FROM auth_sessions WHERE owner_id = $1)
             AS sessions,
           ((SELECT count(*) FROM projects WHERE owner_id = $1)
            + (SELECT count(*) FROM creation_drafts WHERE owner_id = $1)
            + (SELECT count(*) FROM reference_assets WHERE owner_id = $1))::int
             AS creative_records,
           (SELECT available_balance || '|' || reserved_balance || '|' || status
              FROM credit_accounts WHERE owner_id = $1) AS credit_state,
           (SELECT count(*)::int FROM credit_ledger_entries WHERE owner_id = $1)
             AS ledger_entries,
           (SELECT count(*)::int FROM account_deletion_steps
             WHERE request_id = $2 AND state = 'completed') AS completed_steps`,
        [TARGET_OWNER_ID, REQUEST_ID],
      );
      assert.deepEqual(state.rows[0], {
        anonymized_at: new Date(completedRecord().completedAt),
        completed_steps: 5,
        creative_records: 0,
        credit_state: "0|0|closed",
        email: `deleted-${REQUEST_ID.replaceAll("-", "")}@deleted.goodgood.invalid`,
        identities: 0,
        ledger_entries: 2,
        sessions: 0,
        status: "suspended",
      });

      const second = await replayAccountDeletionRegister(restorePool, artifact, {
        expectedSha256: artifact.sha256,
        logger: { error() {}, info() {} },
        replayedAt: new Date("2026-09-07T13:00:00.000Z"),
      });
      assert.equal(second.alreadyApplied, 1);
      assert.equal(second.completedApplied, 0);
      const ledger = await restorePool.query(
        "SELECT count(*)::int AS count FROM credit_ledger_entries WHERE owner_id = $1",
        [TARGET_OWNER_ID],
      );
      assert.equal(ledger.rows[0].count, 2);

      const processing = processingRecord();
      await sourcePool.query(
        `INSERT INTO account_deletion_register (
           request_id, target_owner_id, state, deadline_at, completed_at,
           audit_retention_until, created_at, updated_at
         ) VALUES ($1, $2, 'processing', $3, NULL, NULL, $4, $5)`,
        [
          processing.requestId,
          processing.targetOwnerId,
          processing.deadlineAt,
          processing.createdAt,
          processing.updatedAt,
        ],
      );
      await restorePool.query(
        `INSERT INTO users (id, email, locale, status, account_tier)
         VALUES ($1, 'processing-private@example.invalid', 'zh-CN', 'active', 'seed')`,
        [processing.targetOwnerId],
      );
      await restorePool.query(
        `INSERT INTO auth_identities (id, owner_id, issuer, subject)
         VALUES ('77777777-7777-4777-8777-777777777777', $1,
                 'https://restore-fake.invalid/oidc', 'processing-private-subject')`,
        [processing.targetOwnerId],
      );
      await restorePool.query(
        `INSERT INTO auth_sessions (
           id, owner_id, auth_identity_id, token_hash, expires_at
         ) VALUES (
           '88888888-8888-4888-8888-888888888888', $1,
           '77777777-7777-4777-8777-777777777777', $2,
           '2026-10-01T00:00:00.000Z'
         )`,
        [processing.targetOwnerId, "9".repeat(64)],
      );
      await restorePool.query(
        `INSERT INTO projects (
           id, owner_id, create_idempotency_key, create_input_hash, name, prompt,
           model_id, aspect_ratio, resolution, generation_count
         ) VALUES (
           '99999999-9999-4999-8999-999999999999', $1,
           'processing-restore-project', $2, 'processing', 'keep until complete',
           'nano-banana-2', '1:1', '1K', 1
         )`,
        [processing.targetOwnerId, "1".repeat(64)],
      );
      const latestArtifact = await exportAccountDeletionRegister(sourcePool, {
        exportedAt: new Date("2026-09-07T13:10:00.000Z"),
        logger: { error() {}, info() {} },
      });
      const blocked = await replayAccountDeletionRegister(
        restorePool,
        latestArtifact,
        {
          expectedSha256: latestArtifact.sha256,
          logger: { error() {}, info() {} },
          replayedAt: new Date("2026-09-07T13:20:00.000Z"),
        },
      );
      assert.equal(blocked.ready, false);
      assert.equal(blocked.alreadyApplied, 1);
      assert.equal(blocked.processingBlocked, 1);
      const processingState = await restorePool.query(
        `SELECT
           (SELECT status FROM users WHERE id = $1) AS status,
           (SELECT count(*)::int FROM auth_sessions
             WHERE owner_id = $1 AND revoked_at IS NOT NULL) AS revoked_sessions,
           (SELECT count(*)::int FROM projects WHERE owner_id = $1) AS projects,
           (SELECT state FROM account_deletion_register
             WHERE request_id = $2) AS register_state,
           (SELECT count(*)::int FROM account_deletion_steps
             WHERE request_id = $2 AND state = 'pending') AS pending_steps`,
        [processing.targetOwnerId, processing.requestId],
      );
      assert.deepEqual(processingState.rows[0], {
        pending_steps: 5,
        projects: 1,
        register_state: "processing",
        revoked_sessions: 1,
        status: "suspended",
      });
    } finally {
      await sourcePool?.end();
      await restorePool?.end();
      await dropDatabase(adminPool, sourceName);
      await dropDatabase(adminPool, restoreName);
      await adminPool.end();
    }
  },
);
