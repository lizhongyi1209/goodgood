import test from "node:test";
import assert from "node:assert/strict";
import { compactCanvasBatchGroupsAfterRemoval, canvasBatchEdgesWithConfiguration }
  from "../features/canvas/canvas-batch-reference-removal.mjs";
import { canvasReferenceInputs } from "../features/canvas/canvas-reference-sources.mjs";
import { canvasBatchGroupCountFromEdges } from "../features/canvas/canvas-batch-reference-model.mjs";
import { planCanvasBatchReferences } from "../features/canvas/canvas-batch-reference-plan.mjs";

const target = "batch-generator-example";
const generator = (id = target, groupCount = 2, mode = "all") => ({ id, type: "imageGenerator",
  data: { batchGroupCount: groupCount, batchMode: mode, slots: [{ id: "frozen-slot" }] } });
const image = (id, status = "ready", parentId) => ({ id, type: "sourceImage", ...(parentId ? { parentId } : {}),
  position: { x: 0, y: 0 }, data: { assetId: id, assetKind: "reference", name: id, previewUrl: "/" + id, uploadState: status } });
const edge = (id, source, index, targetId = target, mode = "all") => ({ id, source, target: targetId,
  sourceHandle: "reference", targetHandle: index ? "batch-" + mode + "-" + index : "reference" });
const port = (result, id) => result.edges.find((value) => value.id === id)?.targetHandle;
const configuration = (result, id = target) => result.configurations.find((value) => value.id === id);

test("removing the last middle-group image compacts later ports without losing collections or conversion keys", () => {
  const album = { id: "group-album", type: "group", data: { referenceOrder: ["c", "d"] } };
  const nodes = [generator(target, 4, "paired"), image("common"), image("a"), image("b"), album,
    image("c", "ready", album.id), image("d", "ready", album.id), generator("ordinary"), image("ordinary-image")];
  const before = [edge("public", "common", 0), edge("first", "a", 1, target, "paired"),
    edge("removed", "b", 2, target, "paired"), edge("later-collection", album.id, 3, target, "paired"),
    edge("ordinary-ref", "ordinary-image", 0, "ordinary")];
  const original = JSON.stringify({ nodes, before });
  const converted = { "later-collection:c": { id: "converted-c" }, "later-collection:d": { id: "converted-d" } };
  const result = compactCanvasBatchGroupsAfterRemoval(nodes, before, before.filter((value) => value.id !== "removed"));
  assert.deepEqual(configuration(result), { id: target, mode: "paired", groupCount: 3 });
  assert.equal(port(result, "first"), "batch-paired-1");
  assert.equal(port(result, "later-collection"), "batch-paired-2");
  assert.equal(port(result, "public"), "reference");
  assert.equal(result.edges.find((value) => value.id === "ordinary-ref"), before.at(-1));
  const members = canvasReferenceInputs(nodes, result.edges).filter((input) => input.edgeId === "later-collection");
  assert.deepEqual(members.map((input) => input.sourceId), ["c", "d"]);
  assert.deepEqual(members.map((input) => converted[input.key].id), ["converted-c", "converted-d"]);
  assert.equal(canvasBatchGroupCountFromEdges(result.edges, target, configuration(result).groupCount), 3);
  assert.equal(JSON.stringify({ nodes, before }), original);
});

test("partial collection removal retains the group; removing its last member removes the extra port", () => {
  const group = { id: "group-images", type: "group", data: { referenceOrder: ["b", "c"] } };
  const nodes = [generator(), image("a"), group, image("b", "ready", group.id), image("c", "ready", group.id)];
  const before = [edge("first", "a", 1), edge("collection", group.id, 2)];
  const partial = [before[0], { ...before[1], data: { excludedSourceIds: ["b"] } }];
  const kept = compactCanvasBatchGroupsAfterRemoval(nodes, before, partial);
  assert.deepEqual(kept.configurations, []);
  assert.deepEqual(canvasReferenceInputs(nodes, kept.edges).filter((input) => input.edgeId === "collection")
    .map((input) => input.sourceId), ["c"]);
  const removed = compactCanvasBatchGroupsAfterRemoval(nodes, partial, [before[0]]);
  assert.equal(configuration(removed).groupCount, 1);
  assert.deepEqual(removed.edges, [before[0]]);
});

test("other edges in the same group keep it alive after one reference connection is deleted", () => {
  const nodes = [generator(), image("a"), image("b"), image("c")];
  const before = [edge("first", "a", 1), edge("second-b", "b", 2), edge("second-c", "c", 2)];
  const result = compactCanvasBatchGroupsAfterRemoval(nodes, before, before.filter((value) => value.id !== "second-b"));
  assert.deepEqual(result.configurations, []);
  assert.equal(port(result, "second-c"), "batch-all-2");
});

test("the single default entry remains after its last reference is explicitly removed", () => {
  const nodes = [generator(target, 1), image("a"), image("common")];
  const before = [edge("public", "common", 0), edge("first", "a", 1)];
  const result = compactCanvasBatchGroupsAfterRemoval(nodes, before, [before[0]]);
  assert.equal(configuration(result).groupCount, 1);
  assert.equal(canvasBatchGroupCountFromEdges(result.edges, target, configuration(result).groupCount), 1);
  assert.deepEqual(result.edges, [before[0]]);
});

test("new empty groups and public/ordinary removals never trigger candidate pruning", () => {
  const nodes = [generator(target, 3, "paired"), generator("ordinary"), image("a"), image("common"), image("normal")];
  const before = [edge("first", "a", 1, target, "paired"), edge("public", "common", 0), edge("ordinary-ref", "normal", 0, "ordinary")];
  assert.deepEqual(compactCanvasBatchGroupsAfterRemoval(nodes, before, before).configurations, []);
  const result = compactCanvasBatchGroupsAfterRemoval(nodes, before, [before[0]]);
  assert.deepEqual(result.configurations, []);
  assert.equal(port(result, "first"), "batch-paired-1");
  assert.equal(canvasBatchGroupCountFromEdges(result.edges, target, nodes[0].data.batchGroupCount), 3);
  assert.deepEqual(compactCanvasBatchGroupsAfterRemoval([], before, []).configurations, []);
});

test("loading and failed references occupy the group until explicitly removed", () => {
  const nodes = [generator(), image("a"), image("loading", "uploading"), image("failed", "failed")];
  const before = [edge("first", "a", 1), edge("loading-edge", "loading", 2), edge("failed-edge", "failed", 2)];
  const partial = before.filter((value) => value.id !== "loading-edge");
  assert.deepEqual(compactCanvasBatchGroupsAfterRemoval(nodes, before, partial).configurations, []);
  assert.equal(configuration(compactCanvasBatchGroupsAfterRemoval(nodes, partial, [before[0]])).groupCount, 1);
});

test("several simultaneous removals compact only their own generator and preserve a usable plan", () => {
  const other = "batch-generator-other";
  const nodes = [generator(target, 3), generator(other), image("a"), image("b"), image("c"), image("common"), image("other")];
  const before = [edge("first", "a", 1), edge("second", "b", 2), edge("third", "c", 3),
    edge("public", "common", 0), edge("other-second", "other", 2, other)];
  const result = compactCanvasBatchGroupsAfterRemoval(nodes, before, before.filter((value) => !["first", "third"].includes(value.id)));
  assert.deepEqual(result.configurations, [{ id: target, mode: "all", groupCount: 1 }]);
  assert.equal(port(result, "second"), "batch-all-1");
  assert.equal(port(result, "other-second"), "batch-all-2");
  const item = (id) => ({ reference: { id, name: id, status: "ready" } });
  const plan = planCanvasBatchReferences([item("common")], [{ id: "1", name: "素材组 1", items: [item("b")] }], "all");
  assert.equal(plan.ready, true);
  assert.equal(plan.total, 1);
  assert.deepEqual(plan.preview[0].items.map((value) => value.reference.id), ["common", "b"]);
});

test("explicit group removal and mode changes share stable port remapping", () => {
  const edges = [edge("public", "a", 0), edge("first", "b", 1), edge("middle", "c", 2), edge("last", "d", 3),
    edge("ordinary", "a", 0, "ordinary")];
  const removed = canvasBatchEdgesWithConfiguration(edges, target, "paired", [2]);
  assert.deepEqual(removed.map((value) => value.id), ["public", "first", "last", "ordinary"]);
  assert.equal(port({ edges: removed }, "first"), "batch-paired-1");
  assert.equal(port({ edges: removed }, "last"), "batch-paired-2");
  const restored = canvasBatchEdgesWithConfiguration(removed, target, "all");
  assert.equal(port({ edges: restored }, "last"), "batch-all-2");
  assert.equal(restored[0], edges[0]);
  assert.equal(restored.at(-1), edges.at(-1));
});
