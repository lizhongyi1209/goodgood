import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { changeAccountAccess } from "../server/admin/repository.mjs";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { createEmailOtpOperations } from "../server/auth/email-operations.mjs";
import {
  acceptOrganizationInvitation,
  createOrganization,
  inviteOrganizationMember,
  listOrganizationManagement,
  listPendingOrganizationInvitations,
} from "../server/organizations/repository.mjs";
import { listOrganizationMemberBudgets } from "../server/organizations/insights-repository.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";

const { Pool } = pg;
const databaseUrl = process.env.GOODGOOD_GG031_DATABASE_URL;

function assertDisposableDatabase(value) {
  if (!value) return;
  const parsed = new URL(value);
  if (
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    parsed.pathname !== "/gg031_email_enterprise_test"
  ) {
    throw new Error(
      "GOODGOOD_GG031_DATABASE_URL must target the loopback database gg031_email_enterprise_test.",
    );
  }
}

function authenticationRequest(cookie = "") {
  return {
    headers: new Headers({
      cookie,
      origin: "http://127.0.0.1:31031",
    }),
    socket: { remoteAddress: "127.0.0.1" },
    url: "/api/auth/email/request",
  };
}

async function insertLegacyOwner(client, { email, id }) {
  await client.query(
    `INSERT INTO users (id, email, locale, status, account_tier)
     VALUES ($1, $2, 'zh-CN', 'active', 'seed')`,
    [id, email],
  );
  await client.query(
    `INSERT INTO auth_identities (id, owner_id, issuer, subject)
     VALUES ($1, $2, 'gg031-reviewed-legacy-oidc', $3)`,
    [randomUUID(), id, id],
  );
}

test(
  "email OTP registration stays reviewed and accepts enterprise invitations by verified binding",
  { skip: !databaseUrl, timeout: 45_000 },
  async () => {
    assertDisposableDatabase(databaseUrl);
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    const pool = new Pool({ connectionString: databaseUrl, max: 8 });
    const siteOwnerId = randomUUID();
    const principalId = randomUUID();
    const unverifiedOwnerId = randomUUID();
    const delivered = [];
    let currentTime = new Date("2026-09-11T04:00:00.000Z");
    const config = loadAuthenticationConfig({
      GOODGOOD_AUTH_COOKIE_NAME: "goodgood_gg031_session",
      GOODGOOD_AUTH_MODE: "email_otp",
      GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://127.0.0.1:31031",
      GOODGOOD_EMAIL_FROM: "GoodGood <no-reply@mail.goodgood.local>",
      GOODGOOD_EMAIL_OTP_SECRET: "gg031-integration-secret-value-at-least-32-bytes",
      GOODGOOD_EMAIL_SMTP_HOST: "mailpit",
      GOODGOOD_EMAIL_SMTP_PORT: "1025",
      GOODGOOD_EMAIL_SMTP_SECURE: "false",
    });
    const authentication = createEmailOtpOperations({
      config,
      getPool: async () => pool,
      mailer: {
        async sendLoginCode(message) {
          delivered.push(message);
          return { messageId: `gg031-message-${delivered.length}` };
        },
      },
      now: () => currentTime,
    });

    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await insertLegacyOwner(client, {
          email: `site-${siteOwnerId}@goodgood.invalid`,
          id: siteOwnerId,
        });
        await insertLegacyOwner(client, {
          email: `principal-${principalId}@goodgood.invalid`,
          id: principalId,
        });
        await client.query(
          `INSERT INTO users (id, email, locale, status, account_tier)
           VALUES ($1, 'unverified.employee@example.com', 'zh-CN', 'active', 'seed')`,
          [unverifiedOwnerId],
        );
        await client.query(
          `INSERT INTO system_role_assignments (
             id, owner_id, role, source, assigned_by_operator_id, reason,
             idempotency_key, operation_hash
           ) VALUES ($1, $2, 'site_owner', 'bootstrap', 'gg031-test',
                     'integration owner', $3, $4)`,
          [
            randomUUID(),
            siteOwnerId,
            `gg031-site-${siteOwnerId}`,
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

      const organization = await createOrganization(pool, {
        actorOwnerId: siteOwnerId,
        idempotencyKey: `gg031-create-${randomUUID()}`,
        initialOwnerId: principalId,
        name: "GG-031 Design Team",
        operationHash: "b".repeat(64),
        reason: "email enterprise integration",
      });
      const returnTo = `/organizations/${organization.workspace.id}/members?from=invite`;
      const invitation = await inviteOrganizationMember(pool, {
        actorOwnerId: principalId,
        email: "Employee@bücher.example",
        expiresAt: new Date(currentTime.getTime() + 24 * 60 * 60 * 1_000),
        idempotencyKey: `gg031-invite-${randomUUID()}`,
        intendedRole: "org_member",
        operationHash: "c".repeat(64),
        reason: "join verified team",
        workspaceId: organization.workspace.id,
      });
      assert.equal(
        invitation.invitation.email,
        "employee@xn--bcher-kva.example",
      );

      const issued = await authentication.requestCode(
        { email: "Employee@bücher.example", returnTo },
        authenticationRequest(),
      );
      const loginBinding = /^goodgood_gg031_session_login=([^;]+)/.exec(
        issued.cookie,
      )?.[1];
      assert.ok(loginBinding);
      const verified = await authentication.verifyCode(
        { challengeId: issued.body.challengeId, code: delivered[0].code },
        authenticationRequest(`goodgood_gg031_session_login=${loginBinding}`),
      );
      assert.equal(verified.body.returnTo, returnTo);

      const employee = await pool.query(
        `SELECT u.id, u.status, b.normalized_email, b.display_email
           FROM users u
           JOIN auth_email_bindings b ON b.owner_id = u.id
          WHERE b.normalized_email = 'employee@xn--bcher-kva.example'`,
      );
      const employeeId = employee.rows[0].id;
      assert.equal(employee.rows[0].status, "pending");
      assert.equal(employee.rows[0].display_email, "Employee@bücher.example");
      assert.deepEqual(
        await listPendingOrganizationInvitations(pool, employeeId),
        [],
      );
      await assert.rejects(
        acceptOrganizationInvitation(pool, {
          actorOwnerId: employeeId,
          idempotencyKey: `gg031-pending-${randomUUID()}`,
          invitationId: invitation.invitation.id,
          operationHash: "d".repeat(64),
        }),
        (error) => error.code === "INVITATION_UNAVAILABLE",
      );

      await changeAccountAccess(pool, {
        actorOwnerId: siteOwnerId,
        idempotencyKey: `gg031-approve-${randomUUID()}`,
        operationHash: "e".repeat(64),
        reason: "approve invited employee",
        targetOwnerId: employeeId,
        toStatus: "active",
      });
      assert.equal(
        (await listPendingOrganizationInvitations(pool, employeeId))[0].id,
        invitation.invitation.id,
      );
      await changeAccountAccess(pool, {
        actorOwnerId: siteOwnerId,
        idempotencyKey: `gg031-suspend-${randomUUID()}`,
        operationHash: "f".repeat(64),
        reason: "verify suspended invitation boundary",
        targetOwnerId: employeeId,
        toStatus: "suspended",
      });
      await assert.rejects(
        acceptOrganizationInvitation(pool, {
          actorOwnerId: employeeId,
          idempotencyKey: `gg031-suspended-${randomUUID()}`,
          invitationId: invitation.invitation.id,
          operationHash: "1".repeat(64),
        }),
        (error) => error.code === "INVITATION_UNAVAILABLE",
      );
      await changeAccountAccess(pool, {
        actorOwnerId: siteOwnerId,
        idempotencyKey: `gg031-restore-${randomUUID()}`,
        operationHash: "2".repeat(64),
        reason: "restore reviewed employee",
        targetOwnerId: employeeId,
        toStatus: "active",
      });

      await pool.query("UPDATE users SET email = $2 WHERE id = $1", [
        employeeId,
        "untrusted-profile-value@example.com",
      ]);
      const accepted = await acceptOrganizationInvitation(pool, {
        actorOwnerId: employeeId,
        idempotencyKey: `gg031-accept-${randomUUID()}`,
        invitationId: invitation.invitation.id,
        operationHash: "3".repeat(64),
      });
      assert.equal(accepted.membership.email, "Employee@bücher.example");
      const management = await listOrganizationManagement(pool, {
        actorOwnerId: principalId,
        workspaceId: organization.workspace.id,
      });
      assert.equal(
        management.members.find(({ ownerId }) => ownerId === employeeId).email,
        "Employee@bücher.example",
      );
      const budgets = await listOrganizationMemberBudgets(pool, {
        actorOwnerId: principalId,
        workspaceId: organization.workspace.id,
      });
      assert.equal(
        budgets.find(({ ownerId }) => ownerId === employeeId).email,
        "Employee@bücher.example",
      );

      const spoofedProfileInvitation = await inviteOrganizationMember(pool, {
        actorOwnerId: principalId,
        email: "untrusted-profile-value@example.com",
        expiresAt: new Date(currentTime.getTime() + 24 * 60 * 60 * 1_000),
        idempotencyKey: `gg031-spoofed-profile-${randomUUID()}`,
        intendedRole: "org_member",
        operationHash: "4".repeat(64),
        reason: "mutable profile must not become an identity",
        workspaceId: organization.workspace.id,
      });
      await assert.rejects(
        acceptOrganizationInvitation(pool, {
          actorOwnerId: employeeId,
          idempotencyKey: `gg031-spoofed-accept-${randomUUID()}`,
          invitationId: spoofedProfileInvitation.invitation.id,
          operationHash: "5".repeat(64),
        }),
        (error) => error.code === "INVITATION_UNAVAILABLE",
      );

      const unverifiedInvitation = await inviteOrganizationMember(pool, {
        actorOwnerId: principalId,
        email: "unverified.employee@example.com",
        expiresAt: new Date(currentTime.getTime() + 24 * 60 * 60 * 1_000),
        idempotencyKey: `gg031-unverified-invite-${randomUUID()}`,
        intendedRole: "org_member",
        operationHash: "6".repeat(64),
        reason: "unverified identity boundary",
        workspaceId: organization.workspace.id,
      });
      assert.deepEqual(
        await listPendingOrganizationInvitations(pool, unverifiedOwnerId),
        [],
      );
      await assert.rejects(
        acceptOrganizationInvitation(pool, {
          actorOwnerId: unverifiedOwnerId,
          idempotencyKey: `gg031-unverified-accept-${randomUUID()}`,
          invitationId: unverifiedInvitation.invitation.id,
          operationHash: "7".repeat(64),
        }),
        (error) => error.code === "INVITATION_UNAVAILABLE",
      );

      currentTime = new Date(currentTime.getTime() + 61_000);
      const repeated = await authentication.requestCode(
        { email: "employee@xn--bcher-kva.example", returnTo: "/create" },
        authenticationRequest(),
      );
      const repeatedBinding = /^goodgood_gg031_session_login=([^;]+)/.exec(
        repeated.cookie,
      )?.[1];
      await authentication.verifyCode(
        { challengeId: repeated.body.challengeId, code: delivered[1].code },
        authenticationRequest(`goodgood_gg031_session_login=${repeatedBinding}`),
      );
      const idempotency = await pool.query(
        `SELECT
           (SELECT count(*)::int FROM auth_email_bindings
             WHERE normalized_email = 'employee@xn--bcher-kva.example') AS bindings,
           (SELECT count(*)::int FROM workspaces
             WHERE kind = 'personal' AND personal_owner_id = $1) AS personal_workspaces,
           (SELECT count(*)::int FROM credit_ledger_entries
             WHERE owner_id = $1 AND reason = 'welcome_grant_v1') AS welcome_grants`,
        [employeeId],
      );
      assert.deepEqual(idempotency.rows[0], {
        bindings: 1,
        personal_workspaces: 1,
        welcome_grants: 1,
      });
    } finally {
      await pool.end();
    }
  },
);
