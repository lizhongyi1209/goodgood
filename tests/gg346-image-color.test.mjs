import test from "node:test";
import assert from "node:assert/strict";
import { COLOR_DEFAULTS, COLOR_IDENTITY, applyColorLut, colorStatistics, createColorLut, matchColorStatistics, rgbToOklab, transformColor } from "../features/canvas/canvas-image-color-model.mjs";

const solid = (r, g, b, alpha = 255) => new Uint8ClampedArray(Array.from({ length: 64 }, () => [r, g, b, alpha]).flat());

test("matching a neutral reference reduces a moderate red cast and retains lightness", () => {
  const source = colorStatistics(solid(160, 140, 140));
  const reference = colorStatistics(solid(140, 140, 140));
  const match = matchColorStatistics(source, reference);
  const before = rgbToOklab(160 / 255, 140 / 255, 140 / 255);
  const after = rgbToOklab(...transformColor(160 / 255, 140 / 255, 140 / 255, match, COLOR_DEFAULTS));
  assert.ok(Math.abs(after[1]) < Math.abs(before[1]) / 2);
  assert.ok(Math.abs(after[0] - before[0]) < .00001);
});

test("matching the same image and neutral manual settings is an identity", () => {
  const stats = colorStatistics(solid(130, 110, 90));
  const match = matchColorStatistics(stats, stats);
  assert.deepEqual(transformColor(.4, .5, .6, match, COLOR_DEFAULTS), [.4, .5, .6]);
  assert.deepEqual(transformColor(.4, .5, .6, { ...match, offsetA: .05 }, { ...COLOR_DEFAULTS, strength: 0 }), [.4, .5, .6]);
});

test("transparent, black or white-only samples give an actionable empty error", () => {
  for (const pixels of [solid(255, 255, 255), solid(0, 0, 0), solid(160, 140, 140, 0), new Uint8ClampedArray()]) {
    assert.throws(() => colorStatistics(pixels), /选择另一张参考图/);
  }
});

test("outlier reference shifts and distribution gains are bounded", () => {
  const match = matchColorStatistics({ a: .2, b: -.2, deviationA: .02, deviationB: .04 }, { a: -.2, b: .2, deviationA: .09, deviationB: .009 });
  assert.equal(match.offsetA, -.07); assert.equal(match.offsetB, .07);
  assert.equal(match.gainA, 1.1); assert.equal(match.gainB, .9);
});

test("gamut mapping keeps channels finite under extreme user adjustments", () => {
  for (const color of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]) {
    const output = transformColor(...color, { ...COLOR_IDENTITY, offsetA: -.07, offsetB: .07 }, { strength: 100, temperature: 100, tint: -100, saturation: 100, exposure: 2, contrast: 100 });
    assert.ok(output.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
  }
});

test("CPU export interpolates the shared preview LUT and preserves every alpha", () => {
  const parameters = { ...COLOR_DEFAULTS, temperature: -20, tint: -15 };
  const lut = createColorLut(COLOR_IDENTITY, parameters);
  const pixels = new Uint8ClampedArray([140, 130, 120, 255, 200, 100, 80, 120, 16, 32, 48, 0]);
  const output = applyColorLut(new Uint8ClampedArray(pixels), lut);
  for (const offset of [0, 4]) {
    const expected = transformColor(pixels[offset] / 255, pixels[offset + 1] / 255, pixels[offset + 2] / 255, COLOR_IDENTITY, parameters);
    for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(output[offset + channel] / 255 - expected[channel]) < .008);
    assert.equal(output[offset + 3], pixels[offset + 3]);
  }
  assert.deepEqual(Array.from(output.slice(8)), [16, 32, 48, 0]);
});

test("cooperative chunks give the same result as a whole export", () => {
  const pixels = solid(160, 140, 140);
  const lut = createColorLut({ ...COLOR_IDENTITY, offsetA: -.02 }, COLOR_DEFAULTS);
  const whole = applyColorLut(new Uint8ClampedArray(pixels), lut);
  const chunked = new Uint8ClampedArray(pixels);
  applyColorLut(chunked, lut, 0, 64); applyColorLut(chunked, lut, 64, pixels.length);
  assert.deepEqual(chunked, whole);
});
