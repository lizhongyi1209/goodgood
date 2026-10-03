import { getAuthenticationRuntime } from "../auth/runtime-operations.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { handleAnnouncementsHttp } from "./http.mjs";
import { announcementApiError } from "./policy.mjs";
export async function announcementsRoute(request) {
  try {
    const { authenticateSession } = await getAuthenticationRuntime();
    return await handleAnnouncementsHttp(request, { authenticateSession, resources: await getGenerationResources() });
  } catch (error) { const failure = announcementApiError(error); return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } }); }
}
