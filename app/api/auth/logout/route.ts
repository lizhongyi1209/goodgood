import { authenticationApiError } from "@/server/auth/operations.mjs";
import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { operations } = await getAuthenticationRuntime();
    const result = await operations.signOut(request);
    if (result.location) {
      return Response.json(
        { redirectTo: result.location },
        {
          headers: { "cache-control": "no-store", "set-cookie": result.cookie },
          status: 200,
        },
      );
    }
    return new Response(null, {
      headers: { "cache-control": "no-store", "set-cookie": result.cookie },
      status: 204,
    });
  } catch (error) {
    const failure = authenticationApiError(error);
    return Response.json(failure.body, {
      headers: { "cache-control": "no-store" },
      status: failure.status,
    });
  }
}
