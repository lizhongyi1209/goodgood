import { creditsToYuan, yuanToCredits } from "./model-pricing.mjs";

export function parsePricingDiscount(value) {
  if (typeof value !== "string" || !/^(?:[1-9]\d?|100)$/.test(value.trim()))
    throw new Error("折扣请输入 1–100 的整数，例如 98 为 9.8 折，80 为 8 折。");
  return Number(value.trim());
}

export function applyPricingDiscount(prices, value) {
  const percent = parsePricingDiscount(value);
  let count = 0;
  function discount(amount) {
    if (typeof amount !== "string")
      throw new Error("请先填写有效的人民币价格。");
    if (!amount.trim()) return amount;
    const cents = yuanToCredits(amount);
    if (cents > 0) count++;
    const rounded = Number((BigInt(cents) * BigInt(percent) + 50n) / 100n);
    return creditsToYuan(cents > 0 ? Math.max(1, rounded) : 0);
  }
  const result = Object.fromEntries(
    Object.entries(prices).map(([key, price]) => [
      key,
      {
        ...price,
        output: discount(price.output),
        input: discount(price.input),
        ...(price.qualities
          ? {
              qualities: Object.fromEntries(
                Object.entries(price.qualities).map(([quality, amount]) => [
                  quality,
                  discount(amount),
                ]),
              ),
            }
          : {}),
      },
    ]),
  );
  if (!count) throw new Error("请先为当前线路填写价格，再应用折扣。");
  return result;
}
