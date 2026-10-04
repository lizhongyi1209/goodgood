import { PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "@/shared/contracts/upload-limits.mjs";
import { loadCanvasCropImage, type CanvasCropImage } from "./canvas-image-crop-image";
import { paintStickerComposition, type StickerPlacement } from "./canvas-image-placement-model.mjs";
import { paintRegionAnnotation } from "./canvas-image-region-model.mjs";
import type { PlacementRegion } from "./canvas-image-placement-model.mjs";

export type PlacementImage = Awaited<ReturnType<typeof loadCanvasCropImage>>;

export function checkPlacementImageSize(image: HTMLImageElement) {
  if (image.naturalWidth < 1 || image.naturalHeight < 1 || image.naturalWidth > 16384 || image.naturalHeight > 16384 || image.naturalWidth * image.naturalHeight > 40_000_000) {
    throw new Error("图片尺寸过大或无效，请选择较小的图片。");
  }
}

export async function loadPlacementImage(source: File | CanvasCropImage, signal: AbortSignal): Promise<PlacementImage> {
  signal.throwIfAborted();
  if (!(source instanceof File)) {
    const resource = await loadCanvasCropImage(source, signal);
    try {
      if (!resource.blob.size || resource.blob.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("请选择 20 MB 以内的完整图片。");
      checkPlacementImageSize(resource.image); return resource;
    }
    catch (cause) { resource.dispose(); throw cause; }
  }
  if (!source.size || source.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("请选择 20 MB 以内的 JPEG、PNG 或 WebP 图片。");
  const header = new Uint8Array(await source.slice(0, 12).arrayBuffer());
  signal.throwIfAborted();
  const png = [137,80,78,71,13,10,26,10].every((value, index) => header[index] === value);
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const webp = String.fromCharCode(...header.slice(0,4)) === "RIFF" && String.fromCharCode(...header.slice(8,12)) === "WEBP";
  if (!png && !jpeg && !webp) throw new Error("贴图支持 JPEG、PNG 和 WebP，请重新选择图片。");
  const objectUrl = URL.createObjectURL(source);
  const image = new Image(); image.decoding = "async";
  const dispose = () => { image.src = ""; URL.revokeObjectURL(objectUrl); };
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        image.onload = null; image.onerror = null; signal.removeEventListener("abort", abort);
        if (error) reject(error); else resolve();
      };
      const abort = () => { finish(new DOMException("Aborted", "AbortError")); image.src = ""; };
      image.onload = () => finish();
      image.onerror = () => finish(new Error("这张贴图无法读取，请选择完整的图片。"));
      signal.addEventListener("abort", abort, { once: true });
      image.src = objectUrl;
      if (signal.aborted) abort();
    });
    signal.throwIfAborted(); checkPlacementImageSize(image);
    return { image, blob: source, objectUrl, dispose };
  } catch (cause) { dispose(); throw cause; }
}

export async function exportStickerComposition(base: HTMLImageElement, layers: readonly Readonly<{ resource: PlacementImage; placement: StickerPlacement }>[], name: string, signal: AbortSignal) {
  signal.throwIfAborted(); checkPlacementImageSize(base);
  if (!layers.length) throw new Error("请先添加一张贴图。");
  const canvas = document.createElement("canvas");
  canvas.width = base.naturalWidth; canvas.height = base.naturalHeight;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法合成图片，请重试。");
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
    paintStickerComposition(context, base, layers);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("贴图保存失败，请重试。")), "image/png"));
    signal.throwIfAborted();
    if (blob.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("合成图片超过 20 MB，请减少贴图后重试。");
    const basename = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 100).trim() || "GoodGood图片";
    return new File([blob], `${basename}_贴图.png`, { type: "image/png" });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "SecurityError") throw new Error("图片无法保存，请关闭后重新打开贴图。");
    throw cause;
  } finally { canvas.width = 0; canvas.height = 0; }
}

export async function exportRegionAnnotation(base: HTMLImageElement, region: PlacementRegion, name: string, signal: AbortSignal): Promise<File> {
  signal.throwIfAborted(); checkPlacementImageSize(base);
  const canvas = document.createElement("canvas");
  canvas.width = base.naturalWidth; canvas.height = base.naturalHeight;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法保存图片，请重试。");
    paintRegionAnnotation(context, base, region, { width: canvas.width, height: canvas.height });
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("框选图片保存失败，请重试。")), "image/png"));
    signal.throwIfAborted();
    if (blob.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error("框选副本超过 20 MB，请使用较小的原图。");
    const basename = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 100).trim() || "GoodGood图片";
    return new File([blob], `${basename}_框选.png`, { type: "image/png" });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "SecurityError") throw new Error("图片无法保存，请关闭后重新打开框选。");
    throw cause;
  } finally { canvas.width = 0; canvas.height = 0; }
}
