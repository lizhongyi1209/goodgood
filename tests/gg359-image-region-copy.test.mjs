import test from "node:test";
import assert from "node:assert/strict";
import { defaultRegion, paintRegionAnnotation, regionMarkRects, REGION_MARK_COLOR } from "../features/canvas/canvas-image-region-model.mjs";

test("opening provides a centered editable frame for landscape, portrait and tiny images", () => {
  for (const size of [{ width: 2000, height: 1000 }, { width: 1000, height: 2000 }, { width: 1, height: 1 }]) {
    const region = defaultRegion(size);
    assert.ok(region && region.width > 0 && region.height > 0);
    assert.equal(region.x + region.width / 2, size.width / 2);
    assert.equal(region.y + region.height / 2, size.height / 2);
    assert.ok(region.x >= 0 && region.y >= 0 && region.x + region.width <= size.width && region.y + region.height <= size.height);
  }
  assert.equal(defaultRegion({ width: 0, height: 1000 }), null);
});

test("edge and tiny red frames stay inside the original and empty frames cannot export", () => {
  const size = { width: 2000, height: 1000 };
  for (const region of [{ x: 0, y: 0, ...size }, { x: 1999, y: 999, width: 1, height: 1 }, { x: -5, y: -5, width: 20, height: 20 }]) {
    const marks = regionMarkRects(region, size);
    assert.ok(marks.length);
    for (const mark of marks) assert.ok(mark.x >= 0 && mark.y >= 0 && mark.width > 0 && mark.height > 0 && mark.x + mark.width <= size.width && mark.y + mark.height <= size.height);
  }
  assert.deepEqual(regionMarkRects(null, size), []);
  assert.deepEqual(regionMarkRects({ x: 1, y: 2, width: 0, height: 4 }, size), []);
  assert.deepEqual(regionMarkRects({ x: NaN, y: 2, width: 3, height: 4 }, size), []);
  assert.throws(() => paintRegionAnnotation({}, {}, { x: 1, y: 2, width: 0, height: 4 }, size), /画框/);
});

test("annotation changes only border pixels, preserving the image interior and exterior", () => {
  const size = { width: 20, height: 20 };
  const original = Array.from({ length: 400 }, (_, index) => `pixel-${index}`);
  const output = [];
  const base = { pixels: original };
  const context = {
    fillStyle: "original-style",
    drawImage(image, x, y) { assert.equal(x, 0); assert.equal(y, 0); output.push(...image.pixels); },
    save() { this.saved = this.fillStyle; },
    restore() { this.fillStyle = this.saved; },
    fillRect(x, y, width, height) {
      for (let row = y; row < y + height; row++) for (let column = x; column < x + width; column++) output[row * size.width + column] = this.fillStyle;
    },
  };
  paintRegionAnnotation(context, base, { x: 5, y: 5, width: 10, height: 10 }, size);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
    const border = x >= 5 && x < 15 && y >= 5 && y < 15 && (x < 7 || x >= 13 || y < 7 || y >= 13);
    assert.equal(output[y * 20 + x], border ? REGION_MARK_COLOR : original[y * 20 + x]);
  }
  assert.equal(context.fillStyle, "original-style");
  assert.equal(original[105], "pixel-105");
});
