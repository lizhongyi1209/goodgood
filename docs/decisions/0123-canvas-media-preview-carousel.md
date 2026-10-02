# ADR 0123: Canvas media preview carousel

- Status: Accepted for GG-249 local implementation
- Date: 2026-10-01
- Task: GG-249
- Supersedes: GG-238's fullscreen, image-only scope and native scrolling rail for the canvas image preview entry only.

## Decision

### GG-314 picture node entry (2026-10-02)

The user adds an explicit top-right expand button to canvas picture nodes, superseding GG-128's removal of that picture-view overlay only. Source pictures, standalone generation results and generator output pictures reuse the canvas asset panel's 24px expand button, 14px Maximize2 icon and hover/focus/touch visibility. Expanded batches expose each picture's entry; collapsed batches expose the front picture only. Opening reuses this canvas-mode ImageViewer, authorized original/local source reads, known dimensions and actual generation input metadata. Pointer/keyboard events on the button do not select/drag/connect nodes or open the generator composer; crop mode disables the entry. Close/Escape restore focus. Empty/error states do not introduce picture-view actions. The canvas300% display-preview gate from ADR0132 remains separate and unchanged.

The canvas image expand action opens a bounded floating viewer. The complete original image fits within a stage with explicit available width and height. The right rail contains current-scope images and video frame previews, without a visible title or scrollbar. Vertical wheel gestures select adjacent items; thumbnails align to the right, pack closely and may overlap. The selected thumbnail scales toward the left above its neighbors, with smooth movement and scaling. Reduced motion disables animation.

Keep click/arrow navigation, bounded ends, loading/retry, Escape and trigger focus restoration. Selected videos reuse the existing node-style canvas playback and private URL refresh. This is transient viewing only. The asset-page image viewer and original standalone video entry retain their current behavior. No backend, generation, upload or project persistence changes are required.

## GG-251 user correction (2026-10-01)

The user's screenshot shows cropped main media and excessive thumbnail overlap. Replace overlap and leftward extraction with a small gap between every item and a centered 1.12 scale for the selected item. Calculate vertical positions using displayed thumbnail heights, including the selected scale, to preserve the gap. Enlarge the bounded dialog slightly (1280px/viewport minus 32px, 900px/92dvh). The left side is a preview canvas: anchor its media region to explicit edges and fit the complete source there, without intrinsic grid sizing or cropping. This supersedes the corresponding GG-249 rules above; wheel, video playback and focus contracts remain.

## GG-253 detail and image navigation (2026-10-01)

The user now requests a real movable image preview. Wheel gestures in the image canvas zoom around the pointer; dragging pans the image. Wheel no longer selects media. Thumbnails use the canvas asset panel's actual media visual in one column, without a separate card fill or fixed-ratio letterbox. The current item shifts slightly left with a clear selected state. The rail scrolls normally with its scrollbar hidden; selection is by click or keyboard.

Move the asset title into a separate information region to the left of the image canvas, with real model/input parameters from the existing authorized generation record. Uploaded media does not acquire invented metadata. Zoom/pan is transient and resets on selection/close, with accessible zoom/fit controls and bounded scale. Preserve image loading/retry, video playback, Escape/focus, reduced motion and asset-page defaults. This supersedes the wheel-selection, centered enlargement and bottom-title rules above.

## GG-258 addendum · unobstructed preview and quieter uploaded details (2026-10-01)

Remove the bottom-right zoom/fit buttons and scale overlay from the canvas image detail so they cannot cover the media. Keep drag pan, wheel zoom and keyboard zoom/fit. Preserve the title in the information region; non-generated media displays only known dimensions below it, without image/video type copy or missing-generation explanations. Actual generated parameters and prompt, empty selection and media recovery remain. This replaces GG-253's visible zoom/fit control requirement without changing navigation or storage.

## GG-264 addendum · filled image stage and centered selection (2026-10-01)

The user's clarification retains complete initial fitting: on opening, changing images or pressing 0/Home, scale the entire source proportionally to contain within the measured middle stage. The ability to fill the entire middle region applies while zooming. Remove fixed inner margins and the bottom-right item count; the movable source can grow beyond its initial fitted frame, with clipping only at the stage boundary and drag/zoom revealing its edges. Do not stretch or permanently crop the source. This restores the canvas entry's initial contain rule while preserving the edge-to-edge zoom viewport, video playback and asset-page defaults.

On opening, changing selection or resizing, center the selected thumbnail vertically within its rail. Dynamic space before the first item and after the last item makes end selections centerable too. Preserve actual thumbnail ratios, gaps, focus without native scroll jumps, hidden scrollbar and reduced-motion behavior. No image upload, provider call, URL, project persistence or backend change is required.

## GG-305 addendum · applicable and used generation parameters (2026-10-02)

Canvas asset details derive parameters from the image's authorized generation snapshot, filtered by that product model's supported options and actual request conditions. Shared repository defaults are not evidence that every model used those options. Keep requested aspect ratio, resolution with known decoded dimensions, and generation count; show reference count only when references were used and a recorded image line only when that model supports it.

Quality, background and output format belong only to GPT Image models, using the existing model-specific quality range and option lists. Supported recorded values, including automatic values actually sent to GPT, remain visible; absent or unsupported values are not replaced with invented display defaults. Nano Banana 2 shows high thinking and Google Search only when its recorded values enabled the corresponding provider payload fields. Low thinking and disabled search are omitted; other models never display these Banana 2 options even if stale fields are present.

The user corrected the unfinished preset request: preset information is outside this task. This clarifies GG-253's real-parameter display requirement without changing generation, persistence, provider behavior, billing, layout or authorization. Regression source is updated but compilation and verification remain delegated to the user.

## GG-307 addendum · hidden Banana 2 thinking parameter (2026-10-02)

The user requests that Nano Banana 2's thinking parameter remain hidden in canvas asset details, including snapshots with high thinking enabled. This supersedes GG-305's display of used high thinking; the original generation snapshot and provider payload are unchanged. Used Google Search and all other model/usage filters retain their existing display rules. This is a presentation change only, with compilation and verification still delegated to the user.
