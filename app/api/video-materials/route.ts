import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";
import { createVideoMaterialUpload, listVideoMaterials, videoMaterialApiError } from "@/server/video-materials/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ownerContext(request: Request) {
  const resources = await getGenerationResources();
  return createRequestAuthenticator({ config: loadAuthenticationConfig(),
    getPool: async () => resources.pool })(request);
}

export async function GET(request: Request) {
  try {
    return Response.json(await listVideoMaterials({ ownerContext: await ownerContext(request),
      workspaceId: workspaceIdFromRequest(request) }), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const result = videoMaterialApiError(error);
    return Response.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { file?: unknown };
    return Response.json(await createVideoMaterialUpload({ file: body?.file,
      ownerContext: await ownerContext(request), workspaceId: workspaceIdFromRequest(request) }),
    { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const result = videoMaterialApiError(error);
    return Response.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
  }
}
