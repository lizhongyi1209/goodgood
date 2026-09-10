import nodemailer from "nodemailer";

export class EmailDeliveryError extends Error {
  constructor(code, deliveryState, message) {
    super(message);
    this.name = "EmailDeliveryError";
    this.code = code;
    this.deliveryState = deliveryState;
  }
}

export function createEmailSmtpTransport({
  config,
  transportFactory = nodemailer.createTransport,
}) {
  if (config.mode !== "email_otp" || !config.mail) {
    throw new Error("Email OTP delivery requires enabled SMTP configuration.");
  }
  return transportFactory({
    auth: config.mail.username
      ? { pass: config.mail.password, user: config.mail.username }
      : undefined,
    connectionTimeout: config.mail.connectionTimeoutMs,
    greetingTimeout: config.mail.connectionTimeoutMs,
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    socketTimeout: config.mail.connectionTimeoutMs,
  });
}

function deliveryFailure(error) {
  const providerCode = typeof error?.code === "string" ? error.code : "SMTP_FAILED";
  const uncertainCodes = new Set([
    "ECONNECTION",
    "ECONNRESET",
    "ESOCKET",
    "ETIMEDOUT",
  ]);
  return new EmailDeliveryError(
    providerCode.slice(0, 100),
    uncertainCodes.has(providerCode) ? "unknown" : "failed",
    "The email delivery provider did not accept the request.",
  );
}

export function createEmailOtpMailer({ config, transportFactory = nodemailer.createTransport }) {
  const transport = createEmailSmtpTransport({
    config,
    transportFactory,
  });

  return Object.freeze({
    async sendLoginCode({ code, expiresInSeconds, to }) {
      const expiresInMinutes = Math.max(1, Math.ceil(expiresInSeconds / 60));
      let result;
      try {
        result = await transport.sendMail({
          from: config.mail.from,
          html: `<div style="font-family:system-ui,-apple-system,sans-serif;color:#292933;line-height:1.6"><p>你正在登录 GoodGood。</p><p style="font-size:28px;font-weight:700;letter-spacing:0.18em">${code}</p><p>验证码 ${expiresInMinutes} 分钟内有效，且只能使用一次。</p><p style="color:#737381">如果不是你本人操作，请忽略这封邮件。</p></div>`,
          replyTo: config.mail.replyTo ?? undefined,
          subject: "GoodGood 登录验证码",
          text: `你正在登录 GoodGood。\n\n验证码：${code}\n\n验证码 ${expiresInMinutes} 分钟内有效，且只能使用一次。\n如果不是你本人操作，请忽略这封邮件。`,
          to,
        });
      } catch (error) {
        throw deliveryFailure(error);
      }
      const accepted = Array.isArray(result?.accepted) ? result.accepted : [];
      if (accepted.length === 0) {
        throw new EmailDeliveryError(
          "SMTP_RECIPIENT_REJECTED",
          "failed",
          "The email delivery provider rejected the recipient.",
        );
      }
      return Object.freeze({
        messageId:
          typeof result.messageId === "string"
            ? result.messageId.slice(0, 500)
            : null,
      });
    },
  });
}
