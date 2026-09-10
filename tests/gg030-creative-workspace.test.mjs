import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { grantCredits } from "../server/billing/repository.mjs";
import {
  claimGenerationJob,
  completeGenerationJob,
  createGenerationJob,
  failGenerationJob,
  findGenerationJob,
  findOwnerAssetGenerationJobs,
  findOrganizationAsset,
  findOrganizationAssetGenerationJobs,
} from "../server/generation/repository.mjs";
import {
  grantOrganizationCredits,
  setMemberBudget,
} from "../server/organizations/credit-repository.mjs";
import {
  listOrganizationMemberBudgets,
  listOrganizationUsage,
} from "../server/organizations/insights-repository.mjs";
import {
  acceptOrganizationInvitation,
  changeOrganizationMembership,
  createOrganization,
  inviteOrganizationMember,
} from "../server/organizations/repository.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { createProject, findProject } from "../server/projects/repository.mjs";
import {
  createPendingReferenceAssets,
  findReadyReferences,
  markReferenceReady,
} from "../server/references/repository.mjs";
import {
  findCreationDraft,
  saveCreationDraft,
} from "../server/drafts/repository.mjs";

const { Pool } = pg;
const integrationRequested = process.env.GOODGOOD_GG030_INTEGRATION === "1";
const explicitDatabaseUrl = process.env.GOODGOOD_GG030_DATABASE_URL;
if (integrationRequested && !explicitDatabaseUrl) {
  throw new Error(
    "GOODGOOD_GG030_DATABASE_URL must name an isolated disposable database when GOODGOOD_GG030_INTEGRATION=1.",
  );
}
if (integrationRequested) {
  const databaseName = new URL(explicitDatabaseUrl).pathname.slice(1).toLowerCase();
  if (
    !databaseName.includes("gg030") ||
    new Set(["goodgood", "postgres"]).has(databaseName)
  ) {
    throw new Error(
      "GOODGOOD_GG030_DATABASE_URL must visibly name a disposable gg030 database.",
    );
  }
}
const integrationEnabled = integrationRequested && Boolean(explicitDatabaseUrl);
const databaseUrl = explicitDatabaseUrl ?? "";

const BASE_STATE = Object.freeze({
  aspectRatio: "1:1",
  background: "auto",
  count: 1,
  googleSearch: false,
  modelId: "nano-banana-2",
  outputFormat: "png",
  prompt: "企业品牌视觉",
  quality: "auto",
  resolution: "1K",
  thinkingLevel: "high",
});

test("GG-030 creative migration backfills and constrains every durable creative record", async () => {
  const [migration, schema, generation, worker] = await Promise.all([
    readFile(
      new URL(
        "../migrations/0026_gg030_creative_workspace_scope.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/generation/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/generation/worker-service.mjs", import.meta.url), "utf8"),
  ]);
  for (const table of [
    "reference_assets",
    "creation_drafts",
    "projects",
    "generation_batches",
    "generation_jobs",
    "assets",
  ]) {
    assert.match(migration, new RegExp(`ALTER TABLE ${table}`));
  }
  assert.match(migration, /goodgood_assign_creative_workspace/);
  assert.match(migration, /generation_jobs_batch_workspace_fk/);
  assert.match(migration, /workspace_credit_ledger_job_workspace_fk/);
  assert.match(migration, /PRIMARY KEY \(workspace_id, creator_owner_id\)/);
  assert.doesNotMatch(migration, /TRUNCATE|DELETE FROM (assets|projects)/i);
  assert.match(schema, /workspaceCreditReservationEntryId/);
  assert.match(generation, /reserveOrganizationGenerationCreditsInTransaction/);
  assert.match(generation, /findOrganizationAssetGenerationJobs/);
  assert.match(worker, /job\.workspace_id/);
});

async function insertOwner(client, { email, id }) {
  await client.query(
    `INSERT INTO users (id, email, locale, status, account_tier)
     VALUES ($1, $2, 'zh-CN', 'active', 'seed')`,
    [id, email],
  );
  await client.query(
    `INSERT INTO auth_identities (id, owner_id, issuer, subject)
     VALUES ($1, $2, 'gg030-creative-integration', $3)`,
    [randomUUID(), id, id],
  );
}

async function joinOrganization(pool, { email, ownerId, principalId, workspaceId }) {
  const invitation = await inviteOrganizationMember(pool, {
    actorOwnerId: principalId,
    email,
    expiresAt: new Date(Date.now() + 86_400_000),
    idempotencyKey: `creative-invite-${randomUUID()}`,
    intendedRole: "org_member",
    operationHash: "3".repeat(64),
    reason: "creative integration member",
    workspaceId,
  });
  return acceptOrganizationInvitation(pool, {
    actorOwnerId: ownerId,
    idempotencyKey: `creative-accept-${randomUUID()}`,
    invitationId: invitation.invitation.id,
    operationHash: "4".repeat(64),
  });
}

test(
  "enterprise creation charges the organization, preserves creator evidence, and isolates management reads",
  { skip: !integrationEnabled, timeout: 40_000 },
  async () => {
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    const pool = new Pool({ connectionString: databaseUrl, max: 8 });
    const siteOwnerId = randomUUID();
    const principalId = randomUUID();
    const employeeId = randomUUID();
    const outsiderId = randomUUID();
    const employeeEmail = `creative-${employeeId}@goodgood.invalid`;
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await insertOwner(client, {
          email: `creative-site-${siteOwnerId}@goodgood.invalid`,
          id: siteOwnerId,
        });
        await insertOwner(client, {
          email: `creative-principal-${principalId}@goodgood.invalid`,
          id: principalId,
        });
        await insertOwner(client, { email: employeeEmail, id: employeeId });
        await insertOwner(client, {
          email: `creative-outsider-${outsiderId}@goodgood.invalid`,
          id: outsiderId,
        });
        await client.query(
          `INSERT INTO system_role_assignments (
             id, owner_id, role, source, assigned_by_operator_id, reason,
             idempotency_key, operation_hash
           ) VALUES ($1, $2, 'site_owner', 'bootstrap', 'gg030-creative-test',
                     'creative integration owner', $3, $4)`,
          [
            randomUUID(),
            siteOwnerId,
            `gg030-creative-site-${siteOwnerId}`,
            "1".repeat(64),
          ],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      const organization = await createOrganization(pool, {
        actorOwnerId: siteOwnerId,
        idempotencyKey: `creative-create-${randomUUID()}`,
        initialOwnerId: principalId,
        name: "GG030 Creative Organization",
        operationHash: "2".repeat(64),
        reason: "creative integration organization",
      });
      const workspaceId = organization.workspace.id;
      const accepted = await joinOrganization(pool, {
        email: employeeEmail,
        ownerId: employeeId,
        principalId,
        workspaceId,
      });
      await grantOrganizationCredits(pool, {
        actorOwnerId: siteOwnerId,
        amount: 1000,
        idempotencyKey: `creative-grant-${randomUUID()}`,
        operationHash: "5".repeat(64),
        reason: "creative integration credits",
        workspaceId,
      });
      await setMemberBudget(pool, {
        actorOwnerId: principalId,
        creditLimit: 500,
        expectedVersion: 0,
        idempotencyKey: `creative-budget-${randomUUID()}`,
        membershipId: accepted.membership.id,
        operationHash: "6".repeat(64),
        reason: "employee creative budget",
        workspaceId,
      });
      await grantCredits(pool, {
        amount: 100,
        idempotencyKey: `creative-personal-${randomUUID()}`,
        ownerId: employeeId,
        reason: "personal isolation fixture",
      });

      const pendingReferences = await createPendingReferenceAssets(pool, {
        files: [{
          byteSize: 1024,
          clientId: "enterprise-reference",
          mimeType: "image/png",
          name: "企业参考.png",
        }],
        ownerId: employeeId,
        uploadTtlSeconds: 900,
        workspaceId,
      });
      const reference = await markReferenceReady(pool, {
        byteSize: 1024,
        checksum: "7".repeat(64),
        detectedMimeType: "image/png",
        height: 1024,
        ownerId: employeeId,
        referenceId: pendingReferences[0].id,
        width: 1024,
        workspaceId,
      });
      assert.equal(
        (await findReadyReferences(pool, {
          ownerId: employeeId,
          referenceIds: [reference.id],
          workspaceId,
        })).length,
        1,
      );
      assert.equal(
        (await findReadyReferences(pool, {
          ownerId: employeeId,
          referenceIds: [reference.id],
        })).length,
        0,
      );

      const enterpriseDraft = await saveCreationDraft(pool, {
        expectedVersion: null,
        ownerId: employeeId,
        state: { ...BASE_STATE, referenceIds: [reference.id] },
        workspaceId,
      });
      const personalDraft = await saveCreationDraft(pool, {
        expectedVersion: null,
        ownerId: employeeId,
        state: { ...BASE_STATE, prompt: "个人草稿", referenceIds: [] },
      });
      assert.notEqual(
        enterpriseDraft.current.workspace_id,
        personalDraft.current.workspace_id,
      );
      assert.equal(
        (await findCreationDraft(pool, { ownerId: employeeId })).prompt,
        "个人草稿",
      );

      const referenceSnapshot = [{
        id: reference.id,
        name: reference.original_file_name,
        objectKey: reference.object_key,
        ordinal: 1,
      }];
      const project = await createProject(pool, {
        batchIds: [],
        idempotencyKey: `creative-project-${randomUUID()}`,
        name: "企业视觉",
        ownerId: employeeId,
        state: { ...BASE_STATE, references: referenceSnapshot },
        workspaceId,
      });
      assert.equal(
        (await findProject(pool, {
          ownerId: employeeId,
          projectId: project.id,
          workspaceId,
        })).workspace_id,
        workspaceId,
      );
      assert.equal(
        await findProject(pool, { ownerId: employeeId, projectId: project.id }),
        null,
      );

      const generationInput = {
        ...BASE_STATE,
        projectId: project.id,
        references: referenceSnapshot,
      };
      const generationRequest = {
        idempotencyKey: `creative-generation-${randomUUID()}`,
        input: generationInput,
        ownerId: employeeId,
        workspaceId,
      };
      const generation = await createGenerationJob(pool, generationRequest);
      assert.equal(generation.created, true);
      assert.equal(generation.row.workspace_id, workspaceId);
      assert.equal(generation.row.creator_owner_id, employeeId);
      assert.ok(generation.row.workspace_credit_reservation_entry_id);
      assert.equal(generation.row.credit_reservation_entry_id, null);
      assert.equal((await createGenerationJob(pool, generationRequest)).created, false);

      const workerId = `gg030-worker-${randomUUID()}`;
      const claimed = await claimGenerationJob(pool, {
        attemptRoute: {
          provider: "mock",
          providerModel: "nano-banana-2",
          routeVersion: "gg030-test-v1",
        },
        jobId: generation.row.id,
        leaseMs: 60_000,
        workerId,
      });
      assert.equal(claimed.claimed, true);
      const assetId = randomUUID();
      assert.deepEqual(
        await completeGenerationJob(pool, {
          assets: [{
            aspectRatio: "1:1",
            batchId: generation.row.batch_id,
            byteSize: 4096,
            checksum: "8".repeat(64),
            id: assetId,
            mimeType: "image/png",
            objectKey: `generated/${workspaceId}/${employeeId}/${assetId}.png`,
            ordinal: 1,
            ownerId: employeeId,
            pixelHeight: 1024,
            pixelWidth: 1024,
          }],
          attemptId: claimed.attempt.id,
          jobId: generation.row.id,
          resultHash: "9".repeat(64),
          workerId,
        }),
        { completed: true, reason: "completed" },
      );

      const failed = await createGenerationJob(pool, {
        idempotencyKey: `creative-failure-${randomUUID()}`,
        input: { ...BASE_STATE, projectId: null, references: [] },
        ownerId: employeeId,
        workspaceId,
      });
      const failedWorkerId = `gg030-worker-${randomUUID()}`;
      const failedClaim = await claimGenerationJob(pool, {
        attemptRoute: {
          provider: "mock",
          providerModel: "nano-banana-2",
          routeVersion: "gg030-test-v1",
        },
        jobId: failed.row.id,
        leaseMs: 60_000,
        workerId: failedWorkerId,
      });
      assert.equal(
        await failGenerationJob(pool, {
          attemptId: failedClaim.attempt.id,
          error: {
            code: "PROVIDER_REJECTED",
            message: "fixture rejection",
            retryable: true,
            title: "生成失败",
          },
          jobId: failed.row.id,
          workerId: failedWorkerId,
        }),
        true,
      );

      const organizationAccount = await pool.query(
        `SELECT available_balance, reserved_balance, allocated_balance
           FROM workspace_credit_accounts WHERE workspace_id = $1`,
        [workspaceId],
      );
      assert.equal(BigInt(organizationAccount.rows[0].available_balance), 990n);
      assert.equal(BigInt(organizationAccount.rows[0].reserved_balance), 0n);
      assert.equal(BigInt(organizationAccount.rows[0].allocated_balance), 490n);
      const personalBefore = await pool.query(
        `SELECT available_balance, reserved_balance FROM credit_accounts
          WHERE owner_id = $1 AND unit = 'credit'`,
        [employeeId],
      );
      assert.equal(BigInt(personalBefore.rows[0].available_balance), 100n);

      const usage = await listOrganizationUsage(pool, {
        actorOwnerId: principalId,
        workspaceId,
      });
      assert.equal(usage.length, 1);
      assert.equal(usage[0].creditAmount, 10n);
      assert.equal(usage[0].ownerId, employeeId);
      assert.equal(
        (await listOrganizationMemberBudgets(pool, {
          actorOwnerId: principalId,
          workspaceId,
        })).find((item) => item.ownerId === employeeId).settledUsage,
        10n,
      );
      const companyAssets = await findOrganizationAssetGenerationJobs(pool, {
        actorOwnerId: principalId,
        workspaceId,
      });
      assert.equal(companyAssets.length, 1);
      assert.equal(companyAssets[0].creator_owner_id, employeeId);
      assert.equal(
        await findGenerationJob(pool, {
          jobId: generation.row.id,
          ownerId: employeeId,
        }),
        null,
      );
      assert.deepEqual(
        await findOwnerAssetGenerationJobs(pool, { ownerId: employeeId }),
        [],
      );
      assert.equal(
        (await findOrganizationAsset(pool, {
          actorOwnerId: principalId,
          assetId,
          workspaceId,
        })).creator_owner_id,
        employeeId,
      );
      await assert.rejects(
        findOrganizationAssetGenerationJobs(pool, {
          actorOwnerId: employeeId,
          workspaceId,
        }),
        (error) => error.code === "WORKSPACE_ACCESS_DENIED",
      );

      await assert.rejects(
        createGenerationJob(pool, {
          idempotencyKey: `cross-workspace-${randomUUID()}`,
          input: { ...BASE_STATE, projectId: null, references: [] },
          ownerId: outsiderId,
          workspaceId,
        }),
        (error) => error.code === "WORKSPACE_ACCESS_DENIED",
      );
      const crossRows = await pool.query(
        `SELECT count(*)::integer AS count FROM generation_jobs
          WHERE workspace_id = $1 AND creator_owner_id = $2`,
        [workspaceId, outsiderId],
      );
      assert.equal(crossRows.rows[0].count, 0);

      const personalGeneration = await createGenerationJob(pool, {
        idempotencyKey: `personal-after-enterprise-${randomUUID()}`,
        input: { ...BASE_STATE, projectId: null, references: [] },
        ownerId: employeeId,
      });
      assert.notEqual(personalGeneration.row.workspace_id, workspaceId);
      assert.ok(personalGeneration.row.credit_reservation_entry_id);
      assert.equal(personalGeneration.row.workspace_credit_reservation_entry_id, null);
      const personalAfter = await pool.query(
        `SELECT available_balance, reserved_balance FROM credit_accounts
          WHERE owner_id = $1 AND unit = 'credit'`,
        [employeeId],
      );
      assert.equal(BigInt(personalAfter.rows[0].available_balance), 90n);
      assert.equal(BigInt(personalAfter.rows[0].reserved_balance), 10n);

      await changeOrganizationMembership(pool, {
        actorOwnerId: principalId,
        expectedVersion: accepted.membership.version,
        idempotencyKey: `creative-remove-${randomUUID()}`,
        membershipId: accepted.membership.id,
        nextRole: "org_member",
        nextStatus: "removed",
        operationHash: "a".repeat(64),
        reason: "creative employee left",
        workspaceId,
      });
      assert.equal(
        (await findOrganizationAssetGenerationJobs(pool, {
          actorOwnerId: principalId,
          workspaceId,
        })).length,
        1,
      );
      await assert.rejects(
        findGenerationJob(pool, {
          jobId: generation.row.id,
          ownerId: employeeId,
          workspaceId,
        }),
        (error) => error.code === "WORKSPACE_ACCESS_DENIED",
      );
    } finally {
      await pool.end();
    }
  },
);
