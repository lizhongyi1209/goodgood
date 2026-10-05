import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";
import { dispatchVideoGeneration } from "@/server/video-generation/node-api.mjs";
import { videoGenerationError, VideoGenerationError } from "@/server/video-generation/errors.mjs";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
async function handle(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const resources = await getGenerationResources();
    const ownerContext = await createRequestAuthenticator({ config: loadAuthenticationConfig(), getPool: async () => resources.pool })(request);
    const result = await dispatchVideoGeneration({ path: (await context.params).path ?? [], method: request.method, ownerContext, workspaceId: workspaceIdFromRequest(request),
      readJson: async () => {
        if (!request.body) throw new VideoGenerationError("VIDEO_INPUT_INVALID", "视频请求为空。");
        const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
        try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length;
          if (size > 64 * 1024) { await reader.cancel(); throw new VideoGenerationError("VIDEO_INPUT_TOO_LARGE", "视频请求过大。", 413); } chunks.push(value); }
          return JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } finally { reader.releaseLock(); }
      } });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { const failure = videoGenerationError(error); return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } }); }
}
export const GET = handle;
export const POST = handle;
