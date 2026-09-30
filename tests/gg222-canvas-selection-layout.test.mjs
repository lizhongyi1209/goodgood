import assert from "node:assert/strict";
import test from "node:test";

import { arrangeCanvasSelection, generatorStackInsets, unionCanvasBounds } from "../features/canvas/canvas-selection-layout.mjs";

function item(id, x, y, width, height, top = 22, right = 0, bottom = 0) {
  return { id, position: { x, y }, bounds: { x, y: y - top, width: width + right, height: height + top + bottom } };
}

function movedBounds(entry, positions) {
  const position = positions.get(entry.id) ?? entry.position;
  return { ...entry.bounds, x: entry.bounds.x + position.x - entry.position.x, y: entry.bounds.y + position.y - entry.position.y };
}

test("selection frame includes metadata and complete expanded output footprints", () => {
  const stack = generatorStackInsets(238, 4, true);
  assert.deepEqual(stack, { right: 750, bottom: 0 });
  const bounds = unionCanvasBounds([item("batch", 100, 100, 238, 160, 22, stack.right).bounds, item("image", 10, 50, 120, 200).bounds]);
  assert.deepEqual(bounds, { x: 10, y: 28, width: 1078, height: 232 });
});

test("collapsed batches include only the two visible back cards", () => {
  assert.deepEqual(generatorStackInsets(238, 17, false), generatorStackInsets(238, 3, false));
  assert.deepEqual(generatorStackInsets(238, 1, false), { right: 0, bottom: 0 });
  assert.deepEqual(generatorStackInsets(100, 3, false), { right: 12, bottom: 8 });
});

test("six alignment actions align visible edges and centers without resizing", () => {
  const items = [item("a", 0, 50, 100, 300), item("b", 250, 300, 260, 80, 22, 24, 8)];
  const snapshot = structuredClone(items);
  for (const [action, edge] of [
    ["left", (b) => b.x], ["center-x", (b) => b.x + b.width / 2], ["right", (b) => b.x + b.width],
    ["top", (b) => b.y], ["center-y", (b) => b.y + b.height / 2], ["bottom", (b) => b.y + b.height],
  ]) {
    const positions = arrangeCanvasSelection(items, action);
    assert.equal(edge(movedBounds(items[0], positions)), edge(movedBounds(items[1], positions)), action);
    for (const [id, position] of positions) {
      assert.deepEqual(Object.keys(position).sort(), ["x", "y"]);
      assert.ok(items.some((entry) => entry.id === id));
    }
  }
  assert.deepEqual(items, snapshot);
});

test("tidy grid preserves stable reading order and keeps mixed footprints apart", () => {
  const stack = generatorStackInsets(180, 5, true);
  const items = [item("c", 250, 150, 180, 250, 22, stack.right), item("a", 20, 50, 80, 300),
    item("e", 700, 250, 400, 80, 0), item("b", 150, 50, 350, 90), item("d", 20, 250, 140, 240)];
  const snapshot = structuredClone(items);
  const positions = arrangeCanvasSelection(items, "tidy");
  const arranged = items.map((entry) => movedBounds(entry, positions));
  for (let first = 0; first < arranged.length; first += 1) {
    for (let second = first + 1; second < arranged.length; second += 1) {
      const a = arranged[first];
      const b = arranged[second];
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
    }
  }
  const [a, b, c, d, e] = ["a", "b", "c", "d", "e"].map((id) => movedBounds(items.find((entry) => entry.id === id), positions));
  assert.ok(a.x < b.x && b.x < c.x);
  assert.equal(a.y, b.y);
  assert.equal(b.y, c.y);
  assert.ok(d.y > a.y && e.x > d.x);
  assert.deepEqual(items, snapshot);
  const settled = items.map((entry) => ({ ...entry, position: positions.get(entry.id) ?? entry.position, bounds: movedBounds(entry, positions) }));
  assert.equal(arrangeCanvasSelection(settled, "tidy").size, 0);
});

test("empty, single, unmeasured, and invalid selections produce no edits", () => {
  assert.equal(arrangeCanvasSelection([], "tidy").size, 0);
  assert.equal(arrangeCanvasSelection([item("a", 0, 0, 100, 100)], "tidy").size, 0);
  assert.equal(unionCanvasBounds([]), null);
  assert.equal(arrangeCanvasSelection([item("a", 0, 0, 0, 100), item("b", 200, 0, 100, 100)], "left").size, 0);
  assert.equal(arrangeCanvasSelection([item("a", NaN, 0, 100, 100), item("b", 200, 0, 100, 100)], "tidy").size, 0);
  assert.deepEqual(generatorStackInsets(100, NaN, true), { right: 0, bottom: 0 });
});

test("already aligned positions remain a no-op", () => {
  assert.equal(arrangeCanvasSelection([item("a", 40, 0, 100, 100), item("b", 40, 200, 300, 100)], "left").size, 0);
});
