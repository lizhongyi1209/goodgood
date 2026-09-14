import {randomUUID,randomBytes} from "node:crypto";
import {invitationDigest} from "../server/auth/invitations.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { createEmailOtpOperations } from "../server/auth/email-operations.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";

const { Pool } = pg;
const databaseUrl = process.env.GOODGOOD_EMAIL_AUTH_TEST_DATABASE_URL;

function assertDisposableDatabase(value) {
  if (!value) return;
  const parsed = new URL(value);
  if (
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    parsed.pathname !== "/gg029_email_auth_test"
  ) {
    throw new Error(
      "GOODGOOD_EMAIL_AUTH_TEST_DATABASE_URL must target the loopback database gg029_email_auth_test.",
    );
  }
}

function request(cookie = "") {
  return {
    headers: new Headers({
      cookie,
      origin: "http://127.0.0.1:31029",
    }),
    socket: { remoteAddress: "127.0.0.1" },
    url: "/api/auth/email/request",
  };
}

test(
  "email OTP PostgreSQL transaction is one-time and grants welcome credit once",
  { skip: !databaseUrl },
  async () => {
    assertDisposableDatabase(databaseUrl);
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    const pool = new Pool({ connectionString: databaseUrl, max: 8 });
    const delivered = [];
    let currentTime = new Date("2026-09-10T08:00:00.000Z");
    const config = loadAuthenticationConfig({
      GOODGOOD_AUTH_COOKIE_NAME: "goodgood_email_session",
      GOODGOOD_AUTH_MODE: "email_otp",
      GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://127.0.0.1:31029",
      GOODGOOD_EMAIL_FROM: "GoodGood <no-reply@mail.goodgood.local>",
      GOODGOOD_EMAIL_OTP_SECRET: "gg029-integration-secret-value-at-least-32-bytes",
      GOODGOOD_EMAIL_SMTP_HOST: "mailpit",
      GOODGOOD_EMAIL_SMTP_PORT: "1025",
      GOODGOOD_EMAIL_SMTP_SECURE: "false",
    });
    const operations = createEmailOtpOperations({
      config,
      getPool: async () => pool,
      mailer: {
        async sendLoginCode(message) {
          delivered.push(message);
          return { messageId: `message-${delivered.length}` };
        },
      },
      now: () => currentTime,
    });

    try {
      const inviterId=randomUUID(),invitationCode='GG-'+randomBytes(18).toString('base64url');
      await pool.query("INSERT INTO users(id,email,status) VALUES($1,'inviter@example.invalid','active')",[inviterId]);
      await pool.query("INSERT INTO registration_invitations(id,code_digest,code_hint,created_by,idempotency_key) VALUES($1,$2,$3,$4,'gg029-registration')",[randomUUID(),invitationDigest(invitationCode),invitationCode.slice(-6),inviterId]);
      const issued = await operations.requestCode(
        { email: "alpha.creator@example.com", returnTo: "/create" },
        request(),
      );
      const binding = /^goodgood_email_session_login=([^;]+)/.exec(issued.cookie)?.[1];
      assert.ok(binding);
      assert.equal(delivered.length, 1);
      const storedChallenge = await pool.query(
        `SELECT code_digest, failed_attempts, send_state
           FROM auth_email_challenges
          WHERE id = $1`,
        [issued.body.challengeId],
      );
      assert.match(storedChallenge.rows[0].code_digest, /^[a-f0-9]{64}$/);
      assert.equal(storedChallenge.rows[0].send_state, "accepted");

      await assert.rejects(
        operations.verifyCode(
          { challengeId: issued.body.challengeId, code: "999999" },
          request(`goodgood_email_session_login=${binding}`),
        ),
        (error) => error.code === "EMAIL_CODE_INVALID",
      );
      const afterFailure = await pool.query(
        "SELECT failed_attempts FROM auth_email_challenges WHERE id = $1",
        [issued.body.challengeId],
      );
      assert.equal(afterFailure.rows[0].failed_attempts, 1);

      await assert.rejects(
        operations.verifyCode(
          { challengeId: issued.body.challengeId, code: delivered[0].code, invitationCode },
          request("goodgood_email_session_login=another-browser-binding-value-123456"),
        ),
        (error) => error.code === "EMAIL_CODE_INVALID",
      );

      const attempts = await Promise.allSettled([
        operations.verifyCode(
          { challengeId: issued.body.challengeId, code: delivered[0].code, invitationCode },
          request(`goodgood_email_session_login=${binding}`),
        ),
        operations.verifyCode(
          { challengeId: issued.body.challengeId, code: delivered[0].code, invitationCode },
          request(`goodgood_email_session_login=${binding}`),
        ),
      ]);
      assert.equal(attempts.filter(({ status }) => status === "fulfilled").length, 1);
      assert.equal(attempts.filter(({ status }) => status === "rejected").length, 1);

      const [users, identities, bindings, sessions, accounts, events] =
        await Promise.all([
          pool.query("SELECT id, email, status FROM users WHERE email='alpha.creator@example.com'"),
          pool.query("SELECT issuer, subject FROM auth_identities"),
          pool.query("SELECT normalized_email, source FROM auth_email_bindings"),
          pool.query("SELECT revoked_at FROM auth_sessions"),
          pool.query("SELECT available_balance, reserved_balance FROM credit_accounts"),
          pool.query("SELECT event_type, outcome FROM auth_events ORDER BY created_at"),
        ]);
      assert.equal(users.rowCount, 1);
      assert.equal(users.rows[0].status, "active");
      assert.equal(identities.rows[0].issuer, "urn:goodgood:email");
      assert.match(identities.rows[0].subject, /^[0-9a-f-]{36}$/);
      assert.deepEqual(bindings.rows[0], {
        normalized_email: "alpha.creator@example.com",
        source: "self_service",
      });
      assert.equal(sessions.rowCount, 1);
      assert.equal(accounts.rows[0].available_balance, "200");
      assert.equal(accounts.rows[0].reserved_balance, "0");
      assert.ok(events.rows.some(({ event_type, outcome }) =>
        event_type === "email_code_verified" && outcome === "succeeded"));

      currentTime = new Date(currentTime.getTime() + 61_000);
      const second = await operations.requestCode(
        { email: "ALPHA.CREATOR@example.com", returnTo: "/assets" },
        request(),
      );
      const secondBinding = /^goodgood_email_session_login=([^;]+)/.exec(second.cookie)?.[1];
      await operations.verifyCode(
        { challengeId: second.body.challengeId, code: delivered[1].code },
        request(`goodgood_email_session_login=${secondBinding}`),
      );
      const repeated = await pool.query(
        `SELECT
           (SELECT count(*)::int FROM users) AS users,
           (SELECT count(*)::int FROM auth_email_bindings) AS bindings,
           (SELECT count(*)::int FROM credit_ledger_entries
             WHERE reason = 'welcome_grant_v1') AS welcome_grants`,
      );
      assert.deepEqual(repeated.rows[0], {
        bindings: 1,
        users: 2,
        welcome_grants: 1,
      });
    } finally {
      await pool.end();
    }
  },
);
