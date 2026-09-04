import {
  completeReferenceUpload,
  createReferenceUploads,
  referenceApiError,
} from "./api.mjs";
import { requestIdFor } from "../observability/http.mjs";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { ...JSON_HEADERS, ...headers });
  response.end(JSON.stringify(payload));
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

const DEFAULT_OPERATIONS = Object.freeze({
  completeReferenceUpload,
  createReferenceUploads,
});

export function createReferenceNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }

  return async function handleReferenceNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/references")) return false;

    let referenceId;
    try {
      const ownerContext = await authenticate(request);
      if (url.pathname === "/api/references" && request.method === "POST") {
        sendJson(
          response,
          201,
          await operations.createReferenceUploads({
            files: (await readJson(request))?.files,
            ownerContext,
          }),
        );
        return true;
      }

      const completeMatch = /^\/api\/references\/([^/]+)\/complete$/.exec(
        url.pathname,
      );
      if (completeMatch && request.method === "POST") {
        referenceId = decodeURIComponent(completeMatch[1]);
        sendJson(
          response,
          200,
          await operations.completeReferenceUpload({
            ownerContext,
            referenceId,
          }),
        );
        return true;
      }

      sendJson(response, 405, { error: "method_not_allowed" });
      return true;
    } catch (error) {
      const failure = referenceApiError(
        error,
        referenceId,
        requestIdFor(request),
      );
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
