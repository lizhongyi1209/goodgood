import test from "node:test";
import assert from "node:assert/strict";
import { CANVAS_FOLDER_DRAG_TYPE, CANVAS_ALBUM_DRAG_HANDLE, CANVAS_ALBUM_INITIAL_SIZE,
  isCanvasAlbumId, canvasAlbumChildFlags, selectCanvasFolderAlbum, createCanvasFolderAlbumNodes } from "../features/canvas/canvas-folder-album.mjs";
import { canGroupCanvasSelection, createCanvasGroup, canvasSelectionWithMembers, canvasGroupContentBounds,
  fitCanvasGroups, ungroupCanvasNodes, resizeCanvasGroup, canvasNodeAbsolutePosition } from "../features/canvas/canvas-groups.mjs";
import { canvasReferenceInputs, planCanvasReferenceConnection, expandCanvasGroupReferences } from "../features/canvas/canvas-reference-sources.mjs";
import { canvasBatchReferenceHandle, canvasReferenceGroupEdgeId } from "../features/canvas/canvas-batch-reference-model.mjs";
import { encodeCanvasReferencePage, decodeCanvasReferencePage } from "../features/canvas/canvas-reference-document.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

const uuid = (number) => String(number).padStart(8, "0") + "-0000-4000-8000-000000000000";
const albumId = "album-" + uuid(90), batchId = "batch-generator-" + uuid(91);
const image = (number, kind = "reference") => ({ id: uuid(number), name: "服装 " + number, kind, media: "image",
  createdAt: "2026-10-05T00:00:00Z", width: 1200, height: 1600, previewUrl: "https://untrusted.invalid/image", sourceUrl: "https://untrusted.invalid/source" });
const folder = (count = 50) => ({ id: uuid(80), name: "服装", images: Array.from({ length: count }, (_, index) => image(index + 1, index % 2 ? "generated" : "reference")) });
const albumNodes = (count = 50) => createCanvasFolderAlbumNodes(folder(count), { x: 300, y: 200 }, albumId,
  Array.from({ length: count }, (_, index) => "asset-" + uuid(index + 1)));
const connection = (target = batchId, handle = canvasBatchReferenceHandle(1)) => ({ source: albumId, target,
  sourceHandle: "reference", targetHandle: handle });
const edge = (target = batchId, handle = canvasBatchReferenceHandle(1)) => ({ ...connection(target, handle),
  id: canvasReferenceGroupEdgeId(albumId, target, handle) });
const generators = () => [{ id: batchId, type: "imageGenerator", position: { x: 900, y: 0 }, data: {} },
  { id: "ordinary", type: "imageGenerator", position: { x: 900, y: 500 }, data: {} }];

function wirePage(nodes, edges) {
  return { nodes: nodes.map((node) => node.type === "group" ? { id: node.id, type: "group", position: node.position,
    name: node.data.name, size: { width: node.width, height: node.height }, groupSizing: "manual", referenceOrder: node.data.referenceOrder }
    : node.type === "sourceImage" ? { id: node.id, type: "sourceImage", position: node.position, parentId: node.parentId,
      name: node.data.name, size: { width: 1, height: 1 }, asset: { id: node.data.assetId, kind: node.data.assetKind },
      metadata: { pixelWidth: node.data.pixelWidth, pixelHeight: node.data.pixelHeight } }
    : { id: node.id, type: "imageGenerator", position: node.position }), edges,
    generators: Object.fromEntries(generators().map((node) => [node.id, { draft: { prompt: "换装", modelKey: "nano-banana-2", ratio: "adaptive", resolution: "2K", count: 1 }, directReferenceIds: [] }])),
    convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } };
}

test("folder resolution uses all authorized members, independently of current media/filter view", () => {
  const value = folder(), other = image(70), video = { ...image(71, "video"), media: "video" };
  const data = { folders: [{ id: value.id, name: value.name, createdAt: "2026-10-05" }],
    items: [...value.images, other, video, value.images[0]],
    arrangements: [...value.images.map((item) => ({ id: item.id, kind: item.kind, folderId: value.id, tags: [] })),
      { id: other.id, kind: other.kind, folderId: null, tags: [] }, { id: video.id, kind: video.kind, folderId: value.id, tags: [] }] };
  const selected = selectCanvasFolderAlbum(data, value.id);
  assert.equal(selected.images.length, 50);
  assert.deepEqual(selected.images.map((item) => item.id), value.images.map((item) => item.id));
  selected.images[0].name = "本地快照";
  assert.equal(data.items[0].name, "服装 1");
  assert.equal(selectCanvasFolderAlbum(data, uuid(81)), null);
  assert.equal(selectCanvasFolderAlbum(null, value.id), null);
  assert.deepEqual(selectCanvasFolderAlbum({ ...data, items: [] }, value.id), { id: value.id, name: value.name, images: [] });
});

test("50 images make one visible album and 50 hidden authorized image children with frozen order", () => {
  const nodes = albumNodes();
  assert.equal(nodes.length, 51);
  assert.equal(nodes.filter((node) => !node.hidden).length, 1);
  assert.equal(nodes[0].dragHandle, CANVAS_ALBUM_DRAG_HANDLE);
  assert.deepEqual(nodes[0].style, CANVAS_ALBUM_INITIAL_SIZE);
  assert.equal(nodes[0].data.sizing, "manual");
  assert.deepEqual(nodes[0].data.referenceOrder, nodes.slice(1).map((node) => node.id));
  nodes.slice(1).forEach((node, index) => {
    assert.equal(node.parentId, albumId);
    assert.deepEqual({ hidden: node.hidden, selectable: node.selectable, draggable: node.draggable, connectable: node.connectable }, canvasAlbumChildFlags(albumId));
    assert.equal(node.data.assetId, uuid(index + 1));
    assert.equal(node.data.previewUrl, "/api/" + (index % 2 ? "assets/" : "references/") + uuid(index + 1) + "/preview");
    assert.equal(node.data.pixelWidth, 1200);
    assert.ok(!node.data.previewUrl.includes("untrusted"));
  });
  assert.deepEqual(canvasAlbumChildFlags("ordinary-group"), {});
  for (const id of [undefined, null, "", "album-", "group-" + uuid(90)]) assert.equal(isCanvasAlbumId(id), false);
  assert.equal(CANVAS_FOLDER_DRAG_TYPE, "application/x-goodgood-canvas-folder");
});

test("empty folders keep a valid album frame; invalid positions and image identities reject atomically", () => {
  assert.equal(albumNodes(0).length, 1);
  assert.throws(() => createCanvasFolderAlbumNodes(folder(1), { x: NaN, y: 0 }, albumId, ["child"]), TypeError);
  assert.throws(() => createCanvasFolderAlbumNodes(folder(2), { x: 0, y: 0 }, albumId, ["child", "child"]), TypeError);
  assert.throws(() => createCanvasFolderAlbumNodes(folder(2), { x: 0, y: 0 }, albumId, ["child"]), TypeError);
  assert.throws(() => createCanvasFolderAlbumNodes({ ...folder(1), images: [{ ...image(1), kind: "video", media: "video" }] }, { x: 0, y: 0 }, albumId, ["child"]), TypeError);
});

test("album geometry ignores hidden assets while grouping and ungrouping leave it as one unit", () => {
  const nodes = albumNodes(2);
  assert.equal(canvasGroupContentBounds(nodes, albumId), null);
  assert.equal(fitCanvasGroups(nodes), nodes);
  assert.equal(ungroupCanvasNodes(nodes, [albumId]), nodes);
  assert.deepEqual(canvasSelectionWithMembers(nodes), nodes);
  const ordinary = { id: "ordinary-image", type: "sourceImage", position: { x: 1000, y: 200 }, selected: true,
    style: { width: 200, height: 200 }, data: { name: "图", assetId: uuid(75), previewUrl: "" } };
  const mixed = [...nodes, ordinary];
  assert.equal(canGroupCanvasSelection(mixed), false);
  assert.equal(createCanvasGroup(mixed, "new-group"), mixed);
  const selectedChild = nodes.map((node) => ({ ...node, selected: node.id !== albumId }));
  assert.equal(canGroupCanvasSelection([...selectedChild, ordinary]), false);
  const expanded = expandCanvasGroupReferences([...nodes, ...generators()], [edge()], [albumId]);
  assert.deepEqual(expanded.edges, [edge()]);
});

test("albums load all images only into dedicated batch candidates, never ordinary or public inputs", () => {
  const nodes = [...albumNodes(), ...generators()];
  assert.equal(canvasReferenceInputs(nodes, [edge()]).length, 50);
  assert.deepEqual(canvasReferenceInputs(nodes, [edge(batchId, "reference"), edge("ordinary", "reference")]), []);
  assert.equal(planCanvasReferenceConnection(nodes, [], connection(), nodes.filter((node) => node.parentId === albumId), [], {}, Number.MAX_SAFE_INTEGER).valid, true);
  assert.equal(planCanvasReferenceConnection(nodes, [], connection(batchId, "reference"), nodes.filter((node) => node.parentId === albumId)).valid, false);
  assert.equal(planCanvasReferenceConnection(nodes, [], connection("ordinary", "reference"), nodes.filter((node) => node.parentId === albumId)).valid, false);
  assert.equal(planCanvasReferenceConnection([...albumNodes(0), ...generators()], [], connection(), []).valid, false);
});

test("existing cloud format restores all 50 authorized album assets and one candidate-group edge", () => {
  const original = wirePage([...albumNodes(), ...generators()], [edge()]);
  const encoded = encodeCanvasReferencePage(original);
  const accepted = validateCanvasProjectSave({ expectedVersion: null, name: "画布", document: { ...encoded, schemaVersion: 1 } }).document;
  assert.equal(accepted.nodes.filter((node) => node.asset).length, 50);
  assert.equal(accepted.edges.length, 50);
  assert.ok(accepted.nodes.every((node) => !Object.hasOwn(node, "hidden")));
  const restored = decodeCanvasReferencePage(accepted);
  assert.deepEqual(restored.edges, original.edges);
  assert.deepEqual(restored.nodes.find((node) => node.id === albumId).referenceOrder, original.nodes.find((node) => node.id === albumId).referenceOrder);
  assert.ok(restored.nodes.filter((node) => node.parentId === albumId).every((node) => canvasAlbumChildFlags(node.parentId).hidden));
});

test("an album never prevents ordinary groups from fitting or ungrouping normally", () => {
  const hidden = albumNodes(2).map((node) => ({ ...node, selected: false }));
  const ordinary = [1, 2].map((number) => ({ id: "ordinary-" + number, type: "sourceImage", selected: true,
    position: { x: 1000 + number * 200, y: 500 }, style: { width: 100, height: 100 }, data: { name: "图", assetId: uuid(70 + number), previewUrl: "" } }));
  assert.equal(canGroupCanvasSelection([...hidden, ...ordinary]), true);
  const grouped = createCanvasGroup([...hidden, ...ordinary], "ordinary-group");
  const moved = grouped.map((node) => node.id === "ordinary-2" ? { ...node, position: { x: node.position.x + 500, y: node.position.y } } : node);
  const fitted = fitCanvasGroups(moved);
  assert.equal(fitted.find((node) => node.id === albumId), moved.find((node) => node.id === albumId));
  assert.ok(fitted.find((node) => node.id === "ordinary-group").width > grouped.find((node) => node.id === "ordinary-group").width);
  const ungrouped = ungroupCanvasNodes(fitted, [albumId, "ordinary-group"]);
  assert.ok(ungrouped.some((node) => node.id === albumId));
  assert.ok(!ungrouped.some((node) => node.id === "ordinary-group"));
  assert.ok(ungrouped.filter((node) => node.id.startsWith("ordinary-")).every((node) => !node.parentId));
  assert.ok(ungrouped.filter((node) => node.parentId === albumId).every((node) => node.hidden));
});

test("manual album height can shrink independently while all real images and references remain intact", () => {
  const nodes = albumNodes();
  const resized = resizeCanvasGroup(nodes, albumId, { x: 300, y: 200, width: 360, height: 120 });
  const frame = resized.find((node) => node.id === albumId);
  assert.deepEqual({ width: frame.width, height: frame.height }, { width: 360, height: 120 });
  assert.deepEqual(frame.style, { width: 360, height: 120 });
  assert.equal(frame.data.sizing, "manual");
  assert.deepEqual(frame.data.referenceOrder, nodes[0].data.referenceOrder);
  const members = resized.filter((node) => node.parentId === albumId);
  assert.equal(members.length, 50);
  members.forEach((node) => {
    const original = nodes.find((entry) => entry.id === node.id);
    assert.strictEqual(node.data, original.data);
    assert.deepEqual(canvasNodeAbsolutePosition(node, resized), canvasNodeAbsolutePosition(original, nodes));
    assert.equal(node.hidden, true);
    assert.equal(node.data.pixelWidth, 1200);
    assert.equal(node.data.pixelHeight, 1600);
  });
  assert.strictEqual(fitCanvasGroups(resized), resized);
  assert.equal(canvasReferenceInputs([...resized, ...generators()], [edge()]).length, 50);
});

test("top-left album resizing preserves the opposite corner and resized geometry through the current cloud wire", () => {
  const nodes = albumNodes();
  const resized = resizeCanvasGroup(nodes, albumId, { x: 460, y: 380, width: 200, height: 120 });
  const frame = resized.find((node) => node.id === albumId);
  assert.equal(frame.position.x + frame.width, 660);
  assert.equal(frame.position.y + frame.height, 500);
  for (const member of resized.filter((node) => node.parentId === albumId)) {
    assert.deepEqual(canvasNodeAbsolutePosition(member, resized), { x: 300, y: 200 });
  }
  const original = wirePage([...resized, ...generators()], [edge()]);
  const encoded = encodeCanvasReferencePage(original);
  const accepted = validateCanvasProjectSave({ expectedVersion: null, name: "可调整相册",
    document: { ...encoded, schemaVersion: 1 } }).document;
  const restored = decodeCanvasReferencePage(accepted);
  const saved = restored.nodes.find((node) => node.id === albumId);
  assert.deepEqual(saved.size, { width: 200, height: 120 });
  assert.deepEqual(saved.position, { x: 460, y: 380 });
  assert.equal(saved.groupSizing, "manual");
  assert.deepEqual(restored.edges, original.edges);
  assert.equal(restored.nodes.filter((node) => node.parentId === albumId).length, 50);
});

test("empty albums resize while below-minimum, non-finite and missing frames leave the graph unchanged", () => {
  const nodes = albumNodes(0);
  const valid = resizeCanvasGroup(nodes, albumId, { x: 300, y: 200, width: 200, height: 120 });
  assert.equal(valid.length, 1);
  assert.equal(valid[0].width, 200);
  assert.equal(valid[0].height, 120);
  for (const patch of [{ width: 199 }, { height: 119 }, { width: NaN }, { x: Infinity }]) {
    assert.strictEqual(resizeCanvasGroup(nodes, albumId, { x: 300, y: 200, width: 360, height: 300, ...patch }), nodes);
  }
  assert.strictEqual(resizeCanvasGroup(nodes, "missing", { x: 0, y: 0, width: 360, height: 300 }), nodes);
});
