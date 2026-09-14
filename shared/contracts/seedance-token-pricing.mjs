export const SEEDANCE_LIST_PRICES = Object.freeze({
  "seedance-2-0": {
    "480p": [46, 28],
    "720p": [46, 28],
    "1080p": [51, 31],
    "4K": [26, 16],
  },
  "seedance-2-0-fast": { "480p": [37, 22], "720p": [37, 22] },
  "seedance-2-5": { "480p": [70, 42], "720p": [70, 42] },
  "seedance-2-0-mini": { "480p": [23, 14], "720p": [23, 14] },
});

export function seedanceListPrices(modelId) {
  const prices = SEEDANCE_LIST_PRICES[modelId];
  return prices
    ? Object.fromEntries(
        Object.entries(prices).map(([resolution, [output, input]]) => [
          resolution,
          { billing: "tokens", output: output * 100, input: input * 100 },
        ]),
      )
    : {};
}

export function readSeedanceCompletionTokens(response) {
  const value =
    response?.metadata?.usage?.completion_tokens ??
    response?.usage?.completion_tokens;
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function calculateTokenQuote(
  prices,
  { resolution, completionTokens, hasReferenceVideo },
) {
  const price = prices[resolution];
  if (
    price?.billing !== "tokens" ||
    typeof hasReferenceVideo !== "boolean" ||
    !Number.isSafeInteger(completionTokens) ||
    completionTokens <= 0
  )
    return null;
  const rate = hasReferenceVideo ? price.input : price.output;
  if (!Number.isSafeInteger(rate) || rate <= 0) return null;
  const numerator = BigInt(completionTokens) * BigInt(rate);
  const credits = (numerator + 999999n) / 1000000n;
  if (credits > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  // Exact yuan string at six decimals; round credits once for the whole task.
  const yuanDivisor = 100000000n;
  const yuan = `${numerator / yuanDivisor}.${String(numerator % yuanDivisor)
    .padStart(8, "0")
    .replace(/0+$/, "")
    .padEnd(2, "0")}`;
  return { credits: Number(credits), yuan };
}
