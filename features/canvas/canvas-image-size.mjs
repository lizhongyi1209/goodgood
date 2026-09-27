/**
 * Fit an image into the initial canvas card without changing its aspect ratio.
 * The returned dimensions are CSS pixels; React Flow owns later user resizing.
 * @param {number} width
 * @param {number} height
 * @returns {{ width: number, height: number } | null}
 */
export function initialCanvasImageSize(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = Math.min(1, 238 / width, 320 / height);
  return { width: width * scale, height: height * scale };
}
