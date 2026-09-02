import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  cleanupReferenceAssets,
  previewReferenceCleanup,
} from "../server/references/cleanup-service.mjs";
import {
  REFERENCE_RETENTION_DEFAULTS,
  loadReferenceRetentionPolicy,
  referenceRetentionWindow,
} from "../server/references/retention.mjs";

const NOW = new Date("2026-09-01T02:00:00.000Z");

function resources() {
  return {
    config: { objectStorage: { bucket: "private-reference-test" } },
    pool: {},
    storage: {},
  };
}

test("reference retention policy is server-owned, bounded, and deterministic", () => {
  assert.deepEqual(loadReferenceRetentionPolicy({}), REFERENCE_RETENTION_DEFAULTS);
  const policy = loadReferenceRetentionPolicy({
    REFERENCE_CLEANUP_BATCH_SIZE: "25",
    REFERENCE_CLEANUP_GRACE_MINUTES: "90",
    REFERENCE_CLEANUP_LEASE_SECONDS: "120",
    REFERENCE_ORPHAN_RETENTION_DAYS: "45",
  });
  assert.deepEqual(policy, {
    batchSize: 25,
    cleanupGraceMs: 5_400_000,
    cleanupLeaseMs: 120_000,
    orphanRetentionMs: 3_888_000_000,
  });
  assert.deepEqual(referenceRetentionWindow(policy, NOW), {
    cleanupEligibleAt: new Date("2026-09-01T03:30:00.000Z"),
    leaseExpiresAt: new Date("2026-09-01T02:02:00.000Z"),
    now: NOW,
    orphanedBefore: new Date("2026-07-18T02:00:00.000Z"),
  });
  assert.throws(
    () => loadReferenceRetentionPolicy({ REFERENCE_CLEANUP_BATCH_SIZE: "0" }),
    /REFERENCE_CLEANUP_BATCH_SIZE/,
  );
  assert.throws(
    () => loadReferenceRetentionPolicy({ REFERENCE_ORPHAN_RETENTION_DAYS: "366" }),
    /REFERENCE_ORPHAN_RETENTION_DAYS/,
  );
});

test("reference cleanup deletes object bytes before terminal evidence and is idempotent", async () => {
  const candidates = [{
    id: "20000000-0000-4000-8000-000000000099",
    object_key: "references/owner/reference/original",
    owner_id: "10000000-0000-4000-8000-000000000001",
    upload_state: "expired",
  }];
  const order = [];
  const repository = {
    async stageAndClaimReferenceCleanup() {
      return {
        candidates: candidates.splice(0),
        expired: 1,
        rescued: 0,
        staged: 1,
      };
    },
    async markReferenceCleanupFailed() {
      assert.fail("success path must not record a failure");
    },
    async markReferenceCleanupSucceeded(_pool, input) {
      order.push(`record:${input.referenceId}`);
      return true;
    },
  };
  const deleteObject = async ({ bucket, key }) => {
    order.push(`delete:${bucket}:${key}`);
  };
  const options = {
    deleteObject,
    now: NOW,
    policy: REFERENCE_RETENTION_DEFAULTS,
    repository,
  };
  assert.deepEqual(await cleanupReferenceAssets(resources(), options), {
    claimed: 1,
    deleted: 1,
    expired: 1,
    failed: 0,
    lostLease: 0,
    rescued: 0,
    staged: 1,
  });
  assert.deepEqual(order, [
    "delete:private-reference-test:references/owner/reference/original",
    "record:20000000-0000-4000-8000-000000000099",
  ]);
  assert.deepEqual(await cleanupReferenceAssets(resources(), options), {
    claimed: 0,
    deleted: 0,
    expired: 1,
    failed: 0,
    lostLease: 0,
    rescued: 0,
    staged: 1,
  });
  assert.equal(order.length, 2);
});

test("reference cleanup retains retry evidence when object deletion fails", async () => {
  const failures = [];
  const logs = [];
  const repository = {
    async stageAndClaimReferenceCleanup() {
      return {
        candidates: [{ id: "reference-failure", object_key: "private/failure" }],
        expired: 0,
        rescued: 0,
        staged: 0,
      };
    },
    async markReferenceCleanupFailed(_pool, input) {
      failures.push(input);
      return true;
    },
    async markReferenceCleanupSucceeded() {
      assert.fail("failed deletion must not record terminal evidence");
    },
  };
  const result = await cleanupReferenceAssets(resources(), {
    deleteObject: async () => {
      throw new Error("storage unavailable");
    },
    logger: { error: (message) => logs.push(message) },
    now: NOW,
    policy: REFERENCE_RETENTION_DEFAULTS,
    repository,
  });
  assert.equal(result.failed, 1);
  assert.equal(result.deleted, 0);
  assert.equal(failures[0].errorCode, "OBJECT_DELETE_FAILED");
  assert.equal(failures[0].referenceId, "reference-failure");
  assert.match(logs[0], /reference\.cleanup_delete_failed/);
});

test("reference cleanup dry-run never stages or deletes data", async () => {
  const repository = {
    async inspectReferenceCleanup(_pool, input) {
      assert.equal(input.ownerId, "owner-test");
      return { dueForDeletion: 2, eligibleToStage: 3, protected: 4 };
    },
  };
  assert.deepEqual(
    await previewReferenceCleanup(resources(), {
      now: NOW,
      ownerId: "owner-test",
      policy: REFERENCE_RETENTION_DEFAULTS,
      repository,
    }),
    { dueForDeletion: 2, eligibleToStage: 3, protected: 4 },
  );
});

test("reference cleanup migration and repository preserve project and generation references", async () => {
  const [
    migration,
    schema,
    repository,
    lifecycleLock,
    generationRepository,
    projectRepository,
    runtime,
    compose,
    packageJson,
  ] = await Promise.all([
    readFile(new URL("../migrations/0007_m4_reference_cleanup.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/references/cleanup-repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/references/lifecycle-lock.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/generation/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/projects/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/runtime/reference-cleanup.mjs", import.meta.url), "utf8"),
    readFile(new URL("../compose.yaml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /cleanup_eligible_at/);
  assert.match(migration, /cleanup_lease_owner/);
  assert.match(migration, /cleanup_attempt_count/);
  assert.match(migration, /object_deleted_at/);
  assert.match(schema, /cleanupEligibleAt/);
  assert.match(repository, /jsonb_array_elements\(batch\.reference_snapshot\)/);
  assert.match(repository, /jsonb_array_elements\(project\.reference_snapshot\)/);
  assert.match(repository, /jsonb_array_elements\(draft\.reference_snapshot\)/);
  assert.match(repository, /FOR UPDATE SKIP LOCKED/);
  assert.match(repository, /REFERENCE_ORPHANED/);
  assert.match(repository, /lockReferenceLifecycle/);
  assert.match(lifecycleLock, /pg_advisory_xact_lock/);
  assert.match(generationRepository, /lockAndVerify|lockReferenceLifecycle/);
  assert.match(generationRepository, /findReadyReferences\(client/);
  assert.match(projectRepository, /verifyProjectReferences/);
  assert.match(projectRepository, /findReadyReferences\(client/);
  assert.match(runtime, /mode: "dry-run"/);
  assert.match(compose, /profiles: \["maintenance"\]/);
  assert.equal(JSON.parse(packageJson).scripts["references:cleanup"], "node server/runtime/reference-cleanup.mjs");
});
