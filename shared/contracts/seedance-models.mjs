export const SEEDANCE_MODEL_IDS = Object.freeze([
  "seedance-2-5",
  "seedance-2-0",
  "seedance-2-0-fast",
  "seedance-2-0-mini",
]);
export const SEEDANCE_LINES = Object.freeze([
  Object.freeze({ id: "standard", name: "标准" }),
  Object.freeze({ id: "backup", name: "备用" }),
]);
export function seedanceResolutions(id) {
  if (id === "seedance-2-5") return ["480p", "720p", "1080p"];
  if (id === "seedance-2-0") return ["480p", "720p", "1080p", "4K"];
  return SEEDANCE_MODEL_IDS.includes(id) ? ["480p", "720p"] : [];
}
export function modelVideoLines(model) {
  if (!SEEDANCE_MODEL_IDS.includes(model.adapterId ?? model.adapter_id))
    return null;
  const lines = model.videoLines ?? model.lines;
  if (lines?.standard && lines?.backup) return lines;
  return Object.fromEntries(
    SEEDANCE_LINES.map(({ id }) => [
      id,
      { enabled: true, prices: structuredClone(model.prices ?? {}) },
    ]),
  );
}
