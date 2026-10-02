const ROUTES = Object.freeze({ asset: "assets", reference: "references" });

/**
 * Stable owner-checked image URLs for cards and explicit original viewing.
 * @param {"asset" | "reference"} kind
 * @param {string} id
 */
export function privateImageUrls(kind, id) {
  const route = ROUTES[kind];
  if (!route || typeof id !== "string" || !id.trim()) {
    throw new TypeError("A private image kind and id are required.");
  }
  const base = `/api/${route}/${encodeURIComponent(id)}`;
  return { previewUrl: `${base}/preview`, contentUrl: `${base}/content` };
}

/**
 * Fixed, owner-checked canvas display derivative; never an original URL.
 * @param {"asset" | "reference"} kind
 * @param {string} id
 */
export function privateCanvasImageUrls(kind, id) {
  const { previewUrl } = privateImageUrls(kind, id);
  return { previewUrl, detailPreviewUrl: previewUrl.replace(/\/preview$/, "/canvas-preview") };
}
