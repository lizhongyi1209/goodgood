export const BANANA_LINES = Object.freeze([
  Object.freeze({ id: "special", name: "特价" }),
  Object.freeze({ id: "quality", name: "优质" }),
  Object.freeze({ id: "dedicated", name: "专线" }),
]);
export const DEFAULT_BANANA_LINE = "special";
export function isBananaModel(modelId) {
  return modelId === "nano-banana-2" || modelId === "nano-banana-pro";
}
export function isValidImageLine(modelId, line) {
  return (
    line === undefined ||
    (isBananaModel(modelId) && BANANA_LINES.some((item) => item.id === line))
  );
}
export function isBananaLineReady(modelId, line = DEFAULT_BANANA_LINE) {
  return (
    modelId === "nano-banana-pro" ||
    (modelId === "nano-banana-2" && line === "special")
  );
}
export function imageLineName(line = DEFAULT_BANANA_LINE) {
  return BANANA_LINES.find((item) => item.id === line)?.name ?? "";
}
export function imagePriceContext(line) {
  return !line || line === DEFAULT_BANANA_LINE ? "standard" : `banana-${line}`;
}
export function modelBananaLines(model) {
  if (!isBananaModel(model.adapterId ?? model.adapter_id)) return null;
  if (model.lines?.special) return model.lines;
  return {
    special: { enabled: true, prices: model.prices ?? {} },
    quality: { enabled: false, prices: {} },
    dedicated: { enabled: false, prices: {} },
  };
}
export function modelSpecificationPrices(model, line = DEFAULT_BANANA_LINE) {
  const lines = modelBananaLines(model);
  return lines ? (lines[line]?.prices ?? {}) : model.prices;
}
