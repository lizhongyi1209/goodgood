import { PRIVATE_AUDIO_UPLOAD_MAX_BYTES, PRIVATE_IMAGE_UPLOAD_MAX_BYTES, PRIVATE_VIDEO_UPLOAD_MAX_BYTES } from "../../shared/contracts/upload-limits.mjs";

/** @param {{name: string, type: string, size: number}} file */
export function canvasAssetFileError(file) {
  const formats = /** @type {Record<string, {extension: RegExp, maximum: number}>} */ ({
    "image/jpeg": { extension: /\.jpe?g$/i, maximum: PRIVATE_IMAGE_UPLOAD_MAX_BYTES },
    "image/png": { extension: /\.png$/i, maximum: PRIVATE_IMAGE_UPLOAD_MAX_BYTES },
    "video/mp4": { extension: /\.mp4$/i, maximum: PRIVATE_VIDEO_UPLOAD_MAX_BYTES },
    "audio/mpeg": { extension: /\.mp3$/i, maximum: PRIVATE_AUDIO_UPLOAD_MAX_BYTES },
  });
  const format = formats[file.type];
  if (!format || !format.extension.test(file.name)) return "仅支持 JPG/JPEG、PNG、MP4、MP3 文件。";
  if (file.size < 1 || file.size > format.maximum) return "单个文件须在 20 MB 以内，且不能为空。";
  return null;
}

/** @param {string} value */
export function canvasImageLinkUrl(value) {
  let url;
  try { url = new URL(value.trim()); }
  catch { throw new Error("请输入完整的 HTTP 或 HTTPS 图片直链。"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("请输入不含账号密码的 HTTP 或 HTTPS 图片直链。");
  }
  return url;
}

/**
 * Read validated bytes from GoodGood, then use the existing private File upload.
 * @param {string} value
 * @param {{signal?: AbortSignal, fetchImplementation?: typeof fetch, timeoutMs?: number}} [options]
 * @returns {Promise<File>}
 */
export async function downloadCanvasImageLink(value, { signal, fetchImplementation = fetch, timeoutMs = 20_000 } = {}) {
  const url = canvasImageLinkUrl(value);
  signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("Image download timed out", "TimeoutError")), timeoutMs);
  try {
    const response = await fetchImplementation("/api/references/read-link", {
      method: "POST", body: JSON.stringify({ url: url.href }), headers: { "content-type": "application/json" },
      cache: "no-store", credentials: "same-origin", mode: "same-origin", signal: controller.signal,
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      const message = failure?.error?.message;
      throw new Error(typeof message === "string" && message ? message : `图片链接无法读取（HTTP ${response.status}），请检查链接或上传文件。`);
    }
    const type = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (type !== "image/jpeg" && type !== "image/png") {
      await response.body?.cancel();
      throw new Error("链接须直接返回 JPG 或 PNG 图片，请检查链接或上传文件。");
    }
    const declaredBytes = Number(response.headers.get("content-length"));
    if (declaredBytes > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) {
      await response.body?.cancel();
      throw new Error("链接图片超过 20 MB，请选择较小的图片。");
    }
    if (!response.body) throw new Error("链接没有可读取的图片，请检查链接或上传文件。");
    const reader = response.body.getReader();
    /** @type {BlobPart[]} */
    const chunks = [];
    let bytes = 0;
    try {
      while (true) {
        controller.signal.throwIfAborted();
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("链接图片超过 20 MB，请选择较小的图片。");
        chunks.push(chunk.value.slice().buffer);
      }
    } catch (cause) {
      await reader.cancel().catch(() => {});
      throw cause;
    } finally { reader.releaseLock(); }
    if (!bytes) throw new Error("链接返回了空文件，请检查链接或上传文件。");
    const blob = new Blob(chunks, { type });
    const prefix = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const image = type === "image/jpeg"
      ? prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff
      : [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => prefix[index] === byte);
    if (!image) throw new Error("链接内容不是有效的 JPG 或 PNG 图片，请检查链接或上传文件。");
    let basename = "链接图片";
    try { basename = decodeURIComponent(url.pathname.split("/").pop() ?? "").replace(/\.[^.]*$/, "").replace(/[\\/\u0000-\u001f\u007f]/g, "").slice(0, 180) || basename; }
    catch { /* Keep the safe fallback for malformed path escaping. */ }
    return new File([blob], `${basename}.${type === "image/png" ? "png" : "jpg"}`, { type });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (controller.signal.aborted) throw new Error("读取图片超时，请重试或上传文件。");
    if (cause instanceof TypeError) throw new Error("暂时无法读取图片链接，请检查网络后重试，或改为上传文件。");
    throw cause;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
