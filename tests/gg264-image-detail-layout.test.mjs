import assert from "node:assert/strict";
import { after, test } from "node:test";
import { coverImageFrame } from "../features/assets/image-preview-navigation.mjs";
import { attachCenteredViewerRail } from "../features/assets/image-viewer-navigation.mjs";

test("cover preserves the complete source ratio and fills both viewport axes", () => {
  const viewport = { width: 900, height: 800 };
  for (const source of [{ width: 1792, height: 2390 }, { width: 2400, height: 800 }, { width: 100, height: 100 }]) {
    const frame = coverImageFrame(viewport, source);
    assert.ok(frame.width >= viewport.width && frame.height >= viewport.height);
    assert.ok(Math.abs(frame.width / frame.height - source.width / source.height) < 1e-10);
    assert.equal(frame.x + frame.width / 2, viewport.width / 2);
    assert.equal(frame.y + frame.height / 2, viewport.height / 2);
    assert.ok(frame.x <= 0 && frame.y <= 0);
    // Panning by the clipped offset exposes the original edge instead of a cropped file.
    assert.equal(frame.x + -frame.x, 0);
  }
});

test("cover recomputes for resized stages and keeps unknown/loading sources finite", () => {
  assert.deepEqual(coverImageFrame({ width: 300, height: 600 }, { width: 1200, height: 600 }), { x: -450, y: 0, width: 1200, height: 600 });
  for (const source of [{}, { width: NaN, height: 20 }, { width: 20, height: 0 }]) {
    assert.deepEqual(coverImageFrame({ width: 300, height: 600 }, source), { x: 0, y: 0, width: 300, height: 600 });
  }
  assert.equal(coverImageFrame({ width: 0, height: 600 }, {}), null);
  assert.equal(coverImageFrame({ width: 300, height: Infinity }, {}), null);
});

const originalWindow = globalThis.window;
const originalObserver = globalThis.ResizeObserver;
let reducedMotion = false;
const listeners = new Map();
globalThis.window = {
  matchMedia: () => ({ matches: reducedMotion }),
  addEventListener: (name, callback) => listeners.set(name, callback),
  removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
};
class Observer {
  static current;
  observed = [];
  disconnected = false;
  constructor(callback) { this.callback = callback; Observer.current = this; }
  observe(element) { this.observed.push(element); }
  disconnect() { this.disconnected = true; }
  resize() { if (!this.disconnected) this.callback(); }
}
globalThis.ResizeObserver = Observer;
after(() => { globalThis.window = originalWindow; globalThis.ResizeObserver = originalObserver; });

function createRail(heights = [100, 60, 140, 80]) {
  const rail = {
    clientHeight: 400, scrollTop: 0, style: {}, lastScroll: null,
    getBoundingClientRect: () => ({ top: 50, height: rail.clientHeight }),
    get scrollHeight() { return (parseFloat(rail.style.paddingTop) || 0) + heights.reduce((sum, height) => sum + height, 0) + Math.max(0, heights.length - 1) * 12 + (parseFloat(rail.style.paddingBottom) || 0); },
    scrollTo(options) { rail.lastScroll = options; rail.scrollTop = Math.max(0, Math.min(options.top, rail.scrollHeight - rail.clientHeight)); },
  };
  const thumbnails = heights.map((_, index) => ({ getBoundingClientRect: () => ({
    top: 50 + (parseFloat(rail.style.paddingTop) || 0) + heights.slice(0, index).reduce((sum, height) => sum + height, 0) + index * 12 - rail.scrollTop,
    height: heights[index],
  }) }));
  return { rail, thumbnails, heights };
}
function assertCentered(rail, selected) {
  const box = selected.getBoundingClientRect();
  assert.equal(box.top + box.height / 2, rail.getBoundingClientRect().top + rail.clientHeight / 2);
}

test("every selection centers with real mixed heights, including first, last and a single item", () => {
  for (const heights of [[100, 60, 140, 80], [100], [800, 40, 650]]) {
    const { rail, thumbnails } = createRail(heights);
    for (const selected of thumbnails) {
      const dispose = attachCenteredViewerRail(rail, thumbnails, selected);
      assertCentered(rail, selected);
      assert.equal(rail.lastScroll.behavior, "smooth");
      dispose();
    }
  }
});

test("viewport and preceding/lazy thumbnail changes recenter the current item and cleanup disconnects", () => {
  const { rail, thumbnails, heights } = createRail();
  const selected = thumbnails[2];
  const dispose = attachCenteredViewerRail(rail, thumbnails, selected);
  const observer = Observer.current;
  assert.deepEqual(observer.observed, [rail, ...thumbnails]);
  rail.clientHeight = 240;
  heights[0] = 190;
  heights[3] = 160;
  observer.resize();
  assertCentered(rail, selected);
  dispose();
  assert.equal(observer.disconnected, true);
});

test("reduced motion uses immediate centering and a hidden rail waits for size", () => {
  const { rail, thumbnails } = createRail();
  rail.clientHeight = 0;
  reducedMotion = true;
  const dispose = attachCenteredViewerRail(rail, thumbnails, thumbnails[3]);
  assert.equal(rail.lastScroll, null);
  rail.clientHeight = 500;
  Observer.current.resize();
  assertCentered(rail, thumbnails[3]);
  assert.equal(rail.lastScroll.behavior, "auto");
  dispose();
  reducedMotion = false;
});

test("missing selection is quiet and resize fallback removes its listener", () => {
  assert.doesNotThrow(() => attachCenteredViewerRail(null, [], undefined)());
  const { rail, thumbnails } = createRail();
  attachCenteredViewerRail(rail, thumbnails, {})();
  assert.equal(rail.lastScroll, null);
  globalThis.ResizeObserver = undefined;
  const dispose = attachCenteredViewerRail(rail, thumbnails, thumbnails[0]);
  rail.clientHeight = 300;
  listeners.get("resize")();
  assertCentered(rail, thumbnails[0]);
  dispose();
  assert.equal(listeners.size, 0);
  globalThis.ResizeObserver = Observer;
});
