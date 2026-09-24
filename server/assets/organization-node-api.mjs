import { assetApiError } from "./api.mjs";
import { createAssetFolder, deleteAssetFolder, listAssetOrganization, renameAssetFolder, saveAssetOrganization } from "./organization.mjs";
import { requestIdFor } from "../observability/http.mjs";
import { workspaceIdFromRequest } from "../organizations/request.mjs";

const defaultOperations = Object.freeze({ createAssetFolder, deleteAssetFolder, listAssetOrganization, renameAssetFolder, saveAssetOrganization });

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16 * 1024) throw new Error("Asset organization request is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, status, body) {
  response.writeHead(status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

export function createAssetOrganizationNodeApiHandler({ authenticate, operations = defaultOperations }) {
  if (typeof authenticate !== "function") throw new Error("An authenticated owner resolver is required.");
  return async function handleAssetOrganizationNodeApi(request, response) {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (!pathname.startsWith("/api/asset-organization")) return false;
    try {
      const ownerContext = await authenticate(request);
      const workspaceId = workspaceIdFromRequest(request);
      const scope = { ownerContext, workspaceId };
      if (pathname === "/api/asset-organization" && request.method === "GET") {
        sendJson(response, 200, await operations.listAssetOrganization(scope));
        return true;
      }
      if (pathname === "/api/asset-organization/folders" && request.method === "POST") {
        sendJson(response, 201, await operations.createAssetFolder({ ...scope, input: await readJson(request) }));
        return true;
      }
      const folder = /^\/api\/asset-organization\/folders\/([^/]+)$/.exec(pathname);
      if (folder && request.method === "PATCH") {
        sendJson(response, 200, await operations.renameAssetFolder({ ...scope, folderId: decodeURIComponent(folder[1]), input: await readJson(request) }));
        return true;
      }
      if (folder && request.method === "DELETE") {
        sendJson(response, 200, await operations.deleteAssetFolder({ ...scope, folderId: decodeURIComponent(folder[1]) }));
        return true;
      }
      const item = /^\/api\/asset-organization\/items\/([^/]+)\/([^/]+)$/.exec(pathname);
      if (item && request.method === "PUT") {
        sendJson(response, 200, await operations.saveAssetOrganization({ ...scope, kind: decodeURIComponent(item[1]), assetId: decodeURIComponent(item[2]), input: await readJson(request) }));
        return true;
      }
      sendJson(response, 405, { error: "method_not_allowed" });
      return true;
    } catch (error) {
      const failure = assetApiError(error, requestIdFor(request));
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
