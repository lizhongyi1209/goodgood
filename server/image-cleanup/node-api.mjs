import { workspaceIdFromRequest } from "../organizations/request.mjs";
import { removeImageAiMetadata } from "./api.mjs";
import { imageCleanupApiError } from "./errors.mjs";
import { readImageCleanupJson } from "./validation.mjs";
function send(response, status, payload) {
  if (response.destroyed) return;
  response.writeHead(status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8", allow: "POST" });
  response.end(JSON.stringify(payload));
}
export function createImageCleanupNodeApiHandler({ authenticate, remove = removeImageAiMetadata }) {
  return async (request, response) => {
    if (new URL(request.url ?? "/", "http://localhost").pathname !== "/api/image-cleanup") return false;
    try {
      const ownerContext = await authenticate(request);
      if (request.method !== "POST") send(response, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "此操作仅支持点击处理。" } });
      else send(response, 200, await remove({ ownerContext, workspaceId: workspaceIdFromRequest(request), input: await readImageCleanupJson(request) }));
    } catch (error) { const failure = imageCleanupApiError(error); send(response, failure.status, failure.body); }
    // After an authenticated submission, disconnection is not a billing rollback.
    return true;
  };
}
