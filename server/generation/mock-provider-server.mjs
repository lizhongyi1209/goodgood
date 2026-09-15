import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { o1keyRouteForProviderModel } from "./us-gateway-adapter.mjs";
import {
  getGptImage2PixelSize,
  isGptImageModelId,
} from "./capabilities.mjs";
import { gptPricingQualities } from "../../shared/contracts/gpt-quality-pricing.mjs";

const HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

// The mock speaks the recorded O1Key image API contract, not a GoodGood-shaped
// shortcut, so a local run exercises the real adapter's request construction,
// response normalization, and reference upload path. It resolves the model of an
// incoming request through the same O1Key route table the adapter sends from, so
// it accepts exactly the models production can address.

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

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function findMockImagePath() {
  return [
    path.resolve(process.cwd(), "public/nano-fashion.png"),
    path.resolve(process.cwd(), "dist/client/nano-fashion.png"),
  ];
}

export function createMockProviderServer({ apiKey, host, port }) {
  let readiness = "starting";
  let imageBytes;
  const tasksById = new Map();
  const tasksByIdempotencyKey = new Map();
  const uploadsById = new Map();
  let submissionCount = 0;

  function encodeTaskId(task, idempotencyKey) {
    return `mock_${Buffer.from(
      JSON.stringify({
        completionPoll: task.completionPoll,
        count: task.count,
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
        count: payload.count ?? 1,
        polls: 0,
        shouldReject: payload.outcome === "reject",
        shouldTimeout: payload.outcome === "timeout",
      };
    } catch {
      return null;
    }
  }

  // Rejects anything the real adapter would not have produced, so a drift
  // between the GoodGood payload builder and the recorded provider contract
  // fails locally instead of at the first production generation.
  function validateGenerationPayload(body) {
    const route = o1keyRouteForProviderModel(body.model);
    if (!route) return "unknown_model";
    if (typeof body.prompt !== "string" || !body.prompt) return "missing_prompt";
    if (!Array.isArray(body.images)) return "missing_images";
    for (const image of body.images) {
      if (
        typeof image?.fileData?.fileUri !== "string" ||
        typeof image?.fileData?.mimeType !== "string" ||
        !image.fileData.mimeType.startsWith("image/")
      ) {
        return "invalid_reference";
      }
      if (!uploadsById.has(image.fileData.fileUri)) {
        return "unregistered_reference";
      }
    }
    if (isGptImageModelId(route.productModelId)) {
      if (!route.outputCounts.includes(body.n)) return "invalid_output_count";
      // The adapter must send the exact pixel size the catalog defines for this
      // aspect ratio and resolution, not a bucket label or a provider default.
      const expectedSize = route.resolutions
        .map((resolution) => getGptImage2PixelSize(body.aspect_ratio, resolution))
        .find((size) => size === body.size);
      if (!expectedSize) return "invalid_size";
      if (!["auto", "transparent"].includes(body.background)) return "invalid_background";
      if (!["auto", "jpeg", "png", "webp"].includes(body.output_format)) {
        return "invalid_output_format";
      }
      const qualities = gptPricingQualities(route.productModelId).map((item) => item.id);
      if (!["auto", ...qualities].includes(body.quality)) return "invalid_quality";
      if (body.background === "transparent" && body.output_format === "jpeg") {
        return "invalid_transparency_format";
      }
      return null;
    }
    if (body.response_modalities?.join(",") !== "TEXT,IMAGE") {
      return "invalid_response_modalities";
    }
    if (!route.aspectRatios.includes(body.aspect_ratio)) return "invalid_aspect_ratio";
    if (!["1K", "2K", "4K"].includes(body.size)) return "invalid_resolution";
    if (body.thinking_level !== undefined && body.thinking_level !== "high") {
      return "invalid_thinking_level";
    }
    if (body.google_search !== undefined && typeof body.google_search !== "boolean") {
      return "invalid_google_search";
    }
    return null;
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
      if (request.method === "GET" && url.pathname === "/v1/assets/nano-fashion.png") {
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

      // Reference uploads: the adapter posts multipart and reuses the returned
      // URL as fileData.fileUri in the generation payload.
      if (request.method === "POST" && url.pathname === "/v1/o1key/uploads") {
        const raw = await readBody(request);
        const contentType = /content-type: (image\/[a-z+.-]+)/i.exec(raw.toString("latin1"))?.[1];
        if (!contentType) {
          sendJson(response, 400, { error: "missing_content_type" });
          return;
        }
        const name = /filename="([^"]*)"/i.exec(raw.toString("latin1"))?.[1] ?? "reference.png";
        const uploadUrl = `${url.origin}/v1/o1key/uploads/${uploadsById.size}?file=${encodeURIComponent(name)}`;
        uploadsById.set(uploadUrl, { contentType, name });
        sendJson(response, 200, {
          content_type: contentType,
          expires_at: Math.floor(Date.now() / 1000) + 3_600,
          filename: name,
          size: raw.length,
          url: uploadUrl,
        });
        return;
      }
      if (request.method === "GET" && url.pathname.startsWith("/v1/o1key/uploads/")) {
        sendJson(response, 200, { service: "goodgood-mock-generation", upload: url.pathname });
        return;
      }

      if (request.method === "POST" && url.pathname === "/async/v1/generateImage") {
        const body = await readJson(request);
        const invalid = validateGenerationPayload(body);
        if (invalid) {
          console.error(
            JSON.stringify({ event: "mock_generation.payload_rejected", reason: invalid }),
          );
          sendJson(response, 400, { error: invalid });
          return;
        }
        // One job fans out into several provider tasks, so the key must be
        // unique per submission; content alone would collapse them into one.
        const idempotencyKey = `${body.model}:${body.prompt}:${submissionCount}`;
        submissionCount += 1;
        const existingTaskId = tasksByIdempotencyKey.get(idempotencyKey);
        if (existingTaskId) {
          sendJson(response, 202, { task_id: existingTaskId });
          return;
        }
        const count = body.n ?? 1;
        const failurePrompt = /error|报错|失败|拒绝/i.test(body.prompt);
        const task = {
          completionPoll: /slow|慢速/i.test(body.prompt) ? 12 : 2,
          count,
          polls: 0,
          shouldReject: failurePrompt,
          shouldTimeout: /timeout|超时/i.test(body.prompt),
        };
        const taskId = encodeTaskId(task, idempotencyKey);
        tasksById.set(taskId, task);
        tasksByIdempotencyKey.set(idempotencyKey, taskId);
        sendJson(response, 202, { task_id: taskId });
        return;
      }

      const match = /^\/async\/v1\/tasks\/([^/]+)$/.exec(url.pathname);
      if (request.method === "GET" && match) {
        const taskId = decodeURIComponent(match[1]);
        const task = tasksById.get(taskId) ?? decodeTask(taskId);
        if (!task) {
          sendJson(response, 404, { error: "task_not_found" });
          return;
        }
        tasksById.set(taskId, task);
        task.polls += 1;
        if (task.shouldReject && task.polls >= 2 && task.polls < 4) {
          sendJson(response, 200, {
            error: { code: "MODEL_REJECTED", message: "content was rejected" },
            progress: 100,
            status: "FAILURE",
            task_id: taskId,
          });
          return;
        }
        if (task.shouldReject) {
          sendJson(response, 200, {
            error: { code: "MODEL_REJECTED", message: "content was rejected" },
            progress: 100,
            status: "FAILURE",
            task_id: taskId,
          });
          return;
        }
        if (task.shouldTimeout || task.polls < task.completionPoll) {
          sendJson(response, 200, {
            progress: Math.min(task.polls * 10, 90),
            status: "IN_PROGRESS",
            task_id: taskId,
          });
          return;
        }
        const image = {
          mime_type: "image/png",
          url: `${url.origin}/v1/assets/nano-fashion.png`,
        };
        sendJson(response, 200, {
          data: { images: Array.from({ length: task.count }, () => image) },
          progress: 100,
          status: "SUCCESS",
          task_id: taskId,
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
