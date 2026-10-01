import assert from "node:assert/strict";
import { test } from "node:test";
import { attachImagePreviewNavigation, INITIAL_IMAGE_VIEW, zoomImageView } from "../features/assets/image-preview-navigation.mjs";

class Surface extends EventTarget {
  captured = new Set();
  focused = false;
  getBoundingClientRect() { return { left: 100, top: 50, width: 600, height: 400 }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  focus() { this.focused = true; }
}
function setup() {
  const surface = new Surface();
  const views = [];
  const dragging = [];
  const navigation = attachImagePreviewNavigation(surface, { onViewChange: (view) => views.push(view), onDraggingChange: (value) => dragging.push(value) });
  return { surface, views, dragging, navigation };
}
function dispatch(surface, type, props = {}, target) {
  const event = new Event(type, { cancelable: true, bubbles: true });
  Object.assign(event, { deltaX: 0, deltaY: 0, deltaMode: 0, clientX: 400, clientY: 250, pointerId: 1, button: 0, ...props });
  if (target) Object.defineProperty(event, "target", { value: target });
  surface.dispatchEvent(event);
  return event;
}

test("zoom preserves the source point under the pointer and stops at bounded scale without drift", () => {
  const view = { scale: 2, x: -100, y: 20 };
  const anchor = { x: 200, y: 180 };
  const next = zoomImageView(view, anchor, 1.25);
  assert.equal((anchor.x - next.x) / next.scale, (anchor.x - view.x) / view.scale);
  assert.equal((anchor.y - next.y) / next.scale, (anchor.y - view.y) / view.scale);
  const maximum = zoomImageView(view, anchor, 999);
  assert.equal(maximum.scale, 16);
  assert.deepEqual(zoomImageView(maximum, anchor, 999), maximum);
  assert.equal(zoomImageView(view, anchor, .0001).scale, .25);
  for (const factor of [NaN, Infinity, 0, -1]) assert.equal(zoomImageView(view, anchor, factor), view);
});

test("wheel zooms at local pointer coordinates and normalizes line/page gestures", () => {
  const { surface, views, navigation } = setup();
  const event = dispatch(surface, "wheel", { deltaY: -120, clientX: 300, clientY: 150 });
  assert.equal(event.defaultPrevented, true);
  const view = views.at(-1);
  assert.ok(view.scale > 1);
  assert.ok(Math.abs((200 - view.x) / view.scale - 200) < 1e-8);
  assert.ok(Math.abs((100 - view.y) / view.scale - 100) < 1e-8);
  navigation.fit();
  dispatch(surface, "wheel", { deltaY: -2, deltaMode: 1 });
  assert.ok(Math.abs(views.at(-1).scale - Math.exp(32 * .0018)) < 1e-8);
  navigation.fit();
  dispatch(surface, "wheel", { deltaY: .1, deltaMode: 2 });
  assert.ok(Math.abs(views.at(-1).scale - Math.exp(-40 * .0018)) < 1e-8);
  navigation.dispose();
});

test("browser zoom and horizontal gestures are not consumed", () => {
  const { surface, views, navigation } = setup();
  for (const props of [{ deltaY: 120, ctrlKey: true }, { deltaY: 120, metaKey: true }, { deltaY: 5, deltaX: 120 }, { deltaY: 0 }]) {
    assert.equal(dispatch(surface, "wheel", props).defaultPrevented, false);
  }
  assert.equal(views.length, 0);
  navigation.dispose();
});

test("captured dragging moves only the preview, ignores other pointers and cancels cleanly", () => {
  const { surface, views, dragging, navigation } = setup();
  dispatch(surface, "pointerdown", { clientX: 150, clientY: 90 });
  assert.equal(surface.focused, true);
  assert.equal(surface.hasPointerCapture(1), true);
  dispatch(surface, "pointermove", { pointerId: 2, clientX: 900 });
  assert.equal(views.length, 0);
  dispatch(surface, "pointermove", { clientX: 180, clientY: 110 });
  assert.deepEqual(views.at(-1), { scale: 1, x: 30, y: 20 });
  dispatch(surface, "pointercancel");
  dispatch(surface, "pointermove", { clientX: 500 });
  assert.equal(views.length, 1);
  assert.equal(surface.hasPointerCapture(1), false);
  assert.deepEqual(dragging, [true, false]);
  navigation.dispose();
});

test("retry controls, secondary buttons and extra touch pointers do not begin dragging", () => {
  const { surface, views, navigation } = setup();
  assert.equal(dispatch(surface, "pointerdown", {}, { closest: () => ({}) }).defaultPrevented, false);
  dispatch(surface, "pointerdown", { button: 2 });
  dispatch(surface, "pointerdown", { isPrimary: false });
  dispatch(surface, "pointermove", { clientX: 900 });
  assert.equal(surface.captured.size, 0);
  assert.equal(views.length, 0);
  navigation.dispose();
});

test("accessible zoom/fit and arrow panning preserve Escape and browser shortcuts", () => {
  const { surface, views, navigation } = setup();
  dispatch(surface, "keydown", { key: "ArrowLeft" });
  assert.deepEqual(views.at(-1), { scale: 1, x: -40, y: 0 });
  assert.equal(dispatch(surface, "keydown", { key: "+" }).defaultPrevented, true);
  assert.equal(views.at(-1).scale, 1.25);
  dispatch(surface, "keydown", { key: "0" });
  assert.deepEqual(views.at(-1), INITIAL_IMAGE_VIEW);
  assert.equal(dispatch(surface, "keydown", { key: "Escape" }).defaultPrevented, false);
  assert.equal(dispatch(surface, "keydown", { key: "+", ctrlKey: true }).defaultPrevented, false);
  navigation.dispose();
});

test("fit releases dragging; disposal detaches all listeners and a new preview starts fitted", () => {
  const { surface, views, navigation } = setup();
  dispatch(surface, "pointerdown");
  navigation.zoomBy(2);
  navigation.fit();
  assert.deepEqual(views.at(-1), INITIAL_IMAGE_VIEW);
  assert.equal(surface.captured.size, 0);
  dispatch(surface, "pointerdown");
  navigation.dispose();
  const count = views.length;
  dispatch(surface, "wheel", { deltaY: -120 });
  dispatch(surface, "pointermove", { clientX: 900 });
  dispatch(surface, "keydown", { key: "+" });
  assert.equal(views.length, count);
  assert.equal(surface.captured.size, 0);
  const fresh = attachImagePreviewNavigation(surface, { onViewChange: (view) => views.push(view) });
  fresh.zoomBy(1);
  assert.deepEqual(views.at(-1), INITIAL_IMAGE_VIEW);
  fresh.dispose();
});
