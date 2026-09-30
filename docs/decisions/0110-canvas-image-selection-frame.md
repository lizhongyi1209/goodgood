# ADR 0110: Canvas image selection frame

- Status: Accepted for GG-130 local implementation
- Date: 2026-09-27
- Task: GG-130
- Supersedes: GG-129's move cursor, detached selection outline, and single achromatic resize handle in ADR 0109's addendum
- Exception to: ADR 0105's achromatic selection color, limited to the canvas image selection frame

## Context

The operator clarified that “移动” meant the computer's normal arrow cursor, not the CSS four-way move cursor. The selected image's dark two-pixel outline had a gap from the picture, and its single bottom-right handle felt too prominent. The requested selection affordance is a fine bright-blue frame touching the image and resize access at all four corners. The white square handles and the later GG-134 quarter arcs were both rejected after visual review.

## Decision

- Image bodies use the system's default arrow on hover and while dragging. Dragging and clicking a generated image to open asset detail still work.
- A selected, loaded local or generated image has a one-pixel `#3b82f6` outline with zero offset. The image card has no inner border or padding, so the frame touches the image.
- Four transparent, visually hidden hit areas sit at the image corners. GG-134 narrowed each target to a small oval near the corner so the diagonal cursor does not appear over the adjacent straight edges. Opposite corners use the standard matching diagonal resize cursors. Dragging any corner preserves the original aspect ratio and the existing size limits. The selected image's blue outline is the only visible resize affordance; the original square handles and the brief quarter-arc experiment stay removed.
- Hover alone keeps only the shallow neutral veil. The blue is solely a spatial selection/resize affordance on canvas images; it does not become a product accent, status color, focus token, or shared component color.

## Consequences

This replaces the GG-129 visual and cursor choices while retaining its resize behavior and temporary node dimensions. `AGENTS.md` and `docs/DESIGN_SYSTEM.md` record the narrow exception to ADR 0105. No asset, generation, billing, persistence, route, or deployment behavior changes.

## GG-136 addendum · square canvas images (2026-09-27)

The operator replaced GG-133's proportional rounded corners with square corners for loaded local and generated images on `/canvas`. The clipped image, hover veil and flush blue selection outline all follow the same square shape. The existing transparent four-corner resize targets retain their size and cursor behavior; their oval hit areas are invisible and still keep diagonal cursors close to the corners. This does not change asset gallery cards, composer reference thumbnails, loading/error surfaces or image dimensions.

## GG-137 addendum · image hover frame (2026-09-27)

The operator replaced the shallow hover veil from ADR 0109 and the earlier decision above with the same one-pixel blue outline used for a selected canvas image. Hover alone does not select the React Flow node or reveal resize controls. The image pixels stay unobscured. Loaded local and generated images share this hover treatment; the square image shape from GG-136 remains. The blue exception stays limited to canvas image outlines.

## GG-190 addendum · shared canvas media corners (2026-09-29)

The operator extended GG-188's restrained generator corner treatment to ordinary image and video nodes. Loaded source images, additional generated result images, and video previews use the same size-aware corner radius as the generator: at most 8px, shrinking with a small node. Clip media to the node edge so the existing one-pixel hover/selection outline follows the same rounded silhouette without a gap. Keep the transparent resize hit areas, original media ratio, playback and node dimensions unchanged. This replaces GG-136's square-corner choice for loaded canvas images; its earlier implementation remains historical. Loading and error cards retain their existing treatment.

## GG-222 addendum · explicit selection arrangement and visible bounds (2026-09-30)

The operator now requests explicit position presets for a selected set. This implements the manual arrangement direction deferred when GG-135 removed drag guides and snapping; drag alignment guides and snapping remain absent. A compact achromatic toolbar appears above two or more selected nodes and offers tidy grid, left/horizontal-center/right alignment, and top/vertical-center/bottom alignment. Actions move existing nodes as complete units without resizing media, splitting output batches, changing references, or calling a provider. They use existing page-scoped graph history and content saving.

Selection bounds cover visible media, the metadata above it, and visible collapsed or expanded generator output cards. They exclude reference handle hit areas, invisible resize controls, and the detached composer. React Flow's measured body dimensions and media aspect ratios remain unchanged. Selection geometry and toolbar placement are temporary view state; selected-node bounds are cached and refreshed without mirroring all nodes into the page on each movement frame.

## GG-229 addendum · minimal line-segment alignment icons (2026-09-30)

The operator chose the supplied line-segment toolbar reference. Replace the six Lucide alignment glyphs with local vector icons: a subdued guide and two short solid strokes with rounded ends. Keep tidy as a matching solid grid, with all seven commands visible. Use a white rounded toolbar, shallow gray hover/pressed fills, and a quiet separator between horizontal and vertical alignment groups. Commands do not acquire a persistent selected state. Labels, focus, disabled behavior, arrangement geometry, graph history, and saving remain unchanged.

## GG-231 addendum · solid selection outline at the media edge (2026-09-30)

The operator requests a solid completed selection frame with the same one-pixel stroke as selected media. React Flow's border is painted inside its border-box dimensions, while media's zero-offset outline is painted outside. Replace only the completed selection rectangle's border with a one-pixel `#3b82f6` outline at zero offset, including its focus and focus-visible states, so shared straight edges overlap. The temporary drag selection uses a solid border with its existing width and color. Keep the existing translucent selection fill, visible metadata/batch bounds, rectangle dimensions, native drag transform, keyboard behavior, and toolbar placement.
