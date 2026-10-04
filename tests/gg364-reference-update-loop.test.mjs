import test from "node:test";
import assert from "node:assert/strict";
import { createCanvasReferenceEdgeView } from "../features/canvas/canvas-reference-edge-view.mjs";

const edge = (id, source = id) => ({ id, source, target: "generator", sourceHandle: "reference", targetHandle: "reference" });

// Each controlled-edge write notifies the parent, which computes the view again.
// A fresh but equivalent count map must converge instead of causing more writes.
function settleControlledEdges(project, edges, getCounts, initialStoreEdges = edges) {
  let storeEdges = initialStoreEdges;
  let writes = 0;
  for (let pass = 0; pass < 4; pass += 1) {
    const visible = project(edges, getCounts());
    if (visible === storeEdges) return { edges: visible, writes };
    storeEdges = visible;
    writes += 1;
  }
  assert.fail("controlled edge notifications did not settle");
}

test("empty and ordinary graphs do not feed new edge arrays back into the store", () => {
  for (const edges of [[], [edge("single")]]) {
    const result = settleControlledEdges(createCanvasReferenceEdgeView(), edges, () => new Map());
    assert.equal(result.edges, edges);
    assert.equal(result.writes, 0);
  }
});

test("group counts converge after one update and unrelated graph notifications do not restart the loop", () => {
  const group = edge("batch", "group"), ordinary = edge("single");
  const edges = [group, ordinary];
  const project = createCanvasReferenceEdgeView();
  const first = settleControlledEdges(project, edges, () => new Map([["batch", 5]]));
  assert.equal(first.writes, 1);
  assert.equal(first.edges[0].label, "5张");
  assert.equal(first.edges[1], ordinary);
  assert.equal(group.label, undefined);
  const unchanged = settleControlledEdges(project, [...edges], () => new Map([["batch", 5]]), first.edges);
  assert.equal(unchanged.writes, 0);
  assert.equal(unchanged.edges, first.edges);
  const excluded = settleControlledEdges(project, edges, () => new Map([["batch", 4]]), first.edges);
  assert.equal(excluded.writes, 1);
  assert.equal(excluded.edges[0].label, "4张");
  assert.equal(excluded.edges[0].ariaLabel, "4张参考图，点击查看");
});

test("real edge edits, ordering, removal and restoration propagate while unchanged group edges remain stable", () => {
  const group = edge("batch", "group"), ordinary = edge("single");
  const project = createCanvasReferenceEdgeView();
  const counts = new Map([["batch", 2]]);
  const first = project([group, ordinary], counts);
  const edited = { ...ordinary, selected: true, target: "other" };
  const changed = project([group, edited], counts);
  assert.equal(changed[0], first[0]);
  assert.equal(changed[1], edited);
  const reordered = project([edited, group], counts);
  assert.equal(reordered[0], edited);
  assert.equal(reordered[1], first[0]);
  assert.deepEqual(project([], new Map()), []);
  assert.equal(project([group], new Map())[0], group);
  const restored = settleControlledEdges(project, [group], () => new Map([["batch", 0]]));
  assert.equal(restored.writes, 1);
  assert.equal(restored.edges[0].label, "0张");
});
