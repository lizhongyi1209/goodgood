import { provisionOwnerIdentity } from "../server/auth/repository.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { createEmailOtpOperations } from "../server/auth/email-operations.mjs";
const enabled = process.env.GOODGOOD_GG091_INTEGRATION === "1";
test(
  "GG091 isolated SQL: dual verification, account-owned reusable code, existing states and rollback",
  { skip: !enabled },
  async () => {
    assert.equal(process.env.GOODGOOD_GG091_NO_WORKER, "1");
    const url = new URL(process.env.GOODGOOD_GG091_DATABASE_URL);
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.port, "54449");
    assert.match(url.pathname, /^\/goodgood_gg091_invitation_test[a-z0-9_]*$/);
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
        (await readdir(new URL("../migrations", import.meta.url)))
          .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
          .sort()
          .at(-1),
      );
      const adminId = randomUUID();
      await pool.query(
        "INSERT INTO users(id,email,status) VALUES($1,'owner@example.invalid','active')",
        [adminId],
      );
      await pool.query(
        "INSERT INTO system_role_assignments(id,owner_id,role,source,assigned_by_operator_id,reason,idempotency_key,operation_hash) VALUES($1,$2,'site_owner','bootstrap','gg091-test','isolated test','gg091-test-owner',$3)",
        [randomUUID(), adminId, "a".repeat(64)],
      );
      const config = loadAuthenticationConfig({
        GOODGOOD_AUTH_MODE: "email_otp",
        GOODGOOD_AUTH_COOKIE_NAME: "gg091_test_session",
        GOODGOOD_EMAIL_FROM: "GoodGood <no-reply@mail.goodgood.local>",
        GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://localhost:32190",
        GOODGOOD_EMAIL_OTP_SECRET:
          "gg091-test-secret-at-least-thirty-two-characters",
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
            return { messageId: "gg091-test-" + delivered.length };
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
      const codeFor = async (id) =>
        (
          await pool.query(
            "SELECT code FROM account_invitations WHERE owner_id=$1",
            [id],
          )
        ).rows[0].code;
      const ownerFor = async (email) =>
        (
          await pool.query("SELECT id,status FROM users WHERE email=$1", [
            email,
          ])
        ).rows[0];
      const code = await codeFor(adminId);
      assert.match(code, /^[0-9]{6}$/);
      await assert.rejects(
        pool.query(
          "INSERT INTO account_invitations(owner_id,code) VALUES($1,'000000')",
          [adminId],
        ),
        (e) => e.code === "23505",
      );
      await assert.rejects(
        provisionOwnerIdentity(pool, {
          email: "legacy-new@example.invalid",
          issuer: "urn:legacy-test",
          subject: "new",
        }),
        (e) => e.code === "INVITATION_REQUIRED",
      );
      const first = await challenge("creator@example.invalid");
      await assert.rejects(
        verify(first, code, first.code === "000000" ? "111111" : "000000"),
        (e) => e.code === "EMAIL_CODE_INVALID",
      );
      // A supplied but unknown six-digit code still fails closed.
      await assert.rejects(
        verify(first, first.code === "000000" ? "111111" : "000000"),
        (e) => e.code === "INVITATION_INVALID",
      );
      assert.equal(await ownerFor("creator@example.invalid"), undefined);
      await assert.rejects(
        operations.verifyCode(
          {
            challengeId: first.challengeId,
            code: first.code,
            invitationCode: code,
            email: "different@example.invalid",
          },
          request(first.cookie),
        ),
        (e) => e.code === "EMAIL_CODE_INVALID",
      );
      await verify(first, code);
      const creator = await ownerFor("creator@example.invalid");
      assert.equal(creator.status, "active");
      assert.match(await codeFor(creator.id), /^[0-9]{6}$/);
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
        verify(first, code),
        (e) => e.code === "EMAIL_CODE_INVALID",
      );
      now = new Date(now.getTime() + 61_000);
      await verify(await challenge("creator@example.invalid"));
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM credit_ledger_entries WHERE owner_id=$1 AND reason='welcome_grant_v1'",
            [creator.id],
          )
        ).rows[0].n,
        1,
      );

      // Registration without an invitation code is now allowed and records no inviter.
      const noInvite = await challenge("no-invite@example.invalid");
      await verify(noInvite);
      const noInviteOwner = await ownerFor("no-invite@example.invalid");
      assert.equal(noInviteOwner.status, "active");
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM account_invitation_uses WHERE registered_owner_id=$1",
            [noInviteOwner.id],
          )
        ).rows[0].n,
        0,
      );

      const a = await challenge("parallel-a@example.invalid");
      const b = await challenge("parallel-b@example.invalid");
      assert.ok(
        (await Promise.allSettled([verify(a, code), verify(b, code)])).every(
          (r) => r.status === "fulfilled",
        ),
      );
      assert.equal(await codeFor(adminId), code);
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM account_invitation_uses WHERE inviter_owner_id=$1",
            [adminId],
          )
        ).rows[0].n,
        3,
      );
      const once = await challenge("once@example.invalid");
      const onceResults = await Promise.allSettled([
        verify(once, code),
        verify(once, code),
      ]);
      assert.equal(
        onceResults.filter((r) => r.status === "fulfilled").length,
        1,
      );

      await pool.query("UPDATE users SET status='suspended' WHERE id=$1", [
        adminId,
      ]);
      const suspendedInvite = await challenge(
        "inviter-suspended@example.invalid",
      );
      await assert.rejects(
        verify(suspendedInvite, code),
        (e) => e.code === "INVITATION_INVALID",
      );
      assert.equal(
        await ownerFor("inviter-suspended@example.invalid"),
        undefined,
      );
      await pool.query("UPDATE users SET status='active' WHERE id=$1", [
        adminId,
      ]);
      await verify(suspendedInvite, code);

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
        verify(pendingMail, await codeFor(pendingId)),
        (e) => e.code === "INVITATION_INVALID",
      );
      await verify(pendingMail, code);
      assert.equal((await ownerFor("pending@example.invalid")).id, pendingId);
      assert.equal(
        (await ownerFor("pending@example.invalid")).status,
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
      );
      await pool.query("UPDATE users SET status='suspended' WHERE id=$1", [
        pendingId,
      ]);
      now = new Date(now.getTime() + 61_000);
      await verify(await challenge("pending@example.invalid"), code);
      assert.equal(
        (await ownerFor("pending@example.invalid")).status,
        "suspended",
      );

      const broken = await challenge("rollback@example.invalid");
      const before = (
        await pool.query("SELECT count(*)::int AS n FROM account_invitations")
      ).rows[0].n;
      await pool.query(
        "CREATE FUNCTION gg091_fail_session() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected session failure'; END $$; CREATE TRIGGER gg091_fail_session BEFORE INSERT ON auth_sessions FOR EACH ROW EXECUTE FUNCTION gg091_fail_session()",
      );
      await assert.rejects(verify(broken, code));
      assert.equal(await ownerFor("rollback@example.invalid"), undefined);
      assert.equal(
        (await pool.query("SELECT count(*)::int AS n FROM account_invitations"))
          .rows[0].n,
        before,
      );
      await pool.query(
        "DROP TRIGGER gg091_fail_session ON auth_sessions; DROP FUNCTION gg091_fail_session()",
      );
      await verify(broken, code);
      await pool.query("DELETE FROM auth_email_challenges WHERE id=$1", [
        first.challengeId,
      ]);
      assert.equal(
        (
          await pool.query(
            "SELECT 1 FROM account_invitation_uses WHERE challenge_id=$1",
            [first.challengeId],
          )
        ).rowCount,
        1,
      );
      const coverage = await pool.query(
        "SELECT (SELECT count(*)::int FROM users) AS users,(SELECT count(*)::int FROM account_invitations) AS codes,(SELECT count(DISTINCT code)::int FROM account_invitations) AS distinct_codes",
      );
      assert.equal(coverage.rows[0].users, coverage.rows[0].codes);
      assert.equal(coverage.rows[0].codes, coverage.rows[0].distinct_codes);
    } finally {
      await pool.end();
    }
  },
);
