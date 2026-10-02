import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { imageDownloadFilename } from "@/features/assets/image-download";
import { PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "@/shared/contracts/upload-limits.mjs";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import type { CanvasNode } from "./canvas-workspace";
import type { CanvasCropRect } from "./canvas-image-crop-model";

export type CanvasCropImage = Readonly<{ nodeId: string; imageId: string; key: string; name: string; contentUrl: string }>;
export type CanvasCropRequest = CanvasCropImage & Readonly<{ pageId: string; sessionId: string }>;
export type CanvasCropCommit = Readonly<{ request: CanvasCropRequest; file: File; width: number; height: number }>;

export function canvasCropImageForNode(node: CanvasNode | undefined, imageId?: string): CanvasCropImage | null {
  if (node?.type === "sourceImage") {
    if (!node.data.assetId || node.data.uploadState || !node.data.imageSized) return null;
    const kind = node.data.assetKind === "generated" ? "asset" : "reference";
    return { nodeId: node.id, imageId: node.data.assetId, key: `${kind}:${node.data.assetId}`, name: node.data.name,
      contentUrl: privateImageUrls(kind, node.data.assetId).contentUrl };
  }
  const job = node?.type === "imageResult" || node?.type === "imageGenerator" ? node.data.job : null;
  if (!node || !job || job.state !== "succeeded") return null;
  const output = node.type === "imageResult" ? job.outputs[node.data.index]
    : job.outputs.find((item) => item.id === imageId) ?? job.outputs[0];
  if (!output?.id) return null;
  return { nodeId: node.id, imageId: output.id, key: `asset:${output.id}`, name: imageDownloadFilename(job.createdAt, job.outputs.indexOf(output) + 1, output.previewUrl),
    contentUrl: privateImageUrls("asset", output.id).contentUrl };
}

export async function loadCanvasCropImage(url: string, signal: AbortSignal) {
  const response = await goodGoodApiFetch(url, { credentials: "same-origin", mode: "cors", signal });
  if (!response.ok) throw new Error("原图读取失败，请重试。");
  const blob = await response.blob();
  signal.throwIfAborted();
  if (!blob.size) throw new Error("原图内容为空，请重试。");
  const objectUrl = URL.createObjectURL(blob);
  const image = new window.Image();
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { image.src = ""; reject(new DOMException("Aborted", "AbortError")); };
      signal.addEventListener("abort", abort, { once: true });
      const finish = (error?: Error) => {
        signal.removeEventListener("abort", abort);
        image.onload = null;
        image.onerror = null;
        if (error) reject(error); else resolve();
      };
      image.onload = () => finish();
      image.onerror = () => finish(new Error("原图无法解码，请重试。"));
      image.src = objectUrl;
      if (signal.aborted) abort();
    });
    signal.throwIfAborted();
    return { image, objectUrl, dispose: () => { image.src = ""; URL.revokeObjectURL(objectUrl); } };
  } catch (cause) {
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(objectUrl);
    throw cause;
  }
}

export async function exportCanvasCrop(image: HTMLImageElement, crop: CanvasCropRect, name: string, signal: AbortSignal): Promise<File> {
  signal.throwIfAborted();
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法创建图片画布，请重试。");
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片导出失败，请重试。")), "image/png"));
    signal.throwIfAborted();
    if (blob.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("裁剪后的图片超过 20 MB，请缩小选区后重试。");
    const basename = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_").trim() || "GoodGood图片";
    return new File([blob], `${basename}_裁剪.png`, { type: "image/png" });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "SecurityError") throw new Error("图片无法安全导出，请取消后重新打开裁剪。");
    throw cause;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
