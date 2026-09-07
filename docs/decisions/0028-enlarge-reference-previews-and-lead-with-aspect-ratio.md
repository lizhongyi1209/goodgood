# ADR 0028: Enlarge reference previews and lead with aspect ratio

- Status: Accepted
- Date: 2026-09-07
- Task: GG-006

## Context

The composer currently shows uploaded references as fixed 46 px square crops.
That footprint keeps the tray compact, but it is too small for creators to
inspect whether they selected the intended source image. The parameter drawer
also places aspect ratio between model and output, while the requested creation
flow starts with the intended canvas shape.

Both behaviors are confirmed visual decisions in the existing design contract,
so this change records their replacement before implementation.

## Decision

- Reference previews remain in the attached horizontal tray and use a larger
  rectangular crop: `84 × 64 px` above 720 px and `72 × 56 px` at 720 px and
  below.
- Preview size is expressed through shared CSS custom properties so the image,
  add control, tray height, and responsive override remain synchronized.
- Images use `object-fit: cover`. Uploading, failure, removal, accessible order,
  the ten-image limit, and horizontal overflow behavior stay on the same tray
  item silhouette.
- Parameter source and visual order becomes: aspect ratio, model, output. On
  wide screens aspect ratio is the left group. At the two-column breakpoint it
  takes the first full-width row; model and output follow beneath it. On mobile
  all three groups stack in the same reading order.

## Consequences

- Creators can identify uploaded references without opening another surface.
- The tray grows by 18 px on desktop and 10 px on mobile when references exist,
  but it still occupies no space before the first reference is selected.
- The parameter drawer follows one DOM reading order across keyboard,
  accessibility, desktop, and mobile layouts.
- This is a local product/UI decision. It does not change persisted reference
  data, generation payloads, provider behavior, or production deployment state.
