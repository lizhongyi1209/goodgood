import {
  creationDraftApiError,
  deleteCreationDraft,
  readCreationDraft,
  saveCreationDraft,
} from "./api.mjs";
import { requestIdFor } from "../observability/http.mjs";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, JSON_HEADERS);
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
  deleteCreationDraft,
  readCreationDraft,
  saveCreationDraft,
});

export function createCreationDraftNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }
  return async function handleCreationDraftNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/draft") return false;
    try {
      const ownerContext = await authenticate(request);
      if (request.method === "GET") {
        sendJson(response, 200, await operations.readCreationDraft({ ownerContext }));
        return true;
      }
      if (request.method === "PUT") {
        sendJson(response, 200, await operations.saveCreationDraft({
          input: await readJson(request),
          ownerContext,
        }));
        return true;
      }
      if (request.method === "DELETE") {
        sendJson(response, 200, await operations.deleteCreationDraft({
          input: await readJson(request),
          ownerContext,
        }));
        return true;
      }
      sendJson(response, 405, { error: "method_not_allowed" });
      return true;
    } catch (error) {
      const failure = creationDraftApiError(error, requestIdFor(request));
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
