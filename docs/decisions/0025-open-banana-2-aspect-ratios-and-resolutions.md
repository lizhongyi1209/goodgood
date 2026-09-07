# ADR 0025: Open Banana 2 aspect ratios and resolutions

- Status: Accepted
- Date: 2026-09-07

## Context

GoodGood's durable generation path originally admitted only Nano Banana 2 at
`1:1`, `1K`, and one output. The creation UI and persisted domain model already
define fourteen aspect ratios and the `1K`, `2K`, and `4K` resolution values,
but the browser, generation API, and O1Key adapter reject every combination
except `1:1` and `1K`.

Creators need the full product-defined canvas range during the controlled alpha.
The selection must remain a server-validated domain value and must reach the
provider without being replaced by a fixed adapter default.

## Decision

Enable Nano Banana 2 for every combination of these aspect ratios:

`1:8`, `1:4`, `9:16`, `2:3`, `3:4`, `4:5`, `1:1`, `5:4`, `4:3`, `3:2`,
`16:9`, `21:9`, `4:1`, and `8:1`.

Enable the existing product resolutions `1K`, `2K`, and `4K`. Keep the model
fixed to Nano Banana 2 and the requested output count fixed to one. `0.5K` is
not added because it is outside GoodGood's confirmed resolution vocabulary and
has no product price row.

The generation API validates the selected values against server-owned
allowlists. The durable job snapshot retains them, retries reuse that snapshot,
and the O1Key adapter sends the exact selected `aspect_ratio` and `size` values.
The O1Key route version advances to
`o1key-gemini-3.1-flash-image-c-sp-v2` so generation attempts identify the
expanded adapter contract.

ADR 0009's price remains unchanged: every enabled Nano Banana 2 resolution
costs 10 credits for the single output. No database migration is required.

## Consequences

- The creation surface exposes 42 supported aspect-ratio/resolution
  combinations through the existing controls.
- Unknown ratios, unknown resolutions, other models, and multi-output requests
  continue to fail closed before provider submission.
- Automated verification covers the complete 42-combination request matrix
  against a fake O1Key boundary without incurring provider charges.
- Promotion must drain or exclude active generation attempts created under the
  previous route version. A billable live-provider smoke remains an explicit
  release action rather than an automatic test.
- This record supersedes only the fixed `1:1` and `1K` portions of the original
  M3/M5 slice. ADR 0008's at-most-once submission rules and ADR 0009's billing
  rules remain authoritative.
