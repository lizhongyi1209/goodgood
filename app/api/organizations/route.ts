import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";
import {
  createOrganizationWorkspace,
  organizationApiError,
} from "@/server/organizations/api.mjs";
import { OrganizationError } from "@/server/organizations/errors.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (request.headers.get("x-goodgood-organization-action") !== "1") {
      throw new OrganizationError(
        "ORGANIZATION_CSRF_CHECK_FAILED",
        "企业管理请求未通过安全校验，请刷新后重试。",
        403,
      );
    }
    const { authenticate } = await getAuthenticationRuntime();
    const result = await createOrganizationWorkspace({
      idempotencyKey: request.headers.get("idempotency-key"),
      input: await request.json(),
      ownerContext: await authenticate(request),
    });
    return Response.json(result, {
      headers: { "cache-control": "no-store" },
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    const failure = organizationApiError(
      error instanceof SyntaxError
        ? new OrganizationError(
            "ORGANIZATION_REQUEST_INVALID",
            "企业管理请求内容无效。",
            400,
          )
        : error,
    );
    return Response.json(failure.body, {
      headers: { "cache-control": "no-store" },
      status: failure.status,
    });
  }
}
