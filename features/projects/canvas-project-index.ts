import { readCanvasProjectCatalog } from "@/features/canvas/canvas-project-boundary";
import { listLocalCanvasProjects } from "@/features/canvas/canvas-project-local";
import { mergeCanvasProjectIndex } from "./project-library-model.mjs";
import { cleanLocalCanvasProject } from "./project-local-retirement";

export type CanvasProjectListItem = {
  id: string; name: string; version: number | null; updatedAt: string;
  localOnly?: boolean; localDirty?: boolean;
};

function deletionKey(ownerKey: string) { return `goodgood.projects.deleted.v1:${ownerKey}`; }

export function readCanvasDeletionReceipts(ownerKey: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(deletionKey(ownerKey)) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export function markCanvasProjectDeleted(ownerKey: string, id: string): void {
  localStorage.setItem(deletionKey(ownerKey), JSON.stringify([...new Set([...readCanvasDeletionReceipts(ownerKey), id])]));
}

export async function readCanvasProjectIndex(ownerKey: string): Promise<{ projects: CanvasProjectListItem[]; warning: string | null }> {
  const [remote, local] = await Promise.allSettled([readCanvasProjectCatalog(), listLocalCanvasProjects(ownerKey)]);
  if (remote.status === "rejected" && local.status === "rejected") {
    throw remote.reason instanceof Error ? remote.reason : new Error("画布项目暂时无法读取，请重试。");
  }
  const deletedIds = [...readCanvasDeletionReceipts(ownerKey), ...(remote.status === "fulfilled" ? remote.value.deletedProjectIds : [])];
  // The server catalog, rather than an old offline cache, authorizes retirement.
  let cleanupFailed = false;
  if (remote.status === "fulfilled" && remote.value.deletedProjectIds.length) {
    try { localStorage.setItem(deletionKey(ownerKey), JSON.stringify([...new Set(deletedIds)])); }
    catch { cleanupFailed = true; }
  }
  if (remote.status === "fulfilled" && local.status === "fulfilled") {
    const deleted = new Set(deletedIds);
    const cleanup = await Promise.allSettled(local.value.filter((project) => deleted.has(project.id))
      .map((project) => cleanLocalCanvasProject(ownerKey, project.id)));
    cleanupFailed ||= cleanup.some((result) => result.status === "rejected");
  }
  return {
    projects: mergeCanvasProjectIndex(remote.status === "fulfilled" ? remote.value.projects : [],
      local.status === "fulfilled" ? local.value : [], deletedIds),
    warning: remote.status === "rejected" ? "网络暂不可用，画布项目正在显示本机保存的内容。"
      : local.status === "rejected" ? "本地画布缓存暂不可用，显示已同步的项目。"
        : cleanupFailed ? "已删除项目的本机缓存清理未完成，请重试。" : null,
  };
}
