import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import { authenticationRequestError } from "./errors.mjs";

export const EMAIL_OTP_CODE_LENGTH = 6;
export const EMAIL_OTP_MAX_FAILURES = 5;
export const EMAIL_OTP_RESEND_SECONDS = 60;

export const EMAIL_RATE_LIMITS = Object.freeze({
  email_send_hour: Object.freeze({ limit: 5, windowSeconds: 60 * 60 }),
  email_send_day: Object.freeze({ limit: 20, windowSeconds: 24 * 60 * 60 }),
  ip_send_hour: Object.freeze({ limit: 20, windowSeconds: 60 * 60 }),
  ip_send_day: Object.freeze({ limit: 100, windowSeconds: 24 * 60 * 60 }),
  global_send_hour: Object.freeze({ limit: 100, windowSeconds: 60 * 60 }),
  global_send_day: Object.freeze({ limit: 500, windowSeconds: 24 * 60 * 60 }),
  email_verify_30m: Object.freeze({ limit: 10, windowSeconds: 30 * 60 }),
  ip_verify_15m: Object.freeze({ limit: 50, windowSeconds: 15 * 60 }),
  ip_entry_minute: Object.freeze({ limit: 60, windowSeconds: 60 }),
});

function headerValue(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name);
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

function canonicalIp(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim().replace(/^::ffff:/, "");
  return isIP(candidate) ? candidate.toLowerCase() : null;
}

export function requestClientAddress(request, trustedProxyAddresses = []) {
  const remoteAddress = canonicalIp(request?.socket?.remoteAddress) ?? "0.0.0.0";
  if (!trustedProxyAddresses.includes(remoteAddress)) return remoteAddress;
  const forwarded = headerValue(request?.headers, "x-forwarded-for");
  if (!forwarded || forwarded.includes(",")) return remoteAddress;
  return canonicalIp(forwarded) ?? remoteAddress;
}

export function normalizeEmailAddress(value) {
  if (typeof value !== "string") {
    throw authenticationRequestError(
      "EMAIL_ADDRESS_INVALID",
      "请输入有效的邮箱地址。",
    );
  }
  const displayEmail = value.trim();
  if (
    displayEmail.length < 3 ||
    displayEmail.length > 320 ||
    /[\s\r\n,<>]/.test(displayEmail)
  ) {
    throw authenticationRequestError(
      "EMAIL_ADDRESS_INVALID",
      "请输入有效的邮箱地址。",
    );
  }
  const separator = displayEmail.lastIndexOf("@");
  if (
    separator < 1 ||
    separator !== displayEmail.indexOf("@") ||
    separator > 64 ||
    separator === displayEmail.length - 1
  ) {
    throw authenticationRequestError(
      "EMAIL_ADDRESS_INVALID",
      "请输入有效的邮箱地址。",
    );
  }
  const localPart = displayEmail.slice(0, separator);
  const asciiDomain = domainToASCII(displayEmail.slice(separator + 1));
  if (
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart) ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !asciiDomain ||
    asciiDomain.length > 255 ||
    asciiDomain.startsWith(".") ||
    asciiDomain.endsWith(".") ||
    asciiDomain.split(".").some((label) =>
      !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label),
    )
  ) {
    throw authenticationRequestError(
      "EMAIL_ADDRESS_INVALID",
      "请输入有效的邮箱地址。",
    );
  }
  return Object.freeze({
    displayEmail,
    mailAddress: `${localPart}@${asciiDomain.toLowerCase()}`,
    normalizedEmail: `${localPart.toLowerCase()}@${asciiDomain.toLowerCase()}`,
  });
}

export function maskEmailAddress(value) {
  const [localPart, domain] = value.split("@");
  const visible = localPart.length <= 2 ? localPart.slice(0, 1) : localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.min(5, Math.max(2, localPart.length - visible.length)))}@${domain}`;
}

function hmac(secret, values) {
  const digest = createHmac("sha256", secret);
  for (const value of values) {
    digest.update(String(value));
    digest.update("\0");
  }
  return digest.digest("hex");
}

export function emailCodeDigest(secret, { challengeId, code, normalizedEmail }) {
  return hmac(secret, ["goodgood-email-code-v1", challengeId, normalizedEmail, code]);
}

export function emailSubjectHash(secret, kind, value) {
  return hmac(secret, ["goodgood-auth-subject-v1", kind, value]);
}

export function equalHexDigest(left, right) {
  if (
    typeof left !== "string" ||
    typeof right !== "string" ||
    left.length !== 64 ||
    right.length !== 64
  ) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function rateLimitWindow(now, windowSeconds) {
  const milliseconds = windowSeconds * 1_000;
  const startedAt = Math.floor(now.getTime() / milliseconds) * milliseconds;
  return Object.freeze({
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((startedAt + milliseconds - now.getTime()) / 1_000),
    ),
    windowStartedAt: new Date(startedAt),
  });
}
