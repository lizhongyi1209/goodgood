import {
  createProject,
  listProjects,
  projectApiError,
  readProject,
  updateProject,
} from "./api.mjs";

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

function idempotencyKey(request) {
  const value = request.headers["idempotency-key"];
  return Array.isArray(value) ? value[0] : value;
}

const DEFAULT_OPERATIONS = Object.freeze({
  createProject,
  listProjects,
  readProject,
  updateProject,
});

export function createProjectNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }

  return async function handleProjectNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/projects")) return false;
    let projectId;
    try {
      const ownerContext = await authenticate(request);
      if (url.pathname === "/api/projects" && request.method === "GET") {
        sendJson(response, 200, await operations.listProjects({ ownerContext }));
        return true;
      }
      if (url.pathname === "/api/projects" && request.method === "POST") {
        sendJson(
          response,
          201,
          await operations.createProject({
            idempotencyKey: idempotencyKey(request),
            input: await readJson(request),
            ownerContext,
          }),
        );
        return true;
      }

      const match = /^\/api\/projects\/([^/]+)$/.exec(url.pathname);
      if (match) {
        projectId = decodeURIComponent(match[1]);
        if (request.method === "GET") {
          sendJson(
            response,
            200,
            await operations.readProject({ ownerContext, projectId }),
          );
          return true;
        }
        if (request.method === "PATCH") {
          sendJson(
            response,
            200,
            await operations.updateProject({
              input: await readJson(request),
              ownerContext,
              projectId,
            }),
          );
          return true;
        }
      }

      sendJson(response, 405, { error: "method_not_allowed" });
      return true;
    } catch (error) {
      const failure = projectApiError(error, projectId);
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
