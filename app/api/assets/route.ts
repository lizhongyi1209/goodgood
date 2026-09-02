import { assetApiError, listAssets } from "@/server/assets/api.mjs";
import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ownerContext(request: Request) {
  const resources = await getGenerationResources();
  return createRequestAuthenticator({
    config: loadAuthenticationConfig(),
    getPool: async () => resources.pool,
  })(request);
}

export async function GET(request: Request) {
  try {
    return Response.json(
      await listAssets({ ownerContext: await ownerContext(request) }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const response = assetApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
