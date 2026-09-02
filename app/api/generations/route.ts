import {
  generationApiError,
  submitGeneration,
} from "@/server/generation/api.mjs";
import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(),
      getPool: async () => resources.pool,
    });
    const result = await submitGeneration({
      idempotencyKey: request.headers.get("idempotency-key"),
      input: await request.json(),
      ownerContext: await authenticate(request),
    });
    return Response.json(result.job, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 202 : 200,
    });
  } catch (error) {
    const response = generationApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
