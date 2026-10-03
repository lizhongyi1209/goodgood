import { unionCanvasBounds } from "./canvas-selection-layout.mjs";

export const CANVAS_GROUP_DRAG_HANDLE = ".canvas-group-drag-handle";
export const CANVAS_GROUP_NAME_LIMIT = 80;
export const CANVAS_GROUP_EMOJIS = [
  { emoji: "🎨", label: "调色盘" }, { emoji: "✨", label: "闪光" },
  { emoji: "💡", label: "灵感" }, { emoji: "📷", label: "相机" },
  { emoji: "🎬", label: "场记板" }, { emoji: "🖼️", label: "画框" },
  { emoji: "🌿", label: "植物" }, { emoji: "🌸", label: "花" },
  { emoji: "🌙", label: "月亮" }, { emoji: "☀️", label: "太阳" },
  { emoji: "🔥", label: "火焰" }, { emoji: "❤️", label: "爱心" },
  { emoji: "⭐", label: "星星" }, { emoji: "📌", label: "图钉" },
  { emoji: "📁", label: "文件夹" }, { emoji: "✅", label: "完成" },
];

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
  const ids = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
  const roots = nodes.filter((node) => ids.has(node.id) && !ids.has(node.parentId));
  return roots.length >= 2 && canvasSelectionWithMembers(nodes).filter((node) => node.type !== "group").length >= 2;
}

function fallbackFootprint(node, nodes) {
  return { ...canvasNodeAbsolutePosition(node, nodes),
    width: Number(node.measured?.width ?? node.width ?? node.style?.width ?? node.size?.width ?? 238),
    height: Number(node.measured?.height ?? node.height ?? node.style?.height ?? node.size?.height ?? 238) };
}

function groupFrame(bounds) {
  return { position: { x: bounds.x - 28, y: bounds.y - 60 },
    style: { width: Math.max(200, bounds.width + 56), height: Math.max(120, bounds.height + 88) } };
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
  const ids = new Set(groupIds);
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
  for (const group of nodes.filter((node) => node.type === "group")) {
    const members = nodes.filter((node) => node.parentId === group.id);
    if (!members.length) continue;
    const bounds = unionCanvasBounds(members.map((node) => byId.get(node.id) ?? fallbackFootprint(node, nodes)));
    if (!bounds) continue;
    const frame = groupFrame(bounds);
    if (Math.abs(frame.position.x - group.position.x) > 0.1 || Math.abs(frame.position.y - group.position.y) > 0.1 ||
        Math.abs(frame.style.width - Number(group.style?.width)) > 0.1 || Math.abs(frame.style.height - Number(group.style?.height)) > 0.1) frames.set(group.id, frame);
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
