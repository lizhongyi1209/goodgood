# ADR 0062 — RMB-anchored specification pricing

- Status: Accepted
- Date: 2026-09-13
- Task: GG-051
- Scope: accepted product pricing direction; rates, unit conversion and implementation remain pending

## Context

The owner accepts Runway's customer pricing approach: images priced by output
specification, video priced by output seconds with an explicit reference-video
input charge where applicable. GoodGood buys through O1Key routes that can have
fixed-image or token-based costs. Customer consumption rules must remain
understandable while the server independently measures those costs.

The owner wants the unit anchored to RMB and proposes “CNY 1 for 100 credits”
as an example for evaluation. ADR 0009's current accepted conversion is CNY 10
for 500 credits. The example is not authorization to convert existing accounts
or publish new prices.

## Decision

- Adopt customer specification pricing, with route-specific price rules and an
  RMB anchor. Images use published per-image prices for their enabled route and
  applicable parameters. Video uses published output-seconds prices plus
  separately disclosed reference-video-seconds charges where needed.
- Separate the customer price version from the upstream cost version. Token
  evidence supports cost accounting, rate evaluation and reconciliation; it
  does not silently reprice an accepted fixed-specification customer quote.
- The first video pricing implementation should use explicit output duration.
  Submission locks the selected route, parameters, eligible input durations,
  sales-rate version and quoted total. Automatic duration needs a separate
  accepted quoting/settlement contract before being enabled commercially.
- Preserve explicit route selection. A switch to a route with another price
  is a new quote, not silent cost-based fallback.
- Model/route rules and future site-owner pricing publication must use the same
  server-side engine. The panel direction is recorded; its implementation and
  exact fields remain in the task's proposed scope.

## Consequences and pending choices

- CNY 1 for 100 credits is the recommended unit for discussion: one credit
  equals a baseline CNY 0.01 of priced consumption. If adopted with unchanged
  RMB prices, old credit quantities convert at 1 old credit to 2 new credits.
  Balances, reserved balances, source balances, enterprise/member budgets and
  recharge quantities must be addressed together; immutable historical rows
  must retain their original units and terms.
- No current runtime rate, account, welcome grant or payment product changes
  through this ADR. ADR 0009 continues to describe the deployed/current credit
  terms until a conversion decision and migration are reviewed.
- Specification rates cannot by themselves remove upstream token variance.
  Actual O1Key route bills and the full enabled parameter range are needed to
  evaluate margins and acceptable loss exposure before setting concrete rates.
- Refund/failure treatment, duration rounding, volume discounts, input cost
  classes and any new reference charges remain explicit implementation choices
  to settle before implementation. Prior customer failure policy is not changed.
