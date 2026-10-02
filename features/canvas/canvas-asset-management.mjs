export function nextCanvasFolderName(folders = []) {
  const names = new Set(folders.map((folder) => folder.name.trim()));
  let number = 1;
  while (names.has(`文件夹${number}`)) number += 1;
  return `文件夹${number}`;
}

export function canvasFolderNameError(value) {
  const name = value.trim();
  return !name || name.length > 64 || /[\u0000-\u001f\u007f]/.test(value)
    ? "文件夹名称应为 1–64 个字符。" : null;
}

export function canvasAssetDeleteNotice(target) {
  if (target.kind === "folder") return `删除文件夹「${target.name}」？其中资产会回到资产根目录。`;
  if (target.kind === "text") return `永久删除文本模板「${target.name}」？该操作不可恢复，已放到画布的文本内容会保留。`;
  return `永久删除「${target.name}」？该操作不可恢复，已使用此素材的项目或引用可能失效。${target.kind === "generated" ? "已结算的生成积分不会退回。" : ""}`;
}

export function removeCanvasLibraryEntry(data, target) {
  if (!data) return data;
  if (target.kind === "folder") return {
    ...data,
    folders: data.folders.filter((folder) => folder.id !== target.id),
    arrangements: data.arrangements.map((entry) => entry.folderId === target.id ? { ...entry, folderId: null } : entry),
  };
  return {
    ...data,
    items: data.items.filter((item) => item.kind !== target.kind || item.id !== target.id),
    arrangements: data.arrangements.filter((entry) => entry.kind !== target.kind || entry.id !== target.id),
  };
}

export async function deleteCanvasLibraryEntry(target, operations) {
  if (target.kind === "folder") await operations.deleteFolder(target.id);
  else if (target.kind === "generated") await operations.deleteGenerated(target.id);
  else if (target.kind === "text" && operations.deleteText) await operations.deleteText(target.id);
  else if (["reference", "video", "audio"].includes(target.kind)) await operations.deleteUploaded(target.kind, target.id);
  else throw new Error("不支持删除此资产类型。");
}
