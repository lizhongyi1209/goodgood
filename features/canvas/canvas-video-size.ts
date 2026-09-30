import { initialCanvasImageSize } from "./canvas-image-size.mjs";

type FrameSize = Readonly<{ width: number; height: number }>;

export function videoFrameMatches(size: FrameSize | undefined, pixelWidth: number | undefined, pixelHeight: number | undefined) {
  if (!size || !pixelWidth || !pixelHeight || size.width <= 0 || size.height <= 0) return false;
  const frameRatio = size.width / size.height;
  const videoRatio = pixelWidth / pixelHeight;
  return Number.isFinite(frameRatio) && Number.isFinite(videoRatio) &&
    Math.abs(frameRatio - videoRatio) / videoRatio < 0.001;
}

export function fittedCanvasVideoSize(size: FrameSize | undefined, pixelWidth: number, pixelHeight: number) {
  const initial = initialCanvasImageSize(pixelWidth, pixelHeight);
  if (!initial || !size || !Number.isFinite(size.width) || !Number.isFinite(size.height) ||
      size.width <= 0 || size.height <= 0 ||
      (Math.abs(size.width - 238) < 0.5 && Math.abs(size.height - 158) < 0.5)) return initial;
  if (videoFrameMatches(size, pixelWidth, pixelHeight)) return size;
  // Legacy off-ratio user resizes keep approximately the same visible area.
  const area = size.width * size.height;
  const ratio = pixelWidth / pixelHeight;
  return { width: Math.sqrt(area * ratio), height: Math.sqrt(area / ratio) };
}
