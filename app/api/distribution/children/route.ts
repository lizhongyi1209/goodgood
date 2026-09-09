import {
  distributionApiError,
  readDistributionChildren,
} from "@/server/distribution/api.mjs";
import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { authenticate } = await getAuthenticationRuntime();
    return Response.json(
      await readDistributionChildren({
        ownerContext: await authenticate(request),
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const failure = distributionApiError(error);
    return Response.json(failure.body, {
      headers: { "cache-control": "no-store" },
      status: failure.status,
    });
  }
}
