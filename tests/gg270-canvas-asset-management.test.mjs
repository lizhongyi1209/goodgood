import assert from "node:assert/strict";
import test from "node:test";
import { canvasAssetDeleteNotice, canvasFolderNameError, deleteCanvasLibraryEntry, nextCanvasFolderName, removeCanvasLibraryEntry } from "../features/canvas/canvas-asset-management.mjs";
import { selectCanvasFolderItems } from "../features/canvas/canvas-folder-drop.mjs";

test("GG-270 default folder names start at one and avoid existing names", () => {
  assert.equal(nextCanvasFolderName(), "文件夹1");
  const folders = [{ name: "文件夹1" }, { name: " 文件夹2 " }, { name: "作品" }];
  assert.equal(nextCanvasFolderName(folders), "文件夹3");
  assert.equal(nextCanvasFolderName([{ name: "文件夹2" }]), "文件夹1");
  assert.deepEqual(folders[0], { name: "文件夹1" });
});

test("GG-270 folder names enforce the existing API limit", () => {
  assert.equal(canvasFolderNameError("作品集"), null);
  assert.equal(canvasFolderNameError("文".repeat(64)), null);
  for (const value of ["", "  ", "文".repeat(65), "作品\0", "作品\n"]) assert.ok(canvasFolderNameError(value));
});

const folder = { id: "folder", name: "文件夹1", createdAt: "2026-10-01" };
const image = { id: "shared", kind: "generated", media: "image", name: "图片" };
const video = { id: "shared", kind: "video", media: "video", name: "视频" };
const data = {
  folders: [folder, { ...folder, id: "other" }], items: [image, video], mediaRevision: 3,
  arrangements: [
    { kind: "generated", id: "shared", folderId: "folder", tags: ["保留"], displayName: "图片" },
    { kind: "video", id: "shared", folderId: "other", tags: [] },
  ],
};

test("GG-270 deleting a folder returns its assets to root without deleting bytes or labels", () => {
  const updated = removeCanvasLibraryEntry(data, { ...folder, kind: "folder" });
  assert.deepEqual(updated.folders.map((entry) => entry.id), ["other"]);
  assert.equal(updated.items, data.items);
  assert.equal(updated.arrangements[0].folderId, null);
  assert.deepEqual(updated.arrangements[0].tags, ["保留"]);
  assert.equal(updated.arrangements[0].displayName, "图片");
  assert.equal(updated.arrangements[1], data.arrangements[1]);
  assert.deepEqual(selectCanvasFolderItems(updated, null), [image]);
  assert.equal(data.arrangements[0].folderId, "folder");
});

test("GG-270 deleting an item removes only its exact kind/id", () => {
  const updated = removeCanvasLibraryEntry(data, image);
  assert.deepEqual(updated.items, [video]);
  assert.deepEqual(updated.arrangements, [data.arrangements[1]]);
  assert.equal(updated.folders, data.folders);
  assert.equal(updated.mediaRevision, 3);
  assert.equal(removeCanvasLibraryEntry(null, image), null);
});

test("GG-270 confirmation distinguishes permanent files from folder ungrouping", () => {
  assert.match(canvasAssetDeleteNotice(image), /不可恢复.*积分不会退回/);
  assert.match(canvasAssetDeleteNotice(video), /项目或引用可能失效/);
  assert.doesNotMatch(canvasAssetDeleteNotice(video), /积分/);
  assert.match(canvasAssetDeleteNotice({ ...folder, kind: "folder" }), /资产会回到资产根目录/);
  assert.doesNotMatch(canvasAssetDeleteNotice({ ...folder, kind: "folder" }), /永久|不可恢复/);
});

test("GG-270 each saved media kind uses its established delete boundary", async () => {
  const calls = [];
  const operations = {
    deleteFolder: async (id) => calls.push(["folder", id]),
    deleteGenerated: async (id) => calls.push(["generated", id]),
    deleteUploaded: async (kind, id) => calls.push([kind, id]),
  };
  for (const kind of ["folder", "generated", "reference", "video", "audio"]) await deleteCanvasLibraryEntry({ kind, id: kind }, operations);
  assert.deepEqual(calls, ["folder", "generated", "reference", "video", "audio"].map((kind) => [kind, kind]));
  await assert.rejects(deleteCanvasLibraryEntry({ kind: "unknown", id: "invalid" }, operations), /不支持/);
  assert.equal(calls.length, 5);
});

test("GG-270 deletion awaits confirmation; rejection preserves the original collection for retry", async () => {
  let release;
  let displayed = data;
  const operations = { deleteFolder: async () => {}, deleteGenerated: () => new Promise((resolve) => { release = resolve; }), deleteUploaded: async () => {} };
  const pending = deleteCanvasLibraryEntry(image, operations).then(() => { displayed = removeCanvasLibraryEntry(displayed, image); });
  assert.equal(displayed, data);
  release();
  await pending;
  assert.deepEqual(displayed.items, [video]);
  displayed = data;
  await assert.rejects(deleteCanvasLibraryEntry(image, { ...operations, deleteGenerated: async () => { throw new Error("网络失败"); } }).then(() => { displayed = removeCanvasLibraryEntry(displayed, image); }), /网络失败/);
  assert.equal(displayed, data);
  await deleteCanvasLibraryEntry(image, { ...operations, deleteGenerated: async () => {} });
});
