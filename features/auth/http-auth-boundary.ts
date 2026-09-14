export const SESSION_EXPIRED_EVENT = "goodgood:session-expired";

export type AuthenticationSession = Readonly<{
  access: Readonly<{
    status: "pending" | "active" | "suspended";
  }>;
  account: Readonly<{
    availableCredits: string;
    businessRole: "enterprise" | "distributor" | null;
    reservedCredits: string;
    role: "site_owner" | "member";
    tier: "seed";
    unit: "credit-cny-cent";
  }>;
  authenticated: true;
  preview?: true;
  user: Readonly<{
    email: string | null;
  }>;
}>;

type AuthenticationErrorEnvelope = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    retryAfterSeconds?: number;
    retryable?: boolean;
  }>;
}>;

export class AuthenticationBoundaryError extends Error {
  code: string;
  retryAfterSeconds: number | null;
  retryable: boolean;

  constructor(payload: AuthenticationErrorEnvelope) {
    super(payload.error?.message ?? "登录暂时无法完成，请稍后重试。");
    this.name = "AuthenticationBoundaryError";
    this.code = payload.error?.code ?? "AUTHENTICATION_FAILED";
    this.retryAfterSeconds = payload.error?.retryAfterSeconds ?? null;
    this.retryable = payload.error?.retryable ?? false;
  }
}

export type AuthenticationMethod = "email_code" | "hosted";

export type EmailAuthenticationChallenge = Readonly<{
  delivery: "sending" | "accepted" | "unknown";
  emailHint: string;
  expiresAt: string;
  id: string;
  resendAfterSeconds: number;
}>;

type LogoutResponse = Readonly<{
  redirectTo?: string;
}>;

export async function goodGoodApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const response = await fetch(input, init);
  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return response;
}

export async function readAuthenticationSession(): Promise<AuthenticationSession | null> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (response.status === 401) return null;
  const payload = (await response.json()) as
    | AuthenticationSession
    | AuthenticationErrorEnvelope;
  if (!response.ok) {
    const failure = payload as AuthenticationErrorEnvelope;
    throw new Error(failure.error?.message ?? "登录状态暂时无法确认，请重试。");
  }
  return payload as AuthenticationSession;
}

export async function readAuthenticationMethod(): Promise<AuthenticationMethod> {
  const response = await fetch("/api/auth/method", { cache: "no-store" });
  const payload = (await response.json()) as
    | { method?: AuthenticationMethod }
    | AuthenticationErrorEnvelope;
  if (!response.ok) throw new AuthenticationBoundaryError(payload as AuthenticationErrorEnvelope);
  const success = payload as { method?: AuthenticationMethod };
  if (success.method !== "email_code" && success.method !== "hosted") {
    throw new Error("登录方式暂时无法确认，请重试。");
  }
  return success.method;
}

export async function readEmailAuthenticationChallenge(): Promise<EmailAuthenticationChallenge | null> {
  const response = await fetch("/api/auth/email/challenge", { cache: "no-store" });
  const payload = (await response.json()) as
    | { challenge?: EmailAuthenticationChallenge | null }
    | AuthenticationErrorEnvelope;
  if (!response.ok) throw new AuthenticationBoundaryError(payload as AuthenticationErrorEnvelope);
  return "challenge" in payload ? payload.challenge ?? null : null;
}

export async function requestEmailAuthenticationCode(
  email: string,
  returnTo: string,
): Promise<EmailAuthenticationChallenge> {
  const response = await fetch("/api/auth/email/request", {
    body: JSON.stringify({ email, returnTo }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as
    | {
        challengeId: string;
        delivery: EmailAuthenticationChallenge["delivery"];
        emailHint: string;
        expiresInSeconds: number;
        resendAfterSeconds: number;
      }
    | AuthenticationErrorEnvelope;
  if (!response.ok) throw new AuthenticationBoundaryError(payload as AuthenticationErrorEnvelope);
  const accepted = payload as Exclude<typeof payload, AuthenticationErrorEnvelope>;
  return Object.freeze({
    delivery: accepted.delivery,
    emailHint: accepted.emailHint,
    expiresAt: new Date(Date.now() + accepted.expiresInSeconds * 1_000).toISOString(),
    id: accepted.challengeId,
    resendAfterSeconds: accepted.resendAfterSeconds,
  });
}

export async function verifyEmailAuthenticationCode(
  challengeId: string,
  code: string,
  invitationCode?: string,
): Promise<string> {
  const response = await fetch("/api/auth/email/verify", {
    body: JSON.stringify({ challengeId, code, ...(invitationCode !== undefined ? {invitationCode} : {}) }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as
    | { authenticated?: boolean; returnTo?: string }
    | AuthenticationErrorEnvelope;
  if (!response.ok) throw new AuthenticationBoundaryError(payload as AuthenticationErrorEnvelope);
  const success = payload as { authenticated?: boolean; returnTo?: string };
  if (success.authenticated !== true || typeof success.returnTo !== "string") {
    throw new Error("登录结果无效，请重新获取验证码。");
  }
  return success.returnTo;
}

export function beginAuthentication(returnTo = "/") {
  const target = new URL("/api/auth/login", window.location.origin);
  target.searchParams.set("returnTo", returnTo);
  window.location.assign(target.toString());
}

export async function signOut(): Promise<boolean> {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) {
    const payload = (await response.json()) as AuthenticationErrorEnvelope;
    throw new Error(payload.error?.message ?? "退出登录失败，请重试。");
  }
  if (response.status === 204) return false;
  const payload = (await response.json()) as LogoutResponse;
  if (typeof payload.redirectTo !== "string") {
    throw new Error("退出登录失败，请重试。");
  }
  window.location.assign(payload.redirectTo);
  return true;
}

export function authenticationErrorMessage(code: string | null) {
  if (!code) return null;
  if (code === "AUTH_SIGN_IN_CANCELLED") return "登录未完成，你可以重新尝试。";
  if (code === "ACCOUNT_LINK_REQUIRED") {
    return "该邮箱已有登录身份，请先在登录页完成账号关联。";
  }
  if (code === "ACCOUNT_PENDING") return "账户尚未开通，请验证邮箱并填写邀请码。";
  if (code === "ACCOUNT_SUSPENDED") return "账号已暂停使用，请联系站长。";
  return "登录没有完成，请重新使用邮箱验证码登录。";
}
