import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import {
  completeReferenceUpload,
  referenceApiError,
} from "@/server/references/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = Readonly<{
  params: Promise<Readonly<{ referenceId: string }>>;
}>;

export async function POST(request: Request, context: RouteContext) {
  const { referenceId } = await context.params;
  try {
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(),
      getPool: async () => resources.pool,
    });
    return Response.json(
      await completeReferenceUpload({
        ownerContext: await authenticate(request),
        referenceId,
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const response = referenceApiError(error, referenceId);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
