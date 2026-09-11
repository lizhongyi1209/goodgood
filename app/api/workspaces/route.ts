import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";
import {
  organizationApiError,
  readWorkspaceDirectory,
} from "@/server/organizations/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { authenticate } = await getAuthenticationRuntime();
    return Response.json(
      await readWorkspaceDirectory({ ownerContext: await authenticate(request) }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const failure = organizationApiError(error);
    return Response.json(failure.body, {
      headers: { "cache-control": "no-store" },
      status: failure.status,
    });
  }
}
