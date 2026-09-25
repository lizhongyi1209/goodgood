import { assetApiError, deleteGeneratedAsset, getAssetDownloadUrl, listAssets, readAssetPreview } from "./api.mjs";
import { requestIdFor } from "../observability/http.mjs";
import { workspaceIdFromRequest } from "../organizations/request.mjs";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { ...JSON_HEADERS, ...headers });
  response.end(JSON.stringify(payload));
}

const DEFAULT_OPERATIONS = Object.freeze({ deleteGeneratedAsset, getAssetDownloadUrl, listAssets, readAssetPreview });

export function createAssetNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }

  return async function handleAssetNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    const downloadUrlMatch = url.pathname.match(
      /^\/api\/assets\/([^/]+)\/download-url$/,
    );
    const previewMatch = url.pathname.match(/^\/api\/assets\/([^/]+)\/preview$/);
    const contentMatch = url.pathname.match(/^\/api\/assets\/([^/]+)\/content$/);
    const assetMatch = url.pathname.match(/^\/api\/assets\/([^/]+)$/);
    if (url.pathname !== "/api/assets" && !downloadUrlMatch && !previewMatch && !contentMatch && !assetMatch) return false;
    try {
      const ownerContext = await authenticate(request);
      const workspaceId = workspaceIdFromRequest(request);
      if (contentMatch && request.method === "GET") {
        const original = await operations.getAssetDownloadUrl({
          assetId: decodeURIComponent(contentMatch[1]),
          ownerContext,
          workspaceId,
        });
        response.writeHead(302, { "cache-control": "private, no-store", location: original.url });
        response.end();
        return true;
      }
      if (previewMatch && request.method === "GET") {
        const preview = await operations.readAssetPreview({
          assetId: decodeURIComponent(previewMatch[1]),
          ownerContext,
          workspaceId,
        });
        if (preview.redirectUrl) {
          response.writeHead(302, { "cache-control": "private, no-store", location: preview.redirectUrl });
          response.end();
        } else {
          response.writeHead(200, {
            "cache-control": "private, no-store",
            "content-length": String(preview.bytes.length),
            "content-type": preview.mimeType,
          });
          response.end(preview.bytes);
        }
        return true;
      }
      if (downloadUrlMatch && request.method === "GET") {
        sendJson(
          response,
          200,
          await operations.getAssetDownloadUrl({
            assetId: downloadUrlMatch[1],
            ownerContext,
            workspaceId,
          }),
        );
        return true;
      }
      if (url.pathname === "/api/assets" && request.method === "GET") {
        sendJson(
          response,
          200,
          await operations.listAssets({ ownerContext, workspaceId }),
        );
        return true;
      }
      if (assetMatch && request.method === "DELETE") {
        sendJson(
          response,
          200,
          await operations.deleteGeneratedAsset({
            assetId: decodeURIComponent(assetMatch[1]),
            ownerContext,
            workspaceId,
          }),
        );
        return true;
      }
      sendJson(
        response,
        405,
        { error: "method_not_allowed" },
        { allow: "GET" },
      );
      return true;
    } catch (error) {
      const failure = assetApiError(error, requestIdFor(request));
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
