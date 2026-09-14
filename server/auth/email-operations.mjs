import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { requestIdFor } from "../observability/http.mjs";
import {
  AuthenticationError,
  authenticationRateLimitError,
  authenticationRequestError,
  emailCodeInvalidError,
} from "./errors.mjs";
import {
  completeEmailChallenge,
  consumeAuthenticationRateLimit,
  createEmailChallenge,
  readCurrentEmailChallenge,
  readEmailChallengeForVerification,
  updateEmailChallengeDelivery,
} from "./email-repository.mjs";
import {
  EMAIL_OTP_CODE_LENGTH,
  EMAIL_OTP_RESEND_SECONDS,
  EMAIL_RATE_LIMITS,
  emailCodeDigest,
  emailSubjectHash,
  equalHexDigest,
  maskEmailAddress,
  normalizeEmailAddress,
  rateLimitWindow,
  requestClientAddress,
} from "./email-policy.mjs";
import { EmailDeliveryError } from "./email-mailer.mjs";
import { safeReturnTo } from "./operations.mjs";
import {
  authenticationLoginCookie,
  authenticationLoginCredential,
  authenticationSessionCookie,
  expiredAuthenticationLoginCookie,
  hashAuthenticationSecret,
} from "./request-authenticator.mjs";

const DEFAULT_REPOSITORY = Object.freeze({
  completeEmailChallenge,
  consumeAuthenticationRateLimit,
  createEmailChallenge,
  readCurrentEmailChallenge,
  readEmailChallengeForVerification,
  updateEmailChallengeDelivery,
});

function randomSecret(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

function randomCode() {
  return String(randomInt(0, 10 ** EMAIL_OTP_CODE_LENGTH)).padStart(
    EMAIL_OTP_CODE_LENGTH,
    "0",
  );
}

function headerValue(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name);
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : (value ?? null);
}

function assertSameOrigin(request, config) {
  if (headerValue(request?.headers, "origin") !== config.publicOrigin) {
    throw authenticationRequestError(
      "AUTH_ORIGIN_INVALID",
      "登录请求未通过来源校验，请刷新后重试。",
      403,
    );
  }
}

function requireChallengeId(value) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value,
    )
  ) {
    throw emailCodeInvalidError();
  }
  return value;
}

function requireCode(value) {
  if (typeof value !== "string" || !/^\d{6}$/.test(value)) {
    throw emailCodeInvalidError();
  }
  return value;
}

async function enforceRateLimits(repository, pool, config, now, limits) {
  for (const { scope, subject } of limits) {
    const policy = EMAIL_RATE_LIMITS[scope];
    const window = rateLimitWindow(now, policy.windowSeconds);
    const rateLimit = await repository.consumeAuthenticationRateLimit(pool, {
      limit: policy.limit,
      now,
      scope,
      subjectHash: emailSubjectHash(config.otpSecret, scope, subject),
      windowSeconds: policy.windowSeconds,
      windowStartedAt: new Date(Math.floor(now.getTime() / 1_000) * 1_000),
    });
    const allowed = rateLimit === true || rateLimit?.allowed === true;
    if (!allowed) {
      throw authenticationRateLimitError(
        rateLimit?.retryAfterSeconds ?? window.retryAfterSeconds,
      );
    }
  }
}

function browserBinding(request, config) {
  const existing = authenticationLoginCredential(request, config);
  if (existing && existing.length >= 32 && existing.length <= 512)
    return existing;
  return randomSecret();
}

export function createEmailOtpOperations({
  config,
  getPool,
  mailer,
  now = () => new Date(),
  repository = DEFAULT_REPOSITORY,
}) {
  if (config.mode !== "email_otp" || typeof getPool !== "function") {
    throw new Error(
      "Email OTP operations require email_otp configuration and a pool.",
    );
  }

  return Object.freeze({
    authenticationMethod() {
      return Object.freeze({ method: "email_code" });
    },

    async readChallenge(request) {
      const binding = authenticationLoginCredential(request, config);
      if (!binding || binding.length < 32 || binding.length > 512) {
        return Object.freeze({ challenge: null });
      }
      const currentTime = now();
      const challenge = await repository.readCurrentEmailChallenge(
        await getPool(),
        {
          browserBindingHash: hashAuthenticationSecret(binding),
          now: currentTime,
        },
      );
      if (!challenge) return Object.freeze({ challenge: null });
      return Object.freeze({
        challenge: Object.freeze({
          delivery: challenge.send_state,
          emailHint: maskEmailAddress(challenge.display_email),
          expiresAt: new Date(challenge.expires_at).toISOString(),
          id: challenge.id,
          resendAfterSeconds: Math.max(
            0,
            Math.ceil(
              (new Date(challenge.created_at).getTime() +
                EMAIL_OTP_RESEND_SECONDS * 1_000 -
                currentTime.getTime()) /
                1_000,
            ),
          ),
        }),
      });
    },

    async requestCode(input, request) {
      assertSameOrigin(request, config);
      if (!config.sendingEnabled || !mailer) {
        throw new AuthenticationError(
          "EMAIL_SENDING_DISABLED",
          "邮件登录暂时不可用，已有登录状态不受影响。",
          503,
          { retryable: true },
        );
      }
      const email = normalizeEmailAddress(input?.email);
      const returnTo = safeReturnTo(input?.returnTo);
      const currentTime = now();
      const clientAddress = requestClientAddress(
        request,
        config.trustedProxyAddresses,
      );
      const pool = await getPool();
      await enforceRateLimits(repository, pool, config, currentTime, [
        { scope: "ip_entry_minute", subject: clientAddress },
        { scope: "email_send_hour", subject: email.normalizedEmail },
        { scope: "email_send_day", subject: email.normalizedEmail },
        { scope: "ip_send_hour", subject: clientAddress },
        { scope: "ip_send_day", subject: clientAddress },
        { scope: "global_send_hour", subject: "global" },
        { scope: "global_send_day", subject: "global" },
      ]);

      const id = randomUUID();
      const code = randomCode();
      const binding = browserBinding(request, config);
      const created = await repository.createEmailChallenge(pool, {
        browserBindingHash: hashAuthenticationSecret(binding),
        codeDigest: emailCodeDigest(config.otpSecret, {
          challengeId: id,
          code,
          normalizedEmail: email.normalizedEmail,
        }),
        displayEmail: email.displayEmail,
        expiresAt: new Date(
          currentTime.getTime() + config.emailCodeTtlSeconds * 1_000,
        ),
        id,
        normalizedEmail: email.normalizedEmail,
        now: currentTime,
        resendAfterSeconds: EMAIL_OTP_RESEND_SECONDS,
        returnTo,
      });
      if (!created.created) {
        throw authenticationRateLimitError(created.retryAfterSeconds);
      }

      const requestId = requestIdFor(request);
      const subjectHash = emailSubjectHash(
        config.otpSecret,
        "email",
        email.normalizedEmail,
      );
      let delivery = "accepted";
      try {
        const result = await mailer.sendLoginCode({
          code,
          expiresInSeconds: config.emailCodeTtlSeconds,
          to: email.mailAddress,
        });
        await repository.updateEmailChallengeDelivery(pool, {
          challengeId: id,
          now: now(),
          providerMessageId: result.messageId,
          requestId,
          state: "accepted",
          subjectHash,
        });
      } catch (error) {
        delivery =
          error instanceof EmailDeliveryError ? error.deliveryState : "unknown";
        await repository.updateEmailChallengeDelivery(pool, {
          challengeId: id,
          errorCode:
            error instanceof EmailDeliveryError ? error.code : "SMTP_UNKNOWN",
          now: now(),
          requestId,
          state: delivery,
          subjectHash,
        });
        if (delivery === "failed") {
          throw new AuthenticationError(
            "EMAIL_SEND_UNAVAILABLE",
            "验证码邮件暂时无法发送，请稍后重试。",
            503,
            { retryable: true },
          );
        }
      }

      return Object.freeze({
        body: Object.freeze({
          challengeId: id,
          delivery,
          emailHint: maskEmailAddress(email.displayEmail),
          expiresInSeconds: config.emailCodeTtlSeconds,
          resendAfterSeconds: EMAIL_OTP_RESEND_SECONDS,
        }),
        cookie: authenticationLoginCookie(config, binding),
      });
    },

    async verifyCode(input, request) {
      assertSameOrigin(request, config);
      const challengeId = requireChallengeId(input?.challengeId);
      const code = requireCode(input?.code);
      const binding = authenticationLoginCredential(request, config);
      if (!binding || binding.length < 32 || binding.length > 512) {
        throw emailCodeInvalidError();
      }
      const currentTime = now();
      const clientAddress = requestClientAddress(
        request,
        config.trustedProxyAddresses,
      );
      const pool = await getPool();
      await enforceRateLimits(repository, pool, config, currentTime, [
        { scope: "ip_entry_minute", subject: clientAddress },
        { scope: "ip_verify_15m", subject: clientAddress },
      ]);
      const challenge = await repository.readEmailChallengeForVerification(
        pool,
        {
          browserBindingHash: hashAuthenticationSecret(binding),
          challengeId,
          now: currentTime,
        },
      );
      if (!challenge) throw emailCodeInvalidError();
      await enforceRateLimits(repository, pool, config, currentTime, [
        { scope: "email_verify_30m", subject: challenge.normalized_email },
      ]);

      const token = randomSecret();
      const subjectHash = emailSubjectHash(
        config.otpSecret,
        "email",
        challenge.normalized_email,
      );
      const result = await repository.completeEmailChallenge(
        pool,
        {
          browserBindingHash: hashAuthenticationSecret(binding),
          challengeId,
          issuer: config.issuer,
          invitationCode: input?.invitationCode,
          expectedEmail:
            input?.email === undefined
              ? null
              : normalizeEmailAddress(input.email).normalizedEmail,
          now: currentTime,
          registrationEnabled: config.registrationEnabled,
          requestId: requestIdFor(request),
          sessionExpiresAt: new Date(
            currentTime.getTime() + config.sessionTtlSeconds * 1_000,
          ),
          sessionTokenHash: hashAuthenticationSecret(token),
          subjectHash,
        },
        {
          verifyCodeDigest: ({ codeDigest, normalizedEmail }) =>
            equalHexDigest(
              codeDigest,
              emailCodeDigest(config.otpSecret, {
                challengeId,
                code,
                normalizedEmail,
              }),
            ),
        },
      );
      if (result.outcome === "invalid") throw emailCodeInvalidError();
      if (
        result.outcome === "invitation_required" ||
        result.outcome === "invitation_invalid"
      ) {
        throw new AuthenticationError(
          result.outcome === "invitation_required"
            ? "INVITATION_REQUIRED"
            : "INVITATION_INVALID",
          result.outcome === "invitation_required"
            ? "请输入邀请码。"
            : "邀请码无效。",
          403,
        );
      }
      if (result.outcome === "registration_closed") {
        throw new AuthenticationError(
          "EMAIL_REGISTRATION_CLOSED",
          "当前暂不开放新账号注册。",
          403,
        );
      }
      if (result.outcome === "link_required") {
        throw new AuthenticationError(
          "ACCOUNT_LINK_REQUIRED",
          "该邮箱需要站长核对原账号后才能登录。",
          409,
        );
      }
      return Object.freeze({
        body: Object.freeze({
          authenticated: true,
          returnTo: safeReturnTo(result.returnTo),
        }),
        cookies: [
          authenticationSessionCookie(config, token),
          expiredAuthenticationLoginCookie(config),
        ],
      });
    },
  });
}
