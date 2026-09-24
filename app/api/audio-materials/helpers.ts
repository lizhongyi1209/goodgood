import { audioMaterialApiError } from "@/server/audio-materials/api.mjs";
import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";

export async function audioScope(request: Request) {
  const resources = await getGenerationResources();
  return {
    ownerContext: await createRequestAuthenticator({ config: loadAuthenticationConfig(),
      getPool: async () => resources.pool })(request),
    workspaceId: workspaceIdFromRequest(request),
  };
}

export function audioFailure(error: unknown, materialId = "") {
  const failure = audioMaterialApiError(error, materialId);
  return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
}

export function audioJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } });
}
