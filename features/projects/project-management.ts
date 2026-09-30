import { deleteCanvasProject, renameCanvasProject } from "@/features/canvas/canvas-project-boundary";
import { readLocalCanvasProject, writeLocalCanvasProject } from "@/features/canvas/canvas-project-local";
import { markCanvasProjectDeleted, type CanvasProjectListItem } from "./canvas-project-index";
import { deleteManagedCanvasProject } from "./project-library-model.mjs";
import { cleanLocalCanvasProject } from "./project-local-retirement";

export function removeCanvasProjectFromLibrary(project: CanvasProjectListItem, ownerKey: string) {
  return deleteManagedCanvasProject({ id: project.id, expectedVersion: project.version }, {
    deleteRemote: deleteCanvasProject,
    markDeleted: (id) => markCanvasProjectDeleted(ownerKey, id),
    removeLocal: (id) => cleanLocalCanvasProject(ownerKey, id),
  });
}

export async function renameCanvasProjectFromLibrary(project: CanvasProjectListItem, name: string, ownerKey: string): Promise<{ project: CanvasProjectListItem; cacheWarning: string | null }> {
  if (project.version === null) {
    const local = await readLocalCanvasProject(ownerKey, project.id);
    if (!local) throw new Error("本地画布项目暂时无法读取，请重试。");
    const updated = { ...local, name, dirty: true, updatedAt: new Date().toISOString() };
    await writeLocalCanvasProject(ownerKey, updated);
    return { project: { ...project, name, updatedAt: updated.updatedAt, localDirty: true }, cacheWarning: null };
  }
  const updated = await renameCanvasProject(project.id, name, project.version);
  let cacheWarning: string | null = null;
  try {
    // Read after the network acknowledgment so content edited in another tab
    // while PATCH was in flight is never replaced with our earlier snapshot.
    const local = await readLocalCanvasProject(ownerKey, project.id);
    if (local) {
      await writeLocalCanvasProject(ownerKey, {
        ...local, name: updated.name, updatedAt: local.dirty ? new Date().toISOString() : updated.updatedAt,
        // Never acknowledge unseen remote graph changes through a name-only PATCH.
        version: local.version === project.version ? updated.version : local.version,
      });
    }
  } catch { cacheWarning = "名称已更新，本机缓存更新未完成，请联网刷新后重试。"; }
  return { project: { ...project, ...updated }, cacheWarning };
}
