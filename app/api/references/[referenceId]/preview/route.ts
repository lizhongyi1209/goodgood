import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";
import { readReferenceAssetPreview, referenceApiError } from "@/server/references/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ referenceId: string }> },
) {
  const { referenceId } = await context.params;
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(),
      getPool: async () => resources.pool,
    });
    const preview = await readReferenceAssetPreview({
      ownerContext: await authenticate(request),
      referenceId,
      workspaceId: workspaceIdFromRequest(request),
    });
    if ("redirectUrl" in preview) {
      return new Response(null, {
        status: 302,
        headers: { "cache-control": "private, no-store", location: preview.redirectUrl },
      });
    }
    return new Response(new Uint8Array(preview.bytes), {
      headers: {
        "cache-control": "private, no-store",
        "content-length": String(preview.bytes.length),
        "content-type": preview.mimeType,
      },
    });
  } catch (error) {
    const failure = referenceApiError(error, referenceId);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}
