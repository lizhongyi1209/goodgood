import test from "node:test";
import assert from "node:assert/strict";
import { orderCanvasReferences, moveCanvasReference, remapCanvasReferenceOrder } from "../features/canvas/canvas-reference-order.mjs";
import { encodeCanvasReferencePage, decodeCanvasReferencePage, decodeCanvasReferenceDocument } from "../features/canvas/canvas-reference-document.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

const uuid = (number) => `${String(number).padStart(8, "0")}-0000-4000-8000-000000000000`;
const draft = { prompt: "", modelKey: "nano-banana-2", ratio: "adaptive", resolution: "2K", count: 1 };
const edge = (id, source, target = "target") => ({ id, source, target, sourceHandle: "reference", targetHandle: "reference" });

test("moving references inserts at the target in either direction; empty, missing and unchanged drops do nothing", () => {
  const keys = ["a", "b", "c", "d"];
  assert.deepEqual(moveCanvasReference(keys, "a", "c"), ["b", "c", "a", "d"]);
  assert.deepEqual(moveCanvasReference(keys, "d", "a"), ["d", "a", "b", "c"]);
  assert.equal(moveCanvasReference(keys, "a", "a"), keys);
  assert.equal(moveCanvasReference(keys, "missing", "c"), keys);
  assert.equal(moveCanvasReference(keys, "a", "missing"), keys);
  assert.deepEqual(moveCanvasReference([], "a", "b"), []);
  assert.deepEqual(keys, ["a", "b", "c", "d"]);
});

test("order survives loading/failure updates and missing entries; new references append", () => {
  const items = [{ orderKey: "linked:a", status: "uploading" }, { orderKey: "linked:b", status: "failed" },
    { orderKey: "direct:c", status: "ready" }];
  const order = ["linked:b", "direct:c", "deleted", "linked:a"];
  assert.deepEqual(orderCanvasReferences(items, order).map((item) => item.orderKey), ["linked:b", "direct:c", "linked:a"]);
  assert.deepEqual(orderCanvasReferences([{ ...items[0], status: "ready" }, items[1], { orderKey: "linked:new" }], order)
    .map((item) => item.orderKey), ["linked:b", "linked:a", "linked:new"]);
  assert.deepEqual(items.map((item) => item.orderKey), ["linked:a", "linked:b", "direct:c"]);
});

function page(suffix = "") {
  const groupId = `group${suffix}`, a = `a${suffix}`, b = `b${suffix}`, c = `c${suffix}`;
  const target = `target${suffix}`, other = `other${suffix}`;
  const groupEdge = edge(`reference-${groupId}-${target}`, groupId, target);
  const order = [`linked:${b}`, `direct:${uuid(12)}`, `linked:${c}`, `linked:${a}`, `direct:${uuid(11)}`];
  return {
    nodes: [
      { id: groupId, type: "group", position: { x: 0, y: 0 }, size: { width: 500, height: 240 }, name: "参考图组", referenceOrder: [a, b] },
      { id: a, type: "sourceImage", parentId: groupId, position: { x: 10, y: 10 }, asset: { id: uuid(1), kind: "generated" } },
      { id: b, type: "sourceImage", parentId: groupId, position: { x: 250, y: 10 }, asset: { id: uuid(2), kind: "reference" } },
      { id: c, type: "sourceImage", position: { x: 600, y: 0 }, asset: { id: uuid(3), kind: "reference" } },
      { id: target, type: "imageGenerator", position: { x: 900, y: 0 } },
      { id: other, type: "imageGenerator", position: { x: 900, y: 500 } },
    ],
    edges: [groupEdge, edge(`single${suffix}`, c, target), edge(`reference-${groupId}-${other}`, groupId, other)],
    generators: { [target]: { draft: { ...draft, referenceOrder: order }, directReferenceIds: [uuid(11), uuid(12)] },
      [other]: { draft, directReferenceIds: [] } },
    convertedReferences: { [`${groupEdge.id}:${a}`]: uuid(21) },
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

test("mixed direct, ordinary and group references retain target-local interleaving through the current backend format", () => {
  const original = page();
  const encoded = encodeCanvasReferencePage(original);
  assert.equal(Object.hasOwn(encoded.generators.target.draft, "referenceOrder"), false);
  assert.deepEqual(encoded.generators.target.directReferenceIds, [uuid(12), uuid(11)]);
  assert.doesNotThrow(() => validateCanvasProjectSave({ expectedVersion: null, name: "画布", document: { ...encoded, schemaVersion: 1 } }));
  const restored = decodeCanvasReferencePage(encoded);
  assert.deepEqual(restored.generators.target.draft.referenceOrder, original.generators.target.draft.referenceOrder);
  assert.deepEqual(restored.generators.other, original.generators.other);
  assert.deepEqual(restored.edges, original.edges);
  assert.deepEqual(restored.convertedReferences, original.convertedReferences);
  assert.deepEqual(restored.nodes.find((node) => node.id === "group").referenceOrder, ["a", "b"]);
  assert.deepEqual(encodeCanvasReferencePage(restored), encoded);
});

test("direct-only order uses the existing reference array without cloud draft extensions", () => {
  const original = { nodes: [{ id: "target", type: "imageGenerator", position: { x: 0, y: 0 } }], edges: [],
    generators: { target: { draft: { ...draft, referenceOrder: [`direct:${uuid(12)}`, `direct:${uuid(11)}`] },
      directReferenceIds: [uuid(11), uuid(12)] } }, convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } };
  const encoded = encodeCanvasReferencePage(original);
  assert.deepEqual(decodeCanvasReferencePage(encoded).generators.target.directReferenceIds, [uuid(12), uuid(11)]);
  assert.doesNotThrow(() => validateCanvasProjectSave({ expectedVersion: null, name: "画布", document: { ...encoded, schemaVersion: 1 } }));
});

test("copying remaps linked source identities, keeps direct references and omits uncopied sources", () => {
  assert.deepEqual(remapCanvasReferenceOrder(["linked:a", `direct:${uuid(11)}`, "linked:outside"], new Map([["a", "copy-a"]])),
    ["linked:copy-a", `direct:${uuid(11)}`]);
  assert.equal(remapCanvasReferenceOrder(undefined, new Map()), undefined);
});

test("ranked cloud group IDs remain unique and reversible across pages", () => {
  const pages = [page("-1"), page("-2")].map((value, index) => ({ ...encodeCanvasReferencePage(value, index),
    id: `page-${index}`, name: `页面${index + 1}` }));
  assert.equal(new Set(pages.flatMap((value) => value.edges.map((item) => item.id))).size, 10);
  const document = { schemaVersion: 2, pages };
  assert.doesNotThrow(() => validateCanvasProjectSave({ expectedVersion: null, name: "画布", document }));
  const restored = decodeCanvasReferenceDocument(document);
  assert.deepEqual(restored.pages[0].generators["target-1"].draft.referenceOrder, page("-1").generators["target-1"].draft.referenceOrder);
  assert.deepEqual(restored.pages[1].generators["target-2"].draft.referenceOrder, page("-2").generators["target-2"].draft.referenceOrder);
});

test("long legacy edge IDs keep valid cloud IDs and converted references after normalization", () => {
  const original = page();
  const longId = "x".repeat(160);
  original.edges[1] = { ...original.edges[1], id: longId };
  original.convertedReferences[longId] = uuid(23);
  const encoded = encodeCanvasReferencePage(original);
  assert.ok(encoded.edges.every((item) => item.id.length <= 160));
  assert.doesNotThrow(() => validateCanvasProjectSave({ expectedVersion: null, name: "画布", document: { ...encoded, schemaVersion: 1 } }));
  const restored = decodeCanvasReferencePage(encoded);
  const sourceEdge = restored.edges.find((item) => item.source === "c");
  assert.equal(restored.convertedReferences[sourceEdge.id], uuid(23));
  assert.deepEqual(restored.generators.target.draft.referenceOrder, original.generators.target.draft.referenceOrder);
});
