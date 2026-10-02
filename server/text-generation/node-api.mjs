import { workspaceIdFromRequest } from "../organizations/request.mjs";
import { prepareTextGeneration, getTextGeneration, cancelTextGeneration, encodeTextEvent } from "./api.mjs";
import { readTextGenerationJson } from "./validation.mjs";
import { textGenerationError } from "./errors.mjs";

export function createTextGenerationNodeApiHandler({ authenticate, operations = { prepareTextGeneration, getTextGeneration, cancelTextGeneration } }) {
  return async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (!pathname.startsWith("/api/text-generation/")) return false;
    const controller = new AbortController();
    const disconnect = () => { if (!response.writableEnded) controller.abort(); };
    request.once("aborted", disconnect);
    response.once("close", disconnect);
    let prepared;
    let heartbeat;
    try {
      const ownerContext = await authenticate(request);
      const workspaceId = workspaceIdFromRequest(request);
      const match = /^\/api\/text-generation\/([^/]+)$/.exec(pathname);
      const cancelMatch = /^\/api\/text-generation\/([^/]+)\/cancel$/.exec(pathname);
      if (request.method === "POST" && cancelMatch) {
        const result = await operations.cancelTextGeneration({ ownerContext, workspaceId, requestId: cancelMatch[1] });
        response.writeHead(200, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify(result));
      } else if (request.method === "GET" && match && match[1] !== "stream") {
        const result = await operations.getTextGeneration({ ownerContext, workspaceId, requestId: match[1] });
        response.writeHead(200, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify(result));
      } else if (request.method === "POST" && pathname === "/api/text-generation/stream") {
        prepared = await operations.prepareTextGeneration({ ownerContext, workspaceId, input: await readTextGenerationJson(request), signal: controller.signal });
        controller.signal.throwIfAborted();
        response.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store, no-transform", "x-accel-buffering": "no" });
        response.flushHeaders();
        heartbeat = setInterval(() => { if (!response.destroyed) response.write(": keep-alive\n\n"); }, 15_000);
        heartbeat.unref();
        for await (const event of prepared.events) {
          if (controller.signal.aborted) break;
          response.write(encodeTextEvent(event));
        }
        response.end();
      } else {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { code: "TEXT_GENERATION_NOT_FOUND", message: "未找到该文本生成接口。" } }));
      }
    } catch (error) {
      if (!controller.signal.aborted) await prepared?.fail?.();
      if (!controller.signal.aborted && !response.destroyed) {
        const failure = textGenerationError(error);
        if (!response.headersSent) {
          response.writeHead(failure.status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
          response.end(JSON.stringify(failure.body));
        } else response.end(encodeTextEvent({ type: "error", ...failure.body.error }));
      }
    } finally {
      clearInterval(heartbeat);
      request.off("aborted", disconnect);
      response.off("close", disconnect);
      await prepared?.cancel();
    }
    return true;
  };
}
