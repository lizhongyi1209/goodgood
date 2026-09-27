# ADR 0109: Quiet canvas image hover

- Status: Accepted for GG-128 local implementation
- Date: 2026-09-27
- Task: GG-128
- Supersedes: GG-126's hover, selection, focus and touch action overlay on local image nodes.

## Context

The first draggable local image nodes showed Preview, Use as Reference and Remove buttons over the image. The operator wants the canvas image to remain visually quiet, with only a subtle hover state. Generated result images already link to asset detail without an action overlay.

## Decision

- Local and generated image nodes show a shallow achromatic veil on hover. No image-node action buttons appear on hover, selection, keyboard focus or touch.
- Keep dragging and React Flow selection. Generated result images continue opening their asset detail. The composer retains its separate reference-image picker; generation failure retains its explicit Retry action.
- Remove the local-node Preview, Use as Reference and Remove controls and their dedicated dialog/state. Further image actions need a separate interaction decision.

## Consequences

Local image nodes are temporary and can still be selected and removed with React Flow's keyboard delete behavior; they have no on-image action control. Dropping a file still does not upload it or call a model. This does not change persisted assets, generation, billing or production.
