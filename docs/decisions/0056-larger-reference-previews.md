# ADR 0056 — Larger square reference thumbnails and media inspection

- Status: Accepted
- Date: 2026-09-13
- Task: GG-043

## Decision

The owner requests clearer uploaded-material previews in image and video modes.
Increase their shared 1:1 tray thumbnail dimensions from 64px/56px to 96px on
desktop and 80px on mobile. Keep horizontal overflow, existing compact labels,
removal controls, ordering, and model/mode-specific reference limits unchanged.

Image mode retains its existing complete-image quick editor. Video mode adds a
read-only, viewport-contained Radix dialog for click/Enter/Space inspection:
uncropped images, controlled video playback, or audio playback without autoplay.
Escape/close returns to the clicked thumbnail. Loading/error/retry stay inside
the dialog and never remove references or trigger creation/generation requests.
No new uploads, backend/media persistence, provider calls, or deployment.

This changes only the confirmed thumbnail dimensions and video-mode inspection
boundary, not image editing or any generation/material-creation contract.
