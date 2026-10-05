import test from "node:test";
import assert from "node:assert/strict";
import { pageCanvasBatchReferences, CANVAS_BATCH_COMBINATIONS_PER_PAGE } from "../features/canvas/canvas-batch-reference-page.mjs";
import { planCanvasBatchReferences } from "../features/canvas/canvas-batch-reference-plan.mjs";

const item = (id, status = "ready") => ({ key: "linked:" + id, previewUrl: "/private/" + id,
  reference: { id, status, name: id + ".png" } });
const group = (id, items) => ({ id, name: id, items });
const ids = (combination) => combination.items.map((entry) => entry.reference.id);

function collectPages(common, groups, mode) {
  const first = pageCanvasBatchReferences(common, groups, mode);
  const collected = [];
  for (let page = 1; page <= first.pageCount; page += 1) {
    const current = pageCanvasBatchReferences(common, groups, mode, page);
    assert.equal(current.page, page);
    assert.equal(current.pageSize, CANVAS_BATCH_COMBINATIONS_PER_PAGE);
    assert.equal(current.combinations.length <= 12, true);
    collected.push(...current.combinations);
  }
  return collected;
}

test("all pages cover the exact planner order and keys without missing or repeated combinations", () => {
  const common = [item("background")];
  const groups = [group("subject", [item("m1"), item("m2"), item("m3")]),
    group("material", Array.from({ length: 7 }, (_, index) => item("c" + index))),
    group("detail", [item("a1"), item("a2")])];
  const expected = [...planCanvasBatchReferences(common, groups, "all").combinations()];
  const actual = collectPages(common, groups, "all");
  assert.deepEqual(actual, expected);
  assert.equal(actual.length, 42);
  assert.equal(new Set(actual.map((entry) => entry.key)).size, 42);
  const last = pageCanvasBatchReferences(common, groups, "all", 4);
  assert.equal(last.pageCount, 4);
  assert.equal(last.combinations.length, 6);
  assert.deepEqual(last.combinations.map((entry) => entry.index), [36, 37, 38, 39, 40, 41]);
});

test("deduplicated pools/jobs match planner semantics and preserve first source wrappers", () => {
  const publicFirst = item("public"), choiceFirst = item("same");
  const common = [publicFirst, item("public")];
  const groups = [group("one", [choiceFirst, item("same"), item("public")]), group("two", [item("same"), item("public")])];
  const current = pageCanvasBatchReferences(common, groups, "all");
  assert.equal(current.total, 4);
  assert.deepEqual(current.combinations, [...planCanvasBatchReferences(common, groups, "all").combinations()]);
  assert.deepEqual(current.combinations.map(ids), [["public", "same"], ["public", "same"], ["public", "same"], ["public"]]);
  assert.equal(current.combinations[0].items[0], publicFirst);
  assert.equal(current.combinations[0].items[1], choiceFirst);
  assert.equal(common.length, 2);
  assert.equal(groups[0].items.length, 3);
});

test("paired pages reuse singleton groups and directly select matching positions", () => {
  const common = [item("background")];
  const groups = [group("subject", Array.from({ length: 25 }, (_, index) => item("m" + index))),
    group("material", Array.from({ length: 25 }, (_, index) => item("c" + index))), group("detail", [item("hat")])];
  assert.deepEqual(collectPages(common, groups, "paired"), [...planCanvasBatchReferences(common, groups, "paired").combinations()]);
  const last = pageCanvasBatchReferences(common, groups, "paired", 3);
  assert.equal(last.total, 25);
  assert.equal(last.pageCount, 3);
  assert.equal(last.combinations.length, 1);
  assert.deepEqual(ids(last.combinations[0]), ["background", "m24", "c24", "hat"]);
  assert.equal(last.combinations[0].index, 24);
});

test("out-of-range pages clamp while malformed requests start on page one", () => {
  const groups = [group("pool", Array.from({ length: 26 }, (_, index) => item("image" + index)))];
  for (const requested of [-1, 0, 0.5, NaN, Infinity]) {
    assert.equal(pageCanvasBatchReferences([], groups, "all", requested).page, 1);
  }
  assert.equal(pageCanvasBatchReferences([], groups, "all", 999).page, 3);
  assert.equal(pageCanvasBatchReferences([], groups, "all", Number.MAX_SAFE_INTEGER).page, 3);
  assert.equal(pageCanvasBatchReferences([], groups, "all", 2).combinations[0].index, 12);
});

test("near-trillion-scale late pages expand only their twelve requested rows by mixed radix", () => {
  const groups = Array.from({ length: 5 }, (_, index) => group("pool" + index,
    Array.from({ length: 1000 }, (_, candidate) => item(index + "-" + candidate))));
  const total = 1_000_000_000_000_000;
  const lastNumber = Number((BigInt(total) + 11n) / 12n);
  const last = pageCanvasBatchReferences([], groups, "all", lastNumber);
  assert.equal(last.total, total);
  assert.equal(last.pageCount, lastNumber);
  assert.equal(last.page, lastNumber);
  assert.equal(last.combinations.length, 4);
  assert.equal(last.combinations[0].index, total - 4);
  assert.deepEqual(ids(last.combinations[0]), ["0-999", "1-999", "2-999", "3-999", "4-996"]);
  assert.deepEqual(ids(last.combinations.at(-1)), ["0-999", "1-999", "2-999", "3-999", "4-999"]);
  const previous = pageCanvasBatchReferences([], groups, "all", lastNumber - 1);
  assert.equal(previous.combinations.length, 12);
  assert.equal(previous.combinations.at(-1).index + 1, last.combinations[0].index);
});

test("loading/failure and per-job capacity errors preserve inspectable quantities", () => {
  for (const mode of ["all", "paired"]) {
    for (const status of ["uploading", "failed"]) {
      const groups = [group("pool", Array.from({ length: 17 }, (_, index) => item("image" + index, index === 16 ? status : "ready")))];
      const current = pageCanvasBatchReferences([item("public")], groups, mode, 2);
      assert.equal(current.total, 17);
      assert.equal(current.combinations.length, 5);
      assert.match(current.error, status === "failed" ? /失败/ : /正在准备/);
      assert.equal(current.combinations.at(-1).items.at(-1).reference.status, status);
    }
  }
  const common = Array.from({ length: 10 }, (_, index) => item("public" + index));
  const capped = pageCanvasBatchReferences(common, [group("pool", [item("extra")])], "all");
  assert.equal(capped.total, 1);
  assert.match(capped.error, /10/);
  assert.equal(capped.combinations[0].items.length, 11);
});

test("empty, invalid modes/groups, paired mismatch, and unsafe totals produce bounded empty pages", () => {
  const cases = [
    [[], [], "all"],
    [[item("public")], [group("empty", [])], "all"],
    [[], [group("one", [item("a"), item("b")]), group("two", [item("c"), item("d"), item("e")])], "paired"],
    [[], [group("pool", [item("a")])], "unknown"],
    [[], Array.from({ length: 6 }, (_, index) => group("pool" + index, [item("a")])), "all"],
    [[], Array.from({ length: 5 }, (_, index) => group("pool" + index,
      Array.from({ length: 1600 }, (_, candidate) => item(index + "-" + candidate)))), "all"],
  ];
  for (const [common, groups, mode] of cases) {
    const current = pageCanvasBatchReferences(common, groups, mode, 999);
    assert.equal(current.total, 0);
    assert.equal(current.page, 1);
    assert.equal(current.pageCount, 0);
    assert.equal(current.pageSize, 12);
    assert.deepEqual(current.combinations, []);
    assert.equal(typeof current.error, "string");
  }
});
