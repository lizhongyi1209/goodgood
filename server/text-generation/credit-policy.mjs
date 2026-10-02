import { TEXT_GENERATION_CREDIT_COST, TEXT_GENERATION_CANCELLATION_CREDIT_COST } from "../../shared/contracts/text-generation.mjs";

export function textGenerationCreditOutcome(state) {
  if (!["succeeded", "cancelled", "failed"].includes(state)) throw new TypeError("A terminal text generation state is required.");
  const chargedAmount = state === "succeeded" ? TEXT_GENERATION_CREDIT_COST : state === "cancelled" ? TEXT_GENERATION_CANCELLATION_CREDIT_COST : 0;
  return { chargedAmount, refundedAmount: TEXT_GENERATION_CREDIT_COST - chargedAmount };
}

export function textCancellationPaymentFundedRefund(reservedPaymentFundedAmount) {
  const funded = BigInt(reservedPaymentFundedAmount);
  if (funded < 0n || funded > BigInt(TEXT_GENERATION_CREDIT_COST)) throw new RangeError("Invalid payment-funded reservation.");
  // Reservations spend non-transferable credits first; return unused paid credits first.
  const refund = BigInt(TEXT_GENERATION_CREDIT_COST - TEXT_GENERATION_CANCELLATION_CREDIT_COST);
  return funded < refund ? funded : refund;
}
