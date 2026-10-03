import assert from "node:assert/strict";
import test from "node:test";
import { canvasTextNodeFrameForKey } from "../features/canvas/canvas-text-input.mjs";

const initial = { x: -25.5, y: 80.25, width: 360, height: 260 };

test("each text corner moves in the arrow direction and anchors the opposite edge", () => {
  for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      const next = canvasTextNodeFrameForKey(initial, corner, key);
      const left = corner.endsWith("left"); const top = corner.startsWith("top");
      const dx = key === "ArrowLeft" ? -10 : key === "ArrowRight" ? 10 : 0;
      const dy = key === "ArrowUp" ? -10 : key === "ArrowDown" ? 10 : 0;
      const beforeCorner = { x: initial.x + (left ? 0 : initial.width), y: initial.y + (top ? 0 : initial.height) };
      const afterCorner = { x: next.x + (left ? 0 : next.width), y: next.y + (top ? 0 : next.height) };
      assert.deepEqual(afterCorner, { x: beforeCorner.x + dx, y: beforeCorner.y + dy });
      assert.equal(left ? next.x + next.width : next.x, left ? initial.x + initial.width : initial.x);
      assert.equal(top ? next.y + next.height : next.y, top ? initial.y + initial.height : initial.y);
    }
  }
});

test("size limits clamp corner movement without drifting the opposite edge", () => {
  const small = { x: 20, y: 30, width: 185, height: 145 };
  const narrower = canvasTextNodeFrameForKey(small, "top-left", "ArrowRight", true);
  assert.deepEqual(narrower, { x: 25, y: 30, width: 180, height: 145 });
  assert.deepEqual(canvasTextNodeFrameForKey(narrower, "top-left", "ArrowRight", true), narrower);
  const shorter = canvasTextNodeFrameForKey(small, "top-left", "ArrowDown", true);
  assert.deepEqual(shorter, { x: 20, y: 35, width: 185, height: 140 });
  assert.deepEqual(canvasTextNodeFrameForKey(shorter, "top-left", "ArrowDown", true), shorter);
  const large = { x: -40, y: -60, width: 1395, height: 1595 };
  assert.deepEqual(canvasTextNodeFrameForKey(large, "bottom-left", "ArrowLeft", true), { x: -45, y: -60, width: 1400, height: 1595 });
  assert.deepEqual(canvasTextNodeFrameForKey(large, "top-right", "ArrowUp", true), { x: -40, y: -65, width: 1395, height: 1600 });
});

test("Shift grows the corner step and missing measurements use the existing text defaults", () => {
  assert.deepEqual(canvasTextNodeFrameForKey(initial, "top-left", "ArrowLeft", true), { ...initial, x: -65.5, width: 400 });
  assert.deepEqual(canvasTextNodeFrameForKey({ x: 0, y: 0, height: NaN }, "top-left", "ArrowUp"), { x: 0, y: -10, width: 360, height: 270 });
  assert.equal(canvasTextNodeFrameForKey(initial, "bottom-right", "Enter"), null);
});
