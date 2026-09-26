import { assetApiError, deleteUploadedAsset } from "@/server/assets/api.mjs";
import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ kind: string; assetId: string }> }) {
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(), getPool: async () => resources.pool,
    });
    const { kind, assetId } = await context.params;
    return Response.json(await deleteUploadedAsset({ kind, assetId,
      ownerContext: await authenticate(request), workspaceId: workspaceIdFromRequest(request) }),
    { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const failure = assetApiError(error);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}
