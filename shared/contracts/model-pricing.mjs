import { modelSpecificationPrices } from "./banana-lines.mjs";

import { specificationOutputPrice } from "./gpt-quality-pricing.mjs";

export const CREDIT_UNIT = "credit-cny-cent";
export const CREDITS_PER_CNY = 100;
export function currentCreditAmount(value, unit) {
  return (BigInt(value) * (unit === "credit" ? 2n : 1n)).toString();
}

export const MODEL_TEMPLATES = Object.freeze([
  ...[
    "nano-banana-2",
    "nano-banana-pro",
    "gpt-image-2.5-sunburst",
    "gpt-image-2",
    "gpt-image-2.5-flare",
  ].map((id) => ({
    id,
    mediaType: "image",
    resolutions: ["1K", "2K", "4K"],
    ready: true,
  })),
  ...[
    "seedance-2-0",
    "seedance-2-0-fast",
    "seedance-2-5",
    "seedance-2-0-mini",
  ].map((id) => ({
    id,
    mediaType: "video",
    resolutions:
      id === "seedance-2-0"
        ? ["480p", "720p", "1080p", "4K"]
        : ["480p", "720p"],
    ready: true,
  })),
]);

export function yuanToCredits(value) {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(value.trim())
  ) {
    throw new Error("人民币价格须为最多两位小数的非负金额。");
  }
  const [whole, fraction = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function creditsToYuan(value) {
  const amount = BigInt(value);
  const absolute = amount < 0n ? -amount : amount;
  return `${amount < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function calculateModelQuote(
  model,
  {
    resolution,
    count = 1,
    outputSeconds = 0,
    referenceSeconds = 0,
    imageLine = "special",
    quality = "auto",
  },
) {
  const specification = modelSpecificationPrices(model, imageLine)[resolution];
  if (specification?.billing === "tokens") return null;
  const price = specification
    ? {
        ...specification,
        output: specificationOutputPrice(specification, quality),
      }
    : null;
  if (
    !price ||
    !Number.isSafeInteger(price.output) ||
    price.output <= 0 ||
    !Number.isSafeInteger(count) ||
    ![1, 2, 4].includes(count)
  )
    return null;
  if (model.mediaType === "image") return price.output * count;
  if (
    !Number.isFinite(outputSeconds) ||
    outputSeconds <= 0 ||
    outputSeconds > 30 ||
    !Number.isFinite(referenceSeconds) ||
    referenceSeconds < 0 ||
    referenceSeconds > 60
  )
    return null;
  // Fractional reference seconds are rounded upward once for the whole quote.
  if (!Number.isSafeInteger(price.input) || price.input < 0) return null;
  const numerator =
    (BigInt(price.output) * BigInt(Math.round(outputSeconds * 100)) +
      BigInt(price.input) * BigInt(Math.round(referenceSeconds * 100))) *
    BigInt(count);
  return Number((numerator + 99n) / 100n);
}
