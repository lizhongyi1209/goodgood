# ADR 0039: Open ready references in a focused large preview

- Status: Accepted
- Date: 2026-09-08
- Refines: ADR 0029 and ADR 0038
- Related task: GG-019

## Context

The composer uses compact square crops so several references remain visible and
reorderable. Those crops are useful for orientation but cannot show fine details
such as fabric texture. The remove control also occupies too much of the current
64 px thumbnail, especially when the important subject reaches the upper-right
corner.

## Decision

- Clicking a ready reference thumbnail opens a focused large preview of that
  reference. The preview contains the complete image without cropping and stays
  within the available viewport.
- The preview is read-only in this slice. It identifies the current `图 N` and
  filename, closes through its explicit close control or standard dialog Escape
  behavior, and does not add asset, download, or delete actions.
- Uploading and failed references do not open the large preview because they do
  not yet have a valid reusable image.
- Dragging a reference remains a reorder gesture and must not open the preview
  when the drag ends. Keyboard users open a focused ready reference with Enter
  or Space and keep `Alt + ← / →` for ordering.
- The thumbnail remove control remains at the upper-right, but uses a smaller
  hit area and icon with clear hover and focus states. Activating it removes the
  reference without opening the preview.

## Consequences

- Creators can inspect source details without leaving the composer or adding a
  separate route.
- The compact tray and its persisted ordering contract are unchanged.
- No schema, provider, storage, or asset-lifecycle change is required.

