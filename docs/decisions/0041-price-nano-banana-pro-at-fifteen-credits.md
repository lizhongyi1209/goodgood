# ADR 0041: Price Nano Banana Pro at fifteen credits

- Status: Accepted
- Date: 2026-09-09

## Context

GoodGood already presents Nano Banana Pro as a stable product model, but the
model has no active customer-credit price and its real provider route is still
deferred. The site owner has now set the customer price at 15 GoodGood credits
per generated image. The product currently exposes only one output when this
model is selected.

Generation prices are server-owned, immutable, resolution-versioned records.
Publishing a price must not be confused with enabling an unverified provider
route or allowing the browser to choose the amount charged.

## Decision

Publish version-1 standard prices for Nano Banana Pro at 15 GoodGood credits
for one output at each existing product resolution: `1K`, `2K`, and `4K`.
Expose those rows through the authenticated billing summary so the composer
shows `15 积分/张` when Nano Banana Pro is selected.

This decision does not enable Nano Banana Pro generation. Its capability map,
provider model, provider route, request contract, and real-provider acceptance
remain a separate product and engineering slice. If multi-output is opened
later, that slice must publish explicit count-2/count-4 price rows rather than
assuming or synthesizing prices in the browser.

## Consequences

- The same per-image price applies to the three displayed resolution tiers.
- Existing Nano Banana 2 and GPT IMAGE 2 prices remain unchanged.
- The local preview and durable billing API agree on the 15-credit quote.
- A future Nano Banana Pro launch may reserve this price only after its server
  capability and provider route are explicitly enabled and verified.
- Migration 0019 appends rows and does not rewrite immutable price history.
