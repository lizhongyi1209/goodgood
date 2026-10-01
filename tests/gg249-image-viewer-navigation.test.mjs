import assert from "node:assert/strict";
import { test } from "node:test";
import { adjacentViewerIndex, createViewerWheelStep } from "../features/assets/image-viewer-navigation.mjs";

const event = (deltaY, timeStamp, extra = {}) => ({ deltaY, timeStamp, deltaX: 0, deltaMode: 0, ctrlKey: false, metaKey: false, ...extra });

test("wheel switches one item per deliberate step and limits trackpad inertia", () => {
  const step = createViewerWheelStep();
  assert.equal(step(event(120, 0), 500), 1);
  assert.equal(step(event(120, 100), 500), 0);
  assert.equal(step(event(120, 279), 500), 0);
  assert.equal(step(event(120, 280), 500), 1);
});

test("small trackpad deltas accumulate before navigation", () => {
  const step = createViewerWheelStep();
  assert.equal(step(event(6, 0), 500), 0);
  assert.equal(step(event(6, 20), 500), 0);
  assert.equal(step(event(6, 40), 500), 1);
});

test("reversal and idle gaps clear incomplete gestures", () => {
  const step = createViewerWheelStep();
  assert.equal(step(event(12, 0), 500), 0);
  assert.equal(step(event(-12, 20), 500), 0);
  assert.equal(step(event(-6, 40), 500), -1);
  assert.equal(step(event(12, 400), 500), 0);
  assert.equal(step(event(12, 600), 500), 0);
});

test("pinch, browser zoom, horizontal gestures and zero deltas do not consume navigation", () => {
  const step = createViewerWheelStep();
  assert.equal(step(event(100, 0, { ctrlKey: true }), 500), null);
  assert.equal(step(event(100, 1, { metaKey: true }), 500), null);
  assert.equal(step(event(100, 2, { deltaX: 101 }), 500), null);
  assert.equal(step(event(0, 3), 500), null);
  assert.equal(step(event(18, 4), 500), 1);
});

test("line and page wheel units normalize in both directions", () => {
  assert.equal(createViewerWheelStep()(event(2, 0, { deltaMode: 1 }), 500), 1);
  assert.equal(createViewerWheelStep()(event(-1, 0, { deltaMode: 2 }), 500), -1);
});

test("navigation stops at ends and handles empty or removed selection", () => {
  assert.equal(adjacentViewerIndex(0, 3, -1), 0);
  assert.equal(adjacentViewerIndex(2, 3, 1), 2);
  assert.equal(adjacentViewerIndex(1, 3, -1), 0);
  assert.equal(adjacentViewerIndex(1, 3, 1), 2);
  assert.equal(adjacentViewerIndex(-1, 3, 1), 0);
  assert.equal(adjacentViewerIndex(-1, 3, -1), 0);
  assert.equal(adjacentViewerIndex(-1, 0, 1), -1);
  assert.equal(adjacentViewerIndex(0, 1, 1), 0);
});
