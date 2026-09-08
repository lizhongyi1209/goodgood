import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import {
  readReferenceAssetContent,
  referenceApiError,
} from "@/server/references/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = Readonly<{
  params: Promise<Readonly<{ referenceId: string }>>;
}>;

export async function GET(request: Request, context: RouteContext) {
  const { referenceId } = await context.params;
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(),
      getPool: async () => resources.pool,
    });
    const content = await readReferenceAssetContent({
      ownerContext: await authenticate(request),
      referenceId,
    });
    return new Response(new Uint8Array(content.bytes), {
      headers: {
        "cache-control": "private, no-store",
        "content-length": String(content.bytes.length),
        "content-type": content.mimeType,
      },
    });
  } catch (error) {
    const response = referenceApiError(error, referenceId);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
