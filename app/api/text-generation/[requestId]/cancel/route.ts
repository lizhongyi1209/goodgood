import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";
import { cancelTextGeneration } from "@/server/text-generation/api.mjs";
import { textGenerationError } from "@/server/text-generation/errors.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const resources = await getGenerationResources();
    const ownerContext = await createRequestAuthenticator({ config: loadAuthenticationConfig(), getPool: async () => resources.pool })(request);
    return Response.json(await cancelTextGeneration({ ownerContext, workspaceId: workspaceIdFromRequest(request), requestId: (await context.params).requestId }),
      { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const failure = textGenerationError(error);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}
