# ADR 0009: Flat Banana 2 credit price and welcome grant

- Status: Accepted
- Date: 2026-09-02

## Context

GoodGood uses a stable special-price New API route for Nano Banana 2. The
customer-facing GoodGood price is CNY 0.20 per successfully delivered image;
the upstream route costs approximately CNY 0.05 to 0.10. The website is an
acquisition surface for an existing client business, so a simple, memorable
price is more valuable than exposing upstream token accounting or the three New
API channel classes.

The current durable path supports one 1K output. The product already defines
1K, 2K, and 4K resolution values, and the operator wants the same Banana 2
customer price at every supported resolution. GoodGood still needs integer
credit granularity for future models and promotions, a bounded welcome trial,
and price history that can change without rewriting prior jobs.

## Decision

Price Nano Banana 2 at 10 GoodGood credits per successfully delivered image for
1K, 2K, and 4K. Persist three version-1 price rows even though their credit
amount is equal. Only a resolution whose provider path and decoded output have
passed verification may be enabled in the generation API.

The initial payment-product conversion is CNY 10 for 500 credits, with no pack
bonus. This makes 10 credits equivalent to the accepted CNY 0.20 image price,
but generation prices remain credit-denominated and do not persist CNY values.
Payment-product versions own the later money-to-credit conversion.

Every newly provisioned GoodGood owner receives one non-expiring 100-credit
welcome grant, equivalent to 10 Banana 2 images at any enabled resolution. The
grant is server-owned, append-only, and idempotent per owner and campaign.
Existing owners receive the same one-time grant through the M6 data migration.
Linking or repeating Google/email login does not create another grant.

Generation submission reserves 10 credits per requested output in the same
transaction as batch/job creation. Each successfully delivered output settles
its reservation. A terminal job with no accepted Asset releases the customer's
reservation, including `SUBMISSION_UNKNOWN`; this customer credit policy does
not assert that the upstream request was refunded. An explicit retry is a new
job and a new reservation.

The M6 launch route remains the special-price route. It must not silently fall
back to a higher-cost quality or enterprise route at the same customer price.
The browser may display the server-owned quote and account balance but never
submits a price or authorizes its own spend.

## Consequences

- The creation UI can say `10 积分/张 · 全分辨率同价`, and a new owner receives
  `100 积分，可生成 10 张` without exposing provider channels.
- The welcome acquisition cost is approximately CNY 0.50 to 1.00 per owner
  before infrastructure and ambiguous upstream charges.
- Prices remain resolution-versioned, so a later price change publishes a new
  row instead of mutating history.
- Paid packs, payment callbacks, account UI, abuse limits, and higher-cost
  channel products remain later M6 slices.
- ADR 0006 remains authoritative for product-owned billing. ADR 0008 remains
  authoritative for O1Key submission uncertainty; releasing customer credit is
  separate from provider charge/refund reconciliation.
