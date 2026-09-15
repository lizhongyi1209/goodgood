export type AuthenticationMode = "login" | "register";

export const DEFAULT_AUTHENTICATION_RETURN_TO = "/create";

const AUTHENTICATION_PATHS = new Set(["/login", "/register"]);

export function safeAuthenticationReturnTo(
  value: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATION_RETURN_TO,
) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 1_000 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\u0000-\u001f\u007f\\]/.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://goodgood.invalid");
    const decodedPath = decodeURIComponent(parsed.pathname);
    const normalizedPath = decodedPath.replace(/\/+$/, "") || "/";
    if (
      parsed.origin !== "https://goodgood.invalid" ||
      decodedPath.startsWith("//") ||
      /[\u0000-\u001f\u007f\\]/.test(decodedPath) ||
      AUTHENTICATION_PATHS.has(normalizedPath)
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function authenticationEntryPath(
  mode: AuthenticationMode,
  returnTo?: string | null,
) {
  const target = new URL(`/${mode}`, "https://goodgood.invalid");
  target.searchParams.set("returnTo", safeAuthenticationReturnTo(returnTo));
  return `${target.pathname}${target.search}`;
}
