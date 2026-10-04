import test from "node:test";
import assert from "node:assert/strict";
import { regionFromPoints } from "../features/canvas/canvas-image-placement-model.mjs";
import { regionImageFrame, regionPanelPosition, regionPointFromClient } from "../features/canvas/canvas-image-region-model.mjs";

const size = { width: 2000, height: 1000 };
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.000001);

test("letterboxed canvas previews map to original pixels after zoom and pan", () => {
  const frame = regionImageFrame({ left: 100, top: 200, width: 600, height: 600 }, size);
  assert.deepEqual(frame, { left: 100, top: 350, width: 600, height: 300 });
  const original = { x: 499, y: 804 };
  for (const scale of [0.1, 1, 4, 8]) {
    const moved = { left: -520 + scale * frame.left, top: 80 + scale * frame.top, width: scale * frame.width, height: scale * frame.height };
    const point = { x: moved.left + original.x / size.width * moved.width, y: moved.top + original.y / size.height * moved.height };
    const result = regionPointFromClient(point, moved, size);
    close(result.x, original.x); close(result.y, original.y);
  }
  assert.equal(regionImageFrame({ left: 0, top: 0, width: 0, height: 10 }, size), null);
  assert.equal(regionImageFrame(frame, { width: 0, height: 0 }), null);
});

test("reverse dragging from client coordinates clamps to the original image", () => {
  const frame = { left: 100, top: 200, width: 400, height: 200 };
  const start = regionPointFromClient({ x: 400, y: 350 }, frame, size);
  const end = regionPointFromClient({ x: 50, y: 150 }, frame, size);
  assert.deepEqual(regionFromPoints(start, end, size), { x: 0, y: 0, width: 1500, height: 750 });
});

test("right action panel stays within the available canvas and narrower screens", () => {
  const available = { left: 240, top: 80, width: 1000, height: 700 };
  const image = { left: 300, top: 200, width: 400, height: 350 };
  assert.deepEqual(regionPanelPosition(image, available, 120), { left: 712, top: 200, width: 156, maxHeight: 676 });
  const overflow = regionPanelPosition({ ...image, left: 1100, top: 900 }, available, 150);
  assert.equal(overflow.left, 1072); assert.equal(overflow.top, 618);
  const narrow = regionPanelPosition(image, { left: 0, top: 60, width: 140, height: 240 }, 120);
  assert.equal(narrow.left, 12); assert.equal(narrow.width, 116); assert.equal(narrow.top, 168);
});
