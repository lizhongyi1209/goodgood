import { isCanvasAlbumId } from "./canvas-folder-album.mjs";
import { unionCanvasBounds } from "./canvas-selection-layout.mjs";

export const CANVAS_GROUP_DRAG_HANDLE = ".canvas-group-drag-handle";
export const CANVAS_GROUP_NAME_LIMIT = 80;

export function canvasNodeAbsolutePosition(node, nodes) {
  const parent = node.parentId && nodes.find((item) => item.id === node.parentId && item.type === "group");
  return parent ? { x: parent.position.x + node.position.x, y: parent.position.y + node.position.y } : { ...node.position };
}

/** Selecting a frame includes its members; selecting a member alone does not. */
export function canvasSelectionWithMembers(nodes) {
  const groups = new Set(nodes.filter((node) => node.selected && node.type === "group").map((node) => node.id));
  return nodes.filter((node) => node.selected || groups.has(node.parentId));
}

export function canGroupCanvasSelection(nodes) {
  if (nodes.some((node) => node.selected && (isCanvasAlbumId(node.id) || isCanvasAlbumId(node.parentId)))) return false;
  const ids = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
  const roots = nodes.filter((node) => ids.has(node.id) && !ids.has(node.parentId));
  return roots.length >= 2 && canvasSelectionWithMembers(nodes).filter((node) => node.type !== "group").length >= 2;
}

function fallbackFootprint(node, nodes) {
  return { ...canvasNodeAbsolutePosition(node, nodes),
    width: Number(node.measured?.width ?? node.width ?? node.style?.width ?? node.size?.width ?? 238),
    height: Number(node.measured?.height ?? node.height ?? node.style?.height ?? node.size?.height ?? 238) };
}

function groupContentEnvelope(bounds) {
  // Match ResizeObserver's integer offset dimensions and round outwards so no
  // visible content is clipped. Parent sizing must not depend on its contents.
  const x = Math.floor(bounds.x - 28); const y = Math.floor(bounds.y - 28);
  return { x, y, width: Math.ceil(bounds.x + bounds.width + 28) - x,
    height: Math.ceil(bounds.y + bounds.height + 28) - y };
}

function groupFrame(bounds) {
  const envelope = groupContentEnvelope(bounds);
  const x = envelope.x; const width = Math.max(200, envelope.width);
  const height = Math.max(120, envelope.height);
  // The title is outside. Both padding and minimum-height whitespace belong
  // equally above/below the visible content, while member positions stay fixed.
  const y = height > envelope.height ? Math.round(bounds.y + bounds.height / 2 - height / 2) : envelope.y;
  return { position: { x, y }, width, height, style: { width, height } };
}

/** Required visible-content envelope, also used by native resize constraints. */
export function canvasGroupContentBounds(nodes, groupId, footprints = []) {
  if (isCanvasAlbumId(groupId)) return null;
  const byId = new Map(footprints.map((item) => [item.id, item.bounds]));
  const members = nodes.filter((node) => node.parentId === groupId);
  const bounds = unionCanvasBounds(members.map((node) => byId.get(node.id) ?? fallbackFootprint(node, nodes)));
  if (!bounds) return null;
  return groupContentEnvelope(bounds);
}

export function canvasGroupFrameContainsContent(frame, content) {
  return [frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) &&
    frame.width >= 200 && frame.height >= 120 && (!content ||
      (frame.x <= content.x + 1 && frame.y <= content.y + 1 &&
       frame.x + frame.width >= content.x + content.width - 1 &&
       frame.y + frame.height >= content.y + content.height - 1));
}

/** Keyboard resizing follows the same content constraints as the native handles. */
export function resizeCanvasGroup(nodes, groupId, frame, footprints = []) {
  const group = nodes.find((node) => node.id === groupId && node.type === "group");
  if (!group || !canvasGroupFrameContainsContent(frame, canvasGroupContentBounds(nodes, groupId, footprints))) return nodes;
  const width = Math.round(frame.width); const height = Math.round(frame.height);
  if (frame.x === group.position.x && frame.y === group.position.y && width === group.width && height === group.height) return nodes;
  return nodes.map((node) => {
    if (node.id === groupId) return { ...node, position: { x: frame.x, y: frame.y }, width, height,
      style: { ...node.style, width, height }, data: { ...node.data, sizing: "manual" } };
    if (node.parentId !== groupId) return node;
    const absolute = canvasNodeAbsolutePosition(node, nodes);
    return { ...node, position: { x: absolute.x - frame.x, y: absolute.y - frame.y } };
  });
}

export function createCanvasGroup(nodes, id, footprints = []) {
  if (!canGroupCanvasSelection(nodes)) return nodes;
  const members = canvasSelectionWithMembers(nodes).filter((node) => node.type !== "group");
  if (members.length < 2) return nodes;
  const ids = new Set(members.map((node) => node.id));
  const byId = new Map(footprints.map((item) => [item.id, item.bounds]));
  const bounds = unionCanvasBounds(members.map((node) => byId.get(node.id) ?? fallbackFootprint(node, nodes)));
  if (!bounds) return nodes;
  const names = new Set(nodes.filter((node) => node.type === "group").map((node) => node.data.name));
  let number = 1;
  while (names.has(`组${number}`)) number += 1;
  const frame = groupFrame(bounds);
  const group = { id, type: "group", ...frame, data: { name: `组${number}` },
    selected: true, zIndex: -1, dragHandle: CANVAS_GROUP_DRAG_HANDLE };
  const affectedGroups = new Set(members.map((node) => node.parentId).filter(Boolean));
  const remaining = nodes.filter((node) => node.type !== "group" || !affectedGroups.has(node.id) ||
    nodes.some((child) => child.parentId === node.id && !ids.has(child.id)));
  const next = remaining.map((node) => {
    if (!ids.has(node.id)) return node.selected ? { ...node, selected: false } : node;
    const absolute = canvasNodeAbsolutePosition(node, nodes);
    return { ...node, parentId: id, extent: undefined, expandParent: undefined, selected: false,
      position: { x: absolute.x - frame.position.x, y: absolute.y - frame.position.y } };
  });
  // React Flow must receive all parents before their children.
  return [...next.filter((node) => node.type === "group"), group, ...next.filter((node) => node.type !== "group")];
}

export function ungroupCanvasNodes(nodes, groupIds) {
  const ids = new Set(groupIds.filter((id) => !isCanvasAlbumId(id)));
  if (!nodes.some((node) => node.type === "group" && ids.has(node.id))) return nodes;
  return nodes.filter((node) => node.type !== "group" || !ids.has(node.id)).map((node) => {
    if (!ids.has(node.parentId)) return node;
    return { ...node, parentId: undefined, extent: undefined, expandParent: undefined,
      position: canvasNodeAbsolutePosition(node, nodes) };
  });
}

/** Resize/rebase frames without moving any member in canvas coordinates. */
export function fitCanvasGroups(nodes, footprints = []) {
  const byId = new Map(footprints.map((item) => [item.id, item.bounds]));
  const frames = new Map();
  for (const group of nodes.filter((node) => node.type === "group" && !isCanvasAlbumId(node.id))) {
    const members = nodes.filter((node) => node.parentId === group.id);
    if (!members.length) continue;
    const bounds = unionCanvasBounds(members.map((node) => byId.get(node.id) ?? fallbackFootprint(node, nodes)));
    if (!bounds) continue;
    let frame = groupFrame(bounds);
    if (group.data.sizing === "manual") {
      // Retain the user's whitespace. Only expand when content leaves the frame;
      // moving members back inward never shrinks a manually arranged group.
      const width = Number(group.width ?? group.style?.width);
      const height = Number(group.height ?? group.style?.height);
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        // A manual frame contains content, not the automatic frame's centered
        // minimum-height whitespace. Preserve its placement even for tiny nodes.
        const envelope = groupContentEnvelope(bounds);
        const x = Math.min(group.position.x, envelope.x);
        const y = Math.min(group.position.y, envelope.y);
        const nextWidth = Math.max(200, Math.ceil(Math.max(group.position.x + width, envelope.x + envelope.width) - x));
        const nextHeight = Math.max(120, Math.ceil(Math.max(group.position.y + height, envelope.y + envelope.height) - y));
        frame = { position: { x, y }, width: nextWidth, height: nextHeight, style: { width: nextWidth, height: nextHeight } };
      }
    }
    // A one-pixel deadband absorbs zoom/DOM rounding noise. Explicit dimensions
    // also keep a restored legacy frame independent of percentage child sizes.
    if (group.width !== Number(group.style?.width) || group.height !== Number(group.style?.height) ||
        Math.abs(frame.position.x - group.position.x) > 1 || Math.abs(frame.position.y - group.position.y) > 1 ||
        Math.abs(frame.width - Number(group.style?.width)) > 1 || Math.abs(frame.height - Number(group.style?.height)) > 1) frames.set(group.id, frame);
  }
  if (!frames.size) return nodes;
  return nodes.map((node) => {
    const ownFrame = frames.get(node.id);
    if (ownFrame) return { ...node, ...ownFrame, style: { ...node.style, ...ownFrame.style } };
    const parentFrame = frames.get(node.parentId);
    if (!parentFrame) return node;
    const absolute = canvasNodeAbsolutePosition(node, nodes);
    return { ...node, position: { x: absolute.x - parentFrame.position.x, y: absolute.y - parentFrame.position.y } };
  });
}

/** Clipboard roots receive the offset once; copied members retain relative positions. */
export function canvasPastedNodeGeometry(node, copiedNodes, ids, offset) {
  const parentId = node.parentId && ids.get(node.parentId);
  const absolute = canvasNodeAbsolutePosition(node, copiedNodes);
  return { parentId: parentId || undefined, extent: undefined, expandParent: undefined,
    position: parentId ? { ...node.position } : { x: absolute.x + offset, y: absolute.y + offset } };
}
