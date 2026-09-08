# ADR 0035: Simplify the sidebar credit summary

- Status: Accepted
- Date: 2026-09-08
- Supersedes: the desktop two-line account-credit summary in `DESIGN_SYSTEM.md`
- Refines: ADR 0009
- Related task: GG-014

## Context

The desktop sidebar repeats the fixed launch price and derives an approximate
remaining-image count below the available-credit balance. The creation composer
already presents the active model's per-image rate and selected batch total,
where that information is actionable and model-aware. Repeating a launch-model
estimate in account chrome adds noise and can be mistaken for a universal
generation allowance.

## Decision

- The authenticated desktop sidebar shows only `积分余额` and the current
  available-credit number in its normal success state.
- The secondary `积分/张 · 可生成 … 张` line is removed, together with its
  launch-model quote derivation in the page component.
- Loading, read-failure, retry, zero-balance, mobile-balance, and composer-price
  behavior remain unchanged.

## Consequences

- Account chrome becomes quieter and no longer duplicates model-specific
  pricing.
- Users still see the exact per-image and batch quote beside the generation
  controls before submitting.
- The billing boundary may retain its general remaining-image helper for other
  consumers and tests; this decision removes only the sidebar use.
- This ADR authorizes local implementation and verification only. Production
  deployment remains a separate action.
