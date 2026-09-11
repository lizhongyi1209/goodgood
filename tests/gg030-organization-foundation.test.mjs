import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import {
  acceptOrganizationInvitation,
  changeOrganizationMembership,
  createOrganization,
  inviteOrganizationMember,
  listOrganizationManagement,
  listOwnerWorkspaces,
  normalizeOrganizationEmail,
  revokeOrganizationInvitation,
  runOrganizationTransaction,
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
  if (!databaseName.includes("gg030") || new Set(["goodgood", "postgres"]).has(databaseName)) {
    throw new Error(
      "GOODGOOD_GG030_DATABASE_URL must visibly name a disposable gg030 database.",
    );
  }
}
const integrationEnabled = integrationRequested && Boolean(explicitDatabaseUrl);
const databaseUrl = explicitDatabaseUrl ?? "";

test("GG-030 migration and Drizzle schema define isolated workspace membership", async () => {
  const [migration, schema, authRepository] = await Promise.all([
    readFile(
      new URL("../migrations/0024_gg030_workspace_foundation.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/auth/repository.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS workspaces/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS workspace_memberships/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS workspace_invitations/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS workspace_audit_events/);
  assert.match(migration, /goodgood_create_personal_workspace/);
  assert.match(migration, /ON CONFLICT DO NOTHING/);
  assert.match(migration, /workspace_audit_events_append_only/);
  assert.doesNotMatch(migration, /TRUNCATE|DROP TABLE users|DELETE FROM users/i);
  assert.match(schema, /export const workspaces = pgTable/);
  assert.match(schema, /'org_owner', 'org_admin', 'org_member'/);
  assert.doesNotMatch(authRepository, /workspace_invitations|workspace_memberships/);
});

test("organization email normalization is provider-neutral and rejects ambiguous input", () => {
  assert.equal(
    normalizeOrganizationEmail("  Employee+Design@Example.COM "),
    "employee+design@example.com",
  );
  for (const value of ["", "missing-at", "a@@example.com", "a @example.com"]) {
    assert.throws(
      () => normalizeOrganizationEmail(value),
      (error) => error.code === "ORGANIZATION_REQUEST_INVALID",
    );
  }
});

test("organization transaction wrapper commits success and rolls back failure", async () => {
  const successQueries = [];
  let released = false;
  const successPool = {
    async connect() {
      return {
        async query(sql) {
          successQueries.push(sql);
        },
        release() {
          released = true;
        },
      };
    },
  };
  assert.equal(
    await runOrganizationTransaction(successPool, async () => "ok"),
    "ok",
  );
  assert.deepEqual(successQueries, ["BEGIN", "COMMIT"]);
  assert.equal(released, true);

  const failureQueries = [];
  const failurePool = {
    async connect() {
      return {
        async query(sql) {
          failureQueries.push(sql);
        },
        release() {},
      };
    },
  };
  await assert.rejects(
    runOrganizationTransaction(failurePool, async () => {
      throw new Error("rollback me");
    }),
    /rollback me/,
  );
  assert.deepEqual(failureQueries, ["BEGIN", "ROLLBACK"]);
});

async function insertOwner(client, { email, id }) {
  await client.query(
    `INSERT INTO users (id, email, locale, status, account_tier)
     VALUES ($1, $2, 'zh-CN', 'active', 'seed')`,
    [id, email],
  );
  await client.query(
    `INSERT INTO auth_identities (id, owner_id, issuer, subject)
     VALUES ($1, $2, 'gg030-integration', $3)`,
    [randomUUID(), id, id],
  );
}

test(
  "workspace migration, invitations, roles, audit, and isolation work in PostgreSQL",
  { skip: !integrationEnabled, timeout: 30_000 },
  async () => {
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    const pool = new Pool({ connectionString: databaseUrl, max: 6 });
    const siteOwnerId = randomUUID();
    const principalId = randomUUID();
    const employeeId = randomUUID();
    const outsiderId = randomUUID();
    const secondPrincipalId = randomUUID();
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await insertOwner(client, {
          email: `site-${siteOwnerId}@goodgood.invalid`,
          id: siteOwnerId,
        });
        await insertOwner(client, {
          email: `principal-${principalId}@goodgood.invalid`,
          id: principalId,
        });
        await insertOwner(client, {
          email: `employee-${employeeId}@goodgood.invalid`,
          id: employeeId,
        });
        await insertOwner(client, {
          email: `outsider-${outsiderId}@goodgood.invalid`,
          id: outsiderId,
        });
        await insertOwner(client, {
          email: `second-${secondPrincipalId}@goodgood.invalid`,
          id: secondPrincipalId,
        });
        await client.query(
          `INSERT INTO system_role_assignments (
             id, owner_id, role, source, assigned_by_operator_id, reason,
             idempotency_key, operation_hash
           ) VALUES ($1, $2, 'site_owner', 'bootstrap', 'gg030-test',
                     'integration owner', $3, $4)`,
          [
            randomUUID(),
            siteOwnerId,
            `gg030-site-${siteOwnerId}`,
            "a".repeat(64),
          ],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      const personalCount = await pool.query(
        `SELECT count(*)::integer AS count FROM workspaces
          WHERE personal_owner_id = ANY($1::uuid[]) AND kind = 'personal'`,
        [[siteOwnerId, principalId, employeeId, outsiderId, secondPrincipalId]],
      );
      assert.equal(personalCount.rows[0].count, 5);

      const createInput = {
        actorOwnerId: siteOwnerId,
        idempotencyKey: `create-org-${randomUUID()}`,
        initialOwnerId: principalId,
        name: "GoodGood Design Team",
        operationHash: "b".repeat(64),
        reason: "approved enterprise onboarding",
      };
      const organization = await createOrganization(pool, createInput);
      assert.equal(organization.created, true);
      assert.equal(organization.workspace.kind, "organization");
      assert.equal(organization.workspace.role, "org_owner");
      const replay = await createOrganization(pool, createInput);
      assert.equal(replay.created, false);
      assert.equal(replay.workspace.id, organization.workspace.id);

      const employeeEmail = `employee-${employeeId}@goodgood.invalid`;
      const inviteInput = {
        actorOwnerId: principalId,
        email: employeeEmail.toUpperCase(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        idempotencyKey: `invite-${randomUUID()}`,
        intendedRole: "org_member",
        operationHash: "c".repeat(64),
        reason: "join the design team",
        workspaceId: organization.workspace.id,
      };
      const invitation = await inviteOrganizationMember(pool, inviteInput);
      assert.equal(invitation.created, true);
      assert.equal(invitation.invitation.email, employeeEmail);
      assert.equal(
        (await inviteOrganizationMember(pool, inviteInput)).created,
        false,
      );

      await assert.rejects(
        acceptOrganizationInvitation(pool, {
          actorOwnerId: outsiderId,
          idempotencyKey: `wrong-accept-${randomUUID()}`,
          invitationId: invitation.invitation.id,
          operationHash: "d".repeat(64),
        }),
        (error) => error.code === "INVITATION_UNAVAILABLE",
      );

      const acceptInput = {
        actorOwnerId: employeeId,
        idempotencyKey: `accept-${randomUUID()}`,
        invitationId: invitation.invitation.id,
        operationHash: "e".repeat(64),
      };
      const accepted = await acceptOrganizationInvitation(pool, acceptInput);
      assert.equal(accepted.created, true);
      assert.equal(accepted.membership.role, "org_member");
      assert.equal(
        (await acceptOrganizationInvitation(pool, acceptInput)).created,
        false,
      );

      const principalWorkspaces = await listOwnerWorkspaces(pool, principalId);
      assert.deepEqual(
        principalWorkspaces.map((workspace) => workspace.kind),
        ["personal", "organization"],
      );
      const dashboard = await listOrganizationManagement(pool, {
        actorOwnerId: principalId,
        workspaceId: organization.workspace.id,
      });
      assert.equal(dashboard.members.length, 2);
      assert.equal(dashboard.invitations.length, 0);
      await assert.rejects(
        listOrganizationManagement(pool, {
          actorOwnerId: outsiderId,
          workspaceId: organization.workspace.id,
        }),
        (error) => error.code === "WORKSPACE_ACCESS_DENIED",
      );

      const promoted = await changeOrganizationMembership(pool, {
        actorOwnerId: principalId,
        expectedVersion: accepted.membership.version,
        idempotencyKey: `promote-${randomUUID()}`,
        membershipId: accepted.membership.id,
        nextRole: "org_owner",
        nextStatus: "active",
        operationHash: "f".repeat(64),
        reason: "add a second responsible owner",
        workspaceId: organization.workspace.id,
      });
      assert.equal(promoted.membership.role, "org_owner");

      const principalMembership = dashboard.members.find(
        (member) => member.ownerId === principalId,
      );
      const suspended = await changeOrganizationMembership(pool, {
        actorOwnerId: principalId,
        expectedVersion: principalMembership.version,
        idempotencyKey: `suspend-${randomUUID()}`,
        membershipId: principalMembership.id,
        nextRole: "org_owner",
        nextStatus: "suspended",
        operationHash: "1".repeat(64),
        reason: "temporary owner leave",
        workspaceId: organization.workspace.id,
      });
      assert.equal(suspended.membership.status, "suspended");
      await assert.rejects(
        changeOrganizationMembership(pool, {
          actorOwnerId: employeeId,
          expectedVersion: promoted.membership.version,
          idempotencyKey: `last-owner-${randomUUID()}`,
          membershipId: promoted.membership.id,
          nextRole: "org_admin",
          nextStatus: "active",
          operationHash: "2".repeat(64),
          reason: "invalid last owner demotion",
          workspaceId: organization.workspace.id,
        }),
        (error) => error.code === "ORGANIZATION_OWNER_REQUIRED",
      );

      const second = await createOrganization(pool, {
        actorOwnerId: siteOwnerId,
        idempotencyKey: `create-second-${randomUUID()}`,
        initialOwnerId: secondPrincipalId,
        name: "Second Organization",
        operationHash: "3".repeat(64),
        reason: "isolation fixture",
      });
      await assert.rejects(
        listOrganizationManagement(pool, {
          actorOwnerId: employeeId,
          workspaceId: second.workspace.id,
        }),
        (error) => error.code === "WORKSPACE_ACCESS_DENIED",
      );

      const revokeInput = {
        actorOwnerId: secondPrincipalId,
        email: `revoke-${randomUUID()}@goodgood.invalid`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        idempotencyKey: `invite-revoke-${randomUUID()}`,
        intendedRole: "org_member",
        operationHash: "4".repeat(64),
        reason: "temporary invitation",
        workspaceId: second.workspace.id,
      };
      const revocable = await inviteOrganizationMember(pool, revokeInput);
      const revoked = await revokeOrganizationInvitation(pool, {
        actorOwnerId: secondPrincipalId,
        idempotencyKey: `revoke-${randomUUID()}`,
        invitationId: revocable.invitation.id,
        operationHash: "5".repeat(64),
        reason: "invitation no longer needed",
        workspaceId: second.workspace.id,
      });
      assert.equal(revoked.invitation.status, "revoked");

      const audit = await pool.query(
        `SELECT id FROM workspace_audit_events
          WHERE workspace_id = $1
          ORDER BY created_at ASC LIMIT 1`,
        [organization.workspace.id],
      );
      await assert.rejects(
        pool.query(
          "UPDATE workspace_audit_events SET reason = 'changed' WHERE id = $1",
          [audit.rows[0].id],
        ),
        /immutable/i,
      );
    } finally {
      await pool.end();
    }
  },
);
