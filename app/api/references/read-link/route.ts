import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";
import { readReferenceImageLink, referenceApiError } from "@/server/references/api.mjs";
import { readImageLinkRequest } from "@/server/references/image-link.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(),
      getPool: async () => resources.pool,
    });
    const ownerContext = await authenticate(request);
    const workspaceId = workspaceIdFromRequest(request);
    const payload = await readImageLinkRequest(request);
    const content = await readReferenceImageLink({
      ownerContext, workspaceId, url: payload.url, signal: request.signal,
    });
    return new Response(new Uint8Array(content.bytes), {
      headers: {
        "cache-control": "private, no-store",
        "content-length": String(content.bytes.length),
        "content-type": content.mimeType,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const failure = referenceApiError(error);
    return Response.json(failure.body, {
      status: failure.status,
      headers: { "cache-control": "no-store" },
    });
  }
}
