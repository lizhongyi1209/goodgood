import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import {
  inspectAuthenticationConfiguration,
  loadAuthenticationConfig,
} from "../server/auth/config.mjs";
import { EmailDeliveryError, createEmailOtpMailer } from "../server/auth/email-mailer.mjs";
import {
  cleanupEmailAuthentication,
  previewEmailAuthenticationCleanup,
} from "../server/auth/email-maintenance.mjs";
import { createEmailOtpOperations } from "../server/auth/email-operations.mjs";
import {
  emailCodeDigest,
  normalizeEmailAddress,
  requestClientAddress,
} from "../server/auth/email-policy.mjs";
import { createAuthenticationNodeApiHandler } from "../server/auth/node-api.mjs";
import { createAuthenticationOperations } from "../server/auth/operations.mjs";
import { hashAuthenticationSecret } from "../server/auth/request-authenticator.mjs";

const TEST_SECRET = "email-otp-test-secret-that-is-at-least-32-bytes";

function emailConfig(overrides = {}) {
  return loadAuthenticationConfig({
    GOODGOOD_AUTH_COOKIE_NAME: "goodgood_email_session",
    GOODGOOD_AUTH_MODE: "email_otp",
    GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://127.0.0.1:3000",
    GOODGOOD_EMAIL_FROM: "GoodGood <no-reply@mail.goodgood.example>",
    GOODGOOD_EMAIL_OTP_SECRET: TEST_SECRET,
    GOODGOOD_EMAIL_SMTP_HOST: "smtp.example.test",
    GOODGOOD_EMAIL_SMTP_PORT: "465",
    GOODGOOD_EMAIL_SMTP_SECURE: "true",
    GOODGOOD_AUTH_TRUSTED_PROXY_ADDRESSES: "127.0.0.1",
    ...overrides,
  });
}

function emailRequest({ body, cookie = "", method = "POST", origin = "http://127.0.0.1:3000", url }) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  request.headers = {
    "content-type": "application/json",
    cookie,
    origin,
  };
  request.method = method;
  request.socket = { remoteAddress: "127.0.0.1" };
  request.url = url;
  return request;
}

function responseRecorder() {
  return {
    body: "",
    headers: {},
    statusCode: 0,
    end(chunk = "") {
      this.body += chunk;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
  };
}

test("email OTP configuration keeps SMTP and OTP secrets server-side", () => {
  const config = emailConfig({
    GOODGOOD_AUTH_TRUSTED_PROXY_ADDRESSES: "127.0.0.1,::1",
    GOODGOOD_EMAIL_SMTP_PASSWORD: "smtp-password",
    GOODGOOD_EMAIL_SMTP_USERNAME: "smtp-user",
  });
  assert.equal(config.mode, "email_otp");
  assert.equal(config.issuer, "urn:goodgood:email");
  assert.equal(config.emailCodeTtlSeconds, 300);
  assert.equal(config.sessionTtlSeconds, 30 * 24 * 60 * 60);
  assert.deepEqual(config.trustedProxyAddresses, ["127.0.0.1", "::1"]);
  assert.equal(config.mail.password, "smtp-password");

  assert.throws(
    () => emailConfig({ GOODGOOD_EMAIL_OTP_SECRET: "too-short" }),
    /at least 32 bytes/,
  );
  assert.throws(
    () =>
      emailConfig({
        GOODGOOD_AUTH_COOKIE_NAME: "not_host_prefixed",
        GOODGOOD_AUTH_PUBLIC_ORIGIN: "https://goodgood.example",
      }),
    /to start with __Host-/,
  );
  assert.throws(
    () => emailConfig({ GOODGOOD_EMAIL_SMTP_USERNAME: "missing-password" }),
    /configured together/,
  );
  assert.throws(
    () => emailConfig({ GOODGOOD_EMAIL_FROM: "one@example.com,two@example.com" }),
    /one safe mailbox value/,
  );
  assert.equal(
    inspectAuthenticationConfiguration({
      GOODGOOD_AUTH_COOKIE_NAME: "goodgood_email_session",
      GOODGOOD_AUTH_MODE: "email_otp",
      GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://127.0.0.1:3000",
      GOODGOOD_EMAIL_OTP_SECRET: TEST_SECRET,
      GOODGOOD_EMAIL_SENDING_ENABLED: "false",
    }).configured,
    true,
  );
});

test("email normalization preserves provider aliases and ignores spoofed forwarding headers", () => {
  assert.deepEqual(normalizeEmailAddress(" Creator+one@Exämple.COM "), {
    displayEmail: "Creator+one@Exämple.COM",
    mailAddress: "Creator+one@xn--exmple-cua.com",
    normalizedEmail: "creator+one@xn--exmple-cua.com",
  });
  assert.throws(
    () => normalizeEmailAddress("invalid(comment)@example.com"),
    (error) => error.code === "EMAIL_ADDRESS_INVALID",
  );
  assert.throws(
    () => normalizeEmailAddress("victim@example.com,attacker@example.com"),
    (error) => error.code === "EMAIL_ADDRESS_INVALID",
  );
  assert.throws(
    () => normalizeEmailAddress("victim@example.com\r\nBcc:x@example.com"),
    (error) => error.code === "EMAIL_ADDRESS_INVALID",
  );
  assert.equal(
    requestClientAddress(
      {
        headers: { "x-forwarded-for": "198.51.100.1" },
        socket: { remoteAddress: "203.0.113.4" },
      },
      ["127.0.0.1"],
    ),
    "203.0.113.4",
  );
  assert.equal(
    requestClientAddress(
      {
        headers: { "x-forwarded-for": "198.51.100.1" },
        socket: { remoteAddress: "127.0.0.1" },
      },
      ["127.0.0.1"],
    ),
    "198.51.100.1",
  );
});

test("email OTP operations persist only digests and establish one opaque GoodGood session", async () => {
  const config = emailConfig();
  const currentTime = new Date("2026-09-10T08:00:00.000Z");
  let challenge;
  let delivered;
  let deliveryUpdate;
  let completedInput;
  const rateLimits = [];
  const repository = {
    async completeEmailChallenge(_pool, input, { verifyCodeDigest }) {
      completedInput = input;
      assert.equal(
        verifyCodeDigest({
          codeDigest: challenge.codeDigest,
          normalizedEmail: challenge.normalizedEmail,
        }),
        true,
      );
      return {
        identityId: "identity-1",
        outcome: "succeeded",
        ownerId: "owner-1",
        returnTo: challenge.returnTo,
      };
    },
    async consumeAuthenticationRateLimit(_pool, input) {
      rateLimits.push(input);
      return true;
    },
    async createEmailChallenge(_pool, input) {
      challenge = input;
      return { created: true, retryAfterSeconds: 0 };
    },
    async readEmailChallengeForVerification() {
      return {
        id: challenge.id,
        normalized_email: challenge.normalizedEmail,
      };
    },
    async updateEmailChallengeDelivery(_pool, input) {
      deliveryUpdate = input;
      return true;
    },
  };
  const mailer = {
    async sendLoginCode(input) {
      delivered = input;
      return { messageId: "smtp-message-1" };
    },
  };
  const operations = createEmailOtpOperations({
    config,
    getPool: async () => ({}),
    mailer,
    now: () => currentTime,
    repository,
  });
  const request = emailRequest({ body: {}, url: "/api/auth/email/request" });
  const requested = await operations.requestCode(
    { email: "Creator+test@Example.COM", returnTo: "/projects?view=recent" },
    request,
  );
  assert.equal(requested.body.delivery, "accepted");
  assert.equal(requested.body.emailHint, "Cr*****@Example.COM");
  assert.equal(delivered.to, "Creator+test@example.com");
  assert.match(delivered.code, /^\d{6}$/);
  assert.equal(challenge.code, undefined);
  assert.equal(challenge.normalizedEmail, "creator+test@example.com");
  assert.equal(
    challenge.codeDigest,
    emailCodeDigest(TEST_SECRET, {
      challengeId: challenge.id,
      code: delivered.code,
      normalizedEmail: challenge.normalizedEmail,
    }),
  );
  assert.equal(deliveryUpdate.state, "accepted");
  assert.deepEqual(
    rateLimits.slice(0, 7).map(({ scope }) => scope),
    [
      "ip_entry_minute",
      "email_send_hour",
      "email_send_day",
      "ip_send_hour",
      "ip_send_day",
      "global_send_hour",
      "global_send_day",
    ],
  );

  const binding = /^goodgood_email_session_login=([^;]+)/.exec(requested.cookie)?.[1];
  assert.ok(binding);
  const verified = await operations.verifyCode(
    { challengeId: challenge.id, code: delivered.code },
    emailRequest({
      body: {},
      cookie: `goodgood_email_session_login=${binding}`,
      url: "/api/auth/email/verify",
    }),
  );
  const rawSession = /^goodgood_email_session=([^;]+)/.exec(verified.cookies[0])?.[1];
  assert.ok(rawSession);
  assert.equal(completedInput.sessionTokenHash, hashAuthenticationSecret(rawSession));
  assert.notEqual(completedInput.sessionTokenHash, rawSession);
  assert.match(verified.cookies[1], /Max-Age=0/);
  assert.equal(verified.body.returnTo, "/projects?view=recent");
});

test("email OTP refuses cross-origin requests and reports shared rate limits", async () => {
  const config = emailConfig();
  const base = {
    config,
    getPool: async () => ({}),
    mailer: { async sendLoginCode() {} },
    repository: {
      async consumeAuthenticationRateLimit() {
        return false;
      },
    },
  };
  const operations = createEmailOtpOperations(base);
  await assert.rejects(
    operations.requestCode(
      { email: "creator@example.com", returnTo: "/" },
      emailRequest({
        body: {},
        origin: "https://evil.example",
        url: "/api/auth/email/request",
      }),
    ),
    (error) => error.code === "AUTH_ORIGIN_INVALID" && error.status === 403,
  );
  await assert.rejects(
    operations.requestCode(
      { email: "creator@example.com", returnTo: "/" },
      emailRequest({ body: {}, url: "/api/auth/email/request" }),
    ),
    (error) =>
      error.code === "EMAIL_RATE_LIMITED" &&
      error.status === 429 &&
      error.retryAfterSeconds > 0,
  );
});

test("SMTP adapter treats acceptance separately from timeout uncertainty", async () => {
  const config = emailConfig();
  const acceptedMailer = createEmailOtpMailer({
    config,
    transportFactory: () => ({
      async sendMail(message) {
        assert.equal(message.to, "creator@example.com");
        assert.match(message.text, /123456/);
        return { accepted: [message.to], messageId: "message-1" };
      },
    }),
  });
  assert.deepEqual(
    await acceptedMailer.sendLoginCode({
      code: "123456",
      expiresInSeconds: 300,
      to: "creator@example.com",
    }),
    { messageId: "message-1" },
  );

  const uncertainMailer = createEmailOtpMailer({
    config,
    transportFactory: () => ({
      async sendMail() {
        throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
      },
    }),
  });
  await assert.rejects(
    uncertainMailer.sendLoginCode({
      code: "123456",
      expiresInSeconds: 300,
      to: "creator@example.com",
    }),
    (error) =>
      error instanceof EmailDeliveryError && error.deliveryState === "unknown",
  );
});

test("email OTP exposes uncertain delivery but fails closed on definite rejection", async () => {
  for (const deliveryState of ["unknown", "failed"]) {
    let deliveryUpdate;
    const operations = createEmailOtpOperations({
      config: emailConfig(),
      getPool: async () => ({}),
      mailer: {
        async sendLoginCode() {
          throw new EmailDeliveryError("SMTP_TEST", deliveryState, "test");
        },
      },
      repository: {
        async consumeAuthenticationRateLimit() {
          return true;
        },
        async createEmailChallenge() {
          return { created: true, retryAfterSeconds: 0 };
        },
        async updateEmailChallengeDelivery(_pool, input) {
          deliveryUpdate = input;
          return true;
        },
      },
    });
    const request = emailRequest({ body: {}, url: "/api/auth/email/request" });
    if (deliveryState === "unknown") {
      const result = await operations.requestCode(
        { email: "creator@example.com", returnTo: "/" },
        request,
      );
      assert.equal(result.body.delivery, "unknown");
    } else {
      await assert.rejects(
        operations.requestCode(
          { email: "creator@example.com", returnTo: "/" },
          request,
        ),
        (error) => error.code === "EMAIL_SEND_UNAVAILABLE" && error.status === 503,
      );
    }
    assert.equal(deliveryUpdate.state, deliveryState);
    assert.equal(deliveryUpdate.errorCode, "SMTP_TEST");
  }
});

test("email authentication cleanup previews by default and deletes only ephemeral records", async () => {
  const currentTime = new Date("2026-09-10T08:00:00.000Z");
  const preview = await previewEmailAuthenticationCleanup(
    {
      async query(sql, parameters) {
        assert.match(sql, /FROM auth_email_challenges/);
        assert.deepEqual(parameters, [currentTime, 24, 48, 30]);
        return { rows: [{ challenges: 2, events: 4, rate_limits: 3 }] };
      },
    },
    currentTime,
  );
  assert.deepEqual(preview, { challenges: 2, events: 4, rate_limits: 3 });

  const statements = [];
  const client = {
    async query(sql) {
      statements.push(sql);
      if (/DELETE FROM auth_events/.test(sql)) return { rowCount: 4 };
      if (/DELETE FROM auth_email_challenges/.test(sql)) return { rowCount: 2 };
      if (/DELETE FROM auth_rate_limits/.test(sql)) return { rowCount: 3 };
      return { rowCount: 0 };
    },
    release() {
      statements.push("RELEASE");
    },
  };
  const cleaned = await cleanupEmailAuthentication(
    { async connect() { return client; } },
    currentTime,
  );
  assert.deepEqual(cleaned, { challenges: 2, events: 4, rateLimits: 3 });
  assert.equal(statements[0], "BEGIN");
  assert.equal(statements.at(-2), "COMMIT");
  assert.equal(statements.at(-1), "RELEASE");
  assert.equal(statements.some((sql) => /DELETE FROM users/.test(sql)), false);
});

test("email authentication API exposes method, accepts bounded JSON, and returns cookies", async () => {
  let requestInput;
  const config = emailConfig();
  const handler = createAuthenticationNodeApiHandler({
    config,
    emailOperations: {
      async requestCode(input) {
        requestInput = input;
        return {
          body: { challengeId: "challenge-1" },
          cookie: "goodgood_email_session_login=binding; HttpOnly",
        };
      },
    },
    operations: {},
  });
  const methodResponse = responseRecorder();
  await handler(
    { headers: {}, method: "GET", url: "/api/auth/method" },
    methodResponse,
  );
  assert.deepEqual(JSON.parse(methodResponse.body), { method: "email_code" });

  const requestResponse = responseRecorder();
  await handler(
    emailRequest({
      body: { email: "creator@example.com", returnTo: "/create" },
      url: "/api/auth/email/request",
    }),
    requestResponse,
  );
  assert.equal(requestResponse.statusCode, 202);
  assert.equal(requestResponse.headers["set-cookie"], "goodgood_email_session_login=binding; HttpOnly");
  assert.deepEqual(requestInput, {
    email: "creator@example.com",
    returnTo: "/create",
  });

  const oversizedResponse = responseRecorder();
  await handler(
    emailRequest({
      body: { email: `${"x".repeat(2_100)}@example.com`, returnTo: "/" },
      url: "/api/auth/email/request",
    }),
    oversizedResponse,
  );
  assert.equal(oversizedResponse.statusCode, 400);
  assert.equal(
    JSON.parse(oversizedResponse.body).error.code,
    "AUTH_REQUEST_INVALID",
  );
});

test("email mode logout revokes the server session without an external redirect", async () => {
  let revokedHash;
  const config = emailConfig();
  const operations = createAuthenticationOperations({
    authenticate: async () => ({}),
    config,
    getPool: async () => ({}),
    repository: {
      async revokeAuthenticationSession(_pool, tokenHash) {
        revokedHash = tokenHash;
      },
    },
  });
  const token = "x".repeat(43);
  const signedOut = await operations.signOut({
    headers: new Headers({ cookie: `${config.cookieName}=${token}` }),
  });
  assert.equal(revokedHash, hashAuthenticationSecret(token));
  assert.equal(signedOut.location, null);
  assert.match(signedOut.cookie, /Max-Age=0/);
});

test("GG-029 migration stores keyed digests, shared limits, bindings, and audit events", async () => {
  const [migration, schema] = await Promise.all([
    readFile(new URL("../migrations/0023_gg029_email_otp.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_email_bindings/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_email_challenges/);
  assert.match(migration, /code_digest text NOT NULL/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_rate_limits/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_events/);
  assert.doesNotMatch(migration, /\bcode text\b|otp text|plaintext/);
  assert.match(schema, /export const authEmailBindings = pgTable/);
  assert.match(schema, /export const authEmailChallenges = pgTable/);
  assert.match(schema, /export const authRateLimits = pgTable/);
  assert.match(schema, /export const authEvents = pgTable/);
});
