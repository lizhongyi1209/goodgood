export const SESSION_EXPIRED_EVENT = "goodgood:session-expired";

export type AuthenticationSession = Readonly<{
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
  }>;
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
  if (code === "ACCOUNT_DISABLED") return "当前账号暂不可用，请联系支持。";
  return "登录没有完成，请重新使用 Google 或邮箱验证码登录。";
}
