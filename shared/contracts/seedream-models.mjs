export const SEEDREAM_MODEL_ID = "seedream-5.0-pro";
export const SEEDREAM_PROVIDER_MODEL_ID = "dola-seedream-5-0-pro-260628-ep";
export const SEEDREAM_RESOLUTIONS = Object.freeze(["1K", "2K"]);
export const SEEDREAM_ASPECT_RATIOS = Object.freeze(["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]);
export const SEEDREAM_MAX_OUTPUTS = 17;
export const SEEDREAM_REFERENCE_SURCHARGE_CREDITS = 2;
export const SEEDREAM_BASE_CREDITS = Object.freeze({ "1K": 30, "2K": 60 });
export const SEEDREAM_PIXEL_SIZES = Object.freeze({
  "1:1": Object.freeze({ "1K": "1024x1024", "2K": "2048x2048" }),
  "4:3": Object.freeze({ "1K": "1152x864", "2K": "2368x1776" }),
  "3:4": Object.freeze({ "1K": "864x1152", "2K": "1776x2368" }),
  "16:9": Object.freeze({ "1K": "1424x800", "2K": "2816x1584" }),
  "9:16": Object.freeze({ "1K": "800x1424", "2K": "1584x2816" }),
  "3:2": Object.freeze({ "1K": "1248x832", "2K": "2496x1664" }),
  "2:3": Object.freeze({ "1K": "832x1248", "2K": "1664x2496" }),
  "21:9": Object.freeze({ "1K": "1568x672", "2K": "3136x1344" }),
});

export function seedreamReferenceSurcharge(referenceCount = 0) {
  if (!Number.isSafeInteger(referenceCount) || referenceCount < 0 || referenceCount > 10) return null;
  return Math.max(0, referenceCount - 1) * SEEDREAM_REFERENCE_SURCHARGE_CREDITS;
}
