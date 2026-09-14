import assert from "node:assert/strict";
import test from "node:test";
import {
  invitationDigest,
  manageInvitations,
} from "../server/auth/invitations.mjs";
import { invitationHttp } from "../server/auth/invitation-http.mjs";
import { createEmailOtpOperations } from "../server/auth/email-operations.mjs";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { emailCodeDigest } from "../server/auth/email-policy.mjs";
const config = loadAuthenticationConfig({
  GOODGOOD_AUTH_MODE: "email_otp",
  GOODGOOD_AUTH_COOKIE_NAME: "gg090_test_session",
  GOODGOOD_EMAIL_FROM: "GoodGood <no-reply@mail.goodgood.local>",
  GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://localhost:32190",
  GOODGOOD_EMAIL_OTP_SECRET: "gg090-test-secret-at-least-thirty-two-characters",
  GOODGOOD_EMAIL_SENDING_ENABLED: "false",
});
test("single-use invitation digest accepts only generated high-entropy syntax", () => {
  const code = "GG-" + "a".repeat(24);
  assert.match(invitationDigest(code), /^[a-f0-9]{64}$/);
  assert.equal(invitationDigest(" " + code + " "), invitationDigest(code));
  for (const value of [null, {}, "123456", "GG-short", code + "a"])
    assert.equal(invitationDigest(value), null);
});
test("invitation HTTP enforces admin header, bounded JSON and sanitized errors", async () => {
  const request = (body = "{}", headers = {}) =>
    new Request("http://localhost/api/admin/invitations/create", {
      method: "POST",
      headers,
      body,
    });
  const options = {
    authenticate: async () => ({ ownerId: "one" }),
    operation: async (input) => ({
      action: input.action,
      key: input.idempotencyKey,
    }),
  };
  assert.equal((await invitationHttp(request(), options)).status, 403);
  const headers = {
    "x-goodgood-admin-action": "1",
    "idempotency-key": "test-key",
  };
  assert.deepEqual(
    await (await invitationHttp(request("{}", headers), options)).json(),
    { action: "create", key: "test-key" },
  );
  assert.equal(
    (await invitationHttp(request("x".repeat(2049), headers), options)).status,
    413,
  );
  assert.equal(
    (await invitationHttp(request("[]", headers), options)).status,
    400,
  );
  const failure = await invitationHttp(request("{}", headers), {
    ...options,
    operation: async () => {
      throw Error("database password secret");
    },
  });
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /password|secret/);
});
test("email invitation outcomes issue no session cookies and preserve old login", async () => {
  const binding = "b".repeat(32),
    challengeId = "90000000-0000-4000-8000-000000000001";
  let outcome = "invitation_required",
    completed;
  const operations = createEmailOtpOperations({
    config,
    getPool: async () => ({}),
    mailer: null,
    repository: {
      consumeAuthenticationRateLimit: async () => true,
      readEmailChallengeForVerification: async () => ({
        normalized_email: "creator@example.invalid",
      }),
      completeEmailChallenge: async (_pool, input, { verifyCodeDigest }) => {
        completed = input;
        assert.equal(
          verifyCodeDigest({
            normalizedEmail: "creator@example.invalid",
            codeDigest: emailCodeDigest(config.otpSecret, {
              challengeId,
              code: "123456",
              normalizedEmail: "creator@example.invalid",
            }),
          }),
          true,
        );
        return { outcome, returnTo: "/assets" };
      },
    },
  });
  const request = {
    headers: new Headers({
      origin: config.publicOrigin,
      cookie: `${config.cookieName}_login=${binding}`,
    }),
  };
  await assert.rejects(
    operations.verifyCode({ challengeId, code: "123456" }, request),
    (e) => e.code === "INVITATION_REQUIRED",
  );
  outcome = "invitation_invalid";
  await assert.rejects(
    operations.verifyCode(
      { challengeId, code: "123456", invitationCode: "GG-" + "a".repeat(24) },
      request,
    ),
    (e) => e.code === "INVITATION_INVALID",
  );
  assert.equal(completed.invitationCode, "GG-" + "a".repeat(24));
  outcome = "succeeded";
  assert.equal(
    (await operations.verifyCode({ challengeId, code: "123456" }, request))
      .cookies.length,
    2,
  );
  await assert.rejects(
    manageInvitations({
      action: "create",
      idempotencyKey: "bad",
      ownerContext: {},
      resources: {},
    }),
    (e) => e.code === "ADMIN_REQUEST_INVALID",
  );
});
