import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import {
  createReferenceUploads,
  listReferenceAssets,
  referenceApiError,
} from "@/server/references/api.mjs";

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
      await listReferenceAssets({ ownerContext: await ownerContext(request) }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const response = referenceApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { files?: unknown };
    return Response.json(
      await createReferenceUploads({
        files: payload.files,
        ownerContext: await ownerContext(request),
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
