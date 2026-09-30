import { currentCreditAmount } from "./model-pricing.mjs";
import {
  SEEDREAM_MODEL_ID,
  seedreamReferenceSurcharge,
} from "./seedream-models.mjs";

export function isSeedreamModel(modelId) {
  return modelId === SEEDREAM_MODEL_ID;
}

// Keep the stored base price version unchanged; supplements use current credits.
/** @returns {`${bigint}` | null} */
export function seedreamQuoteCreditAmount(
  baseAmount,
  creditUnit,
  referenceCount = 0,
) {
  const supplement = seedreamReferenceSurcharge(referenceCount);
  if (
    supplement === null ||
    !["credit", "credit-cny-cent"].includes(creditUnit) ||
    !["string", "number", "bigint"].includes(typeof baseAmount) ||
    (typeof baseAmount === "number" && !Number.isSafeInteger(baseAmount)) ||
    !/^[1-9]\d*$/.test(String(baseAmount))
  )
    return null;
  return /** @type {`${bigint}`} */ ((
    BigInt(currentCreditAmount(baseAmount, creditUnit)) + BigInt(supplement)
  ).toString());
}
