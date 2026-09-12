# ADR 0055 — Attached parameter drawer overlays results

- Status: Accepted
- Date: 2026-09-13
- Task: GG-042

## Decision

The owner changes the image/video parameter drawer from in-flow expansion to
an attached downward overlay. Opening/closing must not move the finished-work
area. Raise the open composer one layer above its normal sticky level, retaining
an opaque white surface, attached edges, and shallow elevation. Do not add a
modal veil or detached settings panel.

The drawer is anchored below the prompt and reference tray. Bound its scrolling
area to the remaining viewport space, recalculating on composer resize and page
scroll. Closed controls are inert and hidden. Preserve parameter values, order,
mode switching, model menu, and the existing settings-toggle interaction.

This supersedes only the old in-flow drawer layout; generation, media, pricing,
persistence, and provider behavior do not change. Local verification only.
