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

## GG-129 addendum (2026-09-27)

The image body uses a move cursor instead of React Flow's default grab/grabbing cursor. Selecting a successfully loaded local or generated image reveals one small achromatic bottom-right resize control. It scales the card with its image aspect ratio; hover alone still reveals no controls or actions. Dimensions stay on temporary React Flow nodes and survive updates for the same generated output, without changing saved assets.

GG-137 later replaces the shallow hover veil with the same blue outline as selection; the no-action-overlay rule remains.

## GG-145 addendum · read-only image metadata (2026-09-27)

Loaded local and generated image nodes may show persistent, read-only metadata immediately above the image: an image icon and filename at left, original pixel dimensions at right. This does not restore hover action overlays or obscure the image. Long filenames truncate against the temporary node width and expand as the user enlarges it. After manual feedback, metadata remains on one line at all widths: narrow nodes hide the filename, and very narrow nodes hide dimensions while retaining the image type icon. Original pixel dimensions remain fixed while the React Flow card is resized or the viewport zooms. Local filenames come from `File.name`; generated names follow the existing asset download naming rule because generation outputs do not carry an original filename. Missing local dimensions are filled from the loaded file without changing the node's user-resized CSS dimensions. Generated dimensions use backend original-pixel metadata only; a missing value stays unknown rather than reporting the 512px preview size.
