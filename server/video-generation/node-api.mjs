import { workspaceIdFromRequest } from "../organizations/request.mjs";
import { quoteVideoGeneration, submitVideoGeneration, getVideoGeneration, getVideoGenerationDownload, getVideoGenerationCapabilities, retryVideoSave, retryVideoGeneration } from "./api.mjs";
import { readVideoGenerationJson } from "./validation.mjs";
import { videoGenerationError, VideoGenerationError } from "./errors.mjs";
export async function dispatchVideoGeneration({ path, method, readJson, ownerContext, workspaceId }) {
  const context = { ownerContext, workspaceId };
  if (path.length === 1 && path[0] === "capabilities" && method === "GET") return getVideoGenerationCapabilities(context);
  if (path.length === 1 && path[0] === "quote" && method === "POST") return quoteVideoGeneration({ ...context, input: await readJson() });
  if (!path.length && method === "POST") return submitVideoGeneration({ ...context, input: await readJson() });
  if (path.length === 1 && method === "GET") return getVideoGeneration({ ...context, requestId: path[0] });
  if (path.length === 2 && path[1] === "download" && method === "GET") return getVideoGenerationDownload({ ...context, requestId: path[0] });
  if (path.length === 2 && path[1] === "retry-save" && method === "POST") return retryVideoSave({ ...context, requestId: path[0] });
  if (path.length === 2 && path[1] === "retry" && method === "POST") return retryVideoGeneration({ ...context, requestId: path[0], input: await readJson() });
  throw new VideoGenerationError("VIDEO_NOT_FOUND", "未找到该视频生成接口。", 404);
}
export function createVideoGenerationNodeApiHandler({ authenticate }) {
  return async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname !== "/api/video-generation" && !pathname.startsWith("/api/video-generation/")) return false;
    try {
      const result = await dispatchVideoGeneration({ path: pathname.slice("/api/video-generation".length).split("/").filter(Boolean), method: request.method,
        readJson: () => readVideoGenerationJson(request), ownerContext: await authenticate(request), workspaceId: workspaceIdFromRequest(request) });
      response.writeHead(200, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(result));
    } catch (error) {
      const failure = videoGenerationError(error); response.writeHead(failure.status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(failure.body));
    }
    return true;
  };
}
