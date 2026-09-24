import { requestIdFor } from "../observability/http.mjs";
import { workspaceIdFromRequest } from "../organizations/request.mjs";
import { audioMaterialApiError, completeAudioMaterialUpload, createAudioMaterialUpload,
  getAudioMaterialContentUrl, getAudioMaterialStatus, listAudioMaterials } from "./api.mjs";

const defaultOperations = Object.freeze({ completeAudioMaterialUpload, createAudioMaterialUpload,
  getAudioMaterialContentUrl, getAudioMaterialStatus, listAudioMaterials });

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

export function createAudioMaterialNodeApiHandler({ authenticate, operations = defaultOperations }) {
  if (typeof authenticate !== "function") throw new Error("An authenticated owner resolver is required.");
  return async function handleAudioMaterialNodeApi(request, response) {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (!pathname.startsWith("/api/audio-materials")) return false;
    let materialId = "";
    try {
      const ownerContext = await authenticate(request);
      const workspaceId = workspaceIdFromRequest(request);
      if (pathname === "/api/audio-materials" && request.method === "GET") {
        sendJson(response, 200, await operations.listAudioMaterials({ ownerContext, workspaceId }));
        return true;
      }
      if (pathname === "/api/audio-materials" && request.method === "POST") {
        sendJson(response, 201, await operations.createAudioMaterialUpload({ file: (await readJson(request))?.file, ownerContext, workspaceId }));
        return true;
      }
      const match = /^\/api\/audio-materials\/([^/]+)\/(complete|status|content)$/.exec(pathname);
      if (match) {
        materialId = decodeURIComponent(match[1]);
        if (match[2] === "complete" && request.method === "POST") {
          sendJson(response, 200, await operations.completeAudioMaterialUpload({ materialId, ownerContext, workspaceId }));
          return true;
        }
        if (match[2] === "status" && request.method === "GET") {
          sendJson(response, 200, await operations.getAudioMaterialStatus({ materialId, ownerContext, workspaceId }));
          return true;
        }
        if (match[2] === "content" && request.method === "GET") {
          const original = await operations.getAudioMaterialContentUrl({ materialId, ownerContext, workspaceId });
          response.writeHead(302, { "cache-control": "private, no-store", location: original.url });
          response.end();
          return true;
        }
      }
      sendJson(response, 405, { error: "method_not_allowed" });
      return true;
    } catch (error) {
      const failure = audioMaterialApiError(error, materialId, requestIdFor(request));
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
