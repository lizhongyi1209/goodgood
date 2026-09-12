import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";
import {
  acceptInvitation,
  organizationApiError,
} from "@/server/organizations/api.mjs";
import { OrganizationError } from "@/server/organizations/errors.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ invitationId: string }> },
) {
  const { invitationId } = await context.params;
  try {
    if (request.headers.get("x-goodgood-organization-action") !== "1") {
      throw new OrganizationError(
        "ORGANIZATION_CSRF_CHECK_FAILED",
        "企业管理请求未通过安全校验，请刷新后重试。",
        403,
      );
    }
    const { authenticate } = await getAuthenticationRuntime();
    const result = await acceptInvitation({
      idempotencyKey: request.headers.get("idempotency-key"),
      invitationId,
      ownerContext: await authenticate(request),
    });
    return Response.json(result, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    const failure = organizationApiError(error);
    return Response.json(failure.body, {
      headers: { "cache-control": "no-store" },
      status: failure.status,
    });
  }
}
