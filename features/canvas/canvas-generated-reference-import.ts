import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { workspaceRequestHeaders } from "@/features/organizations/workspace-request";
import type { GenerationReference } from "@/shared/contracts/generation";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";

type SharedImport = {
  controller: AbortController;
  consumers: number;
  promise: Promise<GenerationReference>;
};

async function importGeneratedReference(assetId: string, name: string, signal: AbortSignal): Promise<GenerationReference> {
  const response = await goodGoodApiFetch("/api/references/from-asset", {
    method: "POST",
    headers: { "content-type": "application/json", ...workspaceRequestHeaders(null) },
    body: JSON.stringify({ assetId }),
    signal,
  });
  const payload = await response.json() as { id?: string; name?: string; status?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "无法将生成图片用作参考图，请重试。");
  if (payload.status !== "ready" || !payload.id) throw new Error("参考图还未准备好，请重试。");
  return { id: payload.id, name: payload.name ?? name, url: privateImageUrls("reference", payload.id).contentUrl, status: "ready" };
}

/** Scoped to one canvas identity; each edge owns a cancellable subscription. */
export function createCanvasGeneratedReferenceImporter() {
  const ready = new Map<string, GenerationReference>();
  const pending = new Map<string, SharedImport>();
  let cacheGeneration = 0;

  return {
    read(assetId: string, name: string, signal: AbortSignal): Promise<GenerationReference> {
      signal.throwIfAborted();
      const cached = ready.get(assetId);
      if (cached) return Promise.resolve(cached);

      let request = pending.get(assetId);
      if (!request) {
        const controller = new AbortController();
        const generation = cacheGeneration;
        const created: SharedImport = { controller, consumers: 0, promise: importGeneratedReference(assetId, name, controller.signal) };
        created.promise = created.promise.then((reference) => {
          if (!controller.signal.aborted && generation === cacheGeneration) ready.set(assetId, reference);
          return reference;
        }).finally(() => {
          if (pending.get(assetId) === created) pending.delete(assetId);
        });
        pending.set(assetId, created);
        request = created;
      }

      const shared = request;
      shared.consumers += 1;
      return new Promise((resolve, reject) => {
        let released = false;
        const release = () => {
          if (released) return;
          released = true;
          signal.removeEventListener("abort", abort);
          shared.consumers -= 1;
          if (shared.consumers === 0 && pending.get(assetId) === shared) {
            pending.delete(assetId);
            shared.controller.abort();
          }
        };
        const abort = () => {
          release();
          reject(signal.reason ?? new DOMException("Reference import cancelled", "AbortError"));
        };
        signal.addEventListener("abort", abort, { once: true });
        // Always handle the shared rejection, including when the edge was just cancelled.
        shared.promise.then((reference) => { release(); resolve(reference); }, (cause) => { release(); reject(cause); });
        if (signal.aborted) abort();
      });
    },
    clearReady() {
      cacheGeneration += 1;
      ready.clear();
    },
    dispose() {
      cacheGeneration += 1;
      for (const request of pending.values()) request.controller.abort();
      pending.clear();
      ready.clear();
    },
  };
}
