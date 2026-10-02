import { loadAuthenticationConfig } from "@/server/auth/config.mjs";
import { createRequestAuthenticator } from "@/server/auth/request-authenticator.mjs";
import { getGenerationResources } from "@/server/generation/resources.mjs";
import { workspaceIdFromRequest } from "@/server/organizations/request.mjs";
import { prepareTextGeneration, encodeTextEvent } from "@/server/text-generation/api.mjs";
import { readTextGenerationJson } from "@/server/text-generation/validation.mjs";
import { textGenerationError } from "@/server/text-generation/errors.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const resources = await getGenerationResources();
    const ownerContext = await createRequestAuthenticator({ config: loadAuthenticationConfig(), getPool: async () => resources.pool })(request);
    const controller = new AbortController();
    const abort = () => controller.abort(request.signal.reason);
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) abort();
    const input = await readTextGenerationJson(request).catch((error: unknown) => { request.signal.removeEventListener("abort", abort); throw error; });
    const prepared = await prepareTextGeneration({ ownerContext, workspaceId: workspaceIdFromRequest(request),
      input, signal: controller.signal, resources }).catch((error: unknown) => { request.signal.removeEventListener("abort", abort); throw error; });
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(stream) {
        const heartbeat = setInterval(() => { if (!controller.signal.aborted) stream.enqueue(encoder.encode(": keep-alive\n\n")); }, 15_000);
        try {
          for await (const event of prepared.events) {
            if (controller.signal.aborted) break;
            stream.enqueue(encoder.encode(encodeTextEvent(event)));
          }
          if (!controller.signal.aborted) stream.close();
        } catch (error) {
          if (!controller.signal.aborted) { stream.enqueue(encoder.encode(encodeTextEvent({ type: "error", ...textGenerationError(error).body.error }))); stream.close(); }
        } finally { clearInterval(heartbeat); request.signal.removeEventListener("abort", abort); await prepared.cancel(); }
      },
      async cancel() { controller.abort(); await prepared.cancel(); },
    });
    return new Response(body, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store, no-transform", "x-accel-buffering": "no" } });
  } catch (error) {
    const failure = textGenerationError(error);
    return Response.json(failure.body, { status: failure.status, headers: { "cache-control": "no-store" } });
  }
}
