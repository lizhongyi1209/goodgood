import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { ...HEADERS, ...headers });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function findMockImagePath() {
  const candidates = [
    path.resolve(process.cwd(), "public/nano-fashion.png"),
    path.resolve(process.cwd(), "dist/client/nano-fashion.png"),
  ];
  return candidates;
}

export function createMockProviderServer({ apiKey, host, port }) {
  let readiness = "starting";
  let imageBytes;
  const tasksById = new Map();
  const tasksByIdempotencyKey = new Map();

  function encodeTaskId(task, idempotencyKey) {
    return `mock_${Buffer.from(
      JSON.stringify({
        completionPoll: task.completionPoll,
        idempotencyKey,
        outcome: task.shouldTimeout
          ? "timeout"
          : task.shouldReject
            ? "reject"
            : "success",
      }),
    ).toString("base64url")}`;
  }

  function decodeTask(taskId) {
    if (!taskId.startsWith("mock_")) return null;
    try {
      const payload = JSON.parse(
        Buffer.from(taskId.slice(5), "base64url").toString("utf8"),
      );
      return {
        completionPoll: payload.completionPoll,
        polls: 0,
        shouldReject: payload.outcome === "reject",
        shouldTimeout: payload.outcome === "timeout",
      };
    } catch {
      return null;
    }
  }

  const server = createServer(async (request, response) => {
    try {
      const requestOrigin = `http://${request.headers.host ?? "127.0.0.1"}`;
      const url = new URL(request.url ?? "/", requestOrigin);
      if (request.method === "GET" && url.pathname === "/health/live") {
        sendJson(response, 200, { service: "goodgood-mock-generation", status: "ok" });
        return;
      }
      if (request.method === "GET" && url.pathname === "/health/ready") {
        const ready = readiness === "ready";
        sendJson(response, ready ? 200 : 503, {
          checks: { runtime: ready ? "ok" : readiness },
          service: "goodgood-mock-generation",
          status: ready ? "ready" : "not_ready",
        });
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname === "/v1/assets/nano-fashion.png"
      ) {
        response.writeHead(200, {
          "cache-control": "public, max-age=3600",
          "content-length": imageBytes.length,
          "content-type": "image/png",
        });
        response.end(imageBytes);
        return;
      }
      if (request.headers.authorization !== `Bearer ${apiKey}`) {
        sendJson(response, 401, { error: "unauthorized" });
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/generations") {
        const body = await readJson(request);
        if (body.modelId !== "nano-banana-2") {
          sendJson(response, 400, { error: "unsupported_model" });
          return;
        }
        const existingTaskId = tasksByIdempotencyKey.get(body.idempotencyKey);
        if (existingTaskId) {
          sendJson(response, 200, { state: "queued", taskId: existingTaskId });
          return;
        }
        const prompt = String(body.prompt ?? "");
        const shouldTimeout = /timeout|超时/i.test(prompt);
        const completionPoll = /slow|慢速/i.test(prompt) ? 12 : 3;
        const failurePrompt = /error|报错|失败|拒绝/i.test(prompt);
        const shouldReject = failurePrompt && !body.retryOfJobId;
        const task = {
          polls: 0,
          completionPoll,
          shouldReject,
          shouldTimeout,
        };
        const taskId = encodeTaskId(task, body.idempotencyKey);
        tasksById.set(taskId, task);
        tasksByIdempotencyKey.set(body.idempotencyKey, taskId);
        sendJson(response, 202, { state: "queued", taskId });
        return;
      }

      const match = /^\/v1\/generations\/([^/]+)$/.exec(url.pathname);
      if (request.method === "GET" && match) {
        const taskId = decodeURIComponent(match[1]);
        const task = tasksById.get(taskId) ?? decodeTask(taskId);
        if (!task) {
          sendJson(response, 404, { error: "task_not_found" });
          return;
        }
        tasksById.set(taskId, task);
        task.polls += 1;
        if (task.shouldReject && task.polls >= 2) {
          sendJson(response, 200, {
            error: { code: "MODEL_REJECTED", retryable: true },
            state: "failed",
          });
          return;
        }
        if (task.shouldTimeout || task.polls < task.completionPoll) {
          sendJson(response, 200, { state: "processing" });
          return;
        }
        sendJson(response, 200, {
          output: {
            height: 1402,
            mimeType: "image/png",
            url: `${url.origin}/v1/assets/nano-fashion.png`,
            width: 1122,
          },
          state: "succeeded",
        });
        return;
      }
      sendJson(response, 404, { error: "not_found" });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "bad_request",
      });
    }
  });

  return {
    address() {
      return server.address();
    },
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
    async listen() {
      for (const candidate of findMockImagePath()) {
        try {
          imageBytes = await readFile(candidate);
          break;
        } catch {}
      }
      if (!imageBytes) throw new Error("Mock generation image is missing.");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          resolve();
        });
      });
      readiness = "ready";
      return server.address();
    },
    markNotReady(reason = "stopping") {
      readiness = reason;
    },
  };
}
