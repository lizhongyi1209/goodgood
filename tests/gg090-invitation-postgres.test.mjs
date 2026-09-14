import { provisionOwnerIdentity } from "../server/auth/repository.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { createEmailOtpOperations } from "../server/auth/email-operations.mjs";
import { manageInvitations } from "../server/auth/invitations.mjs";
const enabled = process.env.GOODGOOD_GG090_INTEGRATION === "1";
test(
  "GG090 isolated SQL: dual verification, atomic single-use, existing states, admin and rollback",
  { skip: !enabled },
  async () => {
    assert.equal(process.env.GOODGOOD_GG090_NO_WORKER, "1");
    const url = new URL(process.env.GOODGOOD_GG090_DATABASE_URL);
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.port, "54449");
    assert.match(url.pathname, /^\/goodgood_gg090_invitation_test[a-z0-9_]*$/);
    const pool = new pg.Pool({ connectionString: url.href, max: 8 });
    try {
      assert.equal(
        (
          await pool.query(
            "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()",
          )
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public'",
          )
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await applyMigrations({ databaseUrl: url.href, logger: { log() {} } })
        ).at(-1),
        "0042_gg090_registration_invitations.sql",
      );
      const adminId = randomUUID();
      await pool.query(
        "INSERT INTO users(id,email,status) VALUES($1,'owner@example.invalid','active')",
        [adminId],
      );
      await pool.query(
        "INSERT INTO system_role_assignments(id,owner_id,role,source,assigned_by_operator_id,reason,idempotency_key,operation_hash) VALUES($1,$2,'site_owner','bootstrap','gg090-test','isolated test','gg090-test-owner',$3)",
        [randomUUID(), adminId, "a".repeat(64)],
      );
      const ownerContext = {
          ownerId: adminId,
          systemRole: "site_owner",
          accessStatus: "active",
        },
        resources = { pool };
      let seq = 0;
      const invite = () =>
        manageInvitations({
          action: "create",
          ownerContext,
          resources,
          idempotencyKey: "gg090-invite-" + ++seq,
        });
      const config = loadAuthenticationConfig({
        GOODGOOD_AUTH_MODE: "email_otp",
        GOODGOOD_AUTH_COOKIE_NAME: "gg090_test_session",
        GOODGOOD_EMAIL_FROM: "GoodGood <no-reply@mail.goodgood.local>",
        GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://localhost:32190",
        GOODGOOD_EMAIL_OTP_SECRET:
          "gg090-test-secret-at-least-thirty-two-characters",
        GOODGOOD_EMAIL_SMTP_HOST: "mailpit",
        GOODGOOD_EMAIL_SMTP_PORT: "1025",
        GOODGOOD_EMAIL_SMTP_SECURE: "false",
      });
      let now = new Date("2026-09-14T12:00:00Z");
      const delivered = [];
      const operations = createEmailOtpOperations({
        config,
        getPool: async () => pool,
        now: () => now,
        mailer: {
          sendLoginCode: async (message) => {
            delivered.push(message);
            return { messageId: "gg090-test-" + delivered.length };
          },
        },
      });
      const request = (cookie) => ({
        headers: new Headers({
          origin: config.publicOrigin,
          cookie: cookie ?? "",
        }),
        socket: { remoteAddress: "127.0.0.1" },
      });
      const challenge = async (email) => {
        const sent = await operations.requestCode(
          { email, returnTo: "/assets" },
          request(),
        );
        return {
          challengeId: sent.body.challengeId,
          code: delivered.at(-1).code,
          cookie: sent.cookie.split(";")[0],
        };
      };
      const verify = (challenge, invitationCode, code = challenge.code) =>
        operations.verifyCode(
          {
            challengeId: challenge.challengeId,
            code,
            ...(invitationCode !== undefined ? { invitationCode } : {}),
          },
          request(challenge.cookie),
        );
      await assert.rejects(
        provisionOwnerIdentity(pool, {
          email: "legacy-new@example.invalid",
          issuer: "urn:legacy-test",
          subject: "new-identity",
        }),
        (error) => error.code === "INVITATION_REQUIRED",
      );
      const first = await invite(),
        mail = await challenge("creator@example.invalid");
      const stored = (
        await pool.query("SELECT * FROM registration_invitations WHERE id=$1", [
          first.invitation.id,
        ])
      ).rows[0];
      assert.equal(stored.code_digest.includes(first.code), false);
      assert.equal(stored.code_hint, first.code.slice(-6));
      await assert.rejects(
        verify(mail, first.code, mail.code === "000000" ? "111111" : "000000"),
        (e) => e.code === "EMAIL_CODE_INVALID",
      );
      await assert.rejects(
        verify(mail),
        (e) => e.code === "INVITATION_REQUIRED",
      );
      await assert.rejects(
        verify(mail, "wrong-code"),
        (e) => e.code === "INVITATION_INVALID",
      );
      assert.equal(
        (await pool.query("SELECT count(*)::int AS n FROM users")).rows[0].n,
        1,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT used_at FROM registration_invitations WHERE id=$1",
            [first.invitation.id],
          )
        ).rows[0].used_at,
        null,
      );
      assert.equal((await verify(mail, first.code)).body.authenticated, true);
      const creator = (
        await pool.query(
          "SELECT id,status FROM users WHERE email='creator@example.invalid'",
        )
      ).rows[0];
      assert.equal(creator.status, "active");
      assert.equal(
        (
          await pool.query(
            "SELECT available_balance FROM credit_accounts WHERE owner_id=$1",
            [creator.id],
          )
        ).rows[0].available_balance,
        "200",
      );
      await assert.rejects(
        verify(mail, first.code),
        (e) => e.code === "EMAIL_CODE_INVALID",
      );
      now = new Date(now.getTime() + 61000);
      assert.equal(
        (await verify(await challenge("creator@example.invalid"))).body
          .authenticated,
        true,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM credit_ledger_entries WHERE owner_id=$1 AND reason='welcome_grant_v1'",
            [creator.id],
          )
        ).rows[0].n,
        1,
      );
      const second = await invite(),
        left = await challenge("left@example.invalid"),
        right = await challenge("right@example.invalid");
      const race = await Promise.allSettled([
        verify(left, second.code),
        verify(right, second.code),
      ]);
      assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        race.filter(
          (r) =>
            r.status === "rejected" && r.reason.code === "INVITATION_INVALID",
        ).length,
        1,
      );
      const revoked = await invite();
      await manageInvitations({
        action: "revoke",
        input: { id: revoked.invitation.id },
        ownerContext,
        resources,
      });
      await assert.rejects(
        verify(await challenge("revoked@example.invalid"), revoked.code),
        (e) => e.code === "INVITATION_INVALID",
      );
      await assert.rejects(
        manageInvitations({
          action: "revoke",
          input: { id: first.invitation.id },
          ownerContext,
          resources,
        }),
        (e) => e.code === "INVITATION_ALREADY_USED",
      );
      const replay = await manageInvitations({
        action: "create",
        ownerContext,
        resources,
        idempotencyKey: "gg090-invite-1",
      });
      assert.equal(replay.code, null);
      assert.equal(replay.invitation.id, first.invitation.id);
      const pendingId = randomUUID(),
        identityId = randomUUID();
      await pool.query(
        "INSERT INTO users(id,email,status) VALUES($1,'pending@example.invalid','pending')",
        [pendingId],
      );
      await pool.query(
        "INSERT INTO auth_identities(id,owner_id,issuer,subject) VALUES($1,$2,$3,$4)",
        [identityId, pendingId, config.issuer, randomUUID()],
      );
      await pool.query(
        "INSERT INTO auth_email_bindings(identity_id,owner_id,normalized_email,display_email,source,verified_at) VALUES($1,$2,'pending@example.invalid','pending@example.invalid','self_service',now())",
        [identityId, pendingId],
      );
      const pendingMail = await challenge("pending@example.invalid");
      await assert.rejects(
        verify(pendingMail),
        (e) => e.code === "INVITATION_REQUIRED",
      );
      await verify(pendingMail, (await invite()).code);
      assert.equal(
        (await pool.query("SELECT status FROM users WHERE id=$1", [pendingId]))
          .rows[0].status,
        "active",
      );
      assert.equal(
        (
          await pool.query(
            "SELECT 1 FROM credit_ledger_entries WHERE owner_id=$1",
            [pendingId],
          )
        ).rowCount,
        0,
        "No second welcome grant to legacy pending owner",
      );
      await pool.query("UPDATE users SET status='suspended' WHERE id=$1", [
        creator.id,
      ]);
      now = new Date(now.getTime() + 61000);
      const unused = await invite();
      await verify(await challenge("creator@example.invalid"), unused.code);
      assert.equal(
        (await pool.query("SELECT status FROM users WHERE id=$1", [creator.id]))
          .rows[0].status,
        "suspended",
      );
      assert.equal(
        (
          await pool.query(
            "SELECT used_at FROM registration_invitations WHERE id=$1",
            [unused.invitation.id],
          )
        ).rows[0].used_at,
        null,
      );
      const rollback = await invite(),
        failureMail = await challenge("rollback@example.invalid");
      await pool.query(
        `CREATE FUNCTION gg090_reject_session() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM users WHERE id=NEW.owner_id AND email='rollback@example.invalid') THEN RAISE EXCEPTION 'injected session failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER gg090_reject_session BEFORE INSERT ON auth_sessions FOR EACH ROW EXECUTE FUNCTION gg090_reject_session()`,
      );
      await assert.rejects(verify(failureMail, rollback.code));
      assert.equal(
        (
          await pool.query(
            "SELECT 1 FROM users WHERE email='rollback@example.invalid'",
          )
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT used_at FROM registration_invitations WHERE id=$1",
            [rollback.invitation.id],
          )
        ).rows[0].used_at,
        null,
      );
      await pool.query(
        "DROP TRIGGER gg090_reject_session ON auth_sessions; DROP FUNCTION gg090_reject_session()",
      );
      await verify(failureMail, rollback.code);
      await pool.query("DELETE FROM auth_email_challenges WHERE id=$1", [
        mail.challengeId,
      ]);
      assert.equal(
        (
          await pool.query(
            "SELECT challenge_id FROM registration_invitations WHERE id=$1",
            [first.invitation.id],
          )
        ).rows[0].challenge_id,
        mail.challengeId,
        "Ephemeral challenge cleanup preserves invitation usage history",
      );
      const list = await manageInvitations({
        action: "query",
        ownerContext,
        resources,
      });
      assert.ok(list.counts.used >= 4);
      assert.doesNotMatch(JSON.stringify(list), /code_digest|code_digest|GG-/);
      await pool.query("UPDATE users SET status='suspended' WHERE id=$1", [
        adminId,
      ]);
      await assert.rejects(invite(), (e) => e.code === "ADMIN_ACCESS_DENIED");
    } finally {
      await pool.end();
    }
  },
);
