import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import {
  createProject,
  listProjects,
  projectApiError,
} from "@/server/projects/api.mjs";

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
      await listProjects({ ownerContext: await ownerContext(request) }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const response = projectApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}

export async function POST(request: Request) {
  try {
    return Response.json(
      await createProject({
        idempotencyKey: request.headers.get("idempotency-key"),
        input: await request.json(),
        ownerContext: await ownerContext(request),
      }),
      { headers: { "cache-control": "no-store" }, status: 201 },
    );
  } catch (error) {
    const response = projectApiError(error);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
