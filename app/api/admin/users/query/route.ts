import {
  administrationApiError,
  readAdminDashboard,
} from "@/server/admin/api.mjs";
import { AdministrationError } from "@/server/admin/errors.mjs";
import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (request.headers.get("x-goodgood-admin-action") !== "1") {
      throw new AdministrationError(
        "ADMIN_CSRF_CHECK_FAILED",
        "账户管理请求未通过安全校验，请刷新后重试。",
        403,
      );
    }
    const { authenticate } = await getAuthenticationRuntime();
    return Response.json(
      await readAdminDashboard({
        input: await request.json(),
        ownerContext: await authenticate(request),
      }),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const failure = administrationApiError(
      error instanceof SyntaxError
        ? new AdministrationError(
            "ADMIN_REQUEST_INVALID",
            "账户管理请求内容无效。",
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
