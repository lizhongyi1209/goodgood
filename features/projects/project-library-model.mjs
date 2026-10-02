/** @param {string} value */
export function formatProjectUpdated(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "更新于 —";
  return `更新于 ${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`;
}

/**
 * @param {import("../../shared/contracts/canvas-project").CanvasProjectDocument} document
 * @param {string | null} activePageId
 */
export function canvasPreviewPage(document, activePageId) {
  if (document.schemaVersion === 1) return document;
  return document.pages.find((page) => page.id === activePageId) ?? document.pages[0] ?? null;
}

/** @param {import("../../shared/contracts/canvas-project").CanvasProjectNode} node */
export function canvasPreviewNodeSize(node) {
  if (node.size && node.size.width > 0 && node.size.height > 0) return node.size;
  if (node.type === "sourceAudio") return { width: 260, height: 86 };
  if (node.type === "textEditor" || node.type === "textGenerator" && node.markdown) return { width: 360, height: 260 };
  const width = node.metadata?.pixelWidth;
  const height = node.metadata?.pixelHeight;
  if (width && height) {
    const scale = Math.min(1, 238 / width, 320 / height);
    return { width: width * scale, height: height * scale };
  }
  return { width: 238, height: node.type === "imageGenerator" || node.type === "textGenerator" ? 238 : 158 };
}

/** @param {readonly import("../../shared/contracts/canvas-project").CanvasProjectNode[]} nodes */
export function canvasPreviewBounds(nodes) {
  if (!nodes.length) return { x: 0, y: 0, width: 592, height: 400 };
  const sizes = nodes.map((node) => ({ node, size: canvasPreviewNodeSize(node) }));
  const left = Math.min(...sizes.map(({ node }) => node.position.x));
  const top = Math.min(...sizes.map(({ node }) => node.position.y));
  const right = Math.max(...sizes.map(({ node, size }) => node.position.x + size.width));
  const bottom = Math.max(...sizes.map(({ node, size }) => node.position.y + size.height));
  const padding = Math.max(24, Math.max(right - left, bottom - top) * 0.06);
  return { x: left - padding, y: top - padding, width: right - left + padding * 2, height: bottom - top + padding * 2 };
}

/**
 * Server tombstones and browser deletion receipts precede local recovery drafts.
 * @param {readonly import("../../shared/contracts/canvas-project").CanvasProjectSummary[]} remote
 * @param {readonly import("../canvas/canvas-project-local").LocalCanvasProject[]} local
 * @param {readonly string[]} deletedIds
 */
export function mergeCanvasProjectIndex(remote, local, deletedIds) {
  const deleted = new Set(deletedIds);
  /** @type {Map<string, { id:string; name:string; version:number|null; updatedAt:string; localOnly?:boolean; localDirty?:boolean }>} */
  const projects = new Map();
  for (const project of remote) if (!deleted.has(project.id)) projects.set(project.id, project);
  for (const project of local) {
    if (deleted.has(project.id)) continue;
    const saved = projects.get(project.id);
    if (!saved || project.dirty) projects.set(project.id, {
      id: project.id, name: project.name, version: saved?.version ?? project.version,
      updatedAt: project.updatedAt, localOnly: !saved && project.version === null, localDirty: project.dirty,
    });
  }
  return [...projects.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

/** @param {string} name @param {number} maximum */
export function projectNameError(name, maximum) {
  if (!name.trim()) return "请输入项目名称。";
  if ([...name.trim()].length > maximum) return `项目名称最多 ${maximum} 个字。`;
  return null;
}

/**
 * A DELETE response must precede either cache cleanup or a browser receipt.
 * @param {{id:string; expectedVersion:number|null}} project
 * @param {{deleteRemote:(id:string,version:number|null)=>Promise<unknown>; markDeleted:(id:string)=>void; removeLocal:(id:string)=>Promise<void>}} services
 */
export async function deleteManagedCanvasProject(project, services) {
  await services.deleteRemote(project.id, project.expectedVersion);
  const warnings = [];
  try { services.markDeleted(project.id); }
  catch { warnings.push("本机删除记录暂时无法保存"); }
  try { await services.removeLocal(project.id); }
  catch { warnings.push("本机缓存清理未完成"); }
  return { cacheWarning: warnings.length ? `项目已删除，${warnings.join("，")}。请联网刷新后重试清理。` : null };
}
