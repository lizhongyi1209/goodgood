import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import pg from "pg";
import {
  inspectAccountDeletionLifecycle,
  resolveAccountDeletionWaitStep,
} from "../server/account-deletion/lifecycle-repository.mjs";
import {
  AccountDeletionInventoryError,
  readAccountDeletionInventory,
} from "../server/account-deletion/inventory-repository.mjs";
import {
  previewAccountDeletionInventory,
} from "../server/account-deletion/inventory-service.mjs";
import {
  runAccountDeletionObjectPass,
} from "../server/account-deletion/object-service.mjs";
import {
  claimAccountDeletionCreativeStep,
  deferAccountDeletionCreativeStep,
} from "../server/account-deletion/creative-repository.mjs";
import {
  runAccountDeletionCreativePass,
} from "../server/account-deletion/creative-service.mjs";
import {
  runAccountDeletionIdentityPass,
} from "../server/account-deletion/identity-service.mjs";
import {
  claimAccountDeletionCompletionStep,
  deferAccountDeletionCompletionStep,
} from "../server/account-deletion/completion-repository.mjs";
import {
  runAccountDeletionCompletionPass,
} from "../server/account-deletion/completion-service.mjs";
import {
  runAccountDeletionWaitPass,
} from "../server/account-deletion/lifecycle-service.mjs";
import {
  createAdminAccountDeletionRequest,
} from "../server/admin/api.mjs";
import {
  createAccountDeletionRequest,
} from "../server/admin/account-deletion-repository.mjs";
import { createAdminNodeApiHandler } from "../server/admin/node-api.mjs";
import { bootstrapSiteOwner } from "../server/admin/bootstrap-site-owner.mjs";
import {
  changeAccountAccess,
  grantTestCredits,
  listManagedAccounts,
} from "../server/admin/repository.mjs";
import {
  createAuthenticationSession,
  provisionOwnerIdentity,
} from "../server/auth/repository.mjs";
import { releaseGenerationCredits } from "../server/billing/repository.mjs";
import {
  claimGenerationJob,
  completeGenerationJob,
  createGenerationJob,
  markProviderSubmissionStarted,
} from "../server/generation/repository.mjs";
import { ensureObjectStorageBucket } from "../server/generation/resources.mjs";
import { saveCreationDraft } from "../server/drafts/repository.mjs";
import { createProject } from "../server/projects/repository.mjs";
import {
  createPendingReferenceAssets,
  markReferenceReady,
} from "../server/references/repository.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { seedLocalFixtures } from "../server/persistence/seed-local-fixtures.mjs";

const { Pool } = pg;
const integrationEnabled =
  process.env.GOODGOOD_M8_DELETION_INTEGRATION === "1";
const databaseUrl =
  process.env.GOODGOOD_M8_DELETION_DATABASE_URL ??
  "postgresql://goodgood:goodgood-local-only@127.0.0.1:5432/goodgood";
const objectStorageEndpoint =
  process.env.GOODGOOD_M8_DELETION_OBJECT_STORAGE_ENDPOINT ??
  "http://127.0.0.1:9000";
const objectStorageBucket =
  process.env.GOODGOOD_M8_DELETION_OBJECT_STORAGE_BUCKET ?? "goodgood-local";

const ACTOR_ID = "10000000-0000-4000-8000-000000000001";
const LOCAL_SITE_OWNER_ID = "00000000-0000-4000-8000-000000000001";
const TARGET_ID = "20000000-0000-4000-8000-000000000002";
const REQUESTED_AT = "2026-09-06T01:00:00.000Z";
const CONFIRMED_AT = "2026-09-06T02:00:00.000Z";
const OPERATION_HASH = "a".repeat(64);

const SITE_OWNER = Object.freeze({
  accessStatus: "active",
  accountTier: "seed",
  availableCredits: "100",
  email: "owner@goodgood.invalid",
  ownerId: ACTOR_ID,
  reservedCredits: "0",
  systemRole: "site_owner",
});

function deletionInput(overrides = {}) {
  return {
    actorOwnerId: ACTOR_ID,
    idempotencyKey: "delete-request-0001",
    mailReferenceId: "mail-reference-0001",
    operationHash: OPERATION_HASH,
    reason: "用户已通过登记邮箱确认删除",
    targetOwnerId: TARGET_ID,
    verificationConfirmedAt: CONFIRMED_AT,
    verificationRequestedAt: REQUESTED_AT,
    verifiedEmail: "member@goodgood.invalid",
    ...overrides,
  };
}

function createRepositoryHarness({
  jobs = [],
  revokedSessionCount = 0,
  targetEmail = "member@goodgood.invalid",
  targetId = TARGET_ID,
  targetIsSiteOwner = false,
} = {}) {
  let action = null;
  let request = null;
  const queries = [];
  const client = {
    async query(sql, values = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      queries.push({ normalized, values });
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized)) {
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT 1 FROM system_role_assignments")) {
        return { rowCount: 1, rows: [{ exists: 1 }] };
      }
      if (normalized.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rowCount: 1, rows: [{}] };
      }
      if (normalized.startsWith("SELECT id, action_type, operation_hash")) {
        return { rowCount: action ? 1 : 0, rows: action ? [action] : [] };
      }
      if (normalized.startsWith("SELECT * FROM account_deletion_requests")) {
        return { rowCount: request ? 1 : 0, rows: request ? [request] : [] };
      }
      if (normalized.startsWith("SELECT target.id, target.email")) {
        return {
          rowCount: 1,
          rows: [{
            email: targetEmail,
            id: targetId,
            is_site_owner: targetIsSiteOwner,
            status: "active",
          }],
        };
      }
      if (
        normalized.startsWith("SELECT id FROM account_deletion_requests")
      ) {
        return { rowCount: request ? 1 : 0, rows: request ? [request] : [] };
      }
      if (normalized.startsWith("SELECT job.id, job.state")) {
        return { rowCount: jobs.length, rows: jobs };
      }
      if (normalized.startsWith("INSERT INTO administrative_actions")) {
        action = {
          action_type: "create_account_deletion_request",
          id: values[0],
          operation_hash: values[6],
        };
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("INSERT INTO account_deletion_requests")) {
        request = {
          administrative_action_id: values[3],
          cancelled_job_count: 0,
          created_at: "2026-09-06T03:00:00.000Z",
          deadline_at: "2026-10-06T03:00:00.000Z",
          id: values[0],
          released_credit_amount: "0",
          revoked_session_count: 0,
          state: "processing",
          verification_confirmed_at: values[5],
          verification_requested_at: values[4],
        };
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("INSERT INTO account_deletion_register")) {
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("INSERT INTO account_deletion_steps")) {
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("UPDATE users SET status = 'suspended'")) {
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("UPDATE auth_sessions")) {
        return {
          rowCount: revokedSessionCount,
          rows: Array.from({ length: revokedSessionCount }, (_, index) => ({
            id: `session-${index + 1}`,
          })),
        };
      }
      if (normalized.startsWith("UPDATE generation_jobs")) {
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("INSERT INTO generation_job_events")) {
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("UPDATE generation_queue_outbox")) {
        return { rowCount: 1, rows: [] };
      }
      if (normalized.startsWith("UPDATE account_deletion_requests")) {
        request = {
          ...request,
          cancelled_job_count: values[2],
          released_credit_amount: values[3],
          revoked_session_count: values[1],
        };
        return { rowCount: 1, rows: [request] };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {},
  };
  return {
    client,
    pool: { async connect() { return client; } },
    queries,
  };
}

test("M8 deletion migration is additive, irreversible, and queue-aware", async () => {
  const [migration, schema, queue, authRepository, generationRepository, route] =
    await Promise.all([
      readFile(
        new URL(
          "../migrations/0013_m8_account_deletion_requests.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/generation/queue.mjs", import.meta.url), "utf8"),
      readFile(new URL("../server/auth/repository.mjs", import.meta.url), "utf8"),
      readFile(
        new URL("../server/generation/repository.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/api/admin/users/[ownerId]/deletion-requests/route.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS account_deletion_requests/);
  assert.match(migration, /verification_confirmed_at <= verification_requested_at \+ interval '24 hours'/);
  assert.match(migration, /state IN \('processing', 'completed'\)/);
  assert.doesNotMatch(migration, /state IN \([^)]*(?:cancelled|withdrawn|reopened)/);
  assert.match(migration, /UNIQUE \(target_owner_id\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS cancelled_at/);
  assert.match(schema, /export const accountDeletionRequests/);
  assert.match(queue, /dispatched_at IS NULL AND cancelled_at IS NULL/);
  assert.match(authRepository, /FOR UPDATE OF owner, identity/);
  assert.match(authRepository, /account_deletion_requests/);
  assert.match(generationRepository, /FOR UPDATE OF job, attempt/);
  assert.match(generationRepository, /account_deletion_requests/);
  assert.match(route, /createAdminAccountDeletionRequest/);
  assert.doesNotMatch(route, /export async function (?:DELETE|PATCH)/);
});

test("M8 deletion lifecycle foundation is non-content, leased, and additive", async () => {
  const [migration, schema, requestRepository, lifecycleRepository, lifecycleService] =
    await Promise.all([
      readFile(
        new URL(
          "../migrations/0014_m8_account_deletion_lifecycle_foundation.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../server/admin/account-deletion-repository.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../server/account-deletion/lifecycle-repository.mjs",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../server/account-deletion/lifecycle-service.mjs",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS account_deletion_register/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS account_deletion_steps/);
  assert.match(migration, /wait_for_submitted_jobs/);
  assert.match(migration, /ON CONFLICT \(request_id\) DO NOTHING/);
  assert.doesNotMatch(
    migration,
    /\b(?:email|mail_reference_id|object_key|provider_subject|prompt)\b/,
  );
  assert.match(schema, /export const accountDeletionRegister/);
  assert.match(schema, /export const accountDeletionSteps/);
  assert.match(requestRepository, /INSERT INTO account_deletion_register/);
  assert.match(requestRepository, /INSERT INTO account_deletion_steps/);
  assert.match(lifecycleRepository, /FOR UPDATE OF step SKIP LOCKED/);
  assert.match(
    lifecycleRepository,
    /WHERE step\.request_id = candidate\.request_id\s+AND step\.step_name = 'wait_for_submitted_jobs'/,
  );
  assert.match(lifecycleRepository, /attempt\.state <> 'created'/);
  assert.match(lifecycleRepository, /FOR UPDATE OF job/);
  assert.match(lifecycleService, /DELETION_WAIT_STEP_FAILED/);
  assert.doesNotMatch(lifecycleService, /Authing|deleteObject|prepareObjectStorage/);
});

test("M8 deletion inventory preview has no destructive or external adapter", async () => {
  const [contract, repository, service] = await Promise.all([
    readFile(
      new URL(
        "../server/account-deletion/inventory-contract.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../server/account-deletion/inventory-repository.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../server/account-deletion/inventory-service.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  assert.match(repository, /REPEATABLE READ READ ONLY/);
  assert.match(repository, /object_deleted_at IS NULL/);
  assert.match(contract, /goodgood-account-deletion-inventory:v/);
  assert.doesNotMatch(
    `${repository}\n${service}`,
    /Authing|prepareObjectStorage|deleteObject|DeleteObjectCommand/,
  );
  assert.doesNotMatch(repository, /\b(?:INSERT|UPDATE|DELETE FROM)\b/);
});

test("M8 private-object deletion migration is additive, leased, and local-only", async () => {
  const [
    migration,
    constraintMigration,
    schema,
    requestRepository,
    objectRepository,
    objectService,
    objectStorage,
    referenceCleanup,
    generationRepository,
  ] = await Promise.all([
    readFile(
      new URL(
        "../migrations/0015_m8_account_deletion_private_objects.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../migrations/0016_m8_account_deletion_private_object_constraints.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../server/admin/account-deletion-repository.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/account-deletion/object-repository.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/account-deletion/object-service.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/account-deletion/object-storage.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/references/cleanup-repository.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/generation/repository.mjs", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(migration, /ADD COLUMN IF NOT EXISTS object_deleted_at/);
  assert.match(migration, /delete_private_objects/);
  assert.match(migration, /inventory_sha256/);
  assert.match(migration, /OBJECT_DELETE_FAILED/);
  assert.match(constraintMigration, /inventory_sha256 ~ '\^\[0-9a-f\]\{64\}\$'/);
  assert.match(constraintMigration, /step_name = 'delete_private_objects'/);
  assert.match(schema, /objectDeletedAt/);
  assert.match(schema, /lastTargetObjectCount/);
  assert.match(requestRepository, /delete_private_objects/);
  assert.match(objectRepository, /FOR UPDATE OF object_step SKIP LOCKED/);
  assert.match(objectRepository, /wait_step\.state = 'completed'/);
  assert.match(objectRepository, /deleted_object_count = deleted_object_count \+ 1/);
  assert.match(objectRepository, /row\.upload_state === "pending"/);
  assert.match(objectRepository, /row\.expires_at/);
  assert.match(objectRepository, /SIGNED_UPLOAD_EXPIRY_GRACE_MILLISECONDS/);
  assert.match(objectStorage, /DeleteObjectCommand/);
  assert.match(referenceCleanup, /account_deletion_requests/);
  assert.match(generationRepository, /a\.object_deleted_at IS NULL/);
  assert.doesNotMatch(objectService, /Authing|prepareObjectStorage|console\.log/);
  assert.doesNotMatch(migration, /object_key/);
});

test("M8 creative-record deletion is leased, ordered, and retains ledger evidence", async () => {
  const [
    migration,
    schema,
    requestRepository,
    creativeRepository,
    creativeService,
    writeGuard,
    draftRepository,
    projectRepository,
    referenceRepository,
  ] = await Promise.all([
    readFile(
      new URL(
        "../migrations/0017_m8_account_deletion_creative_records.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../server/admin/account-deletion-repository.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/account-deletion/creative-repository.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/account-deletion/creative-service.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/account-deletion/creative-write-guard.mjs", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../server/drafts/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/projects/repository.mjs", import.meta.url), "utf8"),
    readFile(
      new URL("../server/references/repository.mjs", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(migration, /delete_creative_records/);
  assert.match(migration, /CREATIVE_DELETE_FAILED/);
  assert.match(migration, /creative_link_deleted_at/);
  assert.match(migration, /goodgood_guard_credit_ledger_entry_mutation/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON credit_ledger_entries/);
  assert.match(schema, /lastTargetCreativeRecordCount/);
  assert.match(schema, /creativeLinkDeletedAt/);
  assert.match(requestRepository, /delete_creative_records/);
  assert.match(creativeRepository, /FOR UPDATE OF creative_step SKIP LOCKED/);
  assert.match(creativeRepository, /object_step\.state = 'completed'/);
  assert.match(creativeRepository, /PRIVATE_OBJECTS_REMAIN/);
  assert.match(creativeRepository, /CREATIVE_INVENTORY_DRIFT/);
  assert.match(creativeRepository, /UPDATE credit_ledger_entries ledger/);
  const orderedDeletes = [
    "DELETE FROM assets",
    "DELETE FROM generation_job_events",
    "DELETE FROM generation_attempts",
    "DELETE FROM generation_queue_outbox",
    "DELETE FROM generation_jobs",
    "DELETE FROM generation_batches",
    "DELETE FROM projects",
    "DELETE FROM creation_drafts",
    "DELETE FROM reference_assets",
  ].map((statement) => creativeRepository.indexOf(statement));
  assert.ok(orderedDeletes.every((index) => index >= 0));
  assert.deepEqual([...orderedDeletes].sort((left, right) => left - right), orderedDeletes);
  assert.doesNotMatch(creativeService, /Authing|DeleteObjectCommand|objectKey/);
  assert.match(writeGuard, /FOR UPDATE OF owner/);
  assert.match(writeGuard, /account_deletion_requests/);
  assert.match(draftRepository, /lockOwnerCreativeWriteAccess/);
  assert.match(projectRepository, /lockOwnerCreativeWriteAccess/);
  assert.match(referenceRepository, /lockOwnerCreativeWriteAccess/);
});

test("M8 external-identity deletion is leased, provider-neutral, and retains local mappings", async () => {
  const [migration, schema, requestRepository, identityRepository, identityService] =
    await Promise.all([
      readFile(
        new URL(
          "../migrations/0018_m8_account_deletion_external_identities.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../server/admin/account-deletion-repository.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../server/account-deletion/identity-repository.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../server/account-deletion/identity-service.mjs", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(migration, /external_disabled_at/);
  assert.match(migration, /external_deleted_at/);
  assert.match(migration, /delete_external_identities/);
  assert.match(migration, /IDENTITY_DELETE_FAILED/);
  assert.match(schema, /externalDisabledAt/);
  assert.match(schema, /lastTargetIdentityCount/);
  assert.match(requestRepository, /delete_external_identities/);
  assert.match(identityRepository, /FOR UPDATE OF identity_step SKIP LOCKED/);
  assert.match(identityRepository, /creative_step\.state = 'completed'/);
  assert.match(identityRepository, /external_deleted_at IS NULL/);
  assert.match(identityRepository, /external_disabled_at/);
  assert.doesNotMatch(identityRepository, /DELETE FROM auth_identities/);
  assert.doesNotMatch(
    `${identityRepository}\n${identityService}`,
    /https:\/\/|fetch\(|client_secret|management[_-]?token/i,
  );
});

test("M8 local completion anonymizes login data while retaining immutable evidence", async () => {
  const [migration, schema, requestRepository, completionRepository, completionService, billingRepository] =
    await Promise.all([
      readFile(
        new URL(
          "../migrations/0019_m8_account_deletion_local_anonymization.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../server/admin/account-deletion-repository.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../server/account-deletion/completion-repository.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../server/account-deletion/completion-service.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../server/billing/repository.mjs", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(migration, /anonymized_at/);
  assert.match(migration, /audit_retention_until/);
  assert.match(migration, /interval '12 months'/);
  assert.match(migration, /deleted_local_session_count/);
  assert.match(migration, /expired_credit_amount/);
  assert.match(schema, /anonymizedAt/);
  assert.match(schema, /auditRetentionUntil/);
  assert.match(schema, /deletedLocalIdentityCount/);
  assert.match(requestRepository, /anonymize_goodgood_account/);
  assert.match(completionRepository, /FOR UPDATE OF final_step SKIP LOCKED/);
  assert.match(completionRepository, /identity_step\.state = 'completed'/);
  assert.match(completionRepository, /DELETE FROM auth_sessions/);
  assert.match(completionRepository, /DELETE FROM auth_identities/);
  assert.ok(
    completionRepository.indexOf("DELETE FROM auth_sessions") <
      completionRepository.indexOf("DELETE FROM auth_identities"),
  );
  assert.match(completionRepository, /@deleted\.goodgood\.invalid/);
  assert.match(completionRepository, /mail_reference_id = 'anonymized-deletion-evidence'/);
  assert.match(
    completionRepository,
    /audit_retention_until = \$2::timestamptz \+ interval '12 months'/,
  );
  assert.match(billingRepository, /entryType: "expire"/);
  assert.doesNotMatch(
    completionRepository,
    /(?:UPDATE|DELETE FROM) (?:credit_ledger_entries|administrative_actions)/,
  );
  assert.doesNotMatch(
    `${completionRepository}\n${completionService}`,
    /https:\/\/|fetch\(|Authing|client_secret|management[_-]?token/i,
  );
});

test("local completion pass handles success, empty work, failure, and lost lease without PII logs", async () => {
  const successClaims = [{ requestId: "completion-success" }];
  const success = await runAccountDeletionCompletionPass({}, {
    batchSize: 2,
    now: new Date("2026-09-07T08:00:00.000Z"),
    repository: {
      async claimAccountDeletionCompletionStep() {
        return successClaims.shift() ?? null;
      },
      async completeAccountDeletionLocally() {
        return {
          completed: true,
          deletedIdentityCount: 2,
          deletedSessionCount: 3,
          expiredCreditAmount: "100",
        };
      },
      async deferAccountDeletionCompletionStep() {
        assert.fail("successful completion must not defer");
      },
    },
    workerId: "completion-worker-success",
  });
  assert.deepEqual(success, {
    claimed: 1,
    completed: 1,
    deferred: 0,
    deletedIdentities: 2,
    deletedSessions: 3,
    expiredCredits: "100",
    failed: 0,
    lostLease: 0,
  });

  const empty = await runAccountDeletionCompletionPass({}, {
    repository: {
      async claimAccountDeletionCompletionStep() { return null; },
      async completeAccountDeletionLocally() {
        assert.fail("empty work must not complete");
      },
      async deferAccountDeletionCompletionStep() {
        assert.fail("empty work must not defer");
      },
    },
    workerId: "completion-worker-empty",
  });
  assert.equal(empty.claimed, 0);

  const logs = [];
  const failureClaims = [{ requestId: "request-secret-value" }];
  const failure = await runAccountDeletionCompletionPass({}, {
    batchSize: 1,
    logger: { error(message) { logs.push(message); } },
    now: new Date("2026-09-07T08:00:00.000Z"),
    repository: {
      async claimAccountDeletionCompletionStep() {
        return failureClaims.shift() ?? null;
      },
      async completeAccountDeletionLocally() {
        throw new Error("email-secret@goodgood.invalid");
      },
      async deferAccountDeletionCompletionStep() { return true; },
    },
    workerId: "completion-worker-failure",
  });
  assert.equal(failure.failed, 1);
  assert.equal(failure.deferred, 1);
  assert.match(logs[0], /LOCAL_ANONYMIZATION_FAILED/);
  assert.doesNotMatch(logs.join("\n"), /request-secret|email-secret/);

  const lostClaims = [{ requestId: "completion-lost" }];
  const lost = await runAccountDeletionCompletionPass({}, {
    batchSize: 1,
    repository: {
      async claimAccountDeletionCompletionStep() {
        return lostClaims.shift() ?? null;
      },
      async completeAccountDeletionLocally() {
        return { completed: false, reason: "lost_lease" };
      },
      async deferAccountDeletionCompletionStep() {
        assert.fail("lost lease is not a mutation failure");
      },
    },
    workerId: "completion-worker-lost",
  });
  assert.equal(lost.lostLease, 1);
  assert.equal(lost.failed, 0);
});

test("external-identity pass disables before delete and completes empty work", async () => {
  const order = [];
  const claims = [{
    identities: [
      {
        disabled: false,
        id: "identity-1",
        issuer: "https://fake-identity.invalid",
        subject: "subject-1",
      },
      {
        disabled: true,
        id: "identity-2",
        issuer: "https://fake-identity.invalid",
        subject: "subject-2",
      },
    ],
    requestId: "identity-request-success",
    targetIdentityCount: 2,
  }];
  const result = await runAccountDeletionIdentityPass({}, {
    identityAdapter: {
      async disableIdentity({ subject }) { order.push(`disable:${subject}`); },
      async deleteIdentity({ subject }) { order.push(`delete:${subject}`); },
    },
    now: new Date("2026-09-07T06:00:00.000Z"),
    repository: {
      async claimAccountDeletionIdentityStep() {
        return claims.shift() ?? null;
      },
      async markAccountDeletionIdentityDisabled(_pool, { identityId }) {
        order.push(`record-disabled:${identityId}`);
        return { newlyRecorded: true, recorded: true };
      },
      async markAccountDeletionIdentityDeleted(_pool, { identityId }) {
        order.push(`record-deleted:${identityId}`);
        return { newlyRecorded: true, recorded: true };
      },
      async resolveAccountDeletionIdentityStep() {
        order.push("resolve");
        return { resolved: true, state: "completed" };
      },
    },
    workerId: "identity-worker-success",
  });
  assert.deepEqual(result, {
    claimed: 1,
    completed: 1,
    deferred: 0,
    deleted: 2,
    disabled: 1,
    failed: 0,
    identitiesClaimed: 2,
    lostLease: 0,
  });
  assert.deepEqual(order, [
    "disable:subject-1",
    "record-disabled:identity-1",
    "delete:subject-1",
    "record-deleted:identity-1",
    "delete:subject-2",
    "record-deleted:identity-2",
    "resolve",
  ]);

  const emptyClaims = [{
    identities: [],
    requestId: "identity-request-empty",
    targetIdentityCount: 0,
  }];
  const empty = await runAccountDeletionIdentityPass({}, {
    identityAdapter: {
      async disableIdentity() { assert.fail("empty work must not disable"); },
      async deleteIdentity() { assert.fail("empty work must not delete"); },
    },
    now: new Date("2026-09-07T06:00:00.000Z"),
    repository: {
      async claimAccountDeletionIdentityStep() {
        return emptyClaims.shift() ?? null;
      },
      async markAccountDeletionIdentityDisabled() {
        assert.fail("empty work has no disable evidence");
      },
      async markAccountDeletionIdentityDeleted() {
        assert.fail("empty work has no delete evidence");
      },
      async resolveAccountDeletionIdentityStep() {
        return { resolved: true, state: "completed" };
      },
    },
    workerId: "identity-worker-empty",
  });
  assert.equal(empty.claimed, 1);
  assert.equal(empty.completed, 1);
  assert.equal(empty.identitiesClaimed, 0);
});

test("external-identity pass retries partial failure without leaking identity claims", async () => {
  const identity = {
    disabled: false,
    id: "identity-secret",
    issuer: "https://issuer-secret.invalid",
    subject: "subject-secret",
  };
  const logs = [];
  let deleteAttempts = 0;
  let currentClaim = {
    identities: [identity],
    requestId: "identity-request-secret",
    targetIdentityCount: 1,
  };
  let disabledRecorded = false;
  let deletedRecorded = false;
  const repository = {
    async claimAccountDeletionIdentityStep(_pool, input) {
      assert.equal(input.identityLimit, 1);
      const claim = currentClaim;
      currentClaim = null;
      return claim;
    },
    async markAccountDeletionIdentityDisabled() {
      disabledRecorded = true;
      return { newlyRecorded: true, recorded: true };
    },
    async markAccountDeletionIdentityDeleted() {
      deletedRecorded = true;
      return { newlyRecorded: true, recorded: true };
    },
    async resolveAccountDeletionIdentityStep(_pool, { failedIdentityCount }) {
      return {
        resolved: true,
        state: failedIdentityCount ? "pending" : "completed",
      };
    },
  };
  const options = {
    identityAdapter: {
      async disableIdentity() {},
      async deleteIdentity(target) {
        deleteAttempts += 1;
        if (deleteAttempts === 1) {
          throw new Error(`provider exposed ${target.issuer} ${target.subject}`);
        }
      },
    },
    identityBatchSize: 1,
    logger: { error(message) { logs.push(message); } },
    now: new Date("2026-09-07T06:00:00.000Z"),
    repository,
    workerId: "identity-worker-retry",
  };
  const first = await runAccountDeletionIdentityPass({}, options);
  assert.equal(first.deferred, 1);
  assert.equal(first.disabled, 1);
  assert.equal(first.deleted, 0);
  assert.equal(first.failed, 1);
  assert.equal(disabledRecorded, true);
  assert.equal(deletedRecorded, false);
  assert.match(logs[0], /IDENTITY_DELETE_FAILED/);
  assert.doesNotMatch(logs.join("\n"), /issuer-secret|subject-secret|provider exposed/);

  currentClaim = {
    identities: [{ ...identity, disabled: true }],
    requestId: "identity-request-secret",
    targetIdentityCount: 1,
  };
  const second = await runAccountDeletionIdentityPass({}, options);
  assert.equal(second.completed, 1);
  assert.equal(second.disabled, 0);
  assert.equal(second.deleted, 1);
  assert.equal(second.failed, 0);
  assert.equal(deleteAttempts, 2);
  assert.equal(deletedRecorded, true);
});

test("external-identity pass stops after lost evidence lease and requires an adapter", async () => {
  const claims = [{
    identities: [{
      disabled: false,
      id: "identity-lost",
      issuer: "https://fake-identity.invalid",
      subject: "subject-lost",
    }],
    requestId: "identity-request-lost",
    targetIdentityCount: 1,
  }];
  let deleted = false;
  let resolved = false;
  const lost = await runAccountDeletionIdentityPass({}, {
    identityAdapter: {
      async disableIdentity() {},
      async deleteIdentity() { deleted = true; },
    },
    now: new Date("2026-09-07T06:00:00.000Z"),
    repository: {
      async claimAccountDeletionIdentityStep() { return claims.shift() ?? null; },
      async markAccountDeletionIdentityDisabled() {
        return { recorded: false, reason: "lost_lease" };
      },
      async markAccountDeletionIdentityDeleted() {
        assert.fail("lost disable evidence must stop deletion");
      },
      async resolveAccountDeletionIdentityStep() { resolved = true; },
    },
    workerId: "identity-worker-lost",
  });
  assert.equal(lost.lostLease, 1);
  assert.equal(deleted, false);
  assert.equal(resolved, false);

  await assert.rejects(
    runAccountDeletionIdentityPass({}, {
      workerId: "identity-worker-no-adapter",
    }),
    /identity deletion adapter/i,
  );
  await assert.rejects(
    runAccountDeletionIdentityPass({}, {
      identityAdapter: {
        async disableIdentity() {},
        async deleteIdentity() {},
      },
      identityBatchSize: 101,
      workerId: "identity-worker-too-large",
    }),
    /identityBatchSize must be an integer between 1 and 100/,
  );
});

test("creative-record pass completes atomically and reports only aggregate counts", async () => {
  const calls = [];
  const claims = [{
    inventorySha256: "a".repeat(64),
    requestId: "request-creative-success",
    targetRecordCount: 12,
  }];
  const result = await runAccountDeletionCreativePass({}, {
    now: new Date("2026-09-07T04:00:00.000Z"),
    repository: {
      async claimAccountDeletionCreativeStep() {
        calls.push("claim");
        return claims.shift() ?? null;
      },
      async deleteAccountDeletionCreativeRecords(_pool, input) {
        calls.push(`delete:${input.inventorySha256}`);
        return { completed: true, deletedRecordCount: 12 };
      },
      async deferAccountDeletionCreativeStep() {
        assert.fail("successful deletion must not defer");
      },
    },
    workerId: "creative-worker-success",
  });
  assert.deepEqual(result, {
    claimed: 1,
    completed: 1,
    deferred: 0,
    deletedRecords: 12,
    failed: 0,
    lostLease: 0,
  });
  assert.deepEqual(calls, ["claim", `delete:${"a".repeat(64)}`, "claim"]);

  const empty = await runAccountDeletionCreativePass({}, {
    now: new Date("2026-09-07T04:00:00.000Z"),
    repository: {
      async claimAccountDeletionCreativeStep() { return null; },
      async deleteAccountDeletionCreativeRecords() {
        assert.fail("empty work must not delete");
      },
      async deferAccountDeletionCreativeStep() {
        assert.fail("empty work must not defer");
      },
    },
    workerId: "creative-worker-empty",
  });
  assert.equal(empty.claimed, 0);
});

test("creative-record pass defers redacted failures and survives a lost lease", async () => {
  const logs = [];
  let deferInput;
  const failureClaims = [{
    inventorySha256: "b".repeat(64),
    requestId: "request-secret-id",
    targetRecordCount: 7,
  }];
  const failed = await runAccountDeletionCreativePass({}, {
    logger: { error(message) { logs.push(message); } },
    now: new Date("2026-09-07T04:00:00.000Z"),
    repository: {
      async claimAccountDeletionCreativeStep() {
        return failureClaims.shift() ?? null;
      },
      async deleteAccountDeletionCreativeRecords() {
        throw new Error("prompt and owner request-secret-id must stay private");
      },
      async deferAccountDeletionCreativeStep(_pool, input) {
        deferInput = input;
        return true;
      },
    },
    workerId: "creative-worker-failure",
  });
  assert.deepEqual(failed, {
    claimed: 1,
    completed: 0,
    deferred: 1,
    deletedRecords: 0,
    failed: 1,
    lostLease: 0,
  });
  assert.equal(deferInput.failedRecordCount, 7);
  assert.match(logs[0], /CREATIVE_DELETE_FAILED/);
  assert.doesNotMatch(logs.join("\n"), /prompt|request-secret-id/);

  const lostClaims = [{
    inventorySha256: "c".repeat(64),
    requestId: "request-lost",
    targetRecordCount: 1,
  }];
  const lost = await runAccountDeletionCreativePass({}, {
    now: new Date("2026-09-07T04:00:00.000Z"),
    repository: {
      async claimAccountDeletionCreativeStep() {
        return lostClaims.shift() ?? null;
      },
      async deleteAccountDeletionCreativeRecords() {
        return { completed: false, reason: "lost_lease" };
      },
      async deferAccountDeletionCreativeStep() {
        assert.fail("lost lease must not mutate step evidence");
      },
    },
    workerId: "creative-worker-lost",
  });
  assert.equal(lost.lostLease, 1);
  assert.equal(lost.completed, 0);
});

function objectResources() {
  return {
    config: { objectStorage: { bucket: "private-deletion-test" } },
    pool: {},
    storage: {},
  };
}

test("private-object pass deletes bytes before recording success and completes empty work", async () => {
  const order = [];
  const claims = [{
    objects: [
      { assetIds: ["asset-1"], objectKey: "private/asset", referenceIds: [] },
      { assetIds: [], objectKey: "private/reference", referenceIds: ["reference-1"] },
    ],
    requestId: "request-1",
  }];
  const repository = {
    async claimAccountDeletionObjectStep() {
      return claims.shift() ?? null;
    },
    async markAccountDeletionObjectSucceeded(_pool, { object }) {
      order.push(`record:${object.objectKey}`);
      return true;
    },
    async resolveAccountDeletionObjectStep() {
      order.push("resolve");
      return { resolved: true, state: "completed" };
    },
  };
  const result = await runAccountDeletionObjectPass(objectResources(), {
    deleteObject: async ({ key }) => { order.push(`delete:${key}`); },
    now: new Date("2026-09-07T02:00:00.000Z"),
    repository,
    workerId: "object-worker-1",
  });
  assert.deepEqual(result, {
    claimed: 1,
    completed: 1,
    deferred: 0,
    deleted: 2,
    failed: 0,
    lostLease: 0,
    objectsClaimed: 2,
  });
  assert.deepEqual(order, [
    "delete:private/asset",
    "record:private/asset",
    "delete:private/reference",
    "record:private/reference",
    "resolve",
  ]);

  const emptyClaims = [{ objects: [], requestId: "request-empty" }];
  const empty = await runAccountDeletionObjectPass(objectResources(), {
    deleteObject: async () => assert.fail("empty inventory must not call storage"),
    now: new Date("2026-09-07T02:00:00.000Z"),
    repository: {
      async claimAccountDeletionObjectStep() {
        return emptyClaims.shift() ?? null;
      },
      async markAccountDeletionObjectSucceeded() {
        assert.fail("empty inventory has no row evidence");
      },
      async resolveAccountDeletionObjectStep() {
        return { resolved: true, state: "completed" };
      },
    },
    workerId: "object-worker-empty",
  });
  assert.equal(empty.claimed, 1);
  assert.equal(empty.completed, 1);
  assert.equal(empty.objectsClaimed, 0);
});

test("private-object pass defers failures without logging keys and survives lost evidence lease", async () => {
  const logs = [];
  let resolutionInput;
  const claims = [{
    objects: [
      { assetIds: ["asset-fail"], objectKey: "private/secret-key", referenceIds: [] },
      { assetIds: ["asset-ok"], objectKey: "private/ok", referenceIds: [] },
    ],
    requestId: "request-failure",
  }];
  const failed = await runAccountDeletionObjectPass(objectResources(), {
    deleteObject: async ({ key }) => {
      if (key === "private/secret-key") throw new Error(`storage leaked ${key}`);
    },
    logger: { error(message) { logs.push(message); } },
    now: new Date("2026-09-07T02:00:00.000Z"),
    repository: {
      async claimAccountDeletionObjectStep() { return claims.shift() ?? null; },
      async markAccountDeletionObjectSucceeded() { return true; },
      async resolveAccountDeletionObjectStep(_pool, input) {
        resolutionInput = input;
        return { resolved: true, state: "pending" };
      },
    },
    workerId: "object-worker-failure",
  });
  assert.equal(failed.deleted, 1);
  assert.equal(failed.failed, 1);
  assert.equal(failed.deferred, 1);
  assert.equal(resolutionInput.failedObjectCount, 1);
  assert.doesNotMatch(logs.join("\n"), /secret-key|storage leaked/);
  assert.match(logs[0], /OBJECT_DELETE_FAILED/);

  let resolved = false;
  const lostClaims = [{
    objects: [{ assetIds: ["asset-lost"], objectKey: "private/lost", referenceIds: [] }],
    requestId: "request-lost",
  }];
  const lost = await runAccountDeletionObjectPass(objectResources(), {
    deleteObject: async () => {},
    now: new Date("2026-09-07T02:00:00.000Z"),
    repository: {
      async claimAccountDeletionObjectStep() { return lostClaims.shift() ?? null; },
      async markAccountDeletionObjectSucceeded() { return false; },
      async resolveAccountDeletionObjectStep() { resolved = true; },
    },
    workerId: "object-worker-lost",
  });
  assert.equal(lost.lostLease, 1);
  assert.equal(lost.deleted, 0);
  assert.equal(resolved, false);
});

test("private-object deletion retries the same target idempotently and bounds one claim", async () => {
  const object = {
    assetIds: ["asset-retry"],
    objectKey: "private/retry",
    referenceIds: [],
  };
  let currentClaim = { objects: [object], requestId: "request-retry" };
  let deleteAttempts = 0;
  let completed = false;
  const repository = {
    async claimAccountDeletionObjectStep(_pool, input) {
      assert.equal(input.objectLimit, 1);
      const claim = currentClaim;
      currentClaim = null;
      return claim;
    },
    async markAccountDeletionObjectSucceeded() { return true; },
    async resolveAccountDeletionObjectStep(_pool, { failedObjectCount }) {
      if (failedObjectCount) return { resolved: true, state: "pending" };
      completed = true;
      return { resolved: true, state: "completed" };
    },
  };
  const options = {
    deleteObject: async () => {
      deleteAttempts += 1;
      if (deleteAttempts === 1) throw new Error("transient storage failure");
    },
    logger: { error() {} },
    now: new Date("2026-09-07T02:00:00.000Z"),
    objectBatchSize: 1,
    repository,
    workerId: "object-worker-retry",
  };
  const first = await runAccountDeletionObjectPass(objectResources(), options);
  assert.equal(first.deferred, 1);
  assert.equal(first.failed, 1);
  assert.equal(completed, false);

  currentClaim = { objects: [object], requestId: "request-retry" };
  const second = await runAccountDeletionObjectPass(objectResources(), options);
  assert.equal(second.completed, 1);
  assert.equal(second.deleted, 1);
  assert.equal(deleteAttempts, 2);
  assert.equal(completed, true);
  await assert.rejects(
    runAccountDeletionObjectPass(objectResources(), {
      objectBatchSize: 101,
      workerId: "object-worker-too-large",
    }),
    /objectBatchSize must be an integer between 1 and 100/,
  );
});

function createInventoryHarness({
  eligible = true,
  failOn = null,
  rows = {},
} = {}) {
  const queries = [];
  const client = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      queries.push(normalized);
      if (normalized === "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY") {
        return { rowCount: null, rows: [] };
      }
      if (["COMMIT", "ROLLBACK"].includes(normalized)) {
        return { rowCount: null, rows: [] };
      }
      if (failOn && normalized.includes(failOn)) {
        throw new Error("inventory database failure");
      }
      if (normalized.startsWith("SELECT register.target_owner_id")) {
        return eligible
          ? { rowCount: 1, rows: [{ target_owner_id: TARGET_ID }] }
          : { rowCount: 0, rows: [] };
      }
      if (normalized.startsWith("SELECT id FROM projects")) {
        return { rowCount: rows.projects?.length ?? 0, rows: rows.projects ?? [] };
      }
      if (normalized.startsWith("SELECT id FROM generation_batches")) {
        return { rowCount: rows.batches?.length ?? 0, rows: rows.batches ?? [] };
      }
      if (normalized.startsWith("SELECT id FROM generation_jobs")) {
        return { rowCount: rows.jobs?.length ?? 0, rows: rows.jobs ?? [] };
      }
      if (normalized.startsWith("SELECT id FROM assets")) {
        return { rowCount: rows.assets?.length ?? 0, rows: rows.assets ?? [] };
      }
      if (normalized.startsWith("SELECT owner_id FROM creation_drafts")) {
        return { rowCount: rows.drafts?.length ?? 0, rows: rows.drafts ?? [] };
      }
      if (normalized.startsWith("SELECT id FROM reference_assets")) {
        return { rowCount: rows.references?.length ?? 0, rows: rows.references ?? [] };
      }
      if (normalized.startsWith("SELECT object_key")) {
        return { rowCount: rows.objects?.length ?? 0, rows: rows.objects ?? [] };
      }
      throw new Error(`Unexpected inventory SQL: ${normalized}`);
    },
    release() {},
  };
  return {
    pool: { async connect() { return client; } },
    queries,
  };
}

test("deletion inventory is read-only, stable, complete, and redacted", async () => {
  const rows = {
    assets: [{ id: "asset-b" }, { id: "asset-a" }],
    batches: [{ id: "batch-a" }],
    drafts: [{ owner_id: TARGET_ID }],
    jobs: [{ id: "job-a" }],
    objects: [{ object_key: "private/b.png" }, { object_key: "private/a.png" }],
    projects: [{ id: "project-a" }],
    references: [{ id: "reference-a" }],
  };
  const firstHarness = createInventoryHarness({ rows });
  const first = await readAccountDeletionInventory(firstHarness.pool, {
    requestId: TARGET_ID,
  });
  const second = await readAccountDeletionInventory(
    createInventoryHarness({
      rows: {
        ...rows,
        assets: [...rows.assets].reverse(),
        objects: [...rows.objects].reverse(),
      },
    }).pool,
    { requestId: TARGET_ID },
  );

  assert.deepEqual(first, {
    counts: {
      assets: 2,
      drafts: 1,
      generationJobs: 1,
      privateObjects: 2,
      projects: 1,
      references: 1,
    },
    inventorySha256: first.inventorySha256,
    inventoryVersion: 1,
  });
  assert.match(first.inventorySha256, /^[0-9a-f]{64}$/);
  assert.equal(first.inventorySha256, second.inventorySha256);
  const changed = await readAccountDeletionInventory(
    createInventoryHarness({
      rows: { ...rows, batches: [...rows.batches, { id: "batch-b" }] },
    }).pool,
    { requestId: TARGET_ID },
  );
  assert.notEqual(first.inventorySha256, changed.inventorySha256);
  assert.doesNotMatch(JSON.stringify(first), /asset-a|private\/a\.png|target_owner/i);
  assert.equal(firstHarness.queries[0], "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  assert.equal(firstHarness.queries.at(-1), "COMMIT");
  assert.equal(
    firstHarness.queries.some((sql) => /\b(?:INSERT|UPDATE|DELETE)\b/.test(sql)),
    false,
  );
});

test("deletion inventory handles empty, not-ready, failure, and output-whitelisting paths", async () => {
  const empty = await readAccountDeletionInventory(
    createInventoryHarness().pool,
    { requestId: TARGET_ID },
  );
  assert.deepEqual(empty.counts, {
    assets: 0,
    drafts: 0,
    generationJobs: 0,
    privateObjects: 0,
    projects: 0,
    references: 0,
  });

  const notReady = createInventoryHarness({ eligible: false });
  await assert.rejects(
    readAccountDeletionInventory(notReady.pool, { requestId: TARGET_ID }),
    (error) =>
      error instanceof AccountDeletionInventoryError &&
      error.code === "ACCOUNT_DELETION_INVENTORY_NOT_READY",
  );
  assert.equal(notReady.queries.at(-1), "ROLLBACK");

  const failed = createInventoryHarness({ failOn: "FROM assets" });
  await assert.rejects(
    readAccountDeletionInventory(failed.pool, { requestId: TARGET_ID }),
    /inventory database failure/,
  );
  assert.equal(failed.queries.at(-1), "ROLLBACK");

  const safe = await previewAccountDeletionInventory(
    {},
    {
      repository: {
        async readAccountDeletionInventory() {
          return {
            ...empty,
            objectKeys: ["must-not-escape.png"],
            requestId: TARGET_ID,
            targetOwnerId: TARGET_ID,
          };
        },
      },
      requestId: TARGET_ID,
    },
  );
  assert.deepEqual(safe, empty);
  assert.doesNotMatch(JSON.stringify(safe), /must-not-escape|requestId|targetOwnerId/);
  await assert.rejects(
    previewAccountDeletionInventory({}, { requestId: "not-a-uuid" }),
    /requestId must be a UUID/,
  );
});

function createLifecycleResolutionHarness({ activeJobIds = [], leased = true } = {}) {
  const queries = [];
  const client = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      queries.push(normalized);
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized)) {
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT step.request_id")) {
        return leased
          ? { rowCount: 1, rows: [{ request_id: "request-1", target_owner_id: TARGET_ID }] }
          : { rowCount: 0, rows: [] };
      }
      if (normalized.startsWith("SELECT job.id")) {
        return {
          rowCount: activeJobIds.length,
          rows: activeJobIds.map((id) => ({ id })),
        };
      }
      if (normalized.startsWith("UPDATE account_deletion_steps")) {
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected lifecycle SQL: ${normalized}`);
    },
    release() {},
  };
  return {
    pool: { async connect() { return client; } },
    queries,
  };
}

test("leased wait step defers active submitted jobs and completes only after terminal state", async () => {
  const now = new Date("2026-09-06T08:00:00.000Z");
  const retryAt = new Date("2026-09-06T08:01:00.000Z");
  const active = createLifecycleResolutionHarness({ activeJobIds: ["job-1"] });
  const deferred = await resolveAccountDeletionWaitStep(active.pool, {
    now,
    requestId: "request-1",
    retryAt,
    workerId: "deletion-worker-1",
  });
  assert.deepEqual(deferred, {
    activeSubmittedJobCount: 1,
    resolved: true,
    state: "pending",
  });
  assert.equal(
    active.queries.some((sql) => sql.includes("SUBMITTED_JOBS_ACTIVE")),
    true,
  );
  assert.equal(active.queries.at(-1), "COMMIT");

  const terminal = createLifecycleResolutionHarness();
  const completed = await resolveAccountDeletionWaitStep(terminal.pool, {
    now,
    requestId: "request-1",
    retryAt,
    workerId: "deletion-worker-1",
  });
  assert.deepEqual(completed, {
    activeSubmittedJobCount: 0,
    resolved: true,
    state: "completed",
  });
  assert.equal(
    terminal.queries.some((sql) => sql.includes("state = 'completed'")),
    true,
  );

  const lost = createLifecycleResolutionHarness({ leased: false });
  assert.deepEqual(
    await resolveAccountDeletionWaitStep(lost.pool, {
      now,
      requestId: "request-1",
      retryAt,
      workerId: "deletion-worker-1",
    }),
    { reason: "lost_lease", resolved: false },
  );
  assert.equal(lost.queries.some((sql) => sql.startsWith("SELECT job.id")), false);
});

test("bounded lifecycle pass covers empty, completed, deferred, lost-lease, and failure paths", async () => {
  const claims = [
    { requestId: "request-completed" },
    { requestId: "request-deferred" },
    { requestId: "request-lost" },
    { requestId: "request-failed" },
  ];
  const logged = [];
  const result = await runAccountDeletionWaitPass(
    {},
    {
      batchSize: 10,
      logger: { error(value) { logged.push(JSON.parse(value)); } },
      now: new Date("2026-09-06T08:00:00.000Z"),
      repository: {
        async claimAccountDeletionWaitStep() {
          return claims.shift() ?? null;
        },
        async resolveAccountDeletionWaitStep(_pool, { requestId }) {
          if (requestId === "request-completed") {
            return { resolved: true, state: "completed" };
          }
          if (requestId === "request-deferred") {
            return { resolved: true, state: "pending" };
          }
          if (requestId === "request-lost") {
            return { reason: "lost_lease", resolved: false };
          }
          throw new Error("database unavailable");
        },
      },
      workerId: "deletion-worker-1",
    },
  );
  assert.deepEqual(result, {
    claimed: 4,
    completed: 1,
    deferred: 1,
    failed: 1,
    lostLease: 1,
  });
  assert.deepEqual(logged, [{
    errorCode: "DELETION_WAIT_STEP_FAILED",
    event: "account_deletion.wait_step_failed",
  }]);

  const empty = await runAccountDeletionWaitPass(
    {},
    {
      repository: {
        async claimAccountDeletionWaitStep() { return null; },
      },
      workerId: "deletion-worker-2",
    },
  );
  assert.equal(empty.claimed, 0);
  assert.equal(empty.completed, 0);
});

test("lifecycle preview returns aggregate state without account identifiers", async () => {
  const preview = await inspectAccountDeletionLifecycle(
    {
      async query(sql) {
        assert.doesNotMatch(sql, /target_owner_id|email|mail_reference_id/);
        return {
          rows: [{
            overdue: 1,
            processing: 3,
            wait_completed: 1,
            wait_due: 1,
            wait_leased: 1,
          }],
        };
      },
    },
    { now: new Date("2026-09-06T08:00:00.000Z") },
  );
  assert.deepEqual(preview, {
    overdue: 1,
    processing: 3,
    waitCompleted: 1,
    waitDue: 1,
    waitLeased: 1,
  });
});

test("site-owner account rows expose only a durable deletion-state summary", async () => {
  let queryText = "";
  const accounts = await listManagedAccounts(
    {
      async query(sql) {
        queryText = sql;
        return {
          rows: [
            {
              account_tier: "seed",
              available_balance: "90",
              created_at: "2026-09-01T00:00:00.000Z",
              deletion_request_created_at: "2026-09-06T02:00:00.000Z",
              deletion_request_deadline_at: "2026-10-06T02:00:00.000Z",
              deletion_request_id: "70000000-0000-4000-8000-000000000007",
              deletion_request_state: "processing",
              email: "member@goodgood.invalid",
              id: TARGET_ID,
              is_site_owner: false,
              last_authenticated_at: "2026-09-05T00:00:00.000Z",
              reserved_balance: "10",
              status: "suspended",
            },
          ],
        };
      },
    },
    { limit: 50 },
  );
  assert.match(queryText, /LEFT JOIN account_deletion_requests deletion_request/);
  assert.deepEqual(accounts.items[0].deletionRequest, {
    createdAt: "2026-09-06T02:00:00.000Z",
    deadlineAt: "2026-10-06T02:00:00.000Z",
    id: "70000000-0000-4000-8000-000000000007",
    state: "processing",
  });
  assert.equal("mailReferenceId" in accounts.items[0].deletionRequest, false);
  assert.equal("verifiedEmail" in accounts.items[0].deletionRequest, false);
});

test("account-management deletion UI keeps two confirmations before the only POST", async () => {
  const [page, boundary, evidence] = await Promise.all([
    readFile(
      new URL("../features/admin/account-management-page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../features/admin/http-admin-boundary.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../features/admin/account-deletion-evidence.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(page, /第 1 步，共 2 步/);
  assert.match(page, /第 2 步，共 2 步/);
  assert.match(page, /只有下方最终按钮会创建请求并改变账户/);
  assert.match(page, /创建不可撤销请求/);
  assert.match(page, /deletionMutating && <LoaderCircle/);
  assert.match(page, /account\.role !== "site_owner"/);
  assert.match(page, /account\.deletionRequest \?/);
  assert.match(page, /删除请求处理中 · 不可撤销/);
  assert.doesNotMatch(page, /撤销删除|取消删除|恢复删除/);
  assert.match(boundary, /idempotencyKey: string/);
  assert.match(boundary, /input\.idempotencyKey/);
  assert.match(boundary, /method: "POST"/);
  assert.doesNotMatch(boundary, /method: "(?:DELETE|PATCH)"/);
  assert.match(evidence, /24 \* 60 \* 60 \* 1_000/);
  assert.match(evidence, /verifiedEmail !== draft\.accountEmail/);
});

test("admin deletion input requires same-window email evidence before repository mutation", async () => {
  let repositoryInput;
  const repository = {
    async createAccountDeletionRequest(_pool, input) {
      repositoryInput = input;
      return { created: true, id: "request-1", state: "processing" };
    },
  };
  const result = await createAdminAccountDeletionRequest({
    idempotencyKey: "delete-request-0001",
    input: {
      mailReferenceId: "mail-reference-0001",
      reason: "用户已通过登记邮箱确认删除",
      verificationConfirmedAt: CONFIRMED_AT,
      verificationRequestedAt: REQUESTED_AT,
      verifiedEmail: "MEMBER@GOODGOOD.INVALID",
    },
    ownerContext: SITE_OWNER,
    repository,
    resources: { pool: {} },
    targetOwnerId: TARGET_ID,
  });
  assert.equal(result.created, true);
  assert.equal(repositoryInput.verifiedEmail, "member@goodgood.invalid");
  assert.equal(repositoryInput.operationHash.length, 64);
  assert.equal(repositoryInput.verificationRequestedAt, REQUESTED_AT);
  assert.equal(repositoryInput.verificationConfirmedAt, CONFIRMED_AT);

  await assert.rejects(
    createAdminAccountDeletionRequest({
      idempotencyKey: "delete-request-0002",
      input: {
        mailReferenceId: "mail-reference-0002",
        reason: "超时确认",
        verificationConfirmedAt: "2026-09-07T01:00:00.001Z",
        verificationRequestedAt: REQUESTED_AT,
        verifiedEmail: "member@goodgood.invalid",
      },
      ownerContext: SITE_OWNER,
      repository,
      resources: { pool: {} },
      targetOwnerId: TARGET_ID,
    }),
    (error) =>
      error.code === "ADMIN_DELETION_VERIFICATION_EXPIRED" &&
      error.status === 409,
  );
});

test("deletion request atomically suspends access, revokes sessions, and cancels only unsubmitted jobs", async () => {
  const unsubmittedJobId = "30000000-0000-4000-8000-000000000003";
  const submittedJobId = "40000000-0000-4000-8000-000000000004";
  const harness = createRepositoryHarness({
    jobs: [
      {
        credit_reservation_entry_id: "50000000-0000-4000-8000-000000000005",
        id: unsubmittedJobId,
        provider_submission_started: false,
        state: "queued",
      },
      {
        credit_reservation_entry_id: "60000000-0000-4000-8000-000000000006",
        id: submittedJobId,
        provider_submission_started: true,
        state: "running",
      },
    ],
    revokedSessionCount: 2,
  });
  const releaseCalls = [];
  const dependencies = {
    async releaseCreditsInTransaction(client, input) {
      assert.equal(client, harness.client);
      releaseCalls.push(input);
      return { entry: { amount: 10n } };
    },
  };

  const created = await createAccountDeletionRequest(
    harness.pool,
    deletionInput(),
    dependencies,
  );
  assert.equal(created.created, true);
  assert.equal(created.state, "processing");
  assert.equal(created.revokedSessionCount, 2);
  assert.equal(created.cancelledJobCount, 1);
  assert.equal(created.releasedCredits, "10");
  assert.equal(releaseCalls.length, 1);
  assert.equal(releaseCalls[0].jobId, unsubmittedJobId);
  assert.equal(releaseCalls[0].actor, "system");
  assert.equal(
    harness.queries.some(
      ({ normalized, values }) =>
        normalized.startsWith("UPDATE generation_jobs") &&
        values[0] === submittedJobId,
    ),
    false,
  );
  assert.equal(
    harness.queries.some(({ normalized }) =>
      normalized.includes("cancelled_at = COALESCE(cancelled_at, now())"),
    ),
    true,
  );
  assert.equal(harness.queries.at(-1).normalized, "COMMIT");

  const replay = await createAccountDeletionRequest(
    harness.pool,
    deletionInput(),
    dependencies,
  );
  assert.equal(replay.created, false);
  assert.equal(replay.id, created.id);
  assert.equal(releaseCalls.length, 1);
});

test("deletion request supports an empty workload and rolls back cancellation failures", async () => {
  const emptyHarness = createRepositoryHarness();
  const empty = await createAccountDeletionRequest(
    emptyHarness.pool,
    deletionInput(),
  );
  assert.equal(empty.cancelledJobCount, 0);
  assert.equal(empty.revokedSessionCount, 0);
  assert.equal(empty.releasedCredits, "0");

  const failingHarness = createRepositoryHarness({
    jobs: [{
      credit_reservation_entry_id: "50000000-0000-4000-8000-000000000005",
      id: "30000000-0000-4000-8000-000000000003",
      provider_submission_started: false,
      state: "queued",
    }],
  });
  await assert.rejects(
    createAccountDeletionRequest(
      failingHarness.pool,
      deletionInput(),
      {
        async releaseCreditsInTransaction() {
          throw new Error("credit release unavailable");
        },
      },
    ),
    /credit release unavailable/,
  );
  assert.equal(failingHarness.queries.at(-1).normalized, "ROLLBACK");
  assert.equal(
    failingHarness.queries.some(({ normalized }) => normalized === "COMMIT"),
    false,
  );
});

test("deletion request rejects site-owner and changed-email targets before mutation", async () => {
  for (const [harness, input, code] of [
    [
      createRepositoryHarness({
        targetEmail: SITE_OWNER.email,
        targetId: ACTOR_ID,
        targetIsSiteOwner: true,
      }),
      deletionInput({
        targetOwnerId: ACTOR_ID,
        verifiedEmail: SITE_OWNER.email,
      }),
      "ADMIN_SITE_OWNER_DELETION_FORBIDDEN",
    ],
    [
      createRepositoryHarness(),
      deletionInput({ verifiedEmail: "changed@goodgood.invalid" }),
      "ADMIN_DELETION_VERIFICATION_MISMATCH",
    ],
  ]) {
    await assert.rejects(
      createAccountDeletionRequest(harness.pool, input),
      (error) => error.code === code && error.status === 409,
    );
    assert.equal(harness.queries.at(-1).normalized, "ROLLBACK");
    assert.equal(
      harness.queries.some(({ normalized }) =>
        normalized.startsWith("INSERT INTO account_deletion_requests"),
      ),
      false,
    );
  }
});

test("deletion API is POST-only, CSRF-protected, and returns idempotent status", async () => {
  const calls = [];
  const handler = createAdminNodeApiHandler({
    authenticate: async () => SITE_OWNER,
    operations: {
      async createAdminAccountDeletionRequest(input) {
        calls.push(input);
        return { created: true, id: "request-1", state: "processing" };
      },
    },
  });
  const request = Readable.from([Buffer.from(JSON.stringify({}))]);
  request.method = "POST";
  request.url = `/api/admin/users/${TARGET_ID}/deletion-requests`;
  request.headers = {
    "idempotency-key": "delete-request-0001",
    "x-goodgood-admin-action": "1",
  };
  let body;
  let statusCode;
  const response = {
    end(value) { body = JSON.parse(value); },
    writeHead(value) { statusCode = value; },
  };
  assert.equal(await handler(request, response), true);
  assert.equal(statusCode, 201);
  assert.equal(body.id, "request-1");
  assert.equal(calls[0].targetOwnerId, TARGET_ID);
  assert.equal(calls[0].idempotencyKey, "delete-request-0001");
});

test("new sessions and generation writes fail closed after deletion wins the owner lock", async () => {
  const sessionQueries = [];
  const sessionClient = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      sessionQueries.push(normalized);
      if (["BEGIN", "ROLLBACK"].includes(normalized)) {
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT owner.id")) {
        return { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {},
  };
  await assert.rejects(
    createAuthenticationSession(
      { async connect() { return sessionClient; } },
      {
        expiresAt: new Date("2026-09-07T00:00:00Z"),
        identityId: "identity-1",
        ownerId: TARGET_ID,
        tokenHash: "b".repeat(64),
      },
    ),
  );
  assert.equal(sessionQueries.at(-1), "ROLLBACK");
  assert.equal(sessionQueries.some((sql) => sql.startsWith("INSERT")), false);

  const generationQueries = [];
  const generationClient = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      generationQueries.push(normalized);
      if (["BEGIN", "ROLLBACK"].includes(normalized)) {
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rowCount: 1, rows: [{}] };
      }
      if (normalized.startsWith("SELECT owner.status")) {
        return {
          rowCount: 1,
          rows: [{ has_deletion_request: true, status: "suspended" }],
        };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {},
  };
  await assert.rejects(
    createGenerationJob(
      { async connect() { return generationClient; } },
      {
        idempotencyKey: "generation-after-delete",
        input: {
          aspectRatio: "1:1",
          count: 1,
          modelId: "nano-banana-2",
          prompt: "should never persist",
          references: [],
          resolution: "1K",
        },
        ownerId: TARGET_ID,
      },
    ),
    (error) => error.code === "ACCOUNT_SUSPENDED" && error.status === 403,
  );
  assert.equal(generationQueries.at(-1), "ROLLBACK");
});

test("provider submission guard becomes a terminal no-op after deletion", async () => {
  const queries = [];
  const client = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      queries.push(normalized);
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized)) {
        return { rowCount: null, rows: [] };
      }
      if (normalized.startsWith("SELECT attempt.id")) {
        return {
          rowCount: 1,
          rows: [{
            has_deletion_request: true,
            id: "attempt-1",
            job_state: "cancelled",
            owner_id: TARGET_ID,
            provider_task_id: null,
            state: "created",
          }],
        };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    release() {},
  };
  assert.equal(
    await markProviderSubmissionStarted(
      { async connect() { return client; } },
      { attemptId: "attempt-1" },
    ),
    false,
  );
  assert.equal(
    queries.some((sql) => sql.startsWith("UPDATE generation_attempts")),
    false,
  );
  assert.equal(queries.at(-1), "COMMIT");
});

test(
  "PostgreSQL deletion request preserves submitted work and atomically closes unsubmitted work",
  { skip: !integrationEnabled, timeout: 30_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 6 });
    const storage = new S3Client({
      credentials: {
        accessKeyId:
          process.env.GOODGOOD_M8_DELETION_OBJECT_STORAGE_ACCESS_KEY ??
          "goodgood-local",
        secretAccessKey:
          process.env.GOODGOOD_M8_DELETION_OBJECT_STORAGE_SECRET_KEY ??
          "goodgood-local-only",
      },
      endpoint: objectStorageEndpoint,
      forcePathStyle: true,
      region: "us-east-1",
    });
    const exactObjectKeys = [];
    context.after(() => pool.end());
    context.after(async () => {
      await Promise.allSettled(
        exactObjectKeys.map((key) =>
          storage.send(
            new DeleteObjectCommand({ Bucket: objectStorageBucket, Key: key }),
          ),
        ),
      );
      storage.destroy();
    });
    await ensureObjectStorageBucket(storage, objectStorageBucket);
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    const migrationCount = await pool.query(
      "SELECT count(*)::int AS count FROM goodgood_schema_migrations",
    );
    assert.equal(migrationCount.rows[0].count, 19);
    await seedLocalFixtures({ databaseUrl, logger: { log() {} } });
    await bootstrapSiteOwner(pool, {
      email: "m3-local@goodgood.invalid",
      operatorId: "m8-deletion-integration",
      reference: "m8-deletion-integration-site-owner-v1",
    });

    const suffix = `${Date.now()}-${randomUUID()}`;
    const claims = {
      email: `m8-delete-${suffix}@goodgood.invalid`,
      issuer: "https://m8-delete.goodgood.invalid/oidc",
      subject: `subject-${suffix}`,
    };
    const target = await provisionOwnerIdentity(pool, claims);
    await pool.query(
      "UPDATE users SET status = 'active', updated_at = now() WHERE id = $1",
      [target.ownerId],
    );
    await createAuthenticationSession(pool, {
      expiresAt: new Date(Date.now() + 60_000),
      identityId: target.identityId,
      ownerId: target.ownerId,
      tokenHash: createHash("sha256").update(`session-${suffix}`).digest("hex"),
    });

    const generationInput = {
      aspectRatio: "1:1",
      count: 1,
      modelId: "nano-banana-2",
      projectId: null,
      prompt: "M8 deletion integration",
      references: [],
      resolution: "1K",
    };
    const unsubmitted = await createGenerationJob(pool, {
      idempotencyKey: `m8-delete-unsubmitted-${suffix}`,
      input: generationInput,
      ownerId: target.ownerId,
    });
    const submitted = await createGenerationJob(pool, {
      idempotencyKey: `m8-delete-submitted-${suffix}`,
      input: { ...generationInput, prompt: "M8 submitted deletion integration" },
      ownerId: target.ownerId,
    });
    const claim = await claimGenerationJob(pool, {
      attemptRoute: {
        provider: "goodgood-mock",
        providerModel: "nano-banana-2",
        routeVersion: "m8-deletion-test-v1",
      },
      jobId: submitted.row.id,
      leaseMs: 30_000,
      workerId: `m8-delete-worker-${suffix}`,
    });
    assert.equal(claim.claimed, true);
    assert.equal(
      await markProviderSubmissionStarted(pool, { attemptId: claim.attempt.id }),
      true,
    );

    const succeeded = await createGenerationJob(pool, {
      idempotencyKey: `m8-delete-succeeded-${suffix}`,
      input: { ...generationInput, prompt: "M8 succeeded deletion integration" },
      ownerId: target.ownerId,
    });
    const succeededWorkerId = `m8-delete-success-worker-${suffix}`;
    const succeededClaim = await claimGenerationJob(pool, {
      attemptRoute: {
        provider: "goodgood-mock",
        providerModel: "nano-banana-2",
        routeVersion: "m8-deletion-test-v1",
      },
      jobId: succeeded.row.id,
      leaseMs: 30_000,
      workerId: succeededWorkerId,
    });
    assert.equal(succeededClaim.claimed, true);
    assert.equal(
      await markProviderSubmissionStarted(pool, {
        attemptId: succeededClaim.attempt.id,
      }),
      true,
    );
    const assetId = randomUUID();
    const assetObjectKey = `m8-account-deletion/${suffix}/asset`;
    const assetBytes = Buffer.from("m8 disposable generated asset");
    exactObjectKeys.push(assetObjectKey);
    await storage.send(
      new PutObjectCommand({
        Body: assetBytes,
        Bucket: objectStorageBucket,
        Key: assetObjectKey,
      }),
    );
    assert.equal(
      await completeGenerationJob(pool, {
        asset: {
          aspectRatio: "1:1",
          batchId: succeeded.row.batch_id,
          byteSize: assetBytes.length,
          checksum: createHash("sha256").update(assetBytes).digest("hex"),
          id: assetId,
          mimeType: "image/png",
          objectKey: assetObjectKey,
          ownerId: target.ownerId,
          pixelHeight: 1,
          pixelWidth: 1,
        },
        attemptId: succeededClaim.attempt.id,
        jobId: succeeded.row.id,
        resultHash: createHash("sha256")
          .update(`result-${suffix}`)
          .digest("hex"),
        workerId: succeededWorkerId,
      }),
      true,
    );

    const [reference] = await createPendingReferenceAssets(pool, {
      files: [{
        byteSize: 28,
        clientId: `reference-${suffix}`,
        mimeType: "image/png",
        name: "disposable-reference.png",
      }],
      ownerId: target.ownerId,
      uploadTtlSeconds: 3_600,
    });
    exactObjectKeys.push(reference.object_key);
    await storage.send(
      new PutObjectCommand({
        Body: Buffer.from("m8 disposable reference image"),
        Bucket: objectStorageBucket,
        Key: reference.object_key,
      }),
    );
    await markReferenceReady(pool, {
      byteSize: 29,
      checksum: createHash("sha256")
        .update("m8 disposable reference image")
        .digest("hex"),
      detectedMimeType: "image/png",
      height: 64,
      ownerId: target.ownerId,
      referenceId: reference.id,
      width: 64,
    });
    const [activeUploadReference] = await createPendingReferenceAssets(pool, {
      files: [{
        byteSize: 31,
        clientId: `active-upload-${suffix}`,
        mimeType: "image/png",
        name: "active-upload-reference.png",
      }],
      ownerId: target.ownerId,
      uploadTtlSeconds: 3_600,
    });
    exactObjectKeys.push(activeUploadReference.object_key);
    await storage.send(
      new PutObjectCommand({
        Body: Buffer.from("m8 active signed upload object"),
        Bucket: objectStorageBucket,
        Key: activeUploadReference.object_key,
      }),
    );
    await createProject(pool, {
      batchIds: [succeeded.row.id],
      idempotencyKey: `m8-delete-project-${suffix}`,
      name: "M8 disposable project",
      ownerId: target.ownerId,
      state: {
        aspectRatio: "1:1",
        count: 1,
        modelId: "nano-banana-2",
        prompt: "M8 disposable project prompt",
        references: [],
        resolution: "1K",
      },
    });
    await saveCreationDraft(pool, {
      expectedVersion: null,
      ownerId: target.ownerId,
      state: {
        aspectRatio: "1:1",
        count: 1,
        modelId: "nano-banana-2",
        prompt: "M8 disposable draft prompt",
        referenceIds: [],
        resolution: "1K",
      },
    });

    const input = deletionInput({
      actorOwnerId: LOCAL_SITE_OWNER_ID,
      idempotencyKey: `m8-delete-request-${suffix}`,
      operationHash: createHash("sha256").update(suffix).digest("hex"),
      targetOwnerId: target.ownerId,
      verifiedEmail: claims.email,
    });
    const deletion = await createAccountDeletionRequest(pool, input);
    assert.equal(deletion.created, true);
    assert.equal(deletion.cancelledJobCount, 1);
    assert.equal(deletion.releasedCredits, "10");
    assert.equal(deletion.revokedSessionCount, 1);

    const managedAccounts = await listManagedAccounts(pool, {
      limit: 10,
      query: claims.email,
      status: "suspended",
    });
    assert.equal(managedAccounts.items.length, 1);
    assert.equal(managedAccounts.items[0].deletionRequest.id, deletion.id);
    assert.equal(managedAccounts.items[0].deletionRequest.state, "processing");
    assert.equal(
      managedAccounts.items[0].deletionRequest.deadlineAt,
      deletion.deadlineAt,
    );

    const state = await pool.query(
      `SELECT owner.status,
              account.available_balance, account.reserved_balance,
              unsubmitted.state AS unsubmitted_state,
              submitted.state AS submitted_state,
              outbox.cancelled_at,
              session.revoked_at,
              request.state AS deletion_state,
              count(release.id)::int AS release_count
         FROM users owner
         JOIN credit_accounts account
           ON account.owner_id = owner.id AND account.unit = 'credit'
         JOIN generation_jobs unsubmitted ON unsubmitted.id = $2
         JOIN generation_jobs submitted ON submitted.id = $3
         JOIN generation_queue_outbox outbox
           ON outbox.job_id = unsubmitted.id
         JOIN auth_sessions session ON session.owner_id = owner.id
         JOIN account_deletion_requests request
           ON request.target_owner_id = owner.id
         LEFT JOIN credit_ledger_entries release
           ON release.related_job_id = unsubmitted.id
          AND release.entry_type = 'release'
        WHERE owner.id = $1
        GROUP BY owner.status, account.available_balance,
                 account.reserved_balance, unsubmitted.state,
                 submitted.state, outbox.cancelled_at, session.revoked_at,
                 request.state`,
      [target.ownerId, unsubmitted.row.id, submitted.row.id],
    );
    assert.deepEqual(state.rows[0], {
      available_balance: "80",
      cancelled_at: state.rows[0].cancelled_at,
      deletion_state: "processing",
      release_count: 1,
      reserved_balance: "10",
      revoked_at: state.rows[0].revoked_at,
      status: "suspended",
      submitted_state: "running",
      unsubmitted_state: "cancelled",
    });
    assert.ok(state.rows[0].cancelled_at);
    assert.ok(state.rows[0].revoked_at);
    assert.equal(
      (await createAccountDeletionRequest(pool, input)).created,
      false,
    );

    await assert.rejects(
      createAuthenticationSession(pool, {
        expiresAt: new Date(Date.now() + 60_000),
        identityId: target.identityId,
        ownerId: target.ownerId,
        tokenHash: createHash("sha256")
          .update(`second-session-${suffix}`)
          .digest("hex"),
      }),
    );
    await assert.rejects(
      createGenerationJob(pool, {
        idempotencyKey: `m8-delete-denied-${suffix}`,
        input: generationInput,
        ownerId: target.ownerId,
      }),
      (error) => error.code === "ACCOUNT_SUSPENDED",
    );
    await assert.rejects(
      createPendingReferenceAssets(pool, {
        files: [{
          byteSize: 100,
          clientId: `late-reference-${suffix}`,
          mimeType: "image/png",
          name: "late-reference.png",
        }],
        ownerId: target.ownerId,
        uploadTtlSeconds: 600,
      }),
      (error) => error.code === "ACCOUNT_SUSPENDED",
    );
    await assert.rejects(
      createProject(pool, {
        batchIds: [],
        idempotencyKey: `m8-delete-late-project-${suffix}`,
        name: "Late project",
        ownerId: target.ownerId,
        state: {
          aspectRatio: "1:1",
          count: 1,
          modelId: "nano-banana-2",
          prompt: "must not persist",
          references: [],
          resolution: "1K",
        },
      }),
      (error) => error.code === "ACCOUNT_SUSPENDED",
    );
    await assert.rejects(
      saveCreationDraft(pool, {
        expectedVersion: 1,
        ownerId: target.ownerId,
        state: {
          aspectRatio: "1:1",
          count: 1,
          modelId: "nano-banana-2",
          prompt: "must not persist",
          referenceIds: [],
          resolution: "1K",
        },
      }),
      (error) => error.code === "ACCOUNT_SUSPENDED",
    );
    await assert.rejects(
      changeAccountAccess(pool, {
        actorOwnerId: LOCAL_SITE_OWNER_ID,
        idempotencyKey: `m8-delete-restore-${suffix}`,
        operationHash: "c".repeat(64),
        reason: "must remain irreversible",
        targetOwnerId: target.ownerId,
        toStatus: "active",
      }),
      (error) => error.code === "ADMIN_DELETION_REQUEST_IRREVERSIBLE",
    );
    await assert.rejects(
      grantTestCredits(pool, {
        actorOwnerId: LOCAL_SITE_OWNER_ID,
        amount: 100,
        idempotencyKey: `m8-delete-grant-${suffix}`,
        ledgerIdempotencyKey: `m8-delete-ledger-${suffix}`,
        operationHash: "d".repeat(64),
        reason: "must remain irreversible",
        targetOwnerId: target.ownerId,
      }),
      (error) => error.code === "ADMIN_DELETION_REQUEST_IRREVERSIBLE",
    );

    const lifecycleNow = new Date(Date.now() + 10);
    const deferredLifecycle = await runAccountDeletionWaitPass(pool, {
      batchSize: 1,
      now: lifecycleNow,
      requestId: deletion.id,
      retryMilliseconds: 1,
      workerId: `m8-lifecycle-${randomUUID()}`,
    });
    assert.deepEqual(deferredLifecycle, {
      claimed: 1,
      completed: 0,
      deferred: 1,
      failed: 0,
      lostLease: 0,
    });
    const deferredStep = await pool.query(
      `SELECT state, last_active_job_count, last_block_code,
              lease_owner, lease_expires_at
         FROM account_deletion_steps
        WHERE request_id = $1 AND step_name = 'wait_for_submitted_jobs'`,
      [deletion.id],
    );
    assert.deepEqual(deferredStep.rows[0], {
      last_active_job_count: 1,
      last_block_code: "SUBMITTED_JOBS_ACTIVE",
      lease_expires_at: null,
      lease_owner: null,
      state: "pending",
    });

    await pool.query(
      `UPDATE generation_jobs
          SET state = 'failed', completed_at = now(), updated_at = now()
        WHERE id = $1`,
      [submitted.row.id],
    );
    await releaseGenerationCredits(pool, {
      actor: "system",
      idempotencyKey: `m8-delete-submitted-release-${suffix}`,
      jobId: submitted.row.id,
      metadata: { reason: "integration_terminal_failure" },
      ownerId: target.ownerId,
      reason: "generation_release",
    });
    const completedLifecycle = await runAccountDeletionWaitPass(pool, {
      batchSize: 1,
      now: new Date(lifecycleNow.getTime() + 2),
      requestId: deletion.id,
      retryMilliseconds: 1,
      workerId: `m8-lifecycle-${randomUUID()}`,
    });
    assert.deepEqual(completedLifecycle, {
      claimed: 1,
      completed: 1,
      deferred: 0,
      failed: 0,
      lostLease: 0,
    });
    const inventory = await previewAccountDeletionInventory(pool, {
      requestId: deletion.id,
    });
    assert.deepEqual(inventory.counts, {
      assets: 1,
      drafts: 1,
      generationJobs: 3,
      privateObjects: 3,
      projects: 1,
      references: 2,
    });
    assert.match(inventory.inventorySha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(
      await previewAccountDeletionInventory(pool, { requestId: deletion.id }),
      inventory,
    );
    const objectFailureLogs = [];
    const objectFailureNow = new Date();
    const failedObjectPass = await runAccountDeletionObjectPass(
      {
        config: { objectStorage: { bucket: objectStorageBucket } },
        pool,
        storage,
      },
      {
        batchSize: 1,
        deleteObject: async () => {
          throw new Error("disposable RustFS failure simulation");
        },
        logger: { error(message) { objectFailureLogs.push(message); } },
        now: objectFailureNow,
        objectBatchSize: 1,
        requestId: deletion.id,
        retryMilliseconds: 1,
        workerId: `m8-object-failure-${randomUUID()}`,
      },
    );
    assert.deepEqual(failedObjectPass, {
      claimed: 1,
      completed: 0,
      deferred: 1,
      deleted: 0,
      failed: 1,
      lostLease: 0,
      objectsClaimed: 1,
    });
    assert.doesNotMatch(
      objectFailureLogs.join("\n"),
      /m8-account-deletion|references\//,
    );
    const failedObjectState = await pool.query(
      `SELECT state, last_block_code, last_failed_object_count
         FROM account_deletion_steps
        WHERE request_id = $1 AND step_name = 'delete_private_objects'`,
      [deletion.id],
    );
    assert.deepEqual(failedObjectState.rows[0], {
      last_block_code: "OBJECT_DELETE_FAILED",
      last_failed_object_count: 1,
      state: "pending",
    });
    for (const key of exactObjectKeys) {
      await storage.send(
        new HeadObjectCommand({ Bucket: objectStorageBucket, Key: key }),
      );
    }

    const objectNow = new Date(objectFailureNow.getTime() + 2);
    const firstObjectPass = await runAccountDeletionObjectPass(
      {
        config: { objectStorage: { bucket: objectStorageBucket } },
        pool,
        storage,
      },
      {
        batchSize: 1,
        now: objectNow,
        objectBatchSize: 1,
        requestId: deletion.id,
        retryMilliseconds: 1,
        workerId: `m8-object-lifecycle-${randomUUID()}`,
      },
    );
    assert.deepEqual(firstObjectPass, {
      claimed: 1,
      completed: 0,
      deferred: 1,
      deleted: 1,
      failed: 0,
      lostLease: 0,
      objectsClaimed: 1,
    });
    const middleInventory = await previewAccountDeletionInventory(pool, {
      requestId: deletion.id,
    });
    assert.equal(middleInventory.counts.privateObjects, 2);
    const secondObjectPass = await runAccountDeletionObjectPass(
      {
        config: { objectStorage: { bucket: objectStorageBucket } },
        pool,
        storage,
      },
      {
        batchSize: 1,
        now: new Date(objectNow.getTime() + 2),
        objectBatchSize: 1,
        requestId: deletion.id,
        retryMilliseconds: 1,
        workerId: `m8-object-lifecycle-${randomUUID()}`,
      },
    );
    assert.deepEqual(secondObjectPass, {
      claimed: 1,
      completed: 0,
      deferred: 1,
      deleted: 1,
      failed: 0,
      lostLease: 0,
      objectsClaimed: 1,
    });
    const activeUploadInventory = await previewAccountDeletionInventory(pool, {
      requestId: deletion.id,
    });
    assert.equal(activeUploadInventory.counts.privateObjects, 1);
    await storage.send(
      new HeadObjectCommand({
        Bucket: objectStorageBucket,
        Key: activeUploadReference.object_key,
      }),
    );
    await pool.query(
      `UPDATE reference_assets
          SET expires_at = $2
        WHERE id = $1 AND upload_state = 'pending'`,
      [
        activeUploadReference.id,
        new Date(objectNow.getTime() - 5 * 60 * 1_000 - 1),
      ],
    );
    const thirdObjectPass = await runAccountDeletionObjectPass(
      {
        config: { objectStorage: { bucket: objectStorageBucket } },
        pool,
        storage,
      },
      {
        batchSize: 1,
        now: new Date(objectNow.getTime() + 4),
        objectBatchSize: 1,
        requestId: deletion.id,
        retryMilliseconds: 1,
        workerId: `m8-object-lifecycle-${randomUUID()}`,
      },
    );
    assert.deepEqual(thirdObjectPass, {
      claimed: 1,
      completed: 1,
      deferred: 0,
      deleted: 1,
      failed: 0,
      lostLease: 0,
      objectsClaimed: 1,
    });
    for (const key of exactObjectKeys) {
      await assert.rejects(
        storage.send(
          new HeadObjectCommand({ Bucket: objectStorageBucket, Key: key }),
        ),
        (error) => error?.$metadata?.httpStatusCode === 404,
      );
    }
    const postObjectInventory = await previewAccountDeletionInventory(pool, {
      requestId: deletion.id,
    });
    assert.deepEqual(postObjectInventory.counts, {
      ...inventory.counts,
      privateObjects: 0,
    });
    assert.notEqual(postObjectInventory.inventorySha256, inventory.inventorySha256);
    assert.deepEqual(
      await runAccountDeletionObjectPass(
        {
          config: { objectStorage: { bucket: objectStorageBucket } },
          pool,
          storage,
        },
        {
          batchSize: 1,
          requestId: deletion.id,
          workerId: `m8-object-repeat-${randomUUID()}`,
        },
      ),
      {
        claimed: 0,
        completed: 0,
        deferred: 0,
        deleted: 0,
        failed: 0,
        lostLease: 0,
        objectsClaimed: 0,
      },
    );
    const lifecycleState = await pool.query(
      `SELECT register.state AS register_state,
              request.state AS request_state,
              step.state AS step_state,
              step.completed_at,
              object_step.state AS object_step_state,
              object_step.completed_at AS object_completed_at,
              object_step.inventory_sha256,
              object_step.last_target_object_count,
              object_step.deleted_object_count,
              object_step.last_failed_object_count,
              (SELECT count(*)::int FROM users WHERE id = register.target_owner_id)
                AS owner_count,
              (SELECT count(*)::int FROM generation_jobs
                WHERE owner_id = register.target_owner_id) AS job_count,
              (SELECT count(*)::int FROM assets
                WHERE owner_id = register.target_owner_id
                  AND object_deleted_at IS NOT NULL) AS deleted_asset_count,
              (SELECT count(*)::int FROM reference_assets
                WHERE owner_id = register.target_owner_id
                  AND object_deleted_at IS NOT NULL) AS deleted_reference_count
         FROM account_deletion_register register
         JOIN account_deletion_requests request
           ON request.id = register.request_id
         JOIN account_deletion_steps step
           ON step.request_id = register.request_id
          AND step.step_name = 'wait_for_submitted_jobs'
         JOIN account_deletion_steps object_step
           ON object_step.request_id = register.request_id
          AND object_step.step_name = 'delete_private_objects'
        WHERE register.request_id = $1`,
      [deletion.id],
    );
    assert.deepEqual(lifecycleState.rows[0], {
      completed_at: lifecycleState.rows[0].completed_at,
      deleted_asset_count: 1,
      deleted_object_count: 3,
      deleted_reference_count: 2,
      inventory_sha256: activeUploadInventory.inventorySha256,
      job_count: 3,
      last_failed_object_count: 0,
      last_target_object_count: 1,
      object_completed_at: lifecycleState.rows[0].object_completed_at,
      object_step_state: "completed",
      owner_count: 1,
      register_state: "processing",
      request_state: "processing",
      step_state: "completed",
    });
    assert.ok(lifecycleState.rows[0].completed_at);
    assert.ok(lifecycleState.rows[0].object_completed_at);

    const creativeCounts = await pool.query(
      `SELECT (
         (SELECT count(*) FROM projects WHERE owner_id = $1)
         + (SELECT count(*) FROM generation_batches WHERE owner_id = $1)
         + (SELECT count(*) FROM generation_jobs WHERE owner_id = $1)
         + (SELECT count(*) FROM assets WHERE owner_id = $1)
         + (SELECT count(*) FROM creation_drafts WHERE owner_id = $1)
         + (SELECT count(*) FROM reference_assets WHERE owner_id = $1)
         + (SELECT count(*) FROM generation_attempts attempt
              JOIN generation_jobs job ON job.id = attempt.job_id
             WHERE job.owner_id = $1)
         + (SELECT count(*) FROM generation_job_events event
              JOIN generation_jobs job ON job.id = event.job_id
             WHERE job.owner_id = $1)
         + (SELECT count(*) FROM generation_queue_outbox outbox
              JOIN generation_jobs job ON job.id = outbox.job_id
             WHERE job.owner_id = $1)
       )::int AS count,
       (SELECT count(*)::int FROM credit_ledger_entries
         WHERE owner_id = $1 AND related_job_id IS NOT NULL) AS linked_ledger_count,
       (SELECT count(*)::int FROM credit_ledger_entries
         WHERE owner_id = $1) AS ledger_count`,
      [target.ownerId],
    );
    const expectedCreativeRecordCount = creativeCounts.rows[0].count;
    const linkedLedgerCount = creativeCounts.rows[0].linked_ledger_count;
    const ledgerCount = creativeCounts.rows[0].ledger_count;
    assert.ok(expectedCreativeRecordCount > 0);
    assert.ok(linkedLedgerCount > 0);
    await assert.rejects(
      pool.query(
        `UPDATE credit_ledger_entries
            SET reason = reason
          WHERE owner_id = $1`,
        [target.ownerId],
      ),
      /immutable outside reviewed account deletion/,
    );

    const creativeFailureLogs = [];
    const creativeFailureNow = new Date();
    const failedCreativePass = await runAccountDeletionCreativePass(pool, {
      batchSize: 1,
      logger: { error(message) { creativeFailureLogs.push(message); } },
      now: creativeFailureNow,
      repository: {
        claimAccountDeletionCreativeStep,
        deferAccountDeletionCreativeStep,
        async deleteAccountDeletionCreativeRecords() {
          throw new Error(`must not log ${target.ownerId}`);
        },
      },
      requestId: deletion.id,
      retryMilliseconds: 1,
      workerId: `m8-creative-failure-${randomUUID()}`,
    });
    assert.deepEqual(failedCreativePass, {
      claimed: 1,
      completed: 0,
      deferred: 1,
      deletedRecords: 0,
      failed: 1,
      lostLease: 0,
    });
    assert.doesNotMatch(creativeFailureLogs.join("\n"), new RegExp(target.ownerId));
    const failedCreativeState = await pool.query(
      `SELECT state, last_block_code, last_target_creative_record_count,
              last_failed_creative_record_count
         FROM account_deletion_steps
        WHERE request_id = $1 AND step_name = 'delete_creative_records'`,
      [deletion.id],
    );
    assert.deepEqual(failedCreativeState.rows[0], {
      last_block_code: "CREATIVE_DELETE_FAILED",
      last_failed_creative_record_count: expectedCreativeRecordCount,
      last_target_creative_record_count: expectedCreativeRecordCount,
      state: "pending",
    });
    assert.deepEqual(
      await previewAccountDeletionInventory(pool, { requestId: deletion.id }),
      postObjectInventory,
    );

    const completedCreativePass = await runAccountDeletionCreativePass(pool, {
      batchSize: 1,
      now: new Date(creativeFailureNow.getTime() + 2),
      requestId: deletion.id,
      retryMilliseconds: 1,
      workerId: `m8-creative-lifecycle-${randomUUID()}`,
    });
    assert.deepEqual(completedCreativePass, {
      claimed: 1,
      completed: 1,
      deferred: 0,
      deletedRecords: expectedCreativeRecordCount,
      failed: 0,
      lostLease: 0,
    });
    const postCreativeInventory = await previewAccountDeletionInventory(pool, {
      requestId: deletion.id,
    });
    assert.deepEqual(postCreativeInventory.counts, {
      assets: 0,
      drafts: 0,
      generationJobs: 0,
      privateObjects: 0,
      projects: 0,
      references: 0,
    });
    assert.notEqual(
      postCreativeInventory.inventorySha256,
      postObjectInventory.inventorySha256,
    );

    const retained = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM users WHERE id = $1) AS owner_count,
         (SELECT count(*)::int FROM auth_identities WHERE owner_id = $1)
           AS identity_count,
         (SELECT count(*)::int FROM auth_sessions WHERE owner_id = $1)
           AS session_count,
         (SELECT count(*)::int FROM credit_accounts WHERE owner_id = $1)
           AS credit_account_count,
         (SELECT count(*)::int FROM credit_ledger_entries WHERE owner_id = $1)
           AS ledger_count,
         (SELECT count(*)::int FROM credit_ledger_entries
           WHERE owner_id = $1
             AND related_job_id IS NULL
             AND account_deletion_request_id = $2
             AND creative_link_deleted_at IS NOT NULL) AS severed_ledger_count,
         (SELECT count(*)::int FROM administrative_actions
           WHERE target_owner_id = $1) AS administrative_action_count,
         (SELECT count(*)::int FROM account_deletion_requests
           WHERE id = $2 AND target_owner_id = $1) AS request_count,
         (SELECT count(*)::int FROM account_deletion_register
           WHERE request_id = $2 AND target_owner_id = $1) AS register_count`,
      [target.ownerId, deletion.id],
    );
    assert.equal(retained.rows[0].owner_count, 1);
    assert.equal(retained.rows[0].identity_count, 1);
    assert.equal(retained.rows[0].session_count, 1);
    assert.equal(retained.rows[0].credit_account_count, 1);
    assert.equal(retained.rows[0].ledger_count, ledgerCount);
    assert.equal(retained.rows[0].severed_ledger_count, linkedLedgerCount);
    assert.ok(retained.rows[0].administrative_action_count >= 1);
    assert.equal(retained.rows[0].request_count, 1);
    assert.equal(retained.rows[0].register_count, 1);

    const completedCreativeState = await pool.query(
      `SELECT state, inventory_sha256,
              last_target_creative_record_count,
              deleted_creative_record_count,
              last_failed_creative_record_count,
              lease_owner, lease_expires_at, completed_at
         FROM account_deletion_steps
        WHERE request_id = $1 AND step_name = 'delete_creative_records'`,
      [deletion.id],
    );
    assert.deepEqual(completedCreativeState.rows[0], {
      completed_at: completedCreativeState.rows[0].completed_at,
      deleted_creative_record_count: expectedCreativeRecordCount,
      inventory_sha256: postObjectInventory.inventorySha256,
      last_failed_creative_record_count: 0,
      last_target_creative_record_count: expectedCreativeRecordCount,
      lease_expires_at: null,
      lease_owner: null,
      state: "completed",
    });
    assert.ok(completedCreativeState.rows[0].completed_at);
    assert.deepEqual(
      await runAccountDeletionCreativePass(pool, {
        batchSize: 1,
        requestId: deletion.id,
        workerId: `m8-creative-repeat-${randomUUID()}`,
      }),
      {
        claimed: 0,
        completed: 0,
        deferred: 0,
        deletedRecords: 0,
        failed: 0,
        lostLease: 0,
      },
    );

    const identityKey = `${claims.issuer}\u0000${claims.subject}`;
    const disposableIdentityDirectory = new Map([
      [identityKey, { disabled: false }],
    ]);
    let failNextIdentityDelete = true;
    const identityAdapter = {
      async disableIdentity(identity) {
        const entry = disposableIdentityDirectory.get(
          `${identity.issuer}\u0000${identity.subject}`,
        );
        if (entry) entry.disabled = true;
      },
      async deleteIdentity(identity) {
        const key = `${identity.issuer}\u0000${identity.subject}`;
        if (failNextIdentityDelete) {
          failNextIdentityDelete = false;
          throw new Error(`fake provider must not leak ${key}`);
        }
        const entry = disposableIdentityDirectory.get(key);
        if (entry && !entry.disabled) {
          throw new Error("fake provider requires disable before delete");
        }
        disposableIdentityDirectory.delete(key);
      },
    };
    const identityFailureLogs = [];
    const identityFailureNow = new Date(creativeFailureNow.getTime() + 4);
    const failedIdentityPass = await runAccountDeletionIdentityPass(pool, {
      batchSize: 1,
      identityAdapter,
      identityBatchSize: 1,
      logger: { error(message) { identityFailureLogs.push(message); } },
      now: identityFailureNow,
      requestId: deletion.id,
      retryMilliseconds: 1,
      workerId: `m8-identity-failure-${randomUUID()}`,
    });
    assert.deepEqual(failedIdentityPass, {
      claimed: 1,
      completed: 0,
      deferred: 1,
      deleted: 0,
      disabled: 1,
      failed: 1,
      identitiesClaimed: 1,
      lostLease: 0,
    });
    assert.doesNotMatch(
      identityFailureLogs.join("\n"),
      new RegExp(`${claims.subject}|${claims.issuer}`),
    );
    const identityAfterFailure = await pool.query(
      `SELECT external_disabled_at, external_deleted_at
         FROM auth_identities
        WHERE owner_id = $1`,
      [target.ownerId],
    );
    assert.equal(identityAfterFailure.rowCount, 1);
    assert.ok(identityAfterFailure.rows[0].external_disabled_at);
    assert.equal(identityAfterFailure.rows[0].external_deleted_at, null);
    const identityStepAfterFailure = await pool.query(
      `SELECT state, last_block_code, last_target_identity_count,
              disabled_identity_count, deleted_identity_count,
              last_failed_identity_count
         FROM account_deletion_steps
        WHERE request_id = $1 AND step_name = 'delete_external_identities'`,
      [deletion.id],
    );
    assert.deepEqual(identityStepAfterFailure.rows[0], {
      deleted_identity_count: 0,
      disabled_identity_count: 1,
      last_block_code: "IDENTITY_DELETE_FAILED",
      last_failed_identity_count: 1,
      last_target_identity_count: 1,
      state: "pending",
    });

    const completedIdentityPass = await runAccountDeletionIdentityPass(pool, {
      batchSize: 1,
      identityAdapter,
      identityBatchSize: 1,
      now: new Date(identityFailureNow.getTime() + 2),
      requestId: deletion.id,
      retryMilliseconds: 1,
      workerId: `m8-identity-lifecycle-${randomUUID()}`,
    });
    assert.deepEqual(completedIdentityPass, {
      claimed: 1,
      completed: 1,
      deferred: 0,
      deleted: 1,
      disabled: 0,
      failed: 0,
      identitiesClaimed: 1,
      lostLease: 0,
    });
    assert.equal(disposableIdentityDirectory.has(identityKey), false);
    const completedIdentityState = await pool.query(
      `SELECT step.state, step.last_block_code,
              step.last_target_identity_count,
              step.disabled_identity_count, step.deleted_identity_count,
              step.last_failed_identity_count, step.lease_owner,
              step.lease_expires_at, step.completed_at,
              identity.external_disabled_at, identity.external_deleted_at,
              identity.issuer, identity.subject,
              request.state AS request_state,
              register.state AS register_state
         FROM account_deletion_steps step
         JOIN account_deletion_requests request ON request.id = step.request_id
         JOIN account_deletion_register register
           ON register.request_id = step.request_id
         JOIN auth_identities identity
           ON identity.owner_id = register.target_owner_id
        WHERE step.request_id = $1
          AND step.step_name = 'delete_external_identities'`,
      [deletion.id],
    );
    assert.deepEqual(completedIdentityState.rows[0], {
      completed_at: completedIdentityState.rows[0].completed_at,
      deleted_identity_count: 1,
      disabled_identity_count: 1,
      external_deleted_at: completedIdentityState.rows[0].external_deleted_at,
      external_disabled_at: completedIdentityState.rows[0].external_disabled_at,
      last_block_code: null,
      last_failed_identity_count: 0,
      last_target_identity_count: 1,
      lease_expires_at: null,
      lease_owner: null,
      issuer: claims.issuer,
      register_state: "processing",
      request_state: "processing",
      state: "completed",
      subject: claims.subject,
    });
    assert.ok(completedIdentityState.rows[0].completed_at);
    assert.ok(completedIdentityState.rows[0].external_disabled_at);
    assert.ok(completedIdentityState.rows[0].external_deleted_at);
    assert.deepEqual(
      await runAccountDeletionIdentityPass(pool, {
        batchSize: 1,
        identityAdapter,
        requestId: deletion.id,
        workerId: `m8-identity-repeat-${randomUUID()}`,
      }),
      {
        claimed: 0,
        completed: 0,
        deferred: 0,
        deleted: 0,
        disabled: 0,
        failed: 0,
        identitiesClaimed: 0,
        lostLease: 0,
      },
    );

    const ledgerEvidenceBefore = await pool.query(
      `SELECT id, account_id, owner_id, entry_type, amount,
              idempotency_key, operation_hash, reason, related_job_id,
              related_payment_ref, account_deletion_request_id,
              creative_link_deleted_at, prior_entry_id, actor, metadata,
              created_at
         FROM credit_ledger_entries
        WHERE owner_id = $1
        ORDER BY created_at, id`,
      [target.ownerId],
    );
    const administrativeEvidenceBefore = await pool.query(
      `SELECT *
         FROM administrative_actions
        WHERE target_owner_id = $1
        ORDER BY created_at, id`,
      [target.ownerId],
    );
    const completionBalanceBefore = await pool.query(
      `SELECT available_balance, reserved_balance, status
         FROM credit_accounts
        WHERE owner_id = $1 AND unit = 'credit'`,
      [target.ownerId],
    );
    assert.equal(completionBalanceBefore.rows[0].reserved_balance, "0");
    const expectedExpiredCredits = completionBalanceBefore.rows[0].available_balance;

    const completionFailureLogs = [];
    const completionFailureNow = new Date(identityFailureNow.getTime() + 4);
    const failedCompletionPass = await runAccountDeletionCompletionPass(pool, {
      batchSize: 1,
      logger: { error(message) { completionFailureLogs.push(message); } },
      now: completionFailureNow,
      repository: {
        claimAccountDeletionCompletionStep,
        deferAccountDeletionCompletionStep,
        async completeAccountDeletionLocally() {
          throw new Error(`must not log ${claims.email} ${target.ownerId}`);
        },
      },
      requestId: deletion.id,
      retryMilliseconds: 1,
      workerId: `m8-completion-failure-${randomUUID()}`,
    });
    assert.deepEqual(failedCompletionPass, {
      claimed: 1,
      completed: 0,
      deferred: 1,
      deletedIdentities: 0,
      deletedSessions: 0,
      expiredCredits: "0",
      failed: 1,
      lostLease: 0,
    });
    assert.match(completionFailureLogs[0], /LOCAL_ANONYMIZATION_FAILED/);
    assert.doesNotMatch(
      completionFailureLogs.join("\n"),
      new RegExp(`${claims.email}|${target.ownerId}`),
    );
    const completionAfterFailure = await pool.query(
      `SELECT step.state, step.last_block_code,
              owner.email, owner.anonymized_at,
              account.available_balance, account.reserved_balance,
              (SELECT count(*)::int FROM auth_sessions
                WHERE owner_id = owner.id) AS session_count,
              (SELECT count(*)::int FROM auth_identities
                WHERE owner_id = owner.id) AS identity_count
         FROM account_deletion_steps step
         JOIN account_deletion_register register
           ON register.request_id = step.request_id
         JOIN users owner ON owner.id = register.target_owner_id
         JOIN credit_accounts account
           ON account.owner_id = owner.id AND account.unit = 'credit'
        WHERE step.request_id = $1
          AND step.step_name = 'anonymize_goodgood_account'`,
      [deletion.id],
    );
    assert.deepEqual(completionAfterFailure.rows[0], {
      anonymized_at: null,
      available_balance: expectedExpiredCredits,
      email: claims.email,
      identity_count: 1,
      last_block_code: "LOCAL_ANONYMIZATION_FAILED",
      reserved_balance: "0",
      session_count: 1,
      state: "pending",
    });

    const completedAt = new Date(completionFailureNow.getTime() + 2);
    const completedAccountPass = await runAccountDeletionCompletionPass(pool, {
      batchSize: 1,
      now: completedAt,
      requestId: deletion.id,
      retryMilliseconds: 1,
      workerId: `m8-completion-lifecycle-${randomUUID()}`,
    });
    assert.deepEqual(completedAccountPass, {
      claimed: 1,
      completed: 1,
      deferred: 0,
      deletedIdentities: 1,
      deletedSessions: 1,
      expiredCredits: expectedExpiredCredits,
      failed: 0,
      lostLease: 0,
    });

    const completedAccountState = await pool.query(
      `SELECT owner.email, owner.locale, owner.status, owner.anonymized_at,
              account.available_balance, account.reserved_balance,
              account.status AS account_status,
              request.state AS request_state,
              request.mail_reference_id,
              request.completed_at AS request_completed_at,
              register.state AS register_state,
              register.completed_at AS register_completed_at,
              register.audit_retention_until,
              register.audit_retention_until =
                register.completed_at + interval '12 months' AS retention_exact,
              step.state AS step_state,
              step.deleted_local_session_count,
              step.deleted_local_identity_count,
              step.expired_credit_amount,
              step.completed_at AS step_completed_at,
              (SELECT count(*)::int FROM auth_sessions
                WHERE owner_id = owner.id) AS session_count,
              (SELECT count(*)::int FROM auth_identities
                WHERE owner_id = owner.id) AS identity_count,
              (SELECT count(*)::int FROM projects
                WHERE owner_id = owner.id) AS project_count,
              (SELECT count(*)::int FROM generation_jobs
                WHERE owner_id = owner.id) AS job_count,
              (SELECT count(*)::int FROM assets
                WHERE owner_id = owner.id) AS asset_count
         FROM account_deletion_register register
         JOIN account_deletion_requests request
           ON request.id = register.request_id
         JOIN account_deletion_steps step
           ON step.request_id = register.request_id
          AND step.step_name = 'anonymize_goodgood_account'
         JOIN users owner ON owner.id = register.target_owner_id
         JOIN credit_accounts account
           ON account.owner_id = owner.id AND account.unit = 'credit'
        WHERE register.request_id = $1`,
      [deletion.id],
    );
    const completedRow = completedAccountState.rows[0];
    assert.match(
      completedRow.email,
      /^deleted-[a-f0-9]{32}@deleted[.]goodgood[.]invalid$/,
    );
    assert.deepEqual(
      {
        account_status: completedRow.account_status,
        asset_count: completedRow.asset_count,
        available_balance: completedRow.available_balance,
        deleted_local_identity_count: completedRow.deleted_local_identity_count,
        deleted_local_session_count: completedRow.deleted_local_session_count,
        expired_credit_amount: completedRow.expired_credit_amount,
        identity_count: completedRow.identity_count,
        job_count: completedRow.job_count,
        locale: completedRow.locale,
        mail_reference_id: completedRow.mail_reference_id,
        project_count: completedRow.project_count,
        register_state: completedRow.register_state,
        request_state: completedRow.request_state,
        reserved_balance: completedRow.reserved_balance,
        retention_exact: completedRow.retention_exact,
        session_count: completedRow.session_count,
        status: completedRow.status,
        step_state: completedRow.step_state,
      },
      {
        account_status: "closed",
        asset_count: 0,
        available_balance: "0",
        deleted_local_identity_count: 1,
        deleted_local_session_count: 1,
        expired_credit_amount: expectedExpiredCredits,
        identity_count: 0,
        job_count: 0,
        locale: "zh-CN",
        mail_reference_id: "anonymized-deletion-evidence",
        project_count: 0,
        register_state: "completed",
        request_state: "completed",
        reserved_balance: "0",
        retention_exact: true,
        session_count: 0,
        status: "suspended",
        step_state: "completed",
      },
    );
    assert.equal(completedRow.anonymized_at.toISOString(), completedAt.toISOString());
    assert.equal(
      completedRow.request_completed_at.toISOString(),
      completedAt.toISOString(),
    );
    assert.equal(
      completedRow.register_completed_at.toISOString(),
      completedAt.toISOString(),
    );
    assert.equal(
      completedRow.step_completed_at.toISOString(),
      completedAt.toISOString(),
    );
    assert.ok(completedRow.audit_retention_until > completedRow.register_completed_at);

    const priorLedgerEvidenceAfter = await pool.query(
      `SELECT id, account_id, owner_id, entry_type, amount,
              idempotency_key, operation_hash, reason, related_job_id,
              related_payment_ref, account_deletion_request_id,
              creative_link_deleted_at, prior_entry_id, actor, metadata,
              created_at
         FROM credit_ledger_entries
        WHERE id = ANY($1::uuid[])
        ORDER BY created_at, id`,
      [ledgerEvidenceBefore.rows.map((row) => row.id)],
    );
    assert.deepEqual(priorLedgerEvidenceAfter.rows, ledgerEvidenceBefore.rows);
    const administrativeEvidenceAfter = await pool.query(
      `SELECT *
         FROM administrative_actions
        WHERE target_owner_id = $1
        ORDER BY created_at, id`,
      [target.ownerId],
    );
    assert.deepEqual(
      administrativeEvidenceAfter.rows,
      administrativeEvidenceBefore.rows,
    );
    const expiryEvidence = await pool.query(
      `SELECT amount, entry_type, reason, metadata
         FROM credit_ledger_entries
        WHERE owner_id = $1 AND entry_type = 'expire'`,
      [target.ownerId],
    );
    assert.deepEqual(expiryEvidence.rows, [{
      amount: (-BigInt(expectedExpiredCredits)).toString(),
      entry_type: "expire",
      metadata: { deletionRequestId: deletion.id },
      reason: "account_deletion_expiry",
    }]);
    assert.equal(
      (await pool.query("SELECT count(*)::int AS count FROM users WHERE email = $1", [claims.email]))
        .rows[0].count,
      0,
    );
    await assert.rejects(
      pool.query(
        `UPDATE credit_ledger_entries SET reason = reason WHERE owner_id = $1`,
        [target.ownerId],
      ),
      /immutable outside reviewed account deletion/,
    );

    const reprovisioned = await provisionOwnerIdentity(pool, claims);
    assert.notEqual(reprovisioned.ownerId, target.ownerId);
    assert.notEqual(reprovisioned.identityId, target.identityId);
    const reprovisionedOwner = await pool.query(
      `SELECT email, status, anonymized_at
         FROM users
        WHERE id = $1`,
      [reprovisioned.ownerId],
    );
    assert.deepEqual(reprovisionedOwner.rows[0], {
      anonymized_at: null,
      email: claims.email,
      status: "pending",
    });
    assert.deepEqual(
      await runAccountDeletionCompletionPass(pool, {
        batchSize: 1,
        requestId: deletion.id,
        workerId: `m8-completion-repeat-${randomUUID()}`,
      }),
      {
        claimed: 0,
        completed: 0,
        deferred: 0,
        deletedIdentities: 0,
        deletedSessions: 0,
        expiredCredits: "0",
        failed: 0,
        lostLease: 0,
      },
    );
  },
);
