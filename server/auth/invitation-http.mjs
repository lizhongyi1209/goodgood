import { Readable } from "node:stream";
import { manageInvitations } from "./invitations.mjs";
import { administrationApiError } from "../admin/api.mjs";
import { AdministrationError } from "../admin/errors.mjs";

export async function invitationHttp(
  request,
  { authenticate, resources = null, operation = manageInvitations },
) {
  const headers = { "cache-control": "no-store" };
  try {
    if (request.method !== "POST")
      return Response.json(
        { error: "method_not_allowed" },
        { status: 405, headers: { ...headers, allow: "POST" } },
      );
    if (request.headers.get("x-goodgood-admin-action") !== "1")
      throw new AdministrationError(
        "ADMIN_CSRF_CHECK_FAILED",
        "邀请码请求未通过安全校验。",
        403,
      );
    const ownerContext = await authenticate(request);
    let size = 0;
    const chunks = [],
      reader = request.body?.getReader();
    if (reader)
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 2048)
            throw new AdministrationError(
              "ADMIN_REQUEST_INVALID",
              "邀请码请求内容过大。",
              413,
            );
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
    let input;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      throw new AdministrationError(
        "ADMIN_REQUEST_INVALID",
        "邀请码请求内容无效。",
      );
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new AdministrationError(
        "ADMIN_REQUEST_INVALID",
        "邀请码请求内容无效。",
      );
    const action = new URL(request.url).pathname.split("/").at(-1);
    return Response.json(
      await operation({
        action,
        input,
        ownerContext,
        idempotencyKey: request.headers.get("idempotency-key"),
        resources,
      }),
      { headers },
    );
  } catch (error) {
    const failure = administrationApiError(error);
    return Response.json(failure.body, { status: failure.status, headers });
  }
}
export function createInvitationNodeHandler({ authenticate }) {
  return async (request, response) => {
    if (
      !/^\/api\/admin\/invitations\/(query|create|revoke)$/.test(
        new URL(request.url, "http://local").pathname,
      )
    )
      return false;
    const method = request.method ?? "GET",
      body = ["GET", "HEAD"].includes(method)
        ? undefined
        : Readable.toWeb(request);
    const result = await invitationHttp(
      new Request("http://local" + request.url, {
        method,
        headers: request.headers,
        body,
        duplex: "half",
      }),
      { authenticate },
    );
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
    return true;
  };
}
