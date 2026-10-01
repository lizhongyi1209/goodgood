# ADR 0123: Canvas media preview carousel

- Status: Accepted for GG-249 local implementation
- Date: 2026-10-01
- Task: GG-249
- Supersedes: GG-238's fullscreen, image-only scope and native scrolling rail for the canvas image preview entry only.

## Decision

The canvas image expand action opens a bounded floating viewer. The complete original image fits within a stage with explicit available width and height. The right rail contains current-scope images and video frame previews, without a visible title or scrollbar. Vertical wheel gestures select adjacent items; thumbnails align to the right, pack closely and may overlap. The selected thumbnail scales toward the left above its neighbors, with smooth movement and scaling. Reduced motion disables animation.

Keep click/arrow navigation, bounded ends, loading/retry, Escape and trigger focus restoration. Selected videos reuse the existing node-style canvas playback and private URL refresh. This is transient viewing only. The asset-page image viewer and original standalone video entry retain their current behavior. No backend, generation, upload or project persistence changes are required.

## GG-251 user correction (2026-10-01)

The user's screenshot shows cropped main media and excessive thumbnail overlap. Replace overlap and leftward extraction with a small gap between every item and a centered 1.12 scale for the selected item. Calculate vertical positions using displayed thumbnail heights, including the selected scale, to preserve the gap. Enlarge the bounded dialog slightly (1280px/viewport minus 32px, 900px/92dvh). The left side is a preview canvas: anchor its media region to explicit edges and fit the complete source there, without intrinsic grid sizing or cropping. This supersedes the corresponding GG-249 rules above; wheel, video playback and focus contracts remain.

## GG-253 detail and image navigation (2026-10-01)

The user now requests a real movable image preview. Wheel gestures in the image canvas zoom around the pointer; dragging pans the image. Wheel no longer selects media. Thumbnails use the canvas asset panel's actual media visual in one column, without a separate card fill or fixed-ratio letterbox. The current item shifts slightly left with a clear selected state. The rail scrolls normally with its scrollbar hidden; selection is by click or keyboard.

Move the asset title into a separate information region to the left of the image canvas, with real model/input parameters from the existing authorized generation record. Uploaded media does not acquire invented metadata. Zoom/pan is transient and resets on selection/close, with accessible zoom/fit controls and bounded scale. Preserve image loading/retry, video playback, Escape/focus, reduced motion and asset-page defaults. This supersedes the wheel-selection, centered enlargement and bottom-title rules above.
