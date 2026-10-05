import { privateImageUrls } from "../../shared/private-image-urls.mjs";

export const CANVAS_FOLDER_DRAG_TYPE = "application/x-goodgood-canvas-folder";
export const CANVAS_ALBUM_DRAG_HANDLE = ".canvas-album-drag-handle";
export const CANVAS_ALBUM_INITIAL_SIZE = Object.freeze({ width: 360, height: 300 });
const PREFIX = "album-";
const NODE_ID = /^[A-Za-z0-9][A-Za-z0-9_:.\-]{0,159}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCanvasAlbumId(id) {
  return typeof id === "string" && id.startsWith(PREFIX) && id.length > PREFIX.length;
}

/** These are runtime presentation flags, reconstructed from the saved parent ID. */
export function canvasAlbumChildFlags(parentId) {
  return isCanvasAlbumId(parentId) ? { hidden: true, selectable: false, draggable: false, connectable: false } : {};
}

/** Resolve only from the complete, already-authorized library collection. */
export function selectCanvasFolderAlbum(data, folderId) {
  if (!data || typeof folderId !== "string") return null;
  const folder = data.folders.find((entry) => entry.id === folderId);
  if (!folder) return null;
  const members = new Set(data.arrangements.filter((entry) => entry.folderId === folderId).map((entry) => entry.kind + ":" + entry.id));
  const seen = new Set();
  const images = data.items.filter((item) => {
    const key = item.kind + ":" + item.id;
    if (item.media !== "image" || !["generated", "reference"].includes(item.kind) || !members.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((item) => ({ ...item }));
  return { id: folder.id, name: folder.name, images };
}

/** One visible album; each hidden child preserves the existing asset authorization. */
export function createCanvasFolderAlbumNodes(folder, position, id, memberIds) {
  if (!folder || !Array.isArray(folder.images) || !isCanvasAlbumId(id) || !NODE_ID.test(id) ||
      !position || !Number.isFinite(position.x) || !Number.isFinite(position.y) ||
      !Array.isArray(memberIds) || memberIds.length !== folder.images.length ||
      new Set(memberIds).size !== memberIds.length || memberIds.some((memberId) => typeof memberId !== "string" || !NODE_ID.test(memberId) || memberId === id)) {
    throw new TypeError("相册素材或位置无效，请重新拖入文件夹。");
  }
  const children = folder.images.map((image, index) => {
    if (image.media !== "image" || !["generated", "reference"].includes(image.kind) || !UUID.test(image.id)) {
      throw new TypeError("相册中存在不可用的图片，请刷新资产后重试。");
    }
    const dimensions = {};
    if (Number.isFinite(image.width) && image.width > 0) dimensions.pixelWidth = image.width;
    if (Number.isFinite(image.height) && image.height > 0) dimensions.pixelHeight = image.height;
    return { id: memberIds[index], type: "sourceImage", parentId: id, position: { x: 0, y: 0 },
      style: { width: 1, height: 1 }, selected: false, ...canvasAlbumChildFlags(id),
      data: { name: image.name, assetId: image.id, assetKind: image.kind,
        previewUrl: privateImageUrls(image.kind === "generated" ? "asset" : "reference", image.id).previewUrl,
        imageSized: true, ...dimensions } };
  });
  const name = typeof folder.name === "string" ? folder.name.trim().slice(0, 80) : "";
  const group = { id, type: "group", position: { ...position }, ...CANVAS_ALBUM_INITIAL_SIZE,
    style: { ...CANVAS_ALBUM_INITIAL_SIZE }, selected: true, dragHandle: CANVAS_ALBUM_DRAG_HANDLE,
    data: { name: name || "相册", sizing: "manual", referenceOrder: [...memberIds] } };
  return [group, ...children];
}
