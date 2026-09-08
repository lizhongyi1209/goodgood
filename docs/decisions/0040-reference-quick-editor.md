# ADR 0040: Add a non-destructive reference quick editor

- Status: Accepted
- Date: 2026-09-08
- Supersedes: the read-only-preview clause in ADR 0039
- Refines: ADR 0037, ADR 0038, and ADR 0039
- Related task: GG-020

## Context

The focused reference preview now exposes enough source detail for inspection,
but creators still need to leave GoodGood to crop a reference, mark or cover an
area, overlay another image, point at a detail, or communicate a precise box.
Those round trips break the reusable-material workflow and often create another
manual upload of the same derivative.

The site owner confirmed that reference editing must be non-destructive: an
edited result becomes a new reusable material and replaces the current tray
item at the same ordinal, while the original material remains available. A box
selection communicates coordinates and is not burned into exported pixels.

## Decision

- The reference preview becomes a lightweight browser editor with one compact
  left tool rail: view, crop, brush, sticker, arrow, and box selection. Tool
  settings stay visually attached to the stage and use the existing neutral
  canvas, rounded controls, and Palace Red selection state.
- Crop supports free, original, `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `3:2`, and
  `2:3`. A preset starts with the largest centered crop and the crop can be moved
  or resized before export.
- Brush strokes and arrows are flattened into the edited material. Brush color
  and width support both restrained annotation and opaque covering. Arrow color
  and width are adjustable.
- Sticker layers may come from a local image or the owner's reusable-material
  list. A selected layer can be moved, scaled, rotated, or removed before
  export. Local sticker object URLs remain session-only and are released when
  the editor closes.
- Box selection returns integer pixel coordinates and normalized
  `[x1,y1,x2,y2]` coordinates on a `0–1000` scale relative to the current cropped
  output canvas. It can be copied or appended to the prompt and is never drawn
  into the exported material.
- Undo, redo, and reset apply to pixel-affecting edit state. Closing with
  unsaved changes requires confirmation. `完成编辑` renders the current crop and
  flattened layers to a browser image, uploads it through the existing
  owner-scoped reference lifecycle, and replaces the source reference only
  after the new material reaches ready state.
- The original reference record and object are never modified or deleted. An
  export or upload failure keeps the editor and its edit state available for
  retry.

## Consequences

- No database migration is needed; edited output is a new accepted reference
  material using the existing upload boundary. Canvas input uses one new
  authenticated `GET /api/references/:referenceId/content` route that verifies
  owner and ready/accepted state before returning bytes with `no-store`.
- Layer state is intentionally ephemeral in this slice. Reopening the new
  flattened material starts a fresh edit document rather than restoring layers.
- Browser canvas export loads private source and persisted-sticker bytes through
  the owner-authenticated same-origin content route and fails visibly if those
  bytes cannot be decoded or used safely.
- Very large lossless exports may exceed the 20 MiB reference limit; the editor
  falls back to high-quality WebP before upload rather than submitting an
  already-known invalid payload.
