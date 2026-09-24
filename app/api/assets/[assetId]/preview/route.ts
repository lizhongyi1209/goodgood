import { assetApiError, readAssetPreview } from "@/server/assets/api.mjs";
import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params;
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(),
      getPool: async () => resources.pool,
    });
    const preview = await readAssetPreview({
      assetId,
      ownerContext: await authenticate(request),
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
    const failure = assetApiError(error);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}
