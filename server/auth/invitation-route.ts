import { getAuthenticationRuntime } from "./runtime-operations.mjs";
import { invitationHttp } from "./invitation-http.mjs";
export async function invitationRoute(request: Request) {
  const { authenticate } = await getAuthenticationRuntime();
  return invitationHttp(request, { authenticate });
}
