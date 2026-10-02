import test from "node:test";
import assert from "node:assert/strict";
import { TEXT_GENERATION_CREDIT_COST, TEXT_GENERATION_CANCELLATION_CREDIT_COST } from "../shared/contracts/text-generation.mjs";
import { textGenerationCreditOutcome, textCancellationPaymentFundedRefund } from "../server/text-generation/credit-policy.mjs";
import { projectSourceAwareCreditBalance } from "../server/billing/policy.mjs";
import { listCreditActivities } from "../server/billing/activity-repository.mjs";
import { CREDIT_UNIT } from "../shared/contracts/model-pricing.mjs";

test("text generation charges 20 on success, 10 on interruption and nothing on failure", () => {
  assert.equal(TEXT_GENERATION_CREDIT_COST, 20);
  assert.equal(TEXT_GENERATION_CANCELLATION_CREDIT_COST, 10);
  assert.deepEqual(textGenerationCreditOutcome("succeeded"), { chargedAmount: 20, refundedAmount: 0 });
  assert.deepEqual(textGenerationCreditOutcome("cancelled"), { chargedAmount: 10, refundedAmount: 10 });
  assert.deepEqual(textGenerationCreditOutcome("failed"), { chargedAmount: 0, refundedAmount: 20 });
  assert.throws(() => textGenerationCreditOutcome("running"), TypeError);
});

test("closing a mixed-source reservation returns the unused paid portion and leaves no frozen credits", () => {
  for (const paid of [0n, 7n, 10n, 13n, 20n]) {
    const initial = { available: 20n, reserved: 0n, paymentFundedAvailable: paid, paymentFundedReserved: 0n };
    const reserved = projectSourceAwareCreditBalance(initial, "reserve", -20n, -paid);
    const settled = projectSourceAwareCreditBalance(reserved, "settle", -20n, -paid);
    const returnedPaid = textCancellationPaymentFundedRefund(paid);
    const refunded = projectSourceAwareCreditBalance(settled, "refund", 10n, returnedPaid);
    assert.equal(refunded.available, 10n);
    assert.equal(refunded.reserved, 0n);
    assert.equal(refunded.paymentFundedReserved, 0n);
    assert.equal(refunded.paymentFundedAvailable, paid > 10n ? 10n : paid);
  }
  assert.throws(() => textCancellationPaymentFundedRefund(-1n), RangeError);
  assert.throws(() => textCancellationPaymentFundedRefund(21n), RangeError);
});

test("usage shows the final 10-credit interruption charge while ledger retains the full settlement and refund", async () => {
  const row = { id: "00000000-0000-4000-8000-000000000001", entry_type: "reserve", amount: "-20", unit: CREDIT_UNIT,
    reason: "text_generation_reservation", metadata: { activityCategory: "text_generation" },
    closing_metadata: { chargedCreditAmount: 10 }, close_entry_type: "settle",
    created_at: "2026-10-02T00:00:00Z", closed_at: "2026-10-02T00:00:01Z" };
  const pool = { query: async () => ({ rows: [row], rowCount: 1 }) };
  assert.equal((await listCreditActivities(pool, { ownerId: "owner", view: "usage" })).items[0].amount, "-10");
  assert.equal((await listCreditActivities(pool, { ownerId: "owner", view: "ledger" })).items[0].amount, "-20");
  const failed = { ...row, close_entry_type: "release", closing_metadata: { chargedCreditAmount: 0 } };
  assert.equal((await listCreditActivities({ query: async () => ({ rows: [failed] }) }, { ownerId: "owner" })).items[0].amount, "0");
});
