import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import {
  createReferenceUploads,
  referenceApiError,
} from "@/server/references/api.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { files?: unknown };
    const resources = await getGenerationResources();
    const authenticate = createRequestAuthenticator({
      config: loadAuthenticationConfig(),
      getPool: async () => resources.pool,
    });
    return Response.json(
      await createReferenceUploads({
        files: payload.files,
        ownerContext: await authenticate(request),
      }),
      { headers: { "cache-control": "no-store" }, status: 201 },
    );
  } catch (error) {
    const response = referenceApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
