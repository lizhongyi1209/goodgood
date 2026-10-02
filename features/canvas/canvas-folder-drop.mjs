export const CANVAS_ASSET_DRAG_TYPE = "application/x-goodgood-canvas-asset";
export const CANVAS_ASSET_MEDIA_FILTERS = [
  { id: "all", label: "全部" }, { id: "image", label: "图片" },
  { id: "video", label: "视频" }, { id: "audio", label: "音频" }, { id: "text", label: "提示词模板" },
];

// The canvas root is the unclassified location, not a second copy of every
// folder's contents. Missing folders fall back to root so no asset gets hidden.
export function selectCanvasFolderItems(data, folderId = null, media = "all") {
  if (!data) return [];
  const folders = new Set(data.folders.map((folder) => folder.id));
  const activeFolderId = folders.has(folderId) ? folderId : null;
  const membership = new Map(data.arrangements.map((entry) => [`${entry.kind}:${entry.id}`, entry.folderId]));
  return data.items.filter((item) => {
    if (media !== "all" && item.media !== media) return false;
    const assignedFolderId = membership.get(`${item.kind}:${item.id}`);
    return activeFolderId ? assignedFolderId === activeFolderId : !folders.has(assignedFolderId);
  });
}

// Resolve an image or text template in the already authorized panel collection. The drag
// payload identifies it; it never supplies a folder, URL, name or tags to save.
export function planCanvasFolderMove(data, key, folderId) {
  if (!data || typeof key !== "string" || typeof folderId !== "string") return null;
  const folder = data.folders.find((entry) => entry.id === folderId);
  const item = data.items.find((entry) => `${entry.kind}:${entry.id}` === key);
  if (!folder || !item || !(item.media === "image" && ["generated", "reference"].includes(item.kind) || item.media === "text" && item.kind === "text")) return null;
  const arrangement = data.arrangements.find((entry) => entry.kind === item.kind && entry.id === item.id);
  if (arrangement?.folderId === folderId) return null;
  return { key, kind: item.kind, id: item.id, folderId, folderName: folder.name, tags: [...(arrangement?.tags ?? [])] };
}

export function createCanvasFolderMover({ readData, save, onSaved, onState }) {
  let pending = false;
  let disposed = false;
  return {
    isPending: () => pending,
    dispose: () => { disposed = true; },
    async move(key, folderId) {
      if (pending || disposed) return false;
      // Retry re-resolves current membership and tags rather than reusing a
      // failed request snapshot. PUT remains idempotent if its response was lost.
      const plan = planCanvasFolderMove(readData(), key, folderId);
      if (!plan) return false;
      pending = true;
      onState({ ...plan, phase: "pending", error: null });
      try {
        const saved = await save(plan.kind, plan.id, { folderId: plan.folderId, tags: plan.tags });
        if (!disposed) {
          onSaved(saved);
          onState({ ...plan, phase: "succeeded", error: null });
        }
        return true;
      } catch (cause) {
        if (!disposed) onState({ ...plan, phase: "failed", error: cause instanceof Error ? cause.message : "移动失败，请重试。" });
        return false;
      } finally {
        pending = false;
      }
    },
  };
}
