import test from "node:test";
import assert from "node:assert/strict";
import { canvasReferenceDragLayout } from "../features/canvas/canvas-reference-drag-layout.mjs";

const slots = Object.freeze(["a", "b", "c", "d"].map((key, index) =>
  Object.freeze({ key, left: index * 62, width: 54 })));

test("crossing stable slot midpoints opens the next slot without animated hit testing", () => {
  assert.deepEqual(canvasReferenceDragLayout(slots, "a", 30), { target: "a", offsets: [30, 0, 0, 0] });
  assert.deepEqual(canvasReferenceDragLayout(slots, "a", 32), { target: "b", offsets: [32, -62, 0, 0] });
  assert.deepEqual(canvasReferenceDragLayout(slots, "a", 110), { target: "c", offsets: [110, -62, -62, 0] });
  assert.deepEqual(canvasReferenceDragLayout(slots, "a", 20), { target: "a", offsets: [20, 0, 0, 0] });
});

test("leftward drag shifts only the intervening references to the right", () => {
  assert.deepEqual(canvasReferenceDragLayout(slots, "d", -110), { target: "b", offsets: [0, 62, 62, -110] });
  assert.deepEqual(canvasReferenceDragLayout(slots, "c", -32), { target: "b", offsets: [0, 62, -32, 0] });
  assert.deepEqual(slots.map((slot) => slot.key), ["a", "b", "c", "d"]);
});

test("measured slot spacing drives displacement, with drag bounded to the image row", () => {
  const spaced = slots.map((slot, index) => ({ ...slot, left: [4, 66, 146, 212][index] }));
  assert.deepEqual(canvasReferenceDragLayout(spaced, "a", 125), { target: "c", offsets: [125, -62, -80, 0] });
  assert.deepEqual(canvasReferenceDragLayout(slots, "b", -1000), { target: "a", offsets: [62, -62, 0, 0] });
  assert.deepEqual(canvasReferenceDragLayout(slots, "b", 1000), { target: "d", offsets: [0, 124, -62, -62] });
});

test("empty, single, missing and nonfinite drag inputs provide no sorting preview", () => {
  assert.equal(canvasReferenceDragLayout([], "a", 10), null);
  assert.equal(canvasReferenceDragLayout(slots.slice(0, 1), "a", 10), null);
  assert.equal(canvasReferenceDragLayout(slots, "missing", 10), null);
  assert.equal(canvasReferenceDragLayout(slots, "a", NaN), null);
  assert.equal(canvasReferenceDragLayout(slots, "a", Infinity), null);
});
