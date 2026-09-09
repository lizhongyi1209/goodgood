# ADR 0043: Direct-child transfer of payment-funded credits

- Status: Accepted
- Date: 2026-09-09
- Refines: ADR 0006, ADR 0010, and ADR 0020

## Context

GoodGood needs a small distribution capability without becoming an online
marketplace. The site owner must be able to classify selected accounts as an
enterprise or distributor and bind their direct children. Those accounts need
to allocate credit they actually control to a direct child, while negotiating
price and collecting money outside GoodGood.

The existing credit account has only aggregate available/reserved caches. Its
ledger distinguishes payment-authored and promotional grants, but subsequent
consumption and refunds do not yet preserve a transferable-source projection.
Allowing every available credit to move would let welcome, test, promotion, or
operational grants be resold. Adding an in-product price or payment flow would
also contradict the current controlled-alpha boundary and ADR 0010's deferred
customer checkout.

## Decision

GoodGood will implement an account hierarchy and credit-allocation capability,
not a distribution storefront.

- `enterprise` and `distributor` are stable business roles assigned only by the
  site owner. They are independent of system role, access state, and account
  tier. In the first release both map to the same capability: allocate
  transferable credit to an active direct child.
- A child has at most one active direct parent. Only the site owner may create,
  end, or replace this relationship. Self-links, cycles, and actions across a
  non-direct relationship are rejected. Ending or replacing a relationship
  never rewrites balances or history.
- Allocation is a permanent, atomic, zero-sum transfer, not a revocable credit
  limit. It debits the parent's transferable available balance and credits the
  child's transferable available balance in one database transaction. Paired
  ledger entries share one public transfer ID and immutable audit evidence.
- Only payment-funded credit is transferable. Credit received through a valid
  transfer retains its payment-funded provenance and may be transferred again
  by a child that independently holds an eligible business role. Welcome,
  test, promotion, operational adjustment, and other non-payment grants are
  not transferable.
- Generation spends non-transferable available credit before transferable
  available credit. Reservation records its source split; settlement, release,
  and refund preserve that split instead of converting one source into the
  other.
- Paid credit continues to originate through the accepted immutable payment
  order settlement, including ADR 0010's operator-only manual-payment command.
  A site-owner test-credit grant remains promotional and non-transferable. This
  decision adds no browser payment-recording endpoint.
- GoodGood stores no distributor exchange price, CNY amount, customer payment,
  commission, revenue, withdrawal, or downstream order. Any price negotiation
  and settlement between an upstream account and child remains outside the
  product.
- Normal allocation cannot be edited, deleted, or reclaimed by the parent.
  Exceptional correction is a separately authorized site-owner compensating
  transfer with a reason and original-transfer reference; it cannot make the
  corrected account negative.

## Consequences

- Credit accounting needs a durable source/provenance model plus cached
  transferable/non-transferable available and reserved projections. Existing
  balances must be classified from immutable evidence without resetting or
  inventing production history; existing welcome and test grants default to
  non-transferable, while a uniquely linked paid-order grant is payment-funded.
- Transfer authorization requires both an eligible business capability and the
  active direct relationship. Holding payment-funded credit alone does not
  confer distribution authority.
- Every transfer requires row locking or an equivalent concurrency guard,
  owner-scoped idempotency, paired entries, and one transaction so generation
  reservation and concurrent allocation cannot overspend the same source.
- The account UI may show total available credit and the `可分配积分` subset, but
  it must not imply that GoodGood priced, collected, or settled an off-platform
  sale.
- Online checkout and Alipay remain deferred. Production deployment remains a
  separate user-authorized release decision after local implementation and
  verification.
