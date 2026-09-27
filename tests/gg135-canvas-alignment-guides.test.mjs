import assert from "node:assert/strict";
import test from "node:test";

import { canvasAlignmentGuides, snapCanvasNodes } from "../features/canvas/canvas-alignment-guides.mjs";

test("canvas alignment guides remain quiet without another measured image", () => {
  const moving = { x: 100, y: 90, width: 100, height: 80 };
  assert.equal(canvasAlignmentGuides(moving, []), null);
  assert.equal(canvasAlignmentGuides(moving, [{ x: 100, y: 90, width: 0, height: 80 }]), null);
});

test("canvas guides calculate exact edge and center alignment offsets", () => {
  const moving = { x: 102, y: 90, width: 100, height: 80 };
  const target = { x: 0, y: 100, width: 100, height: 60 };
  const original = structuredClone(moving);
  assert.deepEqual(canvasAlignmentGuides(moving, [target]), {
    vertical: { x: 100, y1: 78, y2: 182 },
    horizontal: { y: 130, x1: -12, x2: 214 },
    offset: { x: -2, y: 0 },
  });
  assert.deepEqual(moving, original);
});

test("guide tolerance follows screen pixels at different zoom levels", () => {
  const moving = { x: 107, y: 500, width: 100, height: 80 };
  const target = { x: 0, y: 200, width: 100, height: 80 };
  assert.equal(canvasAlignmentGuides(moving, [target], 2), null);
  assert.deepEqual(canvasAlignmentGuides(moving, [target], 1)?.vertical, {
    x: 100, y1: 188, y2: 592,
  });
  assert.deepEqual(canvasAlignmentGuides(moving, [target], 1)?.offset, { x: -7, y: 0 });
  assert.equal(canvasAlignmentGuides(moving, [target], 1)?.horizontal, null);
});

test("guides favor the closest anchor and allow distant images on the same axis", () => {
  const moving = { x: 104, y: 0, width: 100, height: 80 };
  const farther = { x: 100, y: 20, width: 40, height: 80 };
  const nearer = { x: 103, y: 30, width: 40, height: 80 };
  const remote = { x: 104, y: 500, width: 40, height: 80 };
  assert.equal(canvasAlignmentGuides(moving, [remote])?.vertical?.x, 104);
  assert.equal(canvasAlignmentGuides(moving, [farther, nearer])?.vertical?.x, 103);
});

test("snapping a dragged group preserves spacing and leaves other images alone", () => {
  const nodes = [
    { id: "a", position: { x: 104, y: 55 } },
    { id: "b", position: { x: 224, y: 85 } },
    { id: "target", position: { x: 100, y: 70 } },
  ];
  const snapped = snapCanvasNodes(nodes, new Set(["a", "b"]), { x: -4, y: 7 });
  assert.deepEqual(snapped.map((node) => node.position), [
    { x: 100, y: 62 },
    { x: 220, y: 92 },
    { x: 100, y: 70 },
  ]);
  assert.deepEqual(nodes[0].position, { x: 104, y: 55 });
  assert.equal(snapped[2], nodes[2]);
  assert.equal(snapCanvasNodes(nodes, new Set(["a"]), { x: 0, y: 0 }), nodes);
});
