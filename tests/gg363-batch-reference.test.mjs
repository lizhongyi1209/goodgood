import test from "node:test";
import assert from "node:assert/strict";
import { createCanvasGroup, canvasNodeAbsolutePosition, ungroupCanvasNodes } from "../features/canvas/canvas-groups.mjs";
import { CANVAS_BATCH_REFERENCE_HANDLE, canvasReferenceSelection, canvasReferenceGroupMembers, canvasReferenceInputs,
  canvasReferenceInputKeys, uniqueCanvasReferenceInputs, planCanvasReferenceConnection, expandCanvasGroupReferences } from "../features/canvas/canvas-reference-sources.mjs";
import { encodeCanvasReferencePage, decodeCanvasReferencePage, decodeCanvasReferenceDocument } from "../features/canvas/canvas-reference-document.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

const uuid = (value) => `${String(value).padStart(8, "0")}-0000-4000-8000-000000000000`;
const image = (id, assetId, x = 0, y = 0, extra = {}) => ({
  id, type: "sourceImage", selected: true, position: { x, y }, style: { width: 200, height: 140 },
  data: { name: id, assetId, previewUrl: "", ...extra },
});
const generator = (id = "target") => ({ id, type: "imageGenerator", position: { x: 900, y: 0 }, data: {} });
const connection = (source = "a", target = "target", sourceHandle = CANVAS_BATCH_REFERENCE_HANDLE) => ({ source, target, sourceHandle, targetHandle: "reference" });
const edge = (source, target = "target", extra = {}) => ({ ...connection(source, target, "reference"), id: `reference-${source}-${target}`, ...extra });
const ready = (id) => ({ id, name: "参考图", url: "", status: "ready" });
const draft = { prompt: "", modelKey: "nano-banana-2", ratio: "adaptive", resolution: "2K", count: 1 };

test("a pure multi-image selection uses reading order; mixed, dragging and empty selections have no shared source", () => {
  const a = image("a", uuid(1), 200, 100), b = image("b", uuid(2), 0, 100), c = image("c", uuid(3), 500, 0);
  assert.deepEqual(canvasReferenceSelection([a, b, c]).map((node) => node.id), ["c", "b", "a"]);
  assert.deepEqual(canvasReferenceSelection([]), []);
  assert.deepEqual(canvasReferenceSelection([a]), []);
  assert.deepEqual(canvasReferenceSelection([a, { ...b, dragging: true }]), []);
  assert.deepEqual(canvasReferenceSelection([a, { ...generator(), selected: true }]), []);
});

test("a valid batch groups without moving members, and pending/failed images remain inputs", () => {
  const a = image("a", undefined, 20, 50, { uploadState: "uploading" });
  const b = image("b", undefined, 280, 90, { uploadState: "failed", uploadError: "上传失败" });
  const nodes = [a, b, generator()];
  assert.equal(planCanvasReferenceConnection(nodes, [], connection(), [a, b]).valid, true);
  const grouped = createCanvasGroup(nodes, "group-a").map((node) => node.type === "group"
    ? { ...node, data: { ...node.data, referenceOrder: ["b", "a"] } } : node);
  for (const original of [a, b]) {
    assert.deepEqual(canvasNodeAbsolutePosition(grouped.find((node) => node.id === original.id), grouped), original.position);
  }
  const inputs = canvasReferenceInputs(grouped, [edge("group-a")]);
  assert.deepEqual(inputs.map((input) => input.sourceId), ["b", "a"]);
  assert.equal(inputs[0].node.data.uploadState, "failed");
  assert.equal(inputs[1].node.data.uploadState, "uploading");
  assert.ok(inputs.every((input) => input.key !== input.edgeId));
});

test("deduplication allows the common source image to already be connected", () => {
  const a = image("a", uuid(1)), b = image("b", uuid(2));
  const nodes = [a, b, generator()];
  const plan = planCanvasReferenceConnection(nodes, [edge("a")], connection(), [a, b]);
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.excludedSourceIds, ["a"]);
  assert.equal(planCanvasReferenceConnection(nodes, [edge("a")], connection(), [a]).valid, false);
});

test("capacity preflight counts independent unique images, fails atomically and gives the required reduction", () => {
  const nodes = Array.from({ length: 11 }, (_, index) => image(`pic-${index}`, uuid(index + 1)));
  nodes.push(generator());
  const group = { id: "group-a", type: "group", position: { x: 0, y: 0 }, data: { name: "参考图组" } };
  const grouped = [group, ...nodes.map((node, index) => index < 9 ? { ...node, parentId: group.id } : node)];
  const edges = [edge(group.id)];
  const before = JSON.stringify([grouped, edges]);
  const failed = planCanvasReferenceConnection(grouped, edges, connection("pic-9"), nodes.slice(9, 11));
  assert.equal(failed.valid, false);
  assert.match(failed.message, /减少1张/);
  assert.equal(JSON.stringify([grouped, edges]), before);
  const allowed = planCanvasReferenceConnection(grouped, edges, connection("pic-0"), [nodes[0], nodes[9]]);
  assert.equal(allowed.valid, true);
  assert.deepEqual(allowed.excludedSourceIds, ["pic-0"]);
});

test("unsupported images and cycles reject the whole batch", () => {
  const a = image("a", uuid(1)), b = image("b", uuid(2));
  const nodes = [a, b, generator()];
  assert.equal(planCanvasReferenceConnection(nodes, [{ id: "backlink", source: "target", target: "b" }], connection(), [a, b]).valid, false);
  assert.equal(planCanvasReferenceConnection(nodes, [], connection(), [a, generator()]).valid, false);
  assert.equal(planCanvasReferenceConnection(nodes, [], { ...connection(), targetHandle: "text" }, [a, b]).valid, false);
});

test("moving members keeps order; exclusions affect one target and later additions append", () => {
  const group = { id: "group-a", type: "group", position: { x: 20, y: 30 }, data: { name: "组", referenceOrder: ["b", "a"] } };
  const a = { ...image("a", uuid(1), 0, 0), parentId: group.id };
  const b = { ...image("b", uuid(2), 500, 500), parentId: group.id };
  const c = { ...image("c", uuid(3), -100, -100), parentId: group.id };
  const nodes = [group, a, b, c, generator(), generator("target-2")];
  const edges = [edge(group.id, "target", { data: { excludedSourceIds: ["b"] } }), edge(group.id, "target-2")];
  assert.deepEqual(canvasReferenceGroupMembers(group, nodes).map((node) => node.id), ["b", "a", "c"]);
  assert.deepEqual(canvasReferenceInputs(nodes, edges, "target").map((input) => input.sourceId), ["a", "c"]);
  assert.deepEqual(canvasReferenceInputs(nodes, edges, "target-2").map((input) => input.sourceId), ["b", "a", "c"]);
  assert.equal(nodes.length, 6);
});

test("generated duplicates resolve by asset and imported reference ID rather than edge count", () => {
  const a = image("a", uuid(1), 0, 0, { assetKind: "generated" });
  const b = image("b", uuid(1), 0, 0, { assetKind: "generated" });
  const nodes = [a, b, generator()], edges = [edge("a"), edge("b")];
  const conversions = { [edges[0].id]: ready(uuid(22)) };
  const inputs = canvasReferenceInputs(nodes, edges);
  assert.equal(uniqueCanvasReferenceInputs(inputs, [], conversions).length, 1);
  assert.equal(uniqueCanvasReferenceInputs(inputs, [ready(uuid(22))], conversions).length, 0);
});

function savedPage(suffix = "", includeOrdinary = false) {
  const groupId = `group${suffix}`, targetId = `target${suffix}`, a = `a${suffix}`, b = `b${suffix}`;
  const groupEdge = edge(groupId, targetId);
  return {
    nodes: [
      { id: groupId, type: "group", name: "参考图组", size: { width: 500, height: 220 }, position: { x: 10, y: 20 }, referenceOrder: [b, a] },
      { id: a, type: "sourceImage", name: a, parentId: groupId, position: { x: 0, y: 0 }, asset: { id: uuid(1), kind: "generated" } },
      { id: b, type: "sourceImage", name: b, parentId: groupId, position: { x: 250, y: 0 }, asset: { id: uuid(2), kind: "reference" } },
      { id: targetId, type: "imageGenerator", position: { x: 900, y: 0 } },
      { id: `other${suffix}`, type: "imageGenerator", position: { x: 900, y: 300 } },
    ],
    edges: [{ ...groupEdge, excludedSourceIds: [b] }, edge(groupId, `other${suffix}`), ...(includeOrdinary ? [edge(b, targetId)] : [])],
    generators: { [targetId]: { draft, directReferenceIds: [] }, [`other${suffix}`]: { draft, directReferenceIds: [] } },
    convertedReferences: { [`${groupEdge.id}:${a}`]: uuid(22), [`${edge(groupId, `other${suffix}`).id}:${a}`]: uuid(22) },
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

test("cloud encoding satisfies existing group-forbidding validation and restores order, omissions and converted IDs", () => {
  const page = savedPage();
  const encoded = encodeCanvasReferencePage(page);
  assert.ok(encoded.nodes.every((node) => !Object.hasOwn(node, "referenceOrder")));
  assert.ok(encoded.edges.every((item) => item.source !== "group" && !Object.hasOwn(item, "excludedSourceIds")));
  assert.doesNotThrow(() => validateCanvasProjectSave({ expectedVersion: null, name: "画布", document: { ...encoded, schemaVersion: 1 } }));
  const decoded = decodeCanvasReferencePage(encoded);
  assert.deepEqual(decoded.edges, page.edges);
  assert.deepEqual(decoded.nodes.find((node) => node.id === "group").referenceOrder, ["b", "a"]);
  assert.deepEqual(decoded.convertedReferences, page.convertedReferences);
  assert.deepEqual(encodeCanvasReferencePage(decoded), encoded);
});

test("ordinary member edges remain independent when a bundle is restored", () => {
  const page = savedPage("", true);
  const decoded = decodeCanvasReferencePage(encodeCanvasReferencePage(page));
  assert.deepEqual(decoded.edges.at(-1), edge("b"));
  assert.equal(decoded.edges.length, 3);
});

test("cloud child edges are unique across pages and each page collapses independently", () => {
  const pages = [savedPage("-1"), savedPage("-2")].map((page, index) => ({ ...encodeCanvasReferencePage(page, index), id: `page-${index}`, name: `页面${index + 1}` }));
  const document = { schemaVersion: 2, pages };
  assert.equal(new Set(pages.flatMap((page) => page.edges.map((item) => item.id))).size, 6);
  assert.doesNotThrow(() => validateCanvasProjectSave({ expectedVersion: null, name: "画布", document }));
  const restored = decodeCanvasReferenceDocument(document);
  assert.equal(restored.pages[0].edges[0].source, "group-1");
  assert.equal(restored.pages[1].edges[0].source, "group-2");
});

test("ungrouping preserves active references, positions and ready imports without reviving exclusions", () => {
  const group = { id: "group-a", type: "group", position: { x: 20, y: 30 }, data: { name: "组", referenceOrder: ["b", "a"] } };
  const nodes = [group, { ...image("a", uuid(1)), parentId: group.id }, { ...image("b", uuid(2)), parentId: group.id }, generator()];
  const groupEdge = edge(group.id, "target", { data: { excludedSourceIds: ["b"] } });
  const key = `${groupEdge.id}:a`;
  assert.ok(canvasReferenceInputKeys(nodes, [groupEdge]).has(key));
  const expanded = expandCanvasGroupReferences(nodes, [groupEdge], [group.id], { [key]: ready(uuid(22)) });
  const ungrouped = ungroupCanvasNodes(nodes, [group.id]);
  assert.deepEqual(expanded.edges.map((item) => item.source), ["a"]);
  assert.equal(expanded.converted[expanded.edges[0].id].id, uuid(22));
  assert.ok(!Object.hasOwn(expanded.converted, key));
  assert.deepEqual(ungrouped.find((node) => node.id === "a").position, { x: 20, y: 30 });
});
