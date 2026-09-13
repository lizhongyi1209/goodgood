import {
  imagePriceContext,
  modelSpecificationPrices,
} from "./banana-lines.mjs";

export const GPT_QUALITY_OPTIONS = Object.freeze([
  { id: "low", name: "低" },
  { id: "medium", name: "中" },
  { id: "high", name: "高" },
  { id: "xhigh", name: "超高" },
  { id: "max", name: "最高" },
]);
export function gptPricingQualities(modelId) {
  if (modelId === "gpt-image-2") return GPT_QUALITY_OPTIONS.slice(0, 3);
  return ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].includes(modelId)
    ? GPT_QUALITY_OPTIONS
    : [];
}
export function specificationOutputPrice(price, quality = "auto") {
  if (!price?.qualities) return price?.output;
  if (quality !== "auto") return price.qualities[quality];
  return Math.max(...Object.values(price.qualities));
}
export function modelQualityPriceContext(model, line, quality = "auto") {
  const prices = modelSpecificationPrices(model, line);
  return Object.values(prices).some((price) => price.qualities)
    ? `${imagePriceContext(line)}:gpt-${quality}`
    : imagePriceContext(line);
}
export function parseQualityPriceContext(context) {
  const [base, suffix] = context.split(":gpt-");
  return {
    imageLine: base === "standard" ? "special" : base.replace("banana-", ""),
    ...(suffix ? { quality: suffix } : {}),
  };
}
