import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import {
  projectApiError,
  readProject,
  updateProject,
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

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  try {
    return Response.json(
      await readProject({
        ownerContext: await ownerContext(request),
        projectId,
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const response = projectApiError(error, projectId);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  try {
    return Response.json(
      await updateProject({
        input: await request.json(),
        ownerContext: await ownerContext(request),
        projectId,
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const response = projectApiError(error, projectId);
    return Response.json(response.body, {
      headers: { "cache-control": "no-store" },
      status: response.status,
    });
  }
}
