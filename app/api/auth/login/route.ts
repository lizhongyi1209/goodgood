import { authenticationApiError } from "@/server/auth/operations.mjs";
import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { operations } = await getAuthenticationRuntime();
    const url = new URL(request.url);
    const result = await operations.beginLogin(url.searchParams.get("returnTo"));
    return new Response(null, {
      headers: {
        "cache-control": "no-store",
        location: result.location,
        "set-cookie": result.cookie,
      },
      status: 302,
    });
  } catch (error) {
    const failure = authenticationApiError(error);
    return Response.json(failure.body, {
      headers: { "cache-control": "no-store" },
      status: failure.status,
    });
  }
}
