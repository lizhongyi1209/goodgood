import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";
import { completeVideoMaterialUpload, videoMaterialApiError } from "@/server/video-materials/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await context.params;
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({ config: loadAuthenticationConfig(),
      getPool: async () => resources.pool });
    return Response.json(await completeVideoMaterialUpload({ materialId,
      ownerContext: await authenticate(request), workspaceId: workspaceIdFromRequest(request) }),
    { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const result = videoMaterialApiError(error, materialId);
    return Response.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
  }
}
