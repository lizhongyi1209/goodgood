import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";
import { readReferenceAssetPreview, referenceApiError } from "@/server/references/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ referenceId: string }> }) {
  const { referenceId } = await context.params;
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({ config: loadAuthenticationConfig(), getPool: async () => resources.pool });
    const preview = await readReferenceAssetPreview({ referenceId, ownerContext: await authenticate(request),
      workspaceId: workspaceIdFromRequest(request), canvasPreview: true });
    if ("redirectUrl" in preview) throw new Error("Canvas previews must return bounded image bytes.");
    return new Response(new Uint8Array(preview.bytes), { headers: {
      "cache-control": "private, no-store", "content-type": preview.mimeType, "content-length": String(preview.bytes.length),
    } });
  } catch (error) {
    const failure = referenceApiError(error, referenceId);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}
