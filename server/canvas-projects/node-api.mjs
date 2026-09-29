import {
  canvasProjectApiError, listCanvasProjects, readCanvasProject,
  readCanvasProjectJson, saveCanvasProject,
} from "./api.mjs";
import { requestIdFor } from "../observability/http.mjs";
import { workspaceIdFromRequest } from "../organizations/request.mjs";

function send(response, status, payload) {
  response.writeHead(status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

export function createCanvasProjectNodeApiHandler({ authenticate }) {
  if (typeof authenticate !== "function") throw new Error("Canvas project auth is required.");
  return async function handleCanvasProjectNodeApi(request, response) {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname !== "/api/canvas-projects" && !pathname.startsWith("/api/canvas-projects/")) return false;
    try {
      const ownerContext = await authenticate(request);
      const workspaceId = workspaceIdFromRequest(request);
      if (pathname === "/api/canvas-projects" && request.method === "GET") {
        send(response, 200, await listCanvasProjects({ ownerContext, workspaceId }));
        return true;
      }
      const match = /^\/api\/canvas-projects\/([^/]+)$/.exec(pathname);
      if (match && request.method === "GET") {
        send(response, 200, await readCanvasProject({ ownerContext, workspaceId, projectId: match[1] }));
        return true;
      }
      if (match && request.method === "PUT") {
        send(response, 200, await saveCanvasProject({
          ownerContext, workspaceId, projectId: match[1], input: await readCanvasProjectJson(request),
        }));
        return true;
      }
      send(response, 404, { error: { code: "CANVAS_PROJECT_NOT_FOUND", message: "未找到该画布项目。" } });
    } catch (error) {
      const failure = canvasProjectApiError(error, requestIdFor(request));
      send(response, failure.status, failure.body);
    }
    return true;
  };
}
