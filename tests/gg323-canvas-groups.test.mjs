import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { canGroupCanvasSelection, createCanvasGroup, fitCanvasGroups, ungroupCanvasNodes,
  canvasNodeAbsolutePosition, canvasSelectionWithMembers, canvasPastedNodeGeometry,
  canvasGroupContentBounds, canvasGroupFrameContainsContent, resizeCanvasGroup } from "../features/canvas/canvas-groups.mjs";
import { canvasPreviewBounds } from "../features/projects/project-library-model.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

// Source-only regression suite. No database, queue, provider or live user project.
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { snapshotCanvasProject, remoteCanvasProjectDocument } = await vite.ssrLoadModule("/features/canvas/canvas-project-snapshot.ts");
const text = (id, x, y, selected = true) => ({ id, type: "textEditor", position: { x, y }, selected,
  style: { width: 360, height: 260 }, data: { markdown: "创作内容", text: "创作内容" } });
const origin = () => [text("a", 500, -120), text("b", 930, 240), text("outside", -200, 60, false)];
const absolute = (nodes, id) => canvasNodeAbsolutePosition(nodes.find((node) => node.id === id), nodes);
const snapshot = (nodes) => snapshotCanvasProject({ nodes, edges: [], draftsByGenerator: {}, referencesByGenerator: {},
  convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } });
const save = (document) => validateCanvasProjectSave({ name: "创作", expectedVersion: null, document });

test("grouping preserves mixed canvas positions and places parents first", () => {
  const before = origin(); const grouped = createCanvasGroup(before, "group-1");
  assert.equal(grouped[0].type, "group"); assert.equal(grouped[0].data.name, "组1");
  assert.equal(grouped.filter((node) => node.selected).length, 1);
  for (const id of ["a", "b", "outside"]) assert.deepEqual(absolute(grouped, id), absolute(before, id));
  const moved = grouped.map((node) => node.type === "group" ? { ...node, position: { x: node.position.x + 80, y: node.position.y - 30 } } : node);
  assert.deepEqual(absolute(moved, "a"), { x: 580, y: -150 });
  assert.deepEqual(absolute(moved, "outside"), absolute(before, "outside"));
  assert.deepEqual(absolute(ungroupCanvasNodes(moved, ["group-1"]), "b"), absolute(moved, "b"));
});

test("empty and one-node selections do not create history-worthy changes", () => {
  const empty = []; const one = [text("only", 12, 20)];
  assert.equal(canGroupCanvasSelection(empty), false); assert.equal(createCanvasGroup(empty, "group-1"), empty);
  assert.equal(createCanvasGroup(one, "group-1"), one); assert.equal(ungroupCanvasNodes(one, ["missing"]), one);
  const grouped = createCanvasGroup(origin(), "group-1");
  assert.equal(canGroupCanvasSelection(grouped), false); assert.equal(createCanvasGroup(grouped, "group-2"), grouped);
});

test("regrouping existing members remains flat and preserves the untouched group", () => {
  let grouped = createCanvasGroup(origin(), "group-1");
  grouped = grouped.map((node) => ({ ...node, selected: node.id === "a" || node.id === "outside" }));
  const next = createCanvasGroup(grouped, "group-2");
  assert.equal(next.filter((node) => node.type === "group").length, 2);
  assert.equal(next.find((node) => node.id === "b").parentId, "group-1");
  for (const id of ["a", "b", "outside"]) assert.deepEqual(absolute(next, id), absolute(grouped, id));
  assert(next.filter((node) => node.type === "group").every((node) => !node.parentId));
});

test("bounds include expanded output footprints and rebase without member jumps", () => {
  const grouped = createCanvasGroup(origin(), "group-1");
  const next = fitCanvasGroups(grouped, [{ id: "a", bounds: { x: 500, y: -142, width: 1500, height: 282 } }]);
  assert(next[0].style.width >= 1556);
  for (const id of ["a", "b", "outside"]) assert.deepEqual(absolute(next, id), absolute(grouped, id));
  assert.equal(fitCanvasGroups(next, [{ id: "a", bounds: { x: 500, y: -142, width: 1500, height: 282 } }]), next);
});

test("GG-325 frames use explicit integer dimensions and absorb subpixel measurement noise", () => {
  const before = [text("a", 500.3, -120.4), text("b", 930.6, 240.2)];
  const grouped = createCanvasGroup(before, "group-1");
  const frame = grouped[0];
  assert(Number.isInteger(frame.width) && Number.isInteger(frame.height));
  assert.deepEqual(frame.style, { width: frame.width, height: frame.height });
  for (const id of ["a", "b"]) assert.deepEqual(absolute(grouped, id), absolute(before, id));
  const footprints = before.map((node) => ({ id: node.id, bounds: { ...node.position, width: 360, height: 260 } }));
  for (const delta of [0.01, -0.01, 0.1, -0.1]) {
    const noise = footprints.map((item) => ({ ...item, bounds: { ...item.bounds, x: item.bounds.x + delta, width: item.bounds.width + delta } }));
    assert.equal(fitCanvasGroups(grouped, noise), grouped);
  }
  const resized = fitCanvasGroups(grouped, [{ id: "a", bounds: { x: 500.3, y: -142.4, width: 1700.2, height: 282 } }]);
  assert(resized[0].width > frame.width);
  assert.deepEqual(resized[0].style, { width: resized[0].width, height: resized[0].height });
  for (const id of ["a", "b"]) assert.deepEqual(absolute(resized, id), absolute(before, id));
  assert.equal(fitCanvasGroups(resized, [{ id: "a", bounds: { x: 500.3, y: -142.4, width: 1700.2, height: 282 } }]), resized);
});

test("GG-325 legacy style-only frames stabilize once while preserving saved content", () => {
  const grouped = createCanvasGroup(origin(), "group-1");
  const legacy = grouped.map((node) => node.type === "group" ? { ...node, width: undefined, height: undefined } : node);
  const stable = fitCanvasGroups(legacy);
  assert.equal(stable[0].width, stable[0].style.width); assert.equal(stable[0].height, stable[0].style.height);
  for (const id of ["a", "b", "outside"]) assert.deepEqual(absolute(stable, id), absolute(legacy, id));
  assert.equal(fitCanvasGroups(stable), stable);
});

test("GG-333 automatic frames center visible labels/stacks and normalize the old top reservation", () => {
  const before = origin();
  const footprints = [
    { id: "a", bounds: { x: 500, y: -142, width: 1500, height: 282 } },
    { id: "b", bounds: { x: 930, y: 218, width: 360, height: 282 } },
  ];
  const grouped = createCanvasGroup(before, "group-1", footprints); const frame = grouped[0];
  assert.equal(-142 - frame.position.y, 28);
  assert.equal(frame.position.y + frame.height - 500, 28);
  assert.equal(500 - frame.position.x, 28);
  assert.equal(frame.position.x + frame.width - 2000, 28);
  for (const id of ["a", "b", "outside"]) assert.deepEqual(absolute(grouped, id), absolute(before, id));
  const legacy = grouped.map((node) => node.type === "group" ? {
    ...node, position: { ...node.position, y: node.position.y - 32 }, height: node.height + 32,
    style: { ...node.style, height: node.height + 32 },
  } : node.parentId === "group-1" ? { ...node, position: { ...node.position, y: node.position.y + 32 } } : node);
  const fitted = fitCanvasGroups(legacy, footprints);
  assert.deepEqual(fitted[0].position, frame.position); assert.deepEqual(fitted[0].style, frame.style);
  for (const id of ["a", "b", "outside"]) assert.deepEqual(absolute(fitted, id), absolute(before, id));
  assert.equal(fitCanvasGroups(fitted, footprints), fitted);
});

test("GG-333 minimum-height whitespace and fractional coordinates remain vertically centered", () => {
  for (const [y, height] of [[100, 10], [-100.8, 10.3], [100.3, 10.3], [100.3, 300.3]]) {
    const before = [text("a", 500, y), text("b", 930, y)].map((node) => ({ ...node, style: { width: 80, height } }));
    const grouped = createCanvasGroup(before, "group-1"); const frame = grouped[0];
    const top = y - frame.position.y; const bottom = frame.position.y + frame.height - y - height;
    assert(Math.abs(top - bottom) <= 1.001); assert(top >= 28 && bottom >= 28);
    assert(Number.isInteger(frame.height) && frame.height >= 120);
    if (height < 64) assert.equal(frame.height, 120);
    for (const id of ["a", "b"]) assert.deepEqual(absolute(grouped, id), absolute(before, id));
    assert.equal(fitCanvasGroups(grouped), grouped);
  }
});

test("GG-333 automatic minimum-height centering does not reposition or expand a manual frame", () => {
  const before = [text("a", 500, 100), text("b", 930, 100)].map((node) => ({ ...node, style: { width: 80, height: 10 } }));
  const grouped = createCanvasGroup(before, "group-1"); const frame = grouped[0];
  const manual = resizeCanvasGroup(grouped, frame.id, { x: frame.position.x, y: 40, width: frame.width, height: 120 });
  assert.equal(manual[0].data.sizing, "manual");
  assert.equal(fitCanvasGroups(manual), manual);
  assert.equal(100 - manual[0].position.y, 60); assert.equal(manual[0].position.y + manual[0].height - 110, 50);
  for (const id of ["a", "b"]) assert.deepEqual(absolute(manual, id), absolute(before, id));
  const automatic = fitCanvasGroups(manual.map((node) => node.type === "group" ? { ...node, data: { ...node.data, sizing: "auto" } } : node));
  assert.equal(automatic[0].position.y, 45); assert.equal(automatic[0].height, 120);
  for (const id of ["a", "b"]) assert.deepEqual(absolute(automatic, id), absolute(before, id));
});

test("GG-326 manual top-left resize retains member positions and whitespace through fitting", () => {
  const grouped = createCanvasGroup(origin(), "group-1");
  const frame = grouped[0];
  const resized = resizeCanvasGroup(grouped, frame.id, {
    x: frame.position.x - 100, y: frame.position.y - 80, width: frame.width + 240, height: frame.height + 200,
  });
  assert.equal(resized[0].data.sizing, "manual");
  assert.deepEqual(resized[0].style, { width: frame.width + 240, height: frame.height + 200 });
  for (const id of ["a", "b", "outside"]) assert.deepEqual(absolute(resized, id), absolute(grouped, id));
  assert.equal(fitCanvasGroups(resized), resized);
  const movedInside = resized.map((node) => node.id === "b" ? { ...node, position: { x: node.position.x - 60, y: node.position.y - 60 } } : node);
  assert.equal(fitCanvasGroups(movedInside), movedInside);
  const restored = fitCanvasGroups(resized.map((node) => node.type === "group" ? { ...node, data: { ...node.data, sizing: "auto" } } : node));
  assert.deepEqual(restored[0].style, frame.style);
  for (const id of ["a", "b"]) assert.deepEqual(absolute(restored, id), absolute(grouped, id));
});

test("GG-326 manual frames expand for visible stacks then retain the extra space", () => {
  const grouped = createCanvasGroup(origin(), "group-1");
  const frame = grouped[0];
  const manual = resizeCanvasGroup(grouped, frame.id, {
    ...frame.position, width: frame.width + 80, height: frame.height + 60,
  });
  const stack = [{ id: "a", bounds: { x: 380, y: -200, width: 1900, height: 360 } }];
  const expanded = fitCanvasGroups(manual, stack);
  assert(expanded[0].position.x < manual[0].position.x);
  assert(expanded[0].position.y < manual[0].position.y);
  assert(expanded[0].width > manual[0].width);
  assert.equal(expanded[0].position.x + expanded[0].width, 2308);
  assert.equal(expanded[0].position.y + expanded[0].height, manual[0].position.y + manual[0].height);
  for (const id of ["a", "b", "outside"]) assert.deepEqual(absolute(expanded, id), absolute(manual, id));
  assert.equal(fitCanvasGroups(expanded), expanded);
  assert.equal(fitCanvasGroups(expanded, stack), expanded);
});

test("GG-326 resizing cannot shrink past visible content or accept invalid geometry", () => {
  const grouped = createCanvasGroup(origin(), "group-1"); const frame = grouped[0];
  const content = canvasGroupContentBounds(grouped, frame.id);
  assert(canvasGroupFrameContainsContent({ ...frame.position, width: frame.width, height: frame.height }, content));
  assert.equal(resizeCanvasGroup(grouped, frame.id, { ...frame.position, width: frame.width - 100, height: frame.height }), grouped);
  assert.equal(resizeCanvasGroup(grouped, frame.id, { ...frame.position, width: NaN, height: frame.height }), grouped);
  assert.equal(resizeCanvasGroup(grouped, "missing", { x: 0, y: 0, width: 200, height: 120 }), grouped);
  assert.equal(canvasGroupContentBounds([], "missing"), null);
  assert.equal(resizeCanvasGroup([], "missing", { x: 0, y: 0, width: 200, height: 120 }).length, 0);
  const expandedStack = [{ id: "a", bounds: { x: 500, y: -120, width: 1900, height: 260 } }];
  assert(!canvasGroupFrameContainsContent({ ...frame.position, width: frame.width + 100, height: frame.height }, canvasGroupContentBounds(grouped, frame.id, expandedStack)));
});

test("GG-326 manual sizing and diverse emoji survive cloud snapshots and clipboard geometry", () => {
  const grouped = createCanvasGroup(origin(), "group-1"); const frame = grouped[0];
  const manual = resizeCanvasGroup(grouped, frame.id, { ...frame.position, width: frame.width + 200, height: frame.height + 100 });
  for (const emoji of ["🦊", "🍜", "🚀", "🇨🇳", "👩🏽‍🎨", "👨‍👩‍👧‍👦", "1️⃣"]) {
    const labeled = manual.map((node) => node.type === "group" ? { ...node, data: { ...node.data, emoji } } : node);
    const document = save(remoteCanvasProjectDocument(snapshot(labeled))).document;
    assert.equal(document.nodes[0].groupSizing, "manual"); assert.equal(document.nodes[0].emoji, emoji);
    assert.deepEqual(document.nodes[0].size, manual[0].style);
  }
  const copied = canvasSelectionWithMembers(manual);
  const ids = new Map(copied.map((node) => [node.id, `copy-${node.id}`]));
  const pasted = copied.map((node) => ({ ...node, id: ids.get(node.id), ...canvasPastedNodeGeometry(node, copied, ids, 32) }));
  assert.equal(pasted[0].data.sizing, "manual"); assert.equal(fitCanvasGroups(pasted), pasted);
  assert.deepEqual(absolute(pasted, "copy-a"), { x: 532, y: -88 });
  const inFlight = manual.map((node) => node.type === "group" ? { ...node, width: node.width + 60 } : node);
  assert.equal(snapshot(inFlight).nodes[0].size.width, manual[0].width + 60);
  const auto = snapshot(grouped); assert.equal(auto.nodes[0].groupSizing, undefined);
  assert.equal(save(auto).document.nodes[0].groupSizing, undefined);
  for (const nodeId of ["a", "group-1"]) {
    const invalid = { ...auto, nodes: auto.nodes.map((node) => node.id === nodeId ? { ...node, groupSizing: nodeId === "a" ? "manual" : "invalid" } : node) };
    assert.throws(() => save(invalid), (error) => error.code === "INVALID_CANVAS_PROJECT");
  }
});

test("group clipboard includes members and applies the paste offset only once", () => {
  const grouped = createCanvasGroup(origin(), "group-1");
  const copied = canvasSelectionWithMembers(grouped);
  assert.deepEqual(copied.map((node) => node.id), ["group-1", "a", "b"]);
  const ids = new Map(copied.map((node) => [node.id, `copy-${node.id}`]));
  const pasted = copied.map((node) => ({ ...node, id: ids.get(node.id), ...canvasPastedNodeGeometry(node, copied, ids, 32) }));
  assert.deepEqual(absolute(pasted, "copy-a"), { x: 532, y: -88 });
  const member = grouped.find((node) => node.id === "a");
  const single = canvasPastedNodeGeometry(member, grouped, new Map([["a", "new-a"]]), 32);
  assert.equal(single.parentId, undefined); assert.deepEqual(single.position, { x: 532, y: -88 });
});

test("snapshot/cloud/validated page retain group name emoji size and relative members", () => {
  const grouped = createCanvasGroup(origin(), "group-1").map((node) => node.type === "group"
    ? { ...node, data: { name: "角色探索", emoji: "🎨" } } : node);
  const local = snapshot(grouped); const cloud = remoteCanvasProjectDocument(local);
  const validated = save(cloud).document;
  assert.equal(validated.nodes[0].type, "group"); assert.equal(validated.nodes[0].name, "角色探索");
  assert.equal(validated.nodes[0].emoji, "🎨"); assert.equal(validated.nodes.find((node) => node.id === "a").parentId, "group-1");
  assert.deepEqual(validated.nodes[0].size, { width: grouped[0].style.width, height: grouped[0].style.height });
  const bounds = canvasPreviewBounds(validated.nodes);
  assert(bounds.x < -200 && bounds.y < -120 && bounds.x + bounds.width > 1290);
  const cleared = snapshot(grouped.map((node) => node.type === "group" ? { ...node, data: { name: "角色探索" } } : node));
  assert.equal(save(cleared).document.nodes[0].emoji, undefined);
});

test("cloud rejects missing/non-group/cross-page parents, nesting, group connections and invalid labels", () => {
  const document = snapshot(createCanvasGroup(origin(), "group-1"));
  const invalid = (value) => assert.throws(() => save(value), (error) => error.code === "INVALID_CANVAS_PROJECT");
  for (const parentId of ["missing", "a"]) invalid({ ...document, nodes: document.nodes.map((node) => node.id === "b" ? { ...node, parentId } : node) });
  invalid({ ...document, nodes: document.nodes.map((node) => node.type === "group" ? { ...node, parentId: "group-1" } : node) });
  invalid({ ...document, edges: [{ id: "e", source: "group-1", target: "a", sourceHandle: null, targetHandle: null }] });
  for (const patch of [{ name: " " }, { name: "x".repeat(81) }, { emoji: "plain" }, { emoji: "🎨✨" }]) {
    invalid({ ...document, nodes: document.nodes.map((node) => node.type === "group" ? { ...node, ...patch } : node) });
  }
  const { schemaVersion: _version, ...content } = document;
  invalid({ schemaVersion: 2, pages: [
    { ...content, id: "p1", name: "一", nodes: document.nodes.filter((node) => node.type === "group") },
    { ...content, id: "p2", name: "二", nodes: document.nodes.filter((node) => node.type !== "group") },
  ] });
  assert.deepEqual(save(snapshot(origin())).document.nodes.map((node) => node.parentId), [undefined, undefined, undefined]);
});

test("pending/failed uploads stay local while cloud retains the frame and ready members", () => {
  const uploading = { id: "upload", type: "sourceImage", selected: true, position: { x: 100, y: 100 },
    style: { width: 238, height: 238 }, data: { name: "参考图", previewUrl: "blob:local", uploadState: "uploading" } };
  const grouped = createCanvasGroup([text("a", 450, 100), uploading], "group-1");
  const local = snapshot(grouped); const remote = remoteCanvasProjectDocument(local);
  assert.equal(local.nodes.find((node) => node.id === "upload").parentId, "group-1");
  assert.equal(local.nodes.find((node) => node.id === "upload").pendingFileId, "upload");
  assert.equal(remote.nodes.some((node) => node.id === "upload"), false);
  assert.equal(save(remote).document.nodes.find((node) => node.id === "a").parentId, "group-1");
  const failed = grouped.map((node) => node.id === "upload" ? { ...node, data: { ...node.data, uploadState: "failed" } } : node);
  assert.deepEqual(absolute(failed, "upload"), absolute(grouped, "upload"));
  assert.equal(snapshot(failed).nodes.find((node) => node.id === "upload").pendingFileId, "upload");
});
