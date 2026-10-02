import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";

type Entry = { users: number; controller: AbortController; promise: Promise<string>; objectUrl?: string };

async function previewBlob(src: string, edge: 512 | 2048, signal: AbortSignal) {
  const local = src.startsWith("blob:") || src.startsWith("data:");
  const response = local ? await fetch(src, { signal }) : await goodGoodApiFetch(src, { signal, credentials: "same-origin" });
  if (!response.ok) throw new Error("图片预览暂不可用。");
  const blob = await response.blob();
  signal.throwIfAborted();
  if (!local) return blob; // The authenticated server guarantees the fixed pixel cap.
  const bitmap = await createImageBitmap(blob);
  try {
    signal.throwIfAborted();
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("图片预览暂不可用。");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("图片预览暂不可用。")), "image/webp", edge === 2048 ? .9 : .8));
  } finally { bitmap.close(); }
}

/** One canvas identity; callers retain a handle while its decoded URL is displayed. */
export function createCanvasImagePreviewPool() {
  const entries = new Map<string, Entry>();
  const waiting: Array<() => void> = [];
  let running = 0;
  const trim = () => {
    const idle = [...entries].filter(([, entry]) => entry.users === 0 && entry.objectUrl);
    for (const [key, entry] of idle.slice(0, Math.max(0, idle.length - 8))) {
      URL.revokeObjectURL(entry.objectUrl!); entries.delete(key);
    }
  };
  async function load(src: string, edge: 512 | 2048, signal: AbortSignal) {
    if (running >= 3) await new Promise<void>((resolve, reject) => {
      const start = () => { signal.removeEventListener("abort", abort); running += 1; resolve(); };
      const abort = () => { const index = waiting.indexOf(start); if (index >= 0) waiting.splice(index, 1); reject(signal.reason); };
      waiting.push(start); signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    else running += 1;
    try {
      signal.throwIfAborted();
      const blob = await previewBlob(src, edge, signal);
      signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image(); image.decoding = "async"; image.src = url;
        await image.decode(); signal.throwIfAborted();
        return url;
      } catch (cause) { URL.revokeObjectURL(url); throw cause; }
    } finally { running -= 1; waiting.shift()?.(); }
  }
  return {
    acquire(src: string, edge: 512 | 2048) {
      const key = `${edge}:${src}`;
      let entry = entries.get(key);
      if (!entry) {
        const controller = new AbortController();
        const created: Entry = { users: 0, controller, promise: load(src, edge, controller.signal) };
        created.promise = created.promise.then((url) => {
          if (controller.signal.aborted) { URL.revokeObjectURL(url); controller.signal.throwIfAborted(); }
          created.objectUrl = url; return url;
        }).catch((cause) => {
          if (entries.get(key) === created) entries.delete(key); throw cause;
        });
        entries.set(key, created); entry = created;
      }
      entries.delete(key); entries.set(key, entry); entry.users += 1;
      const retained = entry;
      let released = false;
      return { promise: retained.promise, release() {
        if (released) return; released = true; retained.users -= 1;
        if (retained.users === 0 && !retained.objectUrl) { retained.controller.abort(); if (entries.get(key) === retained) entries.delete(key); }
        trim();
      } };
    },
    dispose() {
      for (const entry of entries.values()) { entry.controller.abort(); if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl); }
      entries.clear();
    },
  };
}
