import test from "node:test";
import assert from "node:assert/strict";
import { planCanvasBatchReferences, validateCanvasBatchReferenceCapacity, CANVAS_BATCH_PREVIEW_LIMIT }
  from "../features/canvas/canvas-batch-reference-plan.mjs";

const item = (id, status = "ready") => ({ reference: { id, status, name: id + ".png" }, previewUrl: "/" + id, orderKey: "linked:" + id });
const pool = (id, items) => ({ id, name: id, items });
const ids = (items) => items.map((value) => value.reference.id);
const histogram = (plan) => [...plan.referenceCounts].sort(([a], [b]) => a - b);

// A small exhaustive oracle uses only sets, independent of the production
// overlap-counting algorithm. Large products deliberately never use this helper.
function exhaustive(common, groups, mode) {
  let selected = [[]];
  if (mode === "all") {
    for (const group of groups) selected = selected.flatMap((prefix) => group.items.map((choice) => [...prefix, choice]));
  } else {
    selected = Array.from({ length: Math.max(...groups.map((group) => group.items.length)) }, (_, index) =>
      groups.map((group) => group.items[group.items.length === 1 ? 0 : index]));
  }
  const counts = new Map();
  for (const choices of selected) {
    const count = new Set([...common, ...choices].map((value) => value.reference.id)).size;
    counts.set(count, (counts.get(count) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a - b);
}

test("public references accompany every job; one through five independent pools preserve source order", () => {
  const common = [item("model"), item("background")];
  for (let count = 1; count <= 5; count += 1) {
    const groups = Array.from({ length: count }, (_, index) => pool("group-" + index, [item("a-" + index), item("b-" + index)]));
    const plan = planCanvasBatchReferences(common, groups, "all");
    assert.equal(plan.valid, true);
    assert.equal(plan.ready, true);
    assert.equal(plan.error, null);
    assert.equal(plan.total, 2 ** count);
    assert.deepEqual(histogram(plan), [[2 + count, 2 ** count]]);
    const combinations = [...plan.combinations()];
    assert.equal(combinations.length, plan.total);
    assert.equal(new Set(combinations.map((combination) => combination.key)).size, plan.total);
    assert.deepEqual(combinations.map((combination) => combination.index), Array.from({ length: plan.total }, (_, index) => index));
    assert.deepEqual(ids(combinations[0].items), ["model", "background", ...groups.map((_, index) => "a-" + index)]);
    assert.deepEqual(ids(combinations.at(-1).items), ["model", "background", ...groups.map((_, index) => "b-" + index)]);
    assert.equal(combinations[0].items[0], common[0]);
    assert.equal(combinations[0].items[2], groups[0].items[0]);
  }
});

test("candidate pool totals may exceed ten; the cap is the actual deduplicated per-job input", () => {
  const clothes = pool("clothes", Array.from({ length: 25 }, (_, index) => item("clothes-" + index)));
  const accessories = pool("accessories", Array.from({ length: 17 }, (_, index) => item("accessory-" + index)));
  const plan = planCanvasBatchReferences([item("model")], [clothes, accessories], "all");
  assert.equal(plan.total, 425);
  assert.equal(plan.ready, true);
  assert.deepEqual(histogram(plan), [[3, 425]]);
  assert.equal(plan.preview.length, CANVAS_BATCH_PREVIEW_LIMIT);
  const ten = Array.from({ length: 9 }, (_, index) => item("common-" + index));
  assert.equal(planCanvasBatchReferences(ten, [clothes], "all").ready, true);
  const eleven = planCanvasBatchReferences([...ten, item("common-9")], [clothes], "all");
  assert.equal(eleven.valid, false);
  assert.equal(eleven.ready, false);
  assert.match(eleven.error, /10/);
  assert.equal(eleven.total, 25);
  assert.equal(eleven.preview.length, 6);
  assert.deepEqual(histogram(eleven), [[11, 25]]);
});

test("duplicate identities collapse inside pools and jobs, retaining the first original wrapper", () => {
  const first = item("model"), duplicate = { ...item("model"), extra: "later" };
  const clothes = item("clothes");
  const groups = [pool("a", [duplicate, clothes, item("clothes")]), pool("b", [item("model"), item("clothes")])];
  const common = [first, duplicate];
  const plan = planCanvasBatchReferences(common, groups, "all");
  assert.equal(plan.total, 4);
  assert.deepEqual(histogram(plan), [[1, 1], [2, 3]]);
  assert.deepEqual([...plan.combinations()].map((combination) => ids(combination.items)),
    [["model"], ["model", "clothes"], ["model", "clothes"], ["model", "clothes"]]);
  assert.equal(new Set([...plan.combinations()].map((combination) => combination.key)).size, 4);
  assert.equal(plan.preview[0].items[0], first);
  assert.equal(plan.preview.at(-1).items[1], clothes);
  assert.deepEqual(common, [first, duplicate]);
  assert.equal(groups[0].items.length, 3);
});

test("paired mode matches positions and reuses singleton groups without inventing missing pairings", () => {
  const groups = [pool("models", [item("m1"), item("m2"), item("m3")]), pool("clothes", [item("c1"), item("c2"), item("c3")]),
    pool("accessory", [item("hat")])];
  const plan = planCanvasBatchReferences([item("background")], groups, "paired");
  assert.equal(plan.ready, true);
  assert.equal(plan.total, 3);
  assert.deepEqual([...plan.combinations()].map((combination) => ids(combination.items)),
    [["background", "m1", "c1", "hat"], ["background", "m2", "c2", "hat"], ["background", "m3", "c3", "hat"]]);
  assert.deepEqual(histogram(plan), [[4, 3]]);
  const mismatch = planCanvasBatchReferences([], [groups[0], pool("clothes", [item("c1"), item("c2")])], "paired");
  assert.equal(mismatch.valid, false);
  assert.equal(mismatch.total, 0);
  assert.match(mismatch.error, /数量需要相同/);
  assert.deepEqual([...mismatch.combinations()], []);
  assert.equal(planCanvasBatchReferences([], [pool("one", [item("a")]), pool("two", [item("b")])], "paired").total, 1);
});

test("the actual paired cap is allowed even if other Cartesian pairings would exceed ten", () => {
  const common = Array.from({ length: 9 }, (_, index) => item("common-" + index));
  const groups = [pool("one", [item("a"), item("b")]), pool("two", [item("a"), item("b")])];
  assert.equal(planCanvasBatchReferences(common, groups, "all").valid, false);
  const paired = planCanvasBatchReferences(common, groups, "paired");
  assert.equal(paired.ready, true);
  assert.deepEqual(histogram(paired), [[10, 2]]);
  assert.deepEqual(validateCanvasBatchReferenceCapacity(common, groups, "paired"), { valid: true, error: null, maxReferences: 10 });
  assert.equal(validateCanvasBatchReferenceCapacity(common, groups).maxReferences, 11);
});

test("all-mode histogram exactly accounts for arbitrary overlap between public refs and five pools", () => {
  const common = [item("shared"), item("common")];
  const groups = [pool("one", [item("shared"), item("x"), item("y")]), pool("two", [item("x"), item("y"), item("z")]),
    pool("three", [item("y"), item("z"), item("shared")]), pool("four", [item("x"), item("z"), item("common")]),
    pool("five", [item("x"), item("y"), item("shared")])];
  for (let length = 1; length <= groups.length; length += 1) {
    const current = groups.slice(0, length);
    for (const mode of ["all", "paired"]) {
      const plan = planCanvasBatchReferences(common, current, mode);
      assert.deepEqual(histogram(plan), exhaustive(common, current, mode));
      assert.equal([...plan.referenceCounts.values()].reduce((sum, count) => sum + count, 0), plan.total);
    }
  }
});

test("capacity matching allows zero/incomplete groups, shared choices, and reassignments", () => {
  const common = Array.from({ length: 8 }, (_, index) => item("common-" + index));
  assert.deepEqual(validateCanvasBatchReferenceCapacity(common, []), { valid: true, error: null, maxReferences: 8 });
  assert.equal(validateCanvasBatchReferenceCapacity(common, [pool("empty", [])]).maxReferences, 8);
  const overlapping = [pool("one", [item("a"), item("b")]), pool("two", [item("a")]), pool("three", [item("a"), item("b")])];
  assert.deepEqual(validateCanvasBatchReferenceCapacity(common, overlapping), { valid: true, error: null, maxReferences: 10 });
  const wider = [...overlapping, pool("four", [item("c")])];
  assert.equal(validateCanvasBatchReferenceCapacity(common, wider).maxReferences, 11);
  assert.equal(validateCanvasBatchReferenceCapacity(common, wider).valid, false);
  assert.equal(validateCanvasBatchReferenceCapacity([...common, item("a")], overlapping).maxReferences, 10);
  const shared = [pool("one", [common[0]]), pool("two", [common[1]])];
  assert.equal(validateCanvasBatchReferenceCapacity(common, shared).maxReferences, 8);
});

test("empty, malformed and over-five configurations fail without output; public refs alone do not launch a batch", () => {
  const configurations = [[], [pool("empty", [])], Array.from({ length: 6 }, (_, index) => pool("g" + index, [item("a")]))];
  for (const groups of configurations) {
    const plan = planCanvasBatchReferences([item("public")], groups, "all");
    assert.equal(plan.valid, false);
    assert.equal(plan.ready, false);
    assert.equal(plan.total, 0);
    assert.deepEqual(plan.preview, []);
    assert.equal(plan.referenceCounts.size, 0);
    assert.deepEqual([...plan.combinations()], []);
  }
  assert.equal(planCanvasBatchReferences([], [pool("a", [item(" ")])], "all").valid, false);
  assert.equal(planCanvasBatchReferences([], [pool("same", [item("a")]), pool("same", [item("b")])], "all").valid, false);
  assert.equal(planCanvasBatchReferences([], [pool("a", [item("a")])], "unknown").valid, false);
  assert.equal(validateCanvasBatchReferenceCapacity([], configurations[2]).valid, false);
});

test("pending and failed references keep quantities/preview, block readiness, and clear after source recovery", () => {
  for (const mode of ["all", "paired"]) {
    for (const status of ["uploading", "failed"]) {
      const groups = [pool("clothes", [item("a", status), item("b")])];
      const plan = planCanvasBatchReferences([item("model")], groups, mode);
      assert.equal(plan.valid, true);
      assert.equal(plan.ready, false);
      assert.equal(plan.total, 2);
      assert.equal(plan.preview.length, 2);
      assert.deepEqual(histogram(plan), [[2, 2]]);
      assert.match(plan.error, status === "failed" ? /失败/ : /正在准备/);
      assert.equal(planCanvasBatchReferences([item("model")], [pool("clothes", [item("a"), item("b")])], mode).ready, true);
    }
    assert.equal(planCanvasBatchReferences([item("public", "failed")], [pool("clothes", [item("a")])], mode).ready, false);
  }
  const shared = item("shared");
  assert.equal(planCanvasBatchReferences([shared], [pool("masked", [item("shared", "failed")])], "all").ready, true);
  assert.equal(planCanvasBatchReferences([], [pool("first", [shared]), pool("masked", [item("shared", "failed")])], "all").ready, true);
});

test("large products keep only a six-item preview and an exact histogram with a reusable lazy iterator", () => {
  const groups = Array.from({ length: 5 }, (_, group) => pool("group-" + group,
    Array.from({ length: 1000 }, (_, candidate) => item(group + "-" + candidate))));
  const plan = planCanvasBatchReferences([], groups, "all");
  assert.equal(plan.total, 1_000_000_000_000_000);
  assert.equal(plan.ready, true);
  assert.deepEqual(histogram(plan), [[5, plan.total]]);
  assert.equal(plan.preview.length, 6);
  const first = plan.combinations(), second = plan.combinations();
  assert.deepEqual(first.next().value, second.next().value);
  assert.equal(first.next().value.index, 1);
  assert.equal(second.next().value.index, 1);
  assert.equal(plan.preview.at(-1).index, 5);
  const overflow = groups.map((group, index) => pool(group.id,
    Array.from({ length: 1600 }, (_, candidate) => item(index + "-" + candidate))));
  const rejected = planCanvasBatchReferences([], overflow, "all");
  assert.equal(rejected.valid, false);
  assert.match(rejected.error, /组合数量过多/);
  assert.equal(rejected.total, 0);
});
