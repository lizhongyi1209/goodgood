import { createHmac, timingSafeEqual } from "node:crypto";
import { PaymentError } from "./payment-errors.mjs";

export const FAKE_PAYMENT_PROVIDER = "fake-sandbox";
export const FAKE_PAYMENT_SIGNATURE_HEADER = "x-goodgood-payment-signature";
export const FAKE_PAYMENT_TIMESTAMP_HEADER = "x-goodgood-payment-timestamp";

function firstHeader(headers, name) {
  const value = headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function requireSecret(value) {
  const secret = value?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET must contain at least 16 characters when the sandbox is enabled.",
    );
  }
  return secret;
}

export function loadFakePaymentSandboxConfig(environment = process.env) {
  const enabled = environment.GOODGOOD_FAKE_PAYMENT_ENABLED === "true";
  return Object.freeze({
    enabled,
    provider: FAKE_PAYMENT_PROVIDER,
    secret: enabled
      ? requireSecret(environment.GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET)
      : null,
    toleranceSeconds: 300,
  });
}

export function signFakePaymentWebhook({ rawBody, secret, timestamp }) {
  return `v1=${createHmac("sha256", requireSecret(secret))
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex")}`;
}

export function verifyFakePaymentWebhook({
  config,
  headers,
  now = new Date(),
  rawBody,
}) {
  if (!config?.enabled || !config.secret) {
    throw new PaymentError(
      "PAYMENT_SANDBOX_DISABLED",
      "支付测试通道当前不可用。",
      503,
      true,
    );
  }
  const timestampText = firstHeader(headers, FAKE_PAYMENT_TIMESTAMP_HEADER);
  const signature = firstHeader(headers, FAKE_PAYMENT_SIGNATURE_HEADER);
  if (!/^\d{10}$/.test(timestampText ?? "") || !/^v1=[a-f0-9]{64}$/.test(signature ?? "")) {
    throw new PaymentError(
      "PAYMENT_WEBHOOK_INVALID",
      "支付通知校验失败。",
      401,
    );
  }
  const timestamp = Number(timestampText);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (Math.abs(nowSeconds - timestamp) > config.toleranceSeconds) {
    throw new PaymentError(
      "PAYMENT_WEBHOOK_EXPIRED",
      "支付通知已过期。",
      401,
    );
  }
  const expected = signFakePaymentWebhook({
    rawBody,
    secret: config.secret,
    timestamp,
  });
  const suppliedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    throw new PaymentError(
      "PAYMENT_WEBHOOK_INVALID",
      "支付通知校验失败。",
      401,
    );
  }
  return { timestamp };
}
