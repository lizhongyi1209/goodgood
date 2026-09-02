import {
  generationApiError,
  readGeneration,
} from "@/server/generation/api.mjs";
import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(),
      getPool: async () => resources.pool,
    });
    return Response.json(
      await readGeneration({
        jobId,
        ownerContext: await authenticate(request),
      }),
      {
        headers: { "cache-control": "no-store" },
      },
    );
  } catch (error) {
    const response = generationApiError(error, jobId);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
