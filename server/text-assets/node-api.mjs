import { AssetRequestError } from "../assets/api.mjs";
import { requestIdFor } from "../observability/http.mjs";
import { workspaceIdFromRequest } from "../organizations/request.mjs";
import { createTextAsset, deleteTextAsset, getTextAsset, listTextAssets, textAssetApiError } from "./api.mjs";
const defaultOperations = { createTextAsset, deleteTextAsset, getTextAsset, listTextAssets };
function send(response, status, body) { response.writeHead(status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(body)); }
async function readJson(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > 512 * 1024) throw new AssetRequestError("TEXT_ASSET_TOO_LARGE", "文本模板请求过大。", 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AssetRequestError("TEXT_ASSET_INVALID", "文本模板请求无效。", 400); }
}
export function createTextAssetNodeApiHandler({ authenticate, operations = defaultOperations }) {
  return async (request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path !== "/api/text-assets" && !path.startsWith("/api/text-assets/")) return false;
    try {
      const scope = { ownerContext: await authenticate(request), workspaceId: workspaceIdFromRequest(request) };
      const item = /^\/api\/text-assets\/([^/]+)$/.exec(path);
      if (path === "/api/text-assets" && request.method === "GET") send(response, 200, await operations.listTextAssets(scope));
      else if (path === "/api/text-assets" && request.method === "POST") send(response, 201, await operations.createTextAsset({ ...scope, input: await readJson(request) }));
      else if (item && request.method === "GET") send(response, 200, await operations.getTextAsset({ ...scope, assetId: decodeURIComponent(item[1]) }));
      else if (item && request.method === "DELETE") send(response, 200, await operations.deleteTextAsset({ ...scope, assetId: decodeURIComponent(item[1]) }));
      else send(response, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "此操作不受支持。" } });
    } catch (error) { const failure = textAssetApiError(error, requestIdFor(request)); send(response, failure.status, failure.body); }
    return true;
  };
}

