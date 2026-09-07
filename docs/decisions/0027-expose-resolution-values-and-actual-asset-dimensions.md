# ADR 0027: Expose resolution values and actual asset dimensions

- Status: Accepted
- Date: 2026-09-07
- Supersedes: the presentation-label portion of ADR 0001 and the original
  `标准 / 高清 / 超清` copy described in the product journey

## Context

GoodGood persists generation resolution as `1K`, `2K`, or `4K`, but the
creation surface translates those values to `标准`, `高清`, and `超清`. The
asset library also shows only that translated request value even though each
accepted Asset already stores the pixel width and height decoded from the
provider output.

The nominal resolution value does not define one universal pixel size. Models
and aspect ratios may return different actual dimensions for the same `2K` or
`4K` request. Creators need both the requested tier and the delivered dimensions
when judging and reusing an Asset.

## Decision

Show the existing domain values directly as `1K`, `2K`, and `4K` everywhere a
generation resolution is presented. Keep the persisted values and provider
request contract unchanged.

Expose each accepted Asset's stored pixel width and height through the
generation and asset APIs. In the asset library and image detail, present the
requested resolution together with the actual dimensions, for example
`4K · 3584 × 4800`. Dimensions belong to the individual Asset and come from
decoded provider bytes; the UI must not infer them from the requested tier,
model, aspect ratio, CSS, or a static lookup table. If an old or provisional
client record lacks dimensions, show the requested resolution without inventing
pixel values.

## Consequences

- Creator-facing resolution vocabulary now matches the API and persisted
  values, reducing ambiguity across models.
- Asset batch metadata, gallery metadata, and focused detail can distinguish
  the requested tier from the delivered image size.
- No database migration or provider change is required because accepted Assets
  already persist positive `pixel_width` and `pixel_height` values.
- Presentation and API tests must prove dimensions originate from the Asset
  row and remain optional only for compatibility with provisional/local data.
