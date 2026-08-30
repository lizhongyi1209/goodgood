import {
  generationApiError,
  readGeneration,
  retryGeneration,
  submitGeneration,
} from "./api.mjs";
import {
  getGenerationResources,
  probeGenerationResources,
} from "./resources.mjs";

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

async function handleReadiness(response) {
  try {
    const checks = await probeGenerationResources(
      await getGenerationResources(),
    );
    sendJson(response, 200, {
      checks: { ...checks, runtime: "ok" },
      service: "goodgood-web",
      status: "ready",
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "web.readiness_failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    sendJson(response, 503, {
      checks: { dependencies: "unavailable", runtime: "ok" },
      service: "goodgood-web",
      status: "not_ready",
    });
  }
}

export async function handleGenerationNodeApi(request, response) {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (url.pathname === "/api/health/live") {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "method_not_allowed" }, { allow: "GET" });
      return true;
    }
    sendJson(response, 200, { service: "goodgood-web", status: "ok" });
    return true;
  }
  if (url.pathname === "/api/health/ready") {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "method_not_allowed" }, { allow: "GET" });
      return true;
    }
    await handleReadiness(response);
    return true;
  }
  if (!url.pathname.startsWith("/api/generations")) return false;

  let jobId;
  try {
    if (url.pathname === "/api/generations" && request.method === "POST") {
      const result = await submitGeneration({
        idempotencyKey: idempotencyKey(request),
        input: await readJson(request),
      });
      sendJson(response, result.created ? 202 : 200, result.job);
      return true;
    }

    const retryMatch = /^\/api\/generations\/([^/]+)\/retry$/.exec(url.pathname);
    if (retryMatch && request.method === "POST") {
      jobId = decodeURIComponent(retryMatch[1]);
      const result = await retryGeneration({
        idempotencyKey: idempotencyKey(request),
        jobId,
      });
      sendJson(response, result.created ? 202 : 200, result.job);
      return true;
    }

    const jobMatch = /^\/api\/generations\/([^/]+)$/.exec(url.pathname);
    if (jobMatch && request.method === "GET") {
      jobId = decodeURIComponent(jobMatch[1]);
      sendJson(response, 200, await readGeneration(jobId));
      return true;
    }

    sendJson(response, 405, { error: "method_not_allowed" });
    return true;
  } catch (error) {
    const failure = generationApiError(error, jobId);
    sendJson(response, failure.status, failure.body);
    return true;
  }
}
