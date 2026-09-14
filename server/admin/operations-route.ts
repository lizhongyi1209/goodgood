import { administrationApiError } from "./api.mjs";
import { AdministrationError } from "./errors.mjs";
import { readSiteOperations } from "./operations.mjs";
import { getAuthenticationRuntime } from "@/server/auth/runtime-operations.mjs";

export function operationsPost(action: "dashboard" | "logs" | "detail") {
  return async function POST(request: Request) {
    const headers = { "cache-control": "no-store" };
    try {
      if (request.headers.get("x-goodgood-admin-action") !== "1") throw new AdministrationError("ADMIN_CSRF_CHECK_FAILED","管理请求未通过安全校验，请刷新后重试。",403);
      const { authenticate } = await getAuthenticationRuntime();
      const ownerContext = await authenticate(request);
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > 32768) throw new AdministrationError("ADMIN_REQUEST_INVALID","查询内容过大。",400);
      return Response.json(await readSiteOperations({ action, input: JSON.parse(body), ownerContext }), { headers });
    } catch (error) {
      const failure = administrationApiError(error instanceof SyntaxError ? new AdministrationError("ADMIN_REQUEST_INVALID","查询内容无效。",400) : error);
      return Response.json(failure.body,{headers,status:failure.status});
    }
  };
}
