import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { canvasProjectApiError, listCanvasProjects } from "@/server/canvas-projects/api.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const resources = await getGenerationResources();
    const ownerContext = await createRequestAuthenticator({
      config: loadAuthenticationConfig(), getPool: async () => resources.pool,
    })(request);
    return Response.json(await listCanvasProjects({
      ownerContext, workspaceId: workspaceIdFromRequest(request),
    }), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const failure = canvasProjectApiError(error);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}
