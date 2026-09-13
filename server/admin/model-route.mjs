import { getAuthenticationRuntime } from "../auth/runtime-operations.mjs";
import { administrationApiError } from "./api.mjs";
import { AdministrationError } from "./errors.mjs";
import { readManagedModels, saveManagedModel } from "./models.mjs";

export async function modelRoute(request, action) {
  try {
    if (
      action !== "directory" &&
      request.headers.get("x-goodgood-admin-action") !== "1"
    ) {
      throw new AdministrationError(
        "ADMIN_CSRF_CHECK_FAILED",
        "管理请求未通过安全校验，请刷新后重试。",
        403,
      );
    }
    const runtime = await getAuthenticationRuntime();
    const ownerContext = await runtime.authenticate(request);
    const input = action === "directory" ? null : await request.json();
    const payload =
      action === "save"
        ? await saveManagedModel({ ownerContext, input })
        : await readManagedModels({
            ownerContext,
            publicDirectory: action === "directory",
          });
    return Response.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const failure = administrationApiError(
      error instanceof SyntaxError
        ? new AdministrationError("MODEL_REQUEST_INVALID", "请求内容无效。")
        : error,
    );
    return Response.json(failure.body, {
      status: failure.status,
      headers: { "cache-control": "no-store" },
    });
  }
}
