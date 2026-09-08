# ADR 0038: Make reference order visible and user controlled

- Status: Accepted
- Date: 2026-09-08
- Supersedes: the no-visible-number-badge clause in `docs/UX_FLOWS.md`
- Refines: ADR 0029 and ADR 0037
- Related task: GG-018

## Context

GoodGood already preserves the reference tray array as the ordered generation
snapshot, and the backend assigns `参考图 1…10` ordinals from that array. The
composer, however, does not let a creator change the order after upload or
material selection and does not visibly identify which item is image 1 or 2.
This makes prompts such as “use image 1 for the subject and image 2 for style”
hard to verify before submission.

The previous UX contract deliberately avoided visible number badges. The site
owner has now explicitly replaced that choice with a visible ordinal and drag
reordering requirement.

## Decision

- Every reference tray thumbnail shows a compact `图 1` through `图 10` badge
  at its lower-left corner. The badge is always visible and renumbers
  immediately after add, remove, restore, or reorder.
- Creators may drag one tray item onto another to move it to that position.
  The horizontal tray remains stable and provides restrained dragging and drop-
  target feedback.
- Keyboard users can move a focused reference with `Alt + ←` and `Alt + →`.
  Accessible names describe the current ordinal and reorder affordance.
- The reordered tray array is the single source of truth. Root-draft autosave,
  explicit project save, and generation submission use that same order, so
  visible `图 1…10` matches the backend/provider ordinal without a second mapping.
- Newly uploaded or selected references continue to append at the end. Removing
  an item closes the gap and renumbers the remaining items.

## Consequences

- Prompts that refer to numbered images become understandable and predictable.
- No schema migration or drag-and-drop dependency is required; existing ordered
  reference snapshots already persist the array order.
- Material-library sort order is unchanged. This decision affects only the
  selected reference tray for the current creation/project.
- Touch-specific freeform sorting beyond browser pointer/drag support is not a
  separate gesture system in this slice; keyboard ordering remains available.
