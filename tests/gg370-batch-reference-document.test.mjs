import test from "node:test";
import assert from "node:assert/strict";
import { CANVAS_BATCH_REFERENCE_GROUP_LIMIT, isCanvasBatchGeneratorId, canvasBatchReferenceHandle,
  parseCanvasBatchReferenceHandle, canvasBatchModeFromEdges, canvasBatchGroupCountFromEdges,
  canvasReferenceGroupEdgeId } from "../features/canvas/canvas-batch-reference-model.mjs";
import { encodeCanvasReferencePage, decodeCanvasReferencePage, decodeCanvasReferenceDocument } from "../features/canvas/canvas-reference-document.mjs";
import { expandCanvasGroupReferences } from "../features/canvas/canvas-reference-sources.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

const uuid = (number) => String(number).padStart(8, "0") + "-0000-4000-8000-000000000000";
const draft = { prompt: "替换图中的内容", modelKey: "nano-banana-2", ratio: "adaptive", resolution: "2K", count: 1 };
const edge = (source, target, targetHandle = "reference", excludedSourceIds) => ({
  id: canvasReferenceGroupEdgeId(source, target, targetHandle), source, target,
  sourceHandle: "reference", targetHandle, ...(excludedSourceIds?.length ? { excludedSourceIds } : {}),
});

function page(suffix = "", mode = "all", batchNumber = 90) {
  const target = "batch-generator-" + uuid(batchNumber), normal = "normal" + suffix;
  const group = "group" + suffix, a = "a" + suffix, b = "b" + suffix, c = "c" + suffix;
  const edges = [edge(group, target, "reference", [b, c]),
    edge(group, target, canvasBatchReferenceHandle(1, mode), [c]),
    edge(group, target, canvasBatchReferenceHandle(2, mode), [a]),
    edge(a, target, canvasBatchReferenceHandle(3, mode)),
    edge(a, target, canvasBatchReferenceHandle(4, mode)), edge(group, normal, "reference", [b, a])];
  return {
    nodes: [
      { id: group, type: "group", name: "参考素材", size: { width: 600, height: 200 }, position: { x: 0, y: 0 }, referenceOrder: [b, a, c] },
      { id: a, type: "sourceImage", parentId: group, position: { x: 0, y: 0 }, asset: { id: uuid(1), kind: "generated" } },
      { id: b, type: "sourceImage", parentId: group, position: { x: 200, y: 0 }, asset: { id: uuid(2), kind: "reference" } },
      { id: c, type: "sourceImage", parentId: group, position: { x: 400, y: 0 }, asset: { id: uuid(3), kind: "generated" } },
      { id: target, type: "imageGenerator", position: { x: 900, y: 0 } },
      { id: normal, type: "imageGenerator", position: { x: 900, y: 400 } },
    ], edges,
    generators: { [target]: { draft: { ...draft, referenceOrder: ["linked:" + a, "direct:" + uuid(11)] }, directReferenceIds: [uuid(11)] },
      [normal]: { draft, directReferenceIds: [] } },
    convertedReferences: { [edges[0].id + ":" + a]: uuid(21), [edges[1].id + ":" + a]: uuid(21),
      [edges[2].id + ":" + c]: uuid(23), [edges[3].id]: uuid(21), [edges[4].id]: uuid(21), [edges[5].id + ":" + c]: uuid(23) },
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

const validated = (value) => validateCanvasProjectSave({ expectedVersion: null, name: "画布", document: { ...value, schemaVersion: 1 } }).document;

test("batch identity and five portable handles are independent of UI labels", () => {
  assert.equal(CANVAS_BATCH_REFERENCE_GROUP_LIMIT, 5);
  assert.equal(isCanvasBatchGeneratorId("batch-generator-" + uuid(90)), true);
  for (const value of [null, undefined, "", "batch-generator-", "generator-" + uuid(90), "批量生成"]) assert.equal(isCanvasBatchGeneratorId(value), false);
  for (const mode of ["all", "paired"]) for (let index = 1; index <= 5; index++) {
    const handle = canvasBatchReferenceHandle(index, mode);
    assert.deepEqual(parseCanvasBatchReferenceHandle(handle), { index, mode });
    assert.ok(handle.length <= 64);
  }
  for (const handle of [null, undefined, "reference", "batch-all-0", "batch-all-6", "batch-all-01", "batch-other-1", "batch-all-1-extra"]) {
    assert.equal(parseCanvasBatchReferenceHandle(handle), null);
  }
  for (const index of [0, 6, 1.5, NaN]) assert.throws(() => canvasBatchReferenceHandle(index), RangeError);
  assert.throws(() => canvasBatchReferenceHandle(1, "unsupported"), RangeError);
});

test("only matching image candidate edges restore active mode and group count; empty controls use supplied defaults", () => {
  const target = "batch-generator-" + uuid(90);
  const edges = [edge("a", "another-target", "batch-all-5"), { ...edge("text", target, "batch-all-5"), sourceHandle: "text" },
    edge("a", target), edge("b", target, "batch-paired-2"), edge("c", target, "batch-paired-5")];
  assert.equal(canvasBatchModeFromEdges(edges, target), "paired");
  assert.equal(canvasBatchGroupCountFromEdges(edges, target), 5);
  assert.equal(canvasBatchModeFromEdges([], target), "all");
  assert.equal(canvasBatchModeFromEdges([], target, "paired"), "paired");
  assert.equal(canvasBatchGroupCountFromEdges([], target), 1);
  assert.equal(canvasBatchGroupCountFromEdges([], target, 3), 3);
  assert.equal(canvasBatchGroupCountFromEdges([], target, 10), 5);
  assert.equal(canvasBatchGroupCountFromEdges([], target, 0), 1);
});

test("public edge identity stays exact while repeated batch sources get distinct port identities", () => {
  assert.equal(canvasReferenceGroupEdgeId("group", "target"), "reference-group-target");
  assert.equal(canvasReferenceGroupEdgeId("group", "target", "reference"), "reference-group-target");
  assert.notEqual(canvasReferenceGroupEdgeId("group", "target", "batch-all-1"), canvasReferenceGroupEdgeId("group", "target", "batch-all-2"));
});

for (const mode of ["all", "paired"]) test(mode + " groups survive existing cloud validation without cross-port omissions or conversion collisions", () => {
  const original = page("", mode), target = original.nodes.find((node) => isCanvasBatchGeneratorId(node.id)).id;
  const encoded = encodeCanvasReferencePage(original);
  assert.ok(encoded.nodes.every((node) => !Object.hasOwn(node, "referenceOrder")));
  assert.ok(encoded.edges.every((item) => item.source !== "group" && !Object.hasOwn(item, "excludedSourceIds")));
  assert.equal(Object.hasOwn(encoded.generators[target].draft, "referenceOrder"), false);
  const restored = decodeCanvasReferencePage(validated(encoded));
  assert.deepEqual(restored.edges, original.edges);
  assert.deepEqual(restored.convertedReferences, original.convertedReferences);
  assert.deepEqual(restored.generators[target].draft.referenceOrder, original.generators[target].draft.referenceOrder);
  assert.deepEqual(restored.generators.normal, original.generators.normal);
  assert.equal(canvasBatchModeFromEdges(restored.edges, target), mode);
  assert.equal(canvasBatchGroupCountFromEdges(restored.edges, target), 4);
  assert.deepEqual(restored.nodes.find((node) => node.id === "group").referenceOrder, ["b", "a", "c"]);
  assert.deepEqual(encodeCanvasReferencePage(restored), encoded);
});

test("public rank encoding never ranks or removes matching sources in candidate buckets", () => {
  const original = page(), target = original.nodes.find((node) => isCanvasBatchGeneratorId(node.id)).id;
  const encoded = encodeCanvasReferencePage(original);
  const candidates = encoded.edges.filter((item) => item.target === target && parseCanvasBatchReferenceHandle(item.targetHandle));
  assert.equal(candidates.length, 6);
  assert.ok(candidates.every((item) => !item.id.startsWith("reforder-")));
  assert.equal(candidates.filter((item) => item.source === "a").length, 3);
  assert.equal(encoded.edges.filter((item) => item.target === target && item.targetHandle === "reference").length, 1);
  assert.ok(encoded.edges.find((item) => item.target === target && item.targetHandle === "reference").id.startsWith("reforder-0:"));
});

test("ordinary child connections stay independent of collapsed groups in every bucket", () => {
  const original = page();
  const target = original.nodes.find((node) => isCanvasBatchGeneratorId(node.id)).id;
  const separate = { ...edge("b", target, canvasBatchReferenceHandle(1)), id: "ordinary-member-edge" };
  original.edges.push(separate);
  const restored = decodeCanvasReferencePage(validated(encodeCanvasReferencePage(original)));
  assert.deepEqual(restored.edges.at(-1), separate);
  assert.equal(restored.edges.length, original.edges.length);
});

test("encoded reference groups stay unique and restore active configuration independently across pages", () => {
  const original = [page("-1", "all", 91), page("-2", "paired", 92)];
  const pages = original.map((value, index) => ({ ...encodeCanvasReferencePage(value, index), id: "page-" + index, name: "页面" + (index + 1) }));
  const document = { schemaVersion: 2, pages };
  assert.equal(new Set(pages.flatMap((value) => value.edges.map((item) => item.id))).size, pages.reduce((total, value) => total + value.edges.length, 0));
  const accepted = validateCanvasProjectSave({ expectedVersion: null, name: "画布", document }).document;
  const restored = decodeCanvasReferenceDocument(accepted);
  for (let index = 0; index < 2; index++) {
    assert.deepEqual(restored.pages[index].edges, original[index].edges);
    assert.deepEqual(restored.pages[index].convertedReferences, original[index].convertedReferences);
  }
});

for (const mode of ["all", "paired"]) test(mode + " ungrouping preserves the same member in public and separate candidate ports", () => {
  const target = "batch-generator-" + uuid(90);
  const nodes = [{ id: "group", type: "group", position: { x: 0, y: 0 }, data: { name: "素材", referenceOrder: ["b", "a"] } },
    ...["a", "b"].map((id, index) => ({ id, type: "sourceImage", parentId: "group", position: { x: index * 200, y: 0 },
      data: { name: id, assetId: uuid(index + 1), assetKind: "generated", previewUrl: "" } })),
    { id: target, type: "imageGenerator", position: { x: 900, y: 0 }, data: {} }];
  const edges = [edge("group", target, "reference", ["b"]), edge("group", target, canvasBatchReferenceHandle(1, mode)),
    edge("group", target, canvasBatchReferenceHandle(2, mode), ["b"])];
  const ready = (number) => ({ id: uuid(number), name: "输入图", status: "ready", url: "" });
  const converted = { [edges[0].id + ":a"]: ready(21), [edges[1].id + ":a"]: ready(21),
    [edges[1].id + ":b"]: ready(22), [edges[2].id + ":a"]: ready(21) };
  const expanded = expandCanvasGroupReferences(nodes, edges, ["group"], converted);
  assert.deepEqual(expanded.edges.map((item) => [item.source, item.targetHandle]), [["a", "reference"],
    ["b", canvasBatchReferenceHandle(1, mode)], ["a", canvasBatchReferenceHandle(1, mode)], ["a", canvasBatchReferenceHandle(2, mode)]]);
  assert.equal(new Set(expanded.edges.map((item) => item.id)).size, 4);
  assert.equal(Object.keys(expanded.converted).length, 4);
  for (const item of expanded.edges) assert.equal(expanded.converted[item.id].id, uuid(item.source === "a" ? 21 : 22));
  assert.ok(Object.keys(expanded.converted).every((key) => !key.includes("group")));
});
