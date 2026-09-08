# ADR 0036: Add GPT Image 2 quality, background, and format controls

- Status: Accepted
- Date: 2026-09-08
- Supersedes: ADR 0030's deferral of quality and transparent-background controls
- Refines: ADR 0003, ADR 0004, ADR 0030, and ADR 0032
- Related task: GG-015

## Context

GoodGood's GPT IMAGE 2 route currently sends only the exact pixel `size` and
native output count. O1Key also accepts top-level `quality`, `background`, and
`output_format` fields. Creators need these choices in the model-specific
settings while preserving the existing resumable draft, project, retry, and
immutable generation behavior.

Transparent output cannot be represented by JPEG. The product therefore needs
one deterministic interaction and a server-side invariant rather than allowing
an invalid combination to reach a potentially billable provider request.

## Decision

- GPT IMAGE 2 exposes three segmented controls directly below its model selector:
  - quality `auto | low | medium | high`, shown as `自动 / 低 / 中 / 高`;
  - background `auto | transparent`, shown as `自动 / 透明`;
  - output format `png | jpeg | webp`, shown as `PNG / JPEG / WebP`.
- Defaults are `quality: "auto"`, `background: "auto"`, and
  `outputFormat: "png"`. GPT submissions explicitly send all three as top-level
  O1Key fields, using `output_format` for the provider name.
- Choosing transparent background while JPEG is selected changes the format to
  PNG. JPEG is disabled while transparent background remains selected. The API,
  persistence constraints, and provider adapter also reject transparent JPEG.
- These controls render only for GPT IMAGE 2. Other models normalize to the
  defaults and never forward the fields upstream. Switching away from GPT resets
  the GPT-only values.
- Generation batches, projects, and authenticated creation drafts persist the
  normalized product-domain values. Input hashes and retries include them.
- Image detail displays the frozen values. Provider output bytes are not
  converted; existing decoded MIME validation and content-derived object
  extensions remain authoritative.
- The GPT O1Key attempt route advances to
  `o1key-gpt-image-2-c-sd-v2`. Release must drain active v1 attempts before the
  new Worker takes ownership; an attempt is never polled through a mismatched
  route.

## Consequences

- Default GPT requests become explicit and deterministic without changing the
  product's model, size, output count, or 10-credit-per-image price.
- Restored projects, drafts, failed-job settings, and retries reproduce the same
  quality/background/format combination.
- Malformed values, model leakage, and transparent JPEG fail before credit
  reservation or provider submission.
- `moderation`, provider `size: "auto"`, Nano options, and billing changes remain
  outside this slice.
- Automated provider tests use stub transport. Real billable generation and
  production deployment require separate approval.
