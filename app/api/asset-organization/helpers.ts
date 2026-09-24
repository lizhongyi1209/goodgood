import { assetApiError } from "@/server/assets/api.mjs";
import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";

export async function organizationScope(request: Request) {
  const resources = await getGenerationResources();
  const ownerContext = await createRequestAuthenticator({
    config: loadAuthenticationConfig(), getPool: async () => resources.pool,
  })(request);
  return { ownerContext, workspaceId: workspaceIdFromRequest(request) };
}

export function assetOrganizationFailure(error: unknown) {
  const failure = assetApiError(error);
  return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
}

export function assetOrganizationJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } });
}
