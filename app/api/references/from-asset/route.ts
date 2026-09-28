import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";
import { createReferenceFromGeneratedAsset, referenceApiError } from "@/server/references/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(),
      getPool: async () => resources.pool,
    });
    const payload = await request.json().catch(() => null) as { assetId?: unknown } | null;
    return Response.json(await createReferenceFromGeneratedAsset({
      assetId: payload?.assetId,
      ownerContext: await authenticate(request),
      workspaceId: workspaceIdFromRequest(request),
    }), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const failure = referenceApiError(error);
    return Response.json(failure.body, {
      status: failure.status,
      headers: { "cache-control": "no-store" },
    });
  }
}
