# ADR 0047: Add GPT Image 2.5 routes and update the GPT Image 2 provider ID

- Status: Accepted
- Date: 2026-09-12
- Refines: ADR 0030, ADR 0032, and ADR 0036
- Related task: GG-033

## Context

GoodGood currently has one stable GPT IMAGE 2 product model whose O1Key route
uses the historical provider ID `gpt-image-2-c-sd`. The site owner has approved
two additional GPT Image 2.5 variants and the current provider ID for GPT IMAGE
2. All three provider models expose the same request parameters and product
behavior.

The product catalog, persistence constraints, billing prices, mock routing, and
real provider adapter currently assume that only the product ID `gpt-image-2`
belongs to the GPT capability family. Adding selector labels alone would make
drafts, projects, billing, retries, or durable Worker attempts reject the new
models.

## Decision

- Add stable product IDs `gpt-image-2.5-sunburst` and
  `gpt-image-2.5-flare`. Keep the existing stable product ID `gpt-image-2`.
- Order the GPT catalog entries as sunburst, GPT IMAGE 2, then flare, after the
  existing Nano entries.
- Map the three product IDs to provider models `gpt-image-2.5-sunburst`,
  `gpt-image-2`, and `gpt-image-2.5-flare`, respectively. Give each provider
  contract a distinct immutable route version. Existing persisted attempts
  remain bound to their recorded provider model and route version.
- Treat all three product IDs as one GPT capability family: the seven exact
  aspect-ratio/size combinations, `1K / 2K / 4K`, output counts `1 / 2 / 4`,
  quality, background, output format, reference ordering, transparent-JPEG
  rejection, and neutral thinking/search behavior remain identical.
- Publish immutable active prices of 10 credits per output for each new model,
  resolution, and supported count. Do not rewrite historical GPT IMAGE 2 price
  rows or generation records.
- Extend persistence constraints additively in a new migration. UI labels stay
  separate from product and provider identifiers.
- Real-provider acceptance is limited to one synthetic `1K`, one-output request
  per changed provider route. Production deployment remains a separate action.

## Consequences

- Shared helpers must identify the GPT capability family instead of comparing
  only with `gpt-image-2`.
- Drafts, projects, generation batches, price versions, API validation, mock
  routing, provider routing, retry identity, and presentation all gain the two
  new stable product IDs.
- A release must prove there are no active attempts on the historical
  `o1key-gpt-image-2-c-sd-v2` route before a new Worker takes ownership.
- Automated tests use stub or mock transports. The three explicitly authorized
  local provider smokes are billable evidence and are not production evidence.

