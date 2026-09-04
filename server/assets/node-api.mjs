import { assetApiError, listAssets } from "./api.mjs";
import { requestIdFor } from "../observability/http.mjs";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { ...JSON_HEADERS, ...headers });
  response.end(JSON.stringify(payload));
}

const DEFAULT_OPERATIONS = Object.freeze({ listAssets });

export function createAssetNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }

  return async function handleAssetNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/assets") return false;
    try {
      const ownerContext = await authenticate(request);
      if (url.pathname === "/api/assets" && request.method === "GET") {
        sendJson(response, 200, await operations.listAssets({ ownerContext }));
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
