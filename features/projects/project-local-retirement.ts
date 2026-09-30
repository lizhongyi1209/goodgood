import { listLocalCanvasProjects, readLocalCanvasProject, removeLocalCanvasFile, removeLocalCanvasProject, type LocalCanvasProject } from "@/features/canvas/canvas-project-local";
import { getCanvasProjectPages } from "@/shared/contracts/canvas-project";

function pendingFileIds(project: LocalCanvasProject) {
  return new Set(getCanvasProjectPages(project.document).flatMap((page) => [
    ...page.nodes.flatMap((node) => node.pendingFileId ? [node.pendingFileId] : []),
    ...Object.values(page.generators).flatMap((generator) => generator.pendingReferences?.map((reference) => reference.id) ?? []),
  ]));
}

export async function cleanLocalCanvasProject(ownerKey: string, id: string): Promise<void> {
  const project = await readLocalCanvasProject(ownerKey, id);
  if (project) {
    const files = pendingFileIds(project);
    if (files.size) {
      // A conflicted project copy may still own the same pending File.
      const others = await listLocalCanvasProjects(ownerKey);
      const retained = new Set(others.filter((other) => other.id !== id).flatMap((other) => [...pendingFileIds(other)]));
      const removed = await Promise.allSettled([...files].filter((fileId) => !retained.has(fileId)).map((fileId) => removeLocalCanvasFile(ownerKey, fileId)));
      // Keep the retired recovery record until all its exclusive files are
      // cleaned, so a later catalog refresh can retry without guessing IDs.
      if (removed.some((result) => result.status === "rejected")) throw new Error("本机文件清理未完成。");
    }
  }
  await removeLocalCanvasProject(ownerKey, id);
}
