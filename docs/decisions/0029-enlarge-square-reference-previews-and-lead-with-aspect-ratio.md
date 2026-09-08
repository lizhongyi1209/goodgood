# ADR 0029: Enlarge square reference previews and lead with aspect ratio

- Status: Accepted
- Date: 2026-09-07
- Task: GG-006
- Supersedes: [ADR 0028](0028-enlarge-reference-previews-and-lead-with-aspect-ratio.md)

## Context

ADR 0028 enlarged the old 46 px square reference crop into a responsive
rectangle. Browser review showed that the rectangle removes too much of the
vertical center of portrait references and makes the tray less useful for
checking the intended subject. The creator confirmed that reference previews
must remain 1:1 and should only grow moderately from the original size.

The aspect-ratio group moving before model and output was accepted in the same
review and remains part of this replacement decision.

## Decision

- Reference previews and the add control use a 1:1 footprint: `64 × 64 px`
  above 720 px and `56 × 56 px` at 720 px and below.
- Preview width and height remain separate shared CSS custom properties so all
  tray elements stay synchronized and future global sizing changes remain
  explicit.
- Reference images use `object-fit: cover` with an explicit centered object
  position. Uploading, failure, removal, accessible order, the ten-image limit,
  and horizontal overflow behavior stay on the same square silhouette.
- Parameter source and visual order remains: aspect ratio, model, output. On
  wide screens aspect ratio is the left group; responsive layouts keep it first.

## Consequences

- The desktop crop grows by 18 px on each edge and the mobile crop grows by
  10 px, improving inspection while preserving the familiar centered 1:1 view.
- More references remain visible in one row than in the superseded rectangular
  layout, while overflow still scrolls horizontally for the full ten-image set.
- This changes only local UI layout. Persisted references, uploads, generation
  payloads, provider behavior, and production state are unchanged.
