import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import {
  grantOrganizationCredits,
  readOrganizationCreditSummary,
  releaseOrganizationGenerationCredits,
  reserveOrganizationGenerationCredits,
  setMemberBudget,
  settleOrganizationGenerationCredits,
} from "../server/organizations/credit-repository.mjs";
import {
  acceptOrganizationInvitation,
  changeOrganizationMembership,
  createOrganization,
  inviteOrganizationMember,
} from "../server/organizations/repository.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";

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

test("GG-030 enterprise credits use a separate pool and revocable member budgets", async () => {
  const [migration, schema, repository] = await Promise.all([
    readFile(
      new URL("../migrations/0025_gg030_workspace_credits.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../server/organizations/credit-repository.mjs", import.meta.url),
      "utf8",
    ),
  ]);

  for (const table of [
    "workspace_credit_accounts",
    "member_budgets",
    "workspace_credit_ledger_entries",
    "member_budget_events",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /allocated_balance <= available_balance \+ reserved_balance/);
  assert.match(migration, /workspace_credit_ledger_entries_append_only/);
  assert.match(migration, /member_budget_events_append_only/);
  assert.match(migration, /grant_organization_credits/);
  assert.match(migration, /set_member_budget/);
  assert.doesNotMatch(
    migration,
    /ALTER TABLE credit_accounts|INSERT INTO credit_ledger_entries|TRUNCATE/i,
  );
  assert.match(schema, /export const workspaceCreditAccounts = pgTable/);
  assert.match(schema, /export const memberBudgets = pgTable/);
  assert.match(repository, /ORGANIZATION_CREDIT_INSUFFICIENT|organizationCreditInsufficientError/);
  assert.match(repository, /MEMBER_BUDGET_INSUFFICIENT|memberBudgetInsufficientError/);
  assert.doesNotMatch(repository, /FROM credit_accounts|UPDATE credit_accounts/);
});

test("enterprise credit inputs reject inexact or ambiguous values before mutation", async () => {
  let queried = false;
  const client = {
    async query() {
      queried = true;
      throw new Error("unexpected query");
    },
  };
  const { grantOrganizationCreditsInTransaction } = await import(
    "../server/organizations/credit-repository.mjs"
  );
  await assert.rejects(
    grantOrganizationCreditsInTransaction(client, {
      actorOwnerId: randomUUID(),
      amount: 0,
      idempotencyKey: "valid-key",
      operationHash: "a".repeat(64),
      reason: "test grant",
      workspaceId: randomUUID(),
    }),
    /positive/,
  );
  assert.equal(queried, false);
});

async function insertOwner(client, { email, id }) {
  await client.query(
    `INSERT INTO users (id, email, locale, status, account_tier)
     VALUES ($1, $2, 'zh-CN', 'active', 'seed')`,
    [id, email],
  );
  await client.query(
    `INSERT INTO auth_identities (id, owner_id, issuer, subject)
     VALUES ($1, $2, 'gg030-credit-integration', $3)`,
    [randomUUID(), id, id],
  );
}

async function createMember(pool, { email, ownerId, principalId, workspaceId }) {
  const invited = await inviteOrganizationMember(pool, {
    actorOwnerId: principalId,
    email,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    idempotencyKey: `credit-invite-${randomUUID()}`,
    intendedRole: "org_member",
    operationHash: "3".repeat(64),
    reason: "credit integration member",
    workspaceId,
  });
  const accepted = await acceptOrganizationInvitation(pool, {
    actorOwnerId: ownerId,
    idempotencyKey: `credit-accept-${randomUUID()}`,
    invitationId: invited.invitation.id,
    operationHash: "4".repeat(64),
  });
  return accepted.membership;
}

test(
  "organization grants, member budgets, reservations, settlement, and release stay zero-sum",
  { skip: !integrationEnabled, timeout: 40_000 },
  async () => {
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    const pool = new Pool({ connectionString: databaseUrl, max: 8 });
    const siteOwnerId = randomUUID();
    const principalId = randomUUID();
    const employeeId = randomUUID();
    const outsiderId = randomUUID();
    const employeeEmail = `credit-employee-${employeeId}@goodgood.invalid`;
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await insertOwner(client, {
          email: `credit-site-${siteOwnerId}@goodgood.invalid`,
          id: siteOwnerId,
        });
        await insertOwner(client, {
          email: `credit-principal-${principalId}@goodgood.invalid`,
          id: principalId,
        });
        await insertOwner(client, { email: employeeEmail, id: employeeId });
        await insertOwner(client, {
          email: `credit-outsider-${outsiderId}@goodgood.invalid`,
          id: outsiderId,
        });
        await client.query(
          `INSERT INTO system_role_assignments (
             id, owner_id, role, source, assigned_by_operator_id, reason,
             idempotency_key, operation_hash
           ) VALUES ($1, $2, 'site_owner', 'bootstrap', 'gg030-credit-test',
                     'credit integration owner', $3, $4)`,
          [
            randomUUID(),
            siteOwnerId,
            `gg030-credit-site-${siteOwnerId}`,
            "1".repeat(64),
          ],
        );
        await client.query(
          `INSERT INTO credit_accounts (
             id, owner_id, unit, available_balance, reserved_balance
           ) VALUES ($1, $2, 'credit', 777, 0)`,
          [randomUUID(), employeeId],
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
        idempotencyKey: `credit-create-${randomUUID()}`,
        initialOwnerId: principalId,
        name: "GG030 Credit Organization",
        operationHash: "2".repeat(64),
        reason: "credit integration organization",
      });
      const workspaceId = organization.workspace.id;
      const employeeMembership = await createMember(pool, {
        email: employeeEmail,
        ownerId: employeeId,
        principalId,
        workspaceId,
      });

      const grantInput = {
        actorOwnerId: siteOwnerId,
        amount: 1000,
        idempotencyKey: `credit-grant-${randomUUID()}`,
        operationHash: "5".repeat(64),
        reason: "approved organization credits",
        workspaceId,
      };
      const granted = await grantOrganizationCredits(pool, grantInput);
      assert.equal(granted.created, true);
      assert.equal(granted.account.availableBalance, 1000n);
      assert.equal((await grantOrganizationCredits(pool, grantInput)).created, false);
      await assert.rejects(
        grantOrganizationCredits(pool, {
          ...grantInput,
          actorOwnerId: principalId,
          idempotencyKey: `unauthorized-grant-${randomUUID()}`,
        }),
        (error) => error.code === "WORKSPACE_ACCESS_DENIED",
      );

      const employeeBudgetInput = {
        actorOwnerId: principalId,
        creditLimit: 500,
        expectedVersion: 0,
        idempotencyKey: `employee-budget-${randomUUID()}`,
        membershipId: employeeMembership.id,
        operationHash: "6".repeat(64),
        reason: "employee creation allowance",
        workspaceId,
      };
      const employeeBudget = await setMemberBudget(pool, employeeBudgetInput);
      assert.equal(employeeBudget.budget.creditLimit, 500n);
      assert.equal(employeeBudget.account.allocatedBalance, 500n);
      assert.equal((await setMemberBudget(pool, employeeBudgetInput)).created, false);

      const principalBudget = await setMemberBudget(pool, {
        actorOwnerId: principalId,
        creditLimit: 200,
        expectedVersion: 0,
        idempotencyKey: `principal-budget-${randomUUID()}`,
        membershipId: organization.workspace.membershipId,
        operationHash: "7".repeat(64),
        reason: "owner creation allowance",
        workspaceId,
      });
      assert.equal(principalBudget.account.allocatedBalance, 700n);
      await assert.rejects(
        setMemberBudget(pool, {
          ...employeeBudgetInput,
          actorOwnerId: employeeId,
          creditLimit: 600,
          expectedVersion: 1,
          idempotencyKey: `member-cannot-budget-${randomUUID()}`,
        }),
        (error) => error.code === "WORKSPACE_ACCESS_DENIED",
      );
      await assert.rejects(
        setMemberBudget(pool, {
          ...employeeBudgetInput,
          creditLimit: 900,
          expectedVersion: 1,
          idempotencyKey: `over-allocate-${randomUUID()}`,
          operationHash: "8".repeat(64),
        }),
        (error) => error.code === "ORGANIZATION_CREDIT_INSUFFICIENT",
      );

      const firstJobId = randomUUID();
      const reserveInput = {
        actorOwnerId: employeeId,
        amount: 120,
        idempotencyKey: `reserve-${randomUUID()}`,
        jobId: firstJobId,
        operationHash: "9".repeat(64),
        workspaceId,
      };
      const reserved = await reserveOrganizationGenerationCredits(
        pool,
        reserveInput,
      );
      assert.equal(reserved.account.availableBalance, 880n);
      assert.equal(reserved.account.reservedBalance, 120n);
      assert.equal(reserved.account.allocatedBalance, 700n);
      assert.equal(reserved.budget.remainingBalance, 380n);
      assert.equal(
        (await reserveOrganizationGenerationCredits(pool, reserveInput)).created,
        false,
      );

      const competingJobs = [randomUUID(), randomUUID()];
      const competing = await Promise.allSettled(
        competingJobs.map((jobId, index) =>
          reserveOrganizationGenerationCredits(pool, {
            actorOwnerId: employeeId,
            amount: 300,
            idempotencyKey: `competing-reserve-${index}-${randomUUID()}`,
            jobId,
            operationHash: index === 0 ? "a".repeat(64) : "b".repeat(64),
            workspaceId,
          }),
        ),
      );
      assert.equal(
        competing.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.equal(
        competing.filter(
          (result) =>
            result.status === "rejected" &&
            result.reason.code === "MEMBER_BUDGET_INSUFFICIENT",
        ).length,
        1,
      );
      const winningIndex = competing.findIndex(
        (result) => result.status === "fulfilled",
      );
      const releaseInput = {
        idempotencyKey: `release-${randomUUID()}`,
        jobId: competingJobs[winningIndex],
        operationHash: "c".repeat(64),
        workspaceId,
      };
      const released = await releaseOrganizationGenerationCredits(
        pool,
        releaseInput,
      );
      assert.equal(released.account.availableBalance, 880n);
      assert.equal(released.account.reservedBalance, 120n);
      assert.equal(released.budget.reservedUsage, 120n);

      const settleInput = {
        idempotencyKey: `settle-${randomUUID()}`,
        jobId: firstJobId,
        operationHash: "d".repeat(64),
        workspaceId,
      };
      const settled = await settleOrganizationGenerationCredits(
        pool,
        settleInput,
      );
      assert.equal(settled.account.availableBalance, 880n);
      assert.equal(settled.account.reservedBalance, 0n);
      assert.equal(settled.account.allocatedBalance, 580n);
      assert.equal(settled.budget.settledUsage, 120n);
      assert.equal(settled.budget.remainingBalance, 380n);
      assert.equal(
        (await settleOrganizationGenerationCredits(pool, settleInput)).created,
        false,
      );
      await assert.rejects(
        releaseOrganizationGenerationCredits(pool, {
          idempotencyKey: `late-release-${randomUUID()}`,
          jobId: firstJobId,
          operationHash: "e".repeat(64),
          workspaceId,
        }),
        (error) => error.code === "ORGANIZATION_CREDIT_RESERVATION_CLOSED",
      );

      await assert.rejects(
        setMemberBudget(pool, {
          ...employeeBudgetInput,
          creditLimit: 100,
          expectedVersion: settled.budget.version,
          idempotencyKey: `below-settled-${randomUUID()}`,
          operationHash: "f".repeat(64),
        }),
        (error) => error.code === "MEMBER_BUDGET_CONFLICT",
      );
      const reclaimed = await setMemberBudget(pool, {
        ...employeeBudgetInput,
        creditLimit: 300,
        expectedVersion: settled.budget.version,
        idempotencyKey: `reclaim-budget-${randomUUID()}`,
        operationHash: "0".repeat(64),
      });
      assert.equal(reclaimed.budget.creditLimit, 300n);
      assert.equal(reclaimed.account.allocatedBalance, 380n);

      const summary = await readOrganizationCreditSummary(pool, {
        actorOwnerId: employeeId,
        workspaceId,
      });
      assert.equal(summary.account.availableBalance, 880n);
      assert.equal(summary.budget.settledUsage, 120n);
      assert.equal(summary.budget.remainingBalance, 180n);
      await assert.rejects(
        readOrganizationCreditSummary(pool, {
          actorOwnerId: outsiderId,
          workspaceId,
        }),
        (error) => error.code === "WORKSPACE_ACCESS_DENIED",
      );

      const personal = await pool.query(
        `SELECT available_balance, reserved_balance FROM credit_accounts
          WHERE owner_id = $1 AND unit = 'credit'`,
        [employeeId],
      );
      assert.equal(BigInt(personal.rows[0].available_balance), 777n);
      assert.equal(BigInt(personal.rows[0].reserved_balance), 0n);

      const exitJobId = randomUUID();
      await reserveOrganizationGenerationCredits(pool, {
        actorOwnerId: employeeId,
        amount: 100,
        idempotencyKey: `exit-reserve-${randomUUID()}`,
        jobId: exitJobId,
        operationHash: "1".repeat(64),
        workspaceId,
      });
      const removed = await changeOrganizationMembership(pool, {
        actorOwnerId: principalId,
        expectedVersion: employeeMembership.version,
        idempotencyKey: `remove-with-budget-${randomUUID()}`,
        membershipId: employeeMembership.id,
        nextRole: "org_member",
        nextStatus: "removed",
        operationHash: "2".repeat(64),
        reason: "employee left the organization",
        workspaceId,
      });
      assert.equal(removed.membership.status, "removed");
      const afterRemoval = await pool.query(
        `SELECT a.allocated_balance, b.credit_limit, b.settled_usage,
                b.reserved_usage, b.status
           FROM workspace_credit_accounts a
           JOIN member_budgets b ON b.workspace_id = a.workspace_id
          WHERE a.workspace_id = $1 AND b.membership_id = $2`,
        [workspaceId, employeeMembership.id],
      );
      assert.equal(BigInt(afterRemoval.rows[0].allocated_balance), 300n);
      assert.equal(BigInt(afterRemoval.rows[0].credit_limit), 220n);
      assert.equal(afterRemoval.rows[0].status, "closed");
      await assert.rejects(
        readOrganizationCreditSummary(pool, {
          actorOwnerId: employeeId,
          workspaceId,
        }),
        (error) => error.code === "WORKSPACE_ACCESS_DENIED",
      );

      await releaseOrganizationGenerationCredits(pool, {
        idempotencyKey: `exit-release-${randomUUID()}`,
        jobId: exitJobId,
        operationHash: "3".repeat(64),
        workspaceId,
      });
      const afterExitRelease = await pool.query(
        `SELECT a.allocated_balance, a.available_balance, a.reserved_balance,
                b.credit_limit, b.settled_usage, b.reserved_usage, b.status,
                b.version
           FROM workspace_credit_accounts a
           JOIN member_budgets b ON b.workspace_id = a.workspace_id
          WHERE a.workspace_id = $1 AND b.membership_id = $2`,
        [workspaceId, employeeMembership.id],
      );
      assert.equal(BigInt(afterExitRelease.rows[0].allocated_balance), 200n);
      assert.equal(BigInt(afterExitRelease.rows[0].available_balance), 880n);
      assert.equal(BigInt(afterExitRelease.rows[0].reserved_balance), 0n);
      assert.equal(BigInt(afterExitRelease.rows[0].credit_limit), 120n);
      assert.equal(BigInt(afterExitRelease.rows[0].settled_usage), 120n);
      assert.equal(BigInt(afterExitRelease.rows[0].reserved_usage), 0n);

      const rejoinedMembership = await createMember(pool, {
        email: employeeEmail,
        ownerId: employeeId,
        principalId,
        workspaceId,
      });
      assert.equal(rejoinedMembership.id, employeeMembership.id);
      const reopened = await pool.query(
        `SELECT version, status FROM member_budgets WHERE membership_id = $1`,
        [employeeMembership.id],
      );
      assert.equal(reopened.rows[0].status, "active");
      const reallocated = await setMemberBudget(pool, {
        actorOwnerId: principalId,
        creditLimit: 220,
        expectedVersion: reopened.rows[0].version,
        idempotencyKey: `rejoined-budget-${randomUUID()}`,
        membershipId: employeeMembership.id,
        operationHash: "4".repeat(64),
        reason: "rejoined employee allowance",
        workspaceId,
      });
      assert.equal(reallocated.budget.remainingBalance, 100n);
      assert.equal(reallocated.account.allocatedBalance, 300n);

      const immutable = await pool.query(
        `SELECT e.id AS ledger_id, b.id AS budget_event_id
           FROM workspace_credit_ledger_entries e
           JOIN member_budget_events b ON b.credit_ledger_entry_id = e.id
          WHERE e.workspace_id = $1 AND e.entry_type = 'reserve'
          ORDER BY e.created_at ASC LIMIT 1`,
        [workspaceId],
      );
      await assert.rejects(
        pool.query(
          "UPDATE workspace_credit_ledger_entries SET reason = 'changed' WHERE id = $1",
          [immutable.rows[0].ledger_id],
        ),
        /immutable/i,
      );
      await assert.rejects(
        pool.query("DELETE FROM member_budget_events WHERE id = $1", [
          immutable.rows[0].budget_event_id,
        ]),
        /immutable/i,
      );
    } finally {
      await pool.end();
    }
  },
);
