import { requestIdFor } from "../observability/http.mjs";
import { workspaceIdFromRequest } from "../organizations/request.mjs";
import {
  completeVideoMaterialUpload, createVideoMaterialUpload, getVideoMaterialStatus,
  listVideoMaterials, videoMaterialApiError,
} from "./api.mjs";

const operations = Object.freeze({ completeVideoMaterialUpload, createVideoMaterialUpload,
  getVideoMaterialStatus, listVideoMaterials });

function sendJson(response, status, value) {
  response.writeHead(status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createVideoMaterialNodeApiHandler({ authenticate, videoOperations = operations }) {
  if (typeof authenticate !== "function") throw new Error("An authenticated owner resolver is required.");
  return async function handleVideoMaterialNodeApi(request, response) {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (!pathname.startsWith("/api/video-materials")) return false;
    let materialId = "";
    try {
      const ownerContext = await authenticate(request);
      const workspaceId = workspaceIdFromRequest(request);
      if (pathname === "/api/video-materials" && request.method === "GET") {
        sendJson(response, 200, await videoOperations.listVideoMaterials({ ownerContext, workspaceId }));
        return true;
      }
      if (pathname === "/api/video-materials" && request.method === "POST") {
        const body = await readJson(request);
        sendJson(response, 201, await videoOperations.createVideoMaterialUpload({
          file: body?.file, ownerContext, workspaceId,
        }));
        return true;
      }
      const match = /^\/api\/video-materials\/([^/]+)\/(complete|status)$/.exec(pathname);
      if (match) {
        materialId = decodeURIComponent(match[1]);
        if (match[2] === "complete" && request.method === "POST") {
          sendJson(response, 200, await videoOperations.completeVideoMaterialUpload({ materialId, ownerContext, workspaceId }));
          return true;
        }
        if (match[2] === "status" && request.method === "GET") {
          sendJson(response, 200, await videoOperations.getVideoMaterialStatus({ materialId, ownerContext, workspaceId }));
          return true;
        }
      }
      sendJson(response, 405, { error: "method_not_allowed" });
      return true;
    } catch (error) {
      const result = videoMaterialApiError(error, materialId, requestIdFor(request));
      sendJson(response, result.status, result.body);
      return true;
    }
  };
}
