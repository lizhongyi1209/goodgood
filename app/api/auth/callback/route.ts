import { authenticationErrorRedirect } from "@/server/auth/operations.mjs";
import { expiredAuthenticationLoginCookie } from "@/server/auth/request-authenticator.mjs";
import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let callbackFailureCookie: string | null = null;
  try {
    const { config, operations } = await getAuthenticationRuntime();
    if (config.mode === "oidc") {
      callbackFailureCookie = expiredAuthenticationLoginCookie(config);
    }
    const result = await operations.completeLogin(
      {
        code: url.searchParams.get("code"),
        error: url.searchParams.get("error"),
        state: url.searchParams.get("state"),
      },
      request,
    );
    const headers = new Headers({
      "cache-control": "no-store",
      location: new URL(result.location, url.origin).toString(),
    });
    for (const cookie of result.cookies) headers.append("set-cookie", cookie);
    return new Response(null, {
      headers,
      status: 303,
    });
  } catch (error) {
    const headers = new Headers({
      "cache-control": "no-store",
      location: new URL(authenticationErrorRedirect(error), url.origin).toString(),
    });
    if (callbackFailureCookie) {
      headers.append("set-cookie", callbackFailureCookie);
    }
    return new Response(null, {
      headers,
      status: 303,
    });
  }
}
