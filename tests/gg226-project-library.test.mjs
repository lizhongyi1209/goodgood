import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canvasPreviewBounds, canvasPreviewNodeSize, canvasPreviewPage, deleteManagedCanvasProject, formatProjectUpdated, mergeCanvasProjectIndex, projectNameError } from "../features/projects/project-library-model.mjs";

const page = (id, nodes = []) => ({ id, name: id, nodes, edges: [], generators: {}, viewport: { x: 0, y: 0, zoom: 1 } });
const node = (id, x, y, width, height) => ({ id, type: "sourceImage", position: { x, y }, size: { width, height } });

test("project dates have a complete local calendar date and handle invalid values", () => {
  const value = new Date(2026, 8, 30, 23, 59).toISOString();
  assert.equal(formatProjectUpdated(value), "更新于 2026年09月30日");
  assert.equal(formatProjectUpdated(""), "更新于 —");
  assert.equal(formatProjectUpdated("not-a-date"), "更新于 —");
});

test("preview chooses this browser's page and defaults to the first persisted page", () => {
  const first = page("first"); const second = page("second");
  const document = { schemaVersion: 2, pages: [first, second] };
  assert.equal(canvasPreviewPage(document, "second"), second);
  assert.equal(canvasPreviewPage(document, "missing"), first);
  assert.equal(canvasPreviewPage(document, null), first);
  assert.equal(canvasPreviewPage({ schemaVersion: 2, pages: [] }, null), null);
  const legacy = { schemaVersion: 1, ...page("legacy") };
  assert.equal(canvasPreviewPage(legacy, "second"), legacy);
});

test("snapshot bounds retain saved coordinates and aspect ratios", () => {
  const tall = node("tall", -320, 45, 100, 300);
  const wide = node("wide", 410, -180, 500, 100);
  const bounds = canvasPreviewBounds([tall, wide]);
  assert.ok(bounds.x < -320 && bounds.y < -180);
  assert.ok(bounds.x + bounds.width > 910);
  assert.ok(bounds.y + bounds.height > 345);
  assert.deepEqual(canvasPreviewNodeSize(tall), { width: 100, height: 300 });
  assert.deepEqual(canvasPreviewNodeSize({ id: "metadata", type: "sourceImage", position: { x: 0, y: 0 }, metadata: { pixelWidth: 1000, pixelHeight: 2000 } }), { width: 160, height: 320 });
  assert.deepEqual(canvasPreviewBounds([]), { x: 0, y: 0, width: 592, height: 400 });
});

test("tombstones override dirty local documents and browser receipts work offline", () => {
  const remote = [{ id: "retired", name: "remote", version: 8, updatedAt: "2026-09-30" }];
  const local = [{ id: "retired", name: "unsynced", version: 7, dirty: true, updatedAt: "2026-10-01", document: {} }];
  assert.deepEqual(mergeCanvasProjectIndex(remote, local, ["retired"]), []);
  assert.deepEqual(mergeCanvasProjectIndex([], local, ["retired"]), []);
  assert.deepEqual(mergeCanvasProjectIndex([], [], []), []);
});

test("dirty local names are retained while actions know the currently listed server version", () => {
  const remote = [{ id: "one", name: "cloud", version: 8, updatedAt: "2026-09-29" }];
  const local = [{ id: "one", name: "draft", version: 7, dirty: true, updatedAt: "2026-09-30", document: {} },
    { id: "new", name: "new canvas", version: null, dirty: true, updatedAt: "2026-10-01", document: {} }];
  const result = mergeCanvasProjectIndex(remote, local, []);
  assert.equal(result[0].id, "new"); assert.equal(result[0].version, null); assert.equal(result[0].localOnly, true);
  assert.equal(result[1].name, "draft"); assert.equal(result[1].version, 8); assert.equal(result[1].localDirty, true);
  assert.equal(local[0].version, 7, "the index must not acknowledge remote content in local recovery records");
});

test("project name validation rejects empty and overlong input", () => {
  assert.match(projectNameError("  ", 20), /请输入/);
  assert.match(projectNameError("字".repeat(21), 20), /20/);
  assert.equal(projectNameError("  新名称  ", 20), null);
  assert.equal(projectNameError("字".repeat(32), 32), null);
});

test("pending remote deletion does not clear local recovery data", async () => {
  const events = []; let accept;
  const remote = new Promise((resolve) => { accept = resolve; });
  const operation = deleteManagedCanvasProject({ id: "one", expectedVersion: 7 }, {
    deleteRemote: async (id, version) => { events.push(["remote", id, version]); await remote; },
    markDeleted: (id) => events.push(["receipt", id]),
    removeLocal: async (id) => { events.push(["local", id]); },
  });
  await Promise.resolve();
  assert.deepEqual(events, [["remote", "one", 7]]);
  accept();
  assert.deepEqual(await operation, { cacheWarning: null });
  assert.deepEqual(events, [["remote", "one", 7], ["receipt", "one"], ["local", "one"]]);
});

test("network failure or CAS conflict retains the local project and deletion receipts", async () => {
  const events = [];
  await assert.rejects(deleteManagedCanvasProject({ id: "unsynced", expectedVersion: null }, {
    deleteRemote: async () => { throw new Error("VERSION_CONFLICT"); },
    markDeleted: () => events.push("receipt"), removeLocal: async () => { events.push("local"); },
  }), /VERSION_CONFLICT/);
  assert.deepEqual(events, []);
});

test("remote deletion success is preserved when local storage or file cleanup fails", async () => {
  const events = [];
  const result = await deleteManagedCanvasProject({ id: "one", expectedVersion: 7 }, {
    deleteRemote: async () => { events.push("deleted"); },
    markDeleted: () => { throw new Error("quota"); },
    removeLocal: async () => { events.push("cleanup-attempt"); throw new Error("IDB failure"); },
  });
  assert.deepEqual(events, ["deleted", "cleanup-attempt"]);
  assert.match(result.cacheWarning, /项目已删除/);
  assert.match(result.cacheWarning, /本机缓存清理未完成/);
});

test("project cards use feature-owned read-only previews and existing shadcn interactions", () => {
  const root = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const library = readFileSync(new URL("../features/projects/project-library.tsx", import.meta.url), "utf8");
  const preview = readFileSync(new URL("../features/projects/canvas-project-preview.tsx", import.meta.url), "utf8");
  const management = readFileSync(new URL("../features/projects/project-management.ts", import.meta.url), "utf8");
  assert.doesNotMatch(root, /GOODGOOD PROJECTS/);
  assert.match(root, /<ProjectLibrary/);
  assert.match(root, /setCurrentProject\(null\); setProjectName/);
  assert.match(library, /DropdownMenuContent/); assert.match(library, /DialogContent/);
  assert.doesNotMatch(library, /nano-fashion/);
  assert.match(preview, /IntersectionObserver/); assert.match(preview, /foreignObject/);
  assert.match(preview, /URL\.revokeObjectURL/);
  assert.doesNotMatch(preview, /CanvasWorkspace|ReactFlow|submit[A-Z]\w+\(|saveCanvasProject\(|method: ["']POST/);
  assert.match(management, /local\.version === project\.version \? updated\.version : local\.version/);
});
