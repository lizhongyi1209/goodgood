# ADR 0110: Canvas image selection frame

- Status: Accepted for GG-130 local implementation
- Date: 2026-09-27
- Task: GG-130
- Supersedes: GG-129's move cursor, detached selection outline, and single achromatic resize handle in ADR 0109's addendum
- Exception to: ADR 0105's achromatic selection color, limited to the canvas image selection frame

## Context

The operator clarified that “移动” meant the computer's normal arrow cursor, not the CSS four-way move cursor. The selected image's dark two-pixel outline had a gap from the picture, and its single bottom-right handle felt too prominent. The requested selection affordance is a fine bright-blue frame touching the image and minimal resize controls on all four corners.

## Decision

- Image bodies use the system's default arrow on hover and while dragging. Dragging and clicking a generated image to open asset detail still work.
- A selected, loaded local or generated image has a one-pixel `#3b82f6` outline with zero offset. The image card has no inner border or padding, so the frame touches the image.
- Four compact blue quarter-arc controls sit flush with the image corners, without white square fills. Their transparent hit areas stay large enough to grab. Opposite corners use the standard matching diagonal resize cursors. Dragging any corner preserves the original aspect ratio and the existing size limits. GG-134 refines the original square handle appearance; it does not change the resize behavior.
- Hover alone keeps only the shallow neutral veil. The blue is solely a spatial selection/resize affordance on canvas images; it does not become a product accent, status color, focus token, or shared component color.

## Consequences

This replaces the GG-129 visual and cursor choices while retaining its resize behavior and temporary node dimensions. `AGENTS.md` and `docs/DESIGN_SYSTEM.md` record the narrow exception to ADR 0105. No asset, generation, billing, persistence, route, or deployment behavior changes.
