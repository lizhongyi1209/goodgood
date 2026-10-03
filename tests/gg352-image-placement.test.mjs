import test from "node:test";
import assert from "node:assert/strict";
import { defaultPlacement, fitImageView, imagePoint, movePlacement, moveRegion, normalizeRotation, paintStickerComposition, placementCorner, regionCoordinates, regionFromPoints, regionPrompt, reorderPlacementLayers, resizePlacement, resizeRegion, rotatePlacement, scalePlacement, zoomImageView } from "../features/canvas/canvas-image-placement-model.mjs";

const size = { width: 2048, height: 2736 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} ≠ ${expected}`);

test("reverse drag and overshoot produce a bounded original-pixel bbox", () => {
  const box = regionFromPoints({ x: 1500.4, y: 2000.1 }, { x: -20, y: -40 }, size);
  assert.deepEqual(box, { x: 0, y: 0, width: 1501, height: 2001 });
  assert.deepEqual(regionCoordinates(box, size), [0, 0, 1501, 2001]);
  assert.equal(regionFromPoints({ x: 4, y: 5 }, { x: 4, y: 5 }, size), null);
  assert.equal(regionFromPoints({ x: -20, y: -30 }, { x: -10, y: -10 }, size), null);
  assert.deepEqual(regionFromPoints({ x: 0, y: 0 }, { x: 3000, y: 4000 }, size), { x: 0, y: 0, ...size });
});

test("moving and resizing preserve valid regions at all image edges", () => {
  const box = { x: 100, y: 200, width: 500, height: 600 };
  assert.deepEqual(moveRegion(box, { x: -9999, y: 9999 }, size), { ...box, x: 0, y: 2136 });
  assert.deepEqual(resizeRegion(box, "nw", { x: 20, y: 40 }, size), { x: 20, y: 40, width: 580, height: 760 });
  assert.deepEqual(resizeRegion(box, "se", { x: 9000, y: 9000 }, size), { x: 100, y: 200, width: 1948, height: 2536 });
  assert.deepEqual(resizeRegion(box, "nw", { x: 9000, y: 9000 }, size), { x: 599, y: 799, width: 1, height: 1 });
});

test("normalized bbox conservatively contains even a one-pixel selection", () => {
  const bounds = { width: 4000, height: 4000 };
  const box = { x: 13, y: 13, width: 1, height: 1 };
  assert.deepEqual(regionCoordinates(box, bounds, true), [3, 3, 4, 4]);
  assert.deepEqual(regionCoordinates({ x: 0, y: 0, ...size }, size, true), [0, 0, 1000, 1000]);
  const text = regionPrompt(box, bounds);
  assert.match(text, /4000 × 4000/);
  assert.match(text, /bbox=\[13, 13, 14, 14\]/);
  assert.match(text, /左上角为原点/);
  assert.match(regionPrompt(box, bounds, true), /0–1000/);
});

test("zoom at the cursor and pan keep the same original-pixel location", () => {
  const view = fitImageView(size, { width: 800, height: 600 });
  const pixel = { x: 1400, y: 1800 };
  const screen = { x: view.x + pixel.x * view.scale, y: view.y + pixel.y * view.scale };
  const next = zoomImageView(view, view.scale * 5, screen);
  const result = imagePoint(screen, next);
  close(result.x, pixel.x); close(result.y, pixel.y);
  const panned = { ...next, x: next.x + 125, y: next.y - 73 };
  const afterPan = imagePoint({ x: screen.x + 125, y: screen.y - 73 }, panned);
  close(afterPan.x, pixel.x); close(afterPan.y, pixel.y);
  assert.equal(zoomImageView(view, 100, screen).scale, 8);
  assert.equal(zoomImageView(view, 0, screen).scale, 0.001);
});

test("default placement fits and preserves aspect ratio; scaling retains its center", () => {
  const layer = defaultPlacement({ width: 400, height: 200 }, { width: 800, height: 600 });
  assert.deepEqual(layer, { cx: 400, cy: 300, width: 320, height: 160, rotation: 0 });
  const scaled = scalePlacement(layer, 2);
  assert.equal(scaled.width, 640); assert.equal(scaled.height, 320);
  assert.equal(scaled.cx, layer.cx); assert.equal(scaled.cy, layer.cy);
  assert.deepEqual(scalePlacement(layer, NaN), layer);
  const thin = scalePlacement({ ...layer, width: 16384, height: 1 }, 100000);
  assert.equal(thin.width, 32768); assert.equal(thin.height, 2);
});

test("rotated corner resize fixes the opposite corner and keeps aspect ratio", () => {
  for (const rotation of [0, 45, 90, -135]) for (const corner of ["nw", "ne", "se", "sw"]) {
    const layer = { cx: 600, cy: 800, width: 400, height: 200, rotation };
    const opposite = { nw: "se", ne: "sw", se: "nw", sw: "ne" }[corner];
    const anchor = placementCorner(layer, opposite), handle = placementCorner(layer, corner);
    const next = resizePlacement(layer, corner, { x: anchor.x + (handle.x - anchor.x) * 1.5, y: anchor.y + (handle.y - anchor.y) * 1.5 });
    const nextAnchor = placementCorner(next, opposite);
    close(nextAnchor.x, anchor.x); close(nextAnchor.y, anchor.y);
    close(next.width, 600); close(next.height, 300);
    assert.equal(next.rotation, rotation);
  }
});

test("rotation supports wraparound and snapping; movement stays recoverable", () => {
  const layer = { cx: 500, cy: 500, width: 200, height: 100, rotation: 0 };
  assert.equal(rotatePlacement(layer, { x: 500, y: 400 }, { x: 600, y: 500 }).rotation, 90);
  assert.equal(normalizeRotation(540), -180);
  const snap = rotatePlacement(layer, { x: 600, y: 500 }, { x: 600, y: 522 }, true);
  assert.equal(snap.rotation, 15);
  const moved = movePlacement(layer, { x: -100000, y: 100000 }, size);
  assert.equal(moved.cx, -200); assert.equal(moved.cy, size.height + 100);
});

test("layer order changes only the selected layer and keeps all resources", () => {
  const layers = [{ id: "a", resource: 1 }, { id: "b", resource: 2 }, { id: "c", resource: 3 }];
  assert.deepEqual(reorderPlacementLayers(layers, "b", 1).map((layer) => layer.id), ["a", "c", "b"]);
  assert.deepEqual(reorderPlacementLayers(layers, "b", -1).map((layer) => layer.id), ["b", "a", "c"]);
  assert.equal(reorderPlacementLayers(layers, "absent", 1), layers);
  assert.equal(reorderPlacementLayers(layers, "c", 1), layers);
  assert.deepEqual(layers.map((layer) => layer.id), ["a", "b", "c"]);
});

test("composition paints base then ordered layers with pixel transforms and balanced state", () => {
  const calls = [];
  const context = Object.fromEntries(["drawImage", "save", "translate", "rotate", "restore"].map((name) => [name, (...args) => calls.push([name, ...args])]));
  const layer = { cx: 300, cy: 400, width: 200, height: 100, rotation: 90 };
  paintStickerComposition(context, "base", [{ resource: { image: "bottom" }, placement: layer }, { resource: { image: "top" }, placement: { ...layer, rotation: -45 } }]);
  assert.deepEqual(calls[0], ["drawImage", "base", 0, 0]);
  assert.deepEqual(calls.filter(([name]) => name === "drawImage"), [["drawImage", "base", 0, 0], ["drawImage", "bottom", -100, -50, 200, 100], ["drawImage", "top", -100, -50, 200, 100]]);
  assert.deepEqual(calls.filter(([name]) => name === "translate"), [["translate", 300, 400], ["translate", 300, 400]]);
  assert.deepEqual(calls.filter(([name]) => name === "rotate"), [["rotate", Math.PI / 2], ["rotate", -Math.PI / 4]]);
  assert.equal(calls.filter(([name]) => name === "save").length, 2);
  assert.equal(calls.filter(([name]) => name === "restore").length, 2);
});

test("draw failure restores composition state before reporting the error", () => {
  let restored = false;
  const context = { drawImage(image) { if (image !== "base") throw new Error("draw failed"); }, save() {}, translate() {}, rotate() {}, restore() { restored = true; } };
  assert.throws(() => paintStickerComposition(context, "base", [{ resource: { image: "sticker" }, placement: { cx: 0, cy: 0, width: 10, height: 20, rotation: 0 } }]), /draw failed/);
  assert.equal(restored, true);
});
