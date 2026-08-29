# ADR 0006: Product-owned billing and scoped provider routing

- Status: Accepted
- Date: 2026-08-29

## Context

GoodGood needs its own accounts and prices while using an existing US service
to reach multiple generation models. Browser-owned balances or a shared
upstream administrator credential would create fraud, isolation, audit, and
failure risks. Automatic provider grouping can improve availability but can
also silently change product semantics or create duplicate cost.

## Decision

GoodGood owns user identity, entitlements, versioned prices, credit balances,
and an append-only server-side ledger. The browser may display and initiate
payment or generation actions but never authorizes its own spend. Generation
submission reserves credit transactionally; success settles it, failure
releases it, and refunds or expiry are separate auditable entries.

The Hong Kong worker calls a US generation gateway with a dedicated,
least-privilege GoodGood service credential, model allowlist, concurrency and
spend limits, rotation, and audit. It must not use a credential that can manage
unrelated users, providers, or administrator settings.

Stable GoodGood model IDs map server-side to versioned provider routes. Automatic
routing and fallback are allowed only between explicitly equivalent routes for
the selected product model. GoodGood does not silently substitute a different
model family. Every attempt records route version, provider model/version,
provider task ID, outcome, and provider cost.

## Consequences

- Customer prices can remain stable while upstream costs and routes change.
- Duplicate requests, messages, and callbacks require end-to-end idempotency.
- Provider availability does not become a promise that every model is always
  available; capacity errors remain explicit and recoverable.
- Pricing, ledger, provider-attempt, and payment records become canonical domain
  entities before real billing is enabled.
- Payment processors move money, while the GoodGood backend remains the source
  of truth for product credits and entitlements.
