import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAccountInvitationCode } from "../server/auth/account-invitations.mjs";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { createEmailOtpOperations } from "../server/auth/email-operations.mjs";
import { emailCodeDigest } from "../server/auth/email-policy.mjs";

const config = loadAuthenticationConfig({
  GOODGOOD_AUTH_MODE: "email_otp",
  GOODGOOD_AUTH_COOKIE_NAME: "gg090_test_session",
  GOODGOOD_EMAIL_FROM: "GoodGood <no-reply@mail.goodgood.local>",
  GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://localhost:32190",
  GOODGOOD_EMAIL_OTP_SECRET: "gg090-test-secret-at-least-thirty-two-characters",
  GOODGOOD_EMAIL_SENDING_ENABLED: "false",
});

test("six-digit invitation preserves leading zeroes and rejects old/invalid codes", () => {
  assert.equal(normalizeAccountInvitationCode(" 000123 "), "000123");
  for (const code of [
    123456,
    "12345",
    "1234567",
    "GG-" + "a".repeat(24),
    null,
    "１２３４５６",
  ])
    assert.equal(normalizeAccountInvitationCode(code), null);
});

test("optional invitation keeps invalid-code rejection and issues no session cookie", async () => {
  const binding = "b".repeat(32),
    challengeId = "90000000-0000-4000-8000-000000000001";
  let outcome = "succeeded",
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
  // A supplied but unknown invitation code still fails closed.
  outcome = "invitation_invalid";
  await assert.rejects(
    operations.verifyCode(
      { challengeId, code: "123456", invitationCode: "123456" },
      request,
    ),
    (e) => e.code === "INVITATION_INVALID",
  );
  assert.equal(completed.invitationCode, "123456");
  // A pending account without an invitation still needs one to open.
  outcome = "invitation_required";
  await assert.rejects(
    operations.verifyCode({ challengeId, code: "123456" }, request),
    (e) => e.code === "INVITATION_REQUIRED",
  );
  // No invitation supplied is now a valid registration path.
  outcome = "succeeded";
  assert.equal(
    (await operations.verifyCode({ challengeId, code: "123456" }, request))
      .cookies.length,
    2,
  );
});
