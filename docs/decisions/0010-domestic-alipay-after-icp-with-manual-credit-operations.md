# ADR 0010: Domestic Alipay after ICP with manual credit operations

- Status: Accepted
- Date: 2026-09-02

## Context

GoodGood's initial customers and the operator's registered sole proprietorship
are in mainland China. The business can issue invoices and wants the eventual
customer checkout to use domestic Alipay and CNY. A USD or cross-border payment
facade would require a genuine overseas merchant entity and would not make a
mainland sole proprietorship an overseas merchant.

The filed production domain and domestic Alipay product are not ready yet.
Existing customers can pay through the operator's established invoiced business
process while the rest of the product is completed. GoodGood therefore needs a
safe temporary way to record a confirmed receipt and grant the corresponding
product credit without exposing an unauthenticated or weakly authorized balance
mutation endpoint.

## Decision

Domestic Alipay is the selected production payment direction. Customer checkout
and the real Alipay adapter remain disabled until an ICP-filed domain, matching
merchant qualification, sandbox verification, and production approval exist.
GoodGood will not use USD display, a personal QR code, or a cross-border facade
to bypass those prerequisites.

Before customer checkout exists, a server operator may record an already
received and independently invoiced payment through an operator-only command.
There is no browser administrator endpoint. The command:

- is a dry-run unless `--execute` is supplied;
- identifies one active owner by exact case-insensitive email;
- accepts one stable GoodGood payment-product ID, never money or credit amounts;
- requires an operator ID and an external receipt/reference of 8-200 characters;
- stores that reference as the immutable `manual` provider order ID;
- creates or reuses the normal immutable `PaymentOrder` snapshot;
- transitions the order from `pending` to `paid` and appends one operator-authored
  grant through the existing credit ledger transaction; and
- treats an exact replay as a no-op while rejecting reuse of the same receipt for
  another owner or product.

The fake provider remains local test infrastructure. A later Alipay adapter will
have provider-specific order creation, signature verification, refund semantics,
and callback evidence, but will settle the same GoodGood payment order and
append-only credit ledger.

## Consequences

- Existing customers can receive paid credit before public checkout exists,
  without direct SQL balance edits.
- The initial CNY 10 / 500-credit product remains server-owned and immutable.
- Manual operation requires trusted server/database access and a separately
  verified business receipt; the command does not collect money or issue an
  invoice.
- The first run should always be reviewed in dry-run mode before repeating it
  with `--execute`.
- A customer-facing wallet/checkout route, automated Alipay refunds, and a
  browser administrator role remain deferred rather than being approximated.
- ADR 0006 remains authoritative for product-owned billing, and ADR 0009 remains
  authoritative for the flat Banana 2 price and welcome grant.
