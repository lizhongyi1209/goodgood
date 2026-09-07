# ADR 0030: Open GPT Image 2 SD with model-specific sizes

- Status: Accepted
- Date: 2026-09-08

## Context

GoodGood currently lists GPT IMAGE 2 in the model selector and permits its
stable product identifier in persisted records, but the durable generation
path, provider router, and active billing summary admit only Nano Banana 2.
The creation UI also derives every pixel readout from Nano Banana's ratio and
resolution table. GPT Image 2 instead accepts a smaller set of exact pixel
sizes, so reusing the Nano table would display and submit incorrect values.

The site owner has approved the first GPT Image 2 release through O1Key's
`gpt-image-2-c-sd` route. One generated image costs 10 GoodGood credits at each
of the existing `1K`, `2K`, and `4K` product resolutions.

## Decision

Add a model-owned generation capability matrix. GPT IMAGE 2 supports one output
at the following aspect ratios and exact provider sizes:

| Ratio | 1K | 2K | 4K |
| --- | --- | --- | --- |
| `1:1` | `1024x1024` | `2048x2048` | `2880x2880` |
| `3:2` | `1536x1024` | `3072x2048` | `3504x2336` |
| `2:3` | `1024x1536` | `2048x3072` | `2336x3504` |
| `4:3` | `1360x1024` | `2736x2048` | `3264x2448` |
| `3:4` | `1024x1360` | `2048x2736` | `2448x3264` |
| `16:9` | `1824x1024` | `3648x2048` | `3840x2160` |
| `9:16` | `1024x1824` | `2048x3648` | `2160x3840` |

The UI shows only ratios supported by the selected model and displays the exact
pixel dimensions for the selected model, ratio, and product resolution. When a
model change makes the current ratio invalid, the composer selects the nearest
supported ratio in the same orientation and immediately exposes that change.
Persisted generation input continues to store the stable product model, ratio,
and `1K` / `2K` / `4K` resolution rather than a provider label or pixel string.

The O1Key adapter maps a GPT IMAGE 2 request to `gpt-image-2-c-sd`, sends the
selected exact size with a lowercase `x`, sends `n: 1`, and does not send
Nano-specific `aspect_ratio` or `response_modalities` fields. Reference images
reuse the ordered temporary-upload and `fileData` path already accepted by the
provider contract. Provider route identity is persisted under a distinct route
version so retries and recovery remain bound to the original provider contract.

Publish immutable active prices for GPT IMAGE 2 at 10 credits for one output at
each of `1K`, `2K`, and `4K`. The billing summary returns active launch prices
for every enabled model. `auto`, multi-output, transparent-background controls,
quality controls, Nano Banana Pro, and Seedream remain outside this slice.

## Consequences

- GPT IMAGE 2 has 21 supported ratio/resolution combinations, all guarded in the
  browser and again before provider submission.
- Nano Banana 2 keeps its existing 42 combinations and O1Key request shape.
- A saved draft or project can retain GPT IMAGE 2 through the existing stable
  domain identifiers; provider-specific pixel strings do not leak into storage.
- Fast tests cover the complete mapping and fake O1Key request shapes without
  incurring provider charges. A real provider smoke remains a separately
  authorized billable verification step.
- Promotion must account for active generation attempts bound to both provider
  route versions and must not silently resubmit an ambiguous billable request.

