/**
 * Fit an image into the initial canvas card without changing its aspect ratio.
 * The returned dimensions are CSS pixels; React Flow owns later user resizing.
 * @param {number} width
 * @param {number} height
 * @returns {{ width: number, height: number } | null}
 */
export function initialCanvasImageSize(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const narrow = typeof window !== "undefined" && window.innerWidth <= 800;
  const maxWidth = narrow ? Math.min(238, window.innerWidth * 0.58) : 238;
  const maxHeight = narrow ? Math.min(320, window.innerHeight * 0.36) : 320;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
}
