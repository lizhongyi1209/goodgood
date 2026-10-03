// Chroma-only reference matching in OKLab; lightness is retained unless the
// user changes exposure/contrast. This is a bounded color transfer, not a
// semantic skin/material reconstruction.
export const COLOR_LUT_SIZE = 33;
export const COLOR_DEFAULTS = Object.freeze({ strength: 100, temperature: 0, tint: 0, saturation: 0, exposure: 0, contrast: 0 });
export const COLOR_IDENTITY = Object.freeze({ offsetA: 0, offsetB: 0, gainA: 1, gainB: 1, centerA: 0, centerB: 0 });
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const linear = (value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const encoded = (value) => value <= .0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - .055;

export function rgbToOklab(r, g, b) {
  r = linear(r); g = linear(g); b = linear(b);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
    .0259040371 * l + .7827717662 * m - .808675766 * s];
}

function labToLinear(L, a, b) {
  const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
  const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
  const s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
    -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
}

export function oklabToRgb(L, a, b) {
  L = clamp(L, 0, 1);
  let rgb = labToLinear(L, a, b);
  const inside = (values) => values.every((value) => value >= -.00001 && value <= 1.00001);
  if (!inside(rgb)) {
    let low = 0, high = 1;
    for (let i = 0; i < 9; i++) {
      const middle = (low + high) / 2;
      if (inside(labToLinear(L, a * middle, b * middle))) low = middle; else high = middle;
    }
    rgb = labToLinear(L, a * low, b * low);
  }
  return rgb.map((value) => clamp(encoded(clamp(value, 0, 1)), 0, 1));
}

export function colorStatistics(pixels) {
  const samples = [];
  // Bounded sampling, alpha and luminance filtering, plus low-chroma weighting
  // reduce domination by transparent pixels, red clothing or bright highlights.
  const stride = Math.max(1, Math.ceil(pixels.length / 4 / 16384)) * 4;
  for (let i = 0; i < pixels.length; i += stride) {
    if (pixels[i + 3] < 230) continue;
    const [L, a, b] = rgbToOklab(pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255);
    if (L < .08 || L > .96) continue;
    const weight = Math.max(.05, 1 - Math.abs(L - .55) / .55) / (1 + (a * a + b * b) / .0064);
    samples.push({ a, b, weight });
  }
  if (!samples.length) throw new Error("图片缺少可用于匹配的颜色，请选择另一张参考图。");
  const bounds = (channel) => {
    const sorted = samples.map((item) => item[channel]).sort((a, b) => a - b);
    return [sorted[Math.floor((sorted.length - 1) * .1)], sorted[Math.ceil((sorted.length - 1) * .9)]];
  };
  const [aMin, aMax] = bounds("a"), [bMin, bMax] = bounds("b");
  let weight = 0, a = 0, b = 0, aa = 0, bb = 0;
  for (const sample of samples) {
    if (sample.a < aMin || sample.a > aMax || sample.b < bMin || sample.b > bMax) continue;
    weight += sample.weight;
    a += sample.a * sample.weight; b += sample.b * sample.weight;
    aa += sample.a * sample.a * sample.weight; bb += sample.b * sample.b * sample.weight;
  }
  if (!weight) throw new Error("图片颜色暂时无法匹配，请选择另一张参考图。");
  a /= weight; b /= weight;
  return { a, b, deviationA: Math.sqrt(Math.max(0, aa / weight - a * a)), deviationB: Math.sqrt(Math.max(0, bb / weight - b * b)) };
}

export function matchColorStatistics(source, reference) {
  const gain = (from, to) => from < .006 || to < .006 ? 1 : clamp(to / from, .9, 1.1);
  return { offsetA: clamp(reference.a - source.a, -.07, .07), offsetB: clamp(reference.b - source.b, -.07, .07),
    gainA: gain(source.deviationA, reference.deviationA), gainB: gain(source.deviationB, reference.deviationB), centerA: source.a, centerB: source.b };
}

export function transformColor(r, g, b, match, parameters) {
  const { strength, temperature, tint, saturation, exposure, contrast } = parameters;
  if ((!strength || (match.offsetA === 0 && match.offsetB === 0 && match.gainA === 1 && match.gainB === 1)) && !temperature && !tint && !saturation && !exposure && !contrast) return [r, g, b];
  let [L, a, B] = rgbToOklab(r, g, b);
  const protection = 1 - .65 * clamp((Math.hypot(a, B) - .12) / .14, 0, 1);
  const amount = clamp(strength / 100, 0, 1) * protection;
  a += (match.offsetA + (a - match.centerA) * (match.gainA - 1)) * amount;
  B += (match.offsetB + (B - match.centerB) * (match.gainB - 1)) * amount;
  a += temperature * .00012 + tint * .0006; B += temperature * .0006;
  a *= Math.max(0, 1 + saturation / 100); B *= Math.max(0, 1 + saturation / 100);
  L = (L * 2 ** (exposure / 3) - .5) * (1 + contrast * .006) + .5;
  return oklabToRgb(L, a, B);
}

// One shared 3D LUT drives both GPU previews and original-resolution exports.
export function createColorLut(match, parameters, size = COLOR_LUT_SIZE) {
  const data = new Uint8Array(size * size * size * 4);
  for (let b = 0; b < size; b++) for (let g = 0; g < size; g++) for (let r = 0; r < size; r++) {
    const rgb = transformColor(r / (size - 1), g / (size - 1), b / (size - 1), match, parameters);
    const offset = (g * size * size + b * size + r) * 4;
    data[offset] = Math.round(rgb[0] * 255); data[offset + 1] = Math.round(rgb[1] * 255); data[offset + 2] = Math.round(rgb[2] * 255); data[offset + 3] = 255;
  }
  return { data, size };
}

export function applyColorLut(pixels, lut, start = 0, end = pixels.length) {
  const { data, size } = lut;
  const scale = (size - 1) / 255;
  for (let i = start; i < end; i += 4) {
    if (!pixels[i + 3]) continue;
    const r = pixels[i] * scale, g = pixels[i + 1] * scale, b = pixels[i + 2] * scale;
    const r0 = Math.floor(r), g0 = Math.floor(g), b0 = Math.floor(b);
    const r1 = Math.min(r0 + 1, size - 1), g1 = Math.min(g0 + 1, size - 1), b1 = Math.min(b0 + 1, size - 1);
    const fr = r - r0, fg = g - g0, fb = b - b0;
    const p000 = (g0 * size * size + b0 * size + r0) * 4, p100 = (g0 * size * size + b0 * size + r1) * 4;
    const p010 = (g1 * size * size + b0 * size + r0) * 4, p110 = (g1 * size * size + b0 * size + r1) * 4;
    const p001 = (g0 * size * size + b1 * size + r0) * 4, p101 = (g0 * size * size + b1 * size + r1) * 4;
    const p011 = (g1 * size * size + b1 * size + r0) * 4, p111 = (g1 * size * size + b1 * size + r1) * 4;
    for (let c = 0; c < 3; c++) {
      const low = (data[p000 + c] * (1 - fr) + data[p100 + c] * fr) * (1 - fg) + (data[p010 + c] * (1 - fr) + data[p110 + c] * fr) * fg;
      const high = (data[p001 + c] * (1 - fr) + data[p101 + c] * fr) * (1 - fg) + (data[p011 + c] * (1 - fr) + data[p111 + c] * fr) * fg;
      pixels[i + c] = Math.round(low * (1 - fb) + high * fb);
    }
  }
  return pixels;
}
