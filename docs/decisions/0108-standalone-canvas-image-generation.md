# ADR 0108: Standalone canvas image generation

- Status: Accepted for GG-125 local implementation
- Date: 2026-09-26
- Task: GG-125
- Supersedes: GG-124's shared workspace shell and empty-only canvas presentation.

## Context

The first `/canvas` mounted React Flow inside the main lobby shell and did not create images. The operator has now specified a separate canvas interface, outside the lobby, with the most common image generation actions. The white, quiet React Flow surface remains the visual baseline.

## Decision

- `/canvas` owns a full-viewport page. The main workspace links to it with a normal route transition; the canvas offers a compact return to creation.
- The first canvas tool supports a prompt, up to ten private reference images, an available image model, aspect ratio, resolution and output count. It reads the existing billing catalog/quote and uses the same authenticated reference upload and durable image generation boundaries as `/create`. Video, node wiring and canvas persistence are later work.
- A deliberate Generate action creates temporary result nodes on the canvas. In-progress, successful and failed states stay visible; successful images link to their existing asset detail. Node positions are local to this page and are not advertised as saved. Existing generation jobs and assets remain durable server records.
- Keep the background pure white and use the installed React Flow UI zoom control. Do not add a grid, sample nodes or default attribution badge.

## Consequences

Opening `/canvas` no longer preserves an in-memory `/create` form through a shared React shell. It does not erase the existing durable creation draft or projects. Refreshing `/canvas` clears its local node arrangement; saved canvas documents need a separate product and persistence decision. All actual provider calls remain behind explicit user submission and the GoodGood backend.

## GG-167 addendum · image generator node and image connections (2026-09-28)

The operator replaces the bottom-fixed canvas composer with a generator node. The canvas starts with no composer. Choosing `图片生成器` (entry name clarified in GG-207) from the empty-pane context menu creates a small neutral image placeholder at that canvas position; selecting one generator presents the existing composer directly below it, at readable screen scale. Selecting another generator moves the composer, while deselecting or removing it hides the composer. A new node does not submit a job or upload a file. Multiple temporary generator nodes may coexist.

An image node may connect into a generator using React Flow handles and edges. A connection is a real reference input for that generator only when the source has a ready server reference ID; local upload previews remain pending until completion, failures block generation, and unsupported source types are rejected. The visible reference tray combines direct uploads belonging to the active generator with connected image inputs, capped at ten total. Disconnecting a source removes that input; it does not delete the source asset. Generated results may be connected only if they can be resolved to an accepted private reference ID through the existing owner-scoped backend contract. The original source card and media playback behaviors remain.

Generator nodes, edges, draft ownership and node positions stay in the transient canvas session; refreshing clears them. This addendum changes the composer placement and connection interaction in the canvas only. It does not add persistent workflow documents, automatic generation, or new provider calls.

## GG-182 amendment · results belong to their generator (2026-09-29)

The operator replaces the original separate-result behavior for new canvas submissions. An explicit Generate action now places the real generation job state and first output on the originating generator node. The node uses the same restrained breathing glass treatment as an uploading image while its job is queued or running. Successful output replaces the placeholder inside that node; selecting it continues to open its own composer with the submitted prompt and settings available. Existing incoming reference edges stay attached. Additional outputs from a multi-image request remain separate result nodes so the existing output-count control does not discard paid results. Stable per-generator sequence numbers distinguish multiple generators. Persist the originating job ID and sequence with the canvas project under ADR 0114, and rehydrate the authorized job after reload. Never start generation during project restore. Legacy independent result nodes remain readable. This supersedes the third decision bullet above for new generator submissions.

## GG-185 addendum · reflective generator progress (2026-09-29)

The operator found the uploading-image breath too faint against an empty gray generator card. While a generation job is queued, running, or refining, hide the central placeholder icon and any previous result image, then show a distinct achromatic soft reflection over the card. The highlight changes intensity and position gently without a sweeping stripe or progress claim; reduced-motion users see a static highlight. On success, show the result without the progress layer. Keep the small generator identity row, sequence, reference edges, selection, and per-node composer unchanged. This supersedes only GG-182's reuse of the upload treatment for the generator.

## GG-172 addendum · generator's initial footprint (2026-09-29)

The operator found the initial 124px square generator much smaller than a newly added image. New generators now start as a 238px square on desktop, matching the initial size cap for square image nodes. On narrow screens, reuse the image node's viewport-based width and height caps. Keep the context-menu point at the card center and position the selected composer from the node's actual width. This only changes the initial visual size and placement; existing reference, upload, generation and transient-session rules stay the same.

## GG-171 addendum · connection feedback and local deletion (2026-09-29)

The operator now requests a restrained flowing animation on completed image-to-generator edges, replacing GG-170's static-line detail. Keep the thin neutral Bézier shape and matching drag preview. After the pointer remains over one completed edge for one second, show a small scissors delete control with its center exactly on the Bézier path at the point nearest the pointer; it follows that point while the pointer moves along the edge. Leaving the edge dismisses it, while moving onto the control keeps it operable. Deleting the edge must use the existing reference-disconnect path, so the generator loses that input without deleting the source asset. Honor reduced-motion preferences by showing a static line. This is visual and local canvas behavior, with no automatic generation, upload, or persistence change.

## GG-176 addendum · canvas keyboard actions (2026-09-29)

Reuse React Flow's native keyboard focus, Shift box selection, Ctrl/Cmd multi-selection, Space panning, and arrow-key node movement. Add canvas-scoped Ctrl/Cmd+A for all selectable nodes and edges, Delete/Backspace through React Flow's `deleteElements` API, and Escape to clear selection. Disable React Flow's document-wide delete key listener so browser and input-field shortcuts outside the focused canvas cannot remove canvas content. The existing node/edge change handlers remain the sole cleanup route for pending uploads, Blob URLs, generator drafts, and connected references; keyboard deletion creates no separate data path. The right-click menu offers a compact shortcut reference. Selection is transient under ADR 0114/GG-175 and never marks a project dirty. Copy/paste and undo/redo need a separate decision about pending files, generated results, references, and durable history; this task does not imply those operations are available.

## GG-177 addendum · shortcut panel, copy and edit history (2026-09-29)

Replace GG-176's right-click shortcut submenu with an icon-only keyboard control beside the lower-left map toggle. Its white popover lists the canvas shortcuts and closes outside. Keep the right-click menu for canvas actions.

Copy/paste duplicates selected stable canvas nodes and only edges whose endpoints are both copied. New node and edge IDs prevent coupling to the originals. Source media and completed generation results reuse their existing owned asset/job records; a pasted generator gets its own draft and ready direct references. Pasting never starts an upload or generation. Pending/failed uploads, pending/failed generation results and unresolved linked references cannot be copied.

Undo/redo is a bounded, in-memory history of stable canvas graph edits: positions, dimensions, node/edge additions and removals. Existing generator prompt editing keeps native text undo and is not a separate graph history step. Upload, generation, billing, server asset creation and viewport navigation are not reversible graph edits. A pending upload or job suspends history; when the external operation settles, establish a new baseline. History is not persisted across refresh; each resulting graph state still enters GG-173/GG-175 autosave. Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y only intercept keys while the canvas itself or its nodes/edges have focus; text fields, menus and controls keep native behavior.

## GG-178 addendum · connection handle visibility and hit area (2026-09-29)

Replace GG-167's 9px pale handle appearance with a restrained gray filled dot inside a larger transparent React Flow `Handle` hit area. Keep the same `reference` handle IDs, source/target directions, positions, edge geometry and validation. Use React Flow's `connectionRadius` to make dropping a dragged line near the target more forgiving, with a subtle hover/valid-target cue and reduced-motion-safe transitions. Show generator target dots while a connection is being dragged so the destination is discoverable. Do not use the whole-node Easy Connect pattern: image-body dragging and corner resizing are established interactions. The React Flow UI Base Handle is an available styled building block, but the existing native `Handle` plus its own CSS and radius setting is the smaller fit for this one shared endpoint style. No server API, persisted project schema or generation behavior changes.

## GG-179 addendum · outboard breathing handles (2026-09-29)

Move each existing React Flow connection handle's center about 11px beyond its node edge, leaving a visible gap between the 10px dot and node border. Keep the 26px transparent hit area and GG-178's `connectionRadius=32`; the edge endpoint follows the handle naturally. Add a small low-contrast halo that slowly changes size and opacity while the handle is visible. The dot itself and handle geometry remain stationary so the connection stays precise. Pause animation when the handle is hidden and remove animation under reduced-motion preference. No new component or persistence field is needed.

## GG-180 addendum · generator identity label (2026-09-29)

The operator now wants the image generator to remain recognizable beside ordinary image nodes. Place a compact icon and `图片生成器` label at the generator's upper-left outer edge, aligned with the existing image node metadata row. Build the icon from the same small image outline with one tiny star at its upper-right. Use neutral colors, no badge panel, and no new title in the card body. Keep the central placeholder, selection outline, reference handle, node dimensions, composer toolbar and canvas graph behavior unchanged. This refines GG-167's icon-only placeholder presentation without changing the persisted project schema.

## GG-138 addendum · canvas zoom menu (2026-09-27)

The canvas keeps the React Flow zoom API, starts at 100%, accepts 10%–800%, and places its compact percentage control at the lower left. The menu follows the operator's reference: editable percentage, zoom in, zoom out, fit to screen, and quick 50%/100% choices. It omits the quick 800% choice; 800% remains reachable by typing or ordinary zooming. The menu uses a white surface, dark text and neutral hover states consistent with GoodGood; clicking outside closes it. Initial image cards retain the desktop 238×320 CSS pixel cap and receive viewport-relative caps on narrow screens so the 100% view remains proportionate. The earlier bottom-right fixed-level selector is superseded; image content and generation are unchanged.

After the operator observed an abrupt size change between fitting a single image and choosing 50%, both fit actions cap their computed zoom at 100%. Fitting can still zoom out to include large or multiple images. Quick 50% remains an absolute canvas scale, so an unresized image is half its 100% screen size.

## GG-140 addendum · quiet canvas header (2026-09-27)

The operator removed the top-right Add Image and Fit View buttons introduced in GG-126. Local JPEG/PNG images still enter through drag and drop; the composer retains its separate reference image picker. Fit View remains in the lower-left zoom menu. The canvas header now carries only navigation, identity and the credit balance. GG-126's original top-right controls are historical behavior.

## GG-141 addendum · compact AI composer (2026-09-27)

The canvas composer follows the operator's chat and image-setting references: prompt above a compact tool row, with a separate reference-image tray, a concise settings trigger, model selection and a generation action showing the current credit quote. Resolution, model-supported aspect ratios and count move into one upward popover. The white, achromatic canvas and GoodGood's existing upload, quote and generation boundaries remain. Installed shadcn primitives fit the controlled state; AI Elements Prompt Input owns chat submission and attachment state and is not added for this flow.

## GG-143 addendum · credit-only canvas action (2026-09-27)

The operator removed the canvas generation button's left send arrow. Its normal state now shows only the credit lightning mark and quoted amount, with a disabled dash when no quote exists. During submission the loading mark occupies the same icon position. The icon follows the amount's font size; the canvas and mobile top-right credit marks likewise follow their adjacent balance numbers. Accessible labels keep the action and credit meaning. This changes the canvas action's visual treatment only; the explicit click, quote and balance gates, and backend submission remain.

## GG-144 addendum · canvas model labels (2026-09-27)

The canvas model menu orders enabled, quoted models by their stable adapter IDs: Nano Banana Pro, Nano Banana 2, GPT Image 2.5 Sunburst, GPT Image 2.5 Flare, then GPT Image 2. The three GPT labels use title case in the canvas menu, including the selected value, independent of managed catalog display names. Catalog IDs, quote matching, the default Nano Banana 2 selection, and other pages' model labels remain unchanged.

## GG-146 addendum · local video nodes (2026-09-27)

The operator now allows a local MP4 to be dropped onto `/canvas` as a temporary, movable and proportionally resizable video node. This changes the earlier image-only drop scope, not the image-generation tool: dropping a video does not upload it, submit a provider request, create an asset, or persist a canvas document. Keep the existing 20 MiB MP4 local-file limit. Above the preview, a video type icon and filename share the single-line responsive metadata treatment with image nodes; original pixel width/height and file-derived FPS are read-only. If FPS is unavailable, show an unknown marker rather than a playback estimate.

At rest, show the cover frame, a centered play glyph and total duration at lower left. Hover starts muted preview and hides both glyph and duration; leaving pauses and restores them without resetting `currentTime`, so the next hover resumes. Keep video time on the element, guard playback when the document is hidden or motion reduction is requested, and release object URLs when nodes are removed or the page unmounts. Failed or unsupported files keep an inline error and do not create a durable record.

## GG-147 addendum · composer reference previews (2026-09-27)

The canvas composer keeps the private reference picker but replaces its image-only tool icon with a text action. Attached references stay in a separate tray above the prompt. They appear as small square center-cropped thumbnails in their existing upload order, numbered from one; removing one renumbers the rest. A thumbnail hover or keyboard focus opens a contained preview of the complete local image above it, while removal appears at the thumbnail's upper right on hover or focus. Existing upload, retry, ten-image limit, and explicit generation gates remain unchanged. Reuse the installed AI Elements attachment group and Radix tooltip portal for this presentation rather than moving attachment state into a new composer abstraction.

The operator's first inspection refined the proportions: keep the full-image hover preview near the reference mockup's small preview size, omit the tooltip arrow, use matching small circular number and remove badges inset from the rounded thumbnail corners, and remove the black focus ring that appeared after clicking a thumbnail. A muted keyboard focus indication remains.

## GG-165 addendum · reference picker in the preview tray (2026-09-28)

Move the canvas reference picker from the lower tool row into the reference tray above the prompt. Show a compact add tile beside the existing thumbnails, including when the tray has no references; hide it at the ten-image limit. After the operator's screenshot, use a soft gray 54×68 tile with a small image icon and `参考图` label instead of a dashed plus tile. This supersedes GG-147's bottom text action. The tile invokes the same hidden file input and real private upload flow (`/api/references` intent, signed PUT, completion), while numbered thumbnails, full-image hover previews, removal, retry, and explicit generation gates remain unchanged.

The operator then set the uploaded reference card to the same 54×68 footprint and rounded shape as the add tile, replacing the GG-147 square thumbnail. While the real upload is pending, reuse the canvas image node's light dark mask and breathing glass highlight over a clear local preview; remove the effect on completion. Keep the existing retry and generation gates tied to server completion.

## GG-148 addendum · canvas mini map (2026-09-27)

Add React Flow's built-in MiniMap at the lower left, above the existing zoom control, with a small map toggle immediately to the left of the percentage. The map opens initially, uses the existing achromatic palette and simple node shapes, and supports viewport panning and zooming through React Flow's own interactions. Remove the percentage trigger's trailing chevron and use lighter, smaller typography matching the operator's reference. The percentage remains clickable and keeps its existing 10%–800% menu. Do not add the other reference toolbar icons without a product action for them, and do not change the pure white canvas background or node persistence boundary.

After the operator requested a clearer indication of the current canvas area, make MiniMap's built-in viewport mask draw a visible neutral rectangular outline and lightly fade the area outside it. The rectangle follows viewport pan and zoom without a separate geometry model.

## GG-149 addendum · compact canvas home menu (2026-09-27)

Replace the canvas header's back arrow, wordmark, divider and text title with one compact, circular black GoodGood icon carrying a white abstract G. Clicking it opens a small menu directly below with a `主页` link to the canonical `/create` workspace, preserving the old return destination. The credit balance at the right remains. The menu uses the installed shadcn/Radix dropdown behavior; it adds no new route or canvas persistence.

After the operator found the first single-G stroke too traditional and too prominent, use a lighter broken-ring G with a detached inner bar and reduce the displayed icon from 36px to 30px. Keep the menu interaction and destination.

The operator later found the broken-ring glyph too generic. Replace its straight detached bar with a folded diagonal return stroke, giving the white G an asymmetric, directional silhouette inside the same black circle. Keep GG-150's 26px displayed size and all menu behavior.

The folded stroke still reads as a routine drawn letter. Redraw the glyph as a broad strip of paper curled into a G, with a small shaded fold on its inward end. The material cue should make the symbol feel like a visual-creation object while the overall silhouette remains G. Retain the 26px black circular container, achromatic colors, canvas name spacing and home-menu interaction.

The operator asked for a more abstract treatment. Replace the single paper ribbon and fold with three separated, aperture-like white blades. Their combined negative space should suggest G without drawing a conventional letter or adding material shading. Keep the 26px black circle and the existing menu and name layout.

## GG-150 addendum · temporary canvas name (2026-09-27)

Show a canvas name immediately beside the new G menu icon. It starts as `未命名画布`; hovering or focusing the name reveals a restrained edit affordance, and clicking enters an inline text field. Enter or blur accepts a trimmed name, while Escape restores the previous one. The name belongs to the current transient canvas page state and resets on refresh, matching the existing unsaved-node contract. This supersedes GG-149's icon-only header treatment while retaining its home menu and destination. Persisted canvas documents and naming remain a separate later decision.

The operator refined the header: reduce the G icon to 26px and keep the adjacent name at the same visual height with a short gap. Use the text-edit cursor on name hover, without a pencil glyph. The editing field follows the current text width instead of expanding to a fixed width, and the name accepts at most 20 Chinese characters. This replaces GG-150's original 30px icon, pencil and 60-character field treatment; the transient state and edit keyboard behavior remain.

Remove the external focus outline from the name field while it is being edited. The insertion caret and the field's existing light gray fill indicate edit mode; the name trigger still keeps a visible keyboard focus state before editing.

## GG-151 addendum · canvas asset browser (2026-09-28)

Add a compact `资产` entry at the lower left next to the existing map and zoom controls. It opens a non-modal, scrollable left-side list over the canvas, using the existing owner-scoped generated assets, uploaded image/video/audio lists and folder organization. The root presents folders and assets; opening a folder narrows the material list and provides a way back. Each material row shows a thumbnail or type icon and its filename. Image hover/focus uses the same Radix tooltip and private-image treatment as the canvas composer references, enlarged without cropping; video can preview muted on hover, while audio has no fabricated image. This is read-only browsing: neither opening the panel nor hovering a row uploads a file, creates a node, starts generation, changes persistence, or bills credits. Keep it usable in narrow viewports and preserve the pure white canvas when closed.

The operator refined the layout: the entry is now a library icon without adjacent text. The list is a full-height sidebar starting at the viewport's left edge, taking space from the React Flow canvas rather than floating over it. The canvas viewport, header and composer align within the remaining width, and existing nodes remain in the same flow coordinates. The sidebar stays open while working on the canvas and closes by its icon, close control or Escape; the earlier outside-click popover treatment is superseded.

After inspection, narrow the sidebar again to a 248px cap. Folder and asset names remain single-line with an ellipsis when their available width is exceeded.

The operator subsequently requested a limited manual expansion. Keep 248px as the initial desktop width and add a narrow drag target on the sidebar's right edge, with the standard horizontal resize cursor. Dragging can increase the sidebar to at most 400px while reserving at least 280px for the canvas; dragging left returns to the initial width. The choice lasts for the current canvas page session and resets on refresh. On narrow screens at or below 560px, keep the existing responsive width and hide the drag handle so the creation surface is not squeezed further.

After the operator saw a vinext `ResizeObserver loop completed with undelivered notifications` overlay while dragging, the first mitigation deferred the width change until pointer release. The operator clarified that the canvas must move continuously with the sidebar. Coalesce pointer updates into one `requestAnimationFrame` write of the sidebar width per frame without rerendering React Flow for every pointer event; commit the page-local preference on release. Cancelled drags restore the previous width. The operator will manually confirm whether the error is gone.

The operator then changed the confirmed sidebar layout: widening it must cover the canvas rather than resize or squeeze the React Flow container. Keep React Flow at the full viewport size and the sidebar above its left edge. The header, composer, lower-left map and zoom controls, and drop cue follow the sidebar width so controls remain accessible; new generated nodes use the unobscured area for placement. The resize edge keeps its horizontal resize cursor but gains no dark hover border. The prior “canvas viewport shifts into the remaining width” rule is superseded. Retain frame-coalesced live width updates; this structural change avoids resizing React Flow's observed container on every drag frame. Manual canvas verification remains with the operator.

## GG-155 addendum · drag assets and rename in the canvas (2026-09-28)

The operator explicitly replaces GG-151's read-only browsing rule. Existing generated images and uploaded image, video, and audio materials may be dragged from the open asset panel onto the canvas as temporary nodes. Reuse existing private read URLs and existing image/video node behavior; an audio node may provide a simple playback control. Dragging does not upload another copy, submit a generation job, charge credits, or persist the canvas layout. Dropping within the panel is inert. The larger preview opens only when its thumbnail receives hover or keyboard focus; names do not trigger it. The smaller thumbnail is a centered crop and is slightly smaller than the former 40px square.

Double-clicking a material name starts inline rename. The saved value is an owner/workspace-scoped display name shared with the asset library, leaving the original uploaded filename and object key unchanged. An empty or invalid name is rejected, Escape cancels, and a failed save leaves the editor open with an error. Generated and uploaded materials use the same alias record. Existing folder membership is retained when a name is changed, and an alias-only record must survive organization updates. This replaces GG-151's “no mutation” rule only for explicit rename; browsing, previewing, and dragging remain non-billable. The operator will manually verify the UI under the standing no-retest instruction.

## GG-161 addendum · real local image and video uploads (2026-09-28)

The operator now wants JPEG/PNG/MP4 files dragged from the computer onto `/canvas` to become private library assets. This supersedes GG-126 and GG-146's local-only drop rule and GG-160's fixed three-second simulated completion. Reuse the existing owner-scoped image reference and private video intent, signed PUT, completion and status flows. Local Blob previews appear immediately; the restrained breathing treatment lasts for the actual pending request. A ready image uses the owner-scoped content route, while a ready video uses the existing signed read URL and refreshes it from the authorized list if playback later fails. Success selects the node and refreshes an open asset sidebar. Failure keeps the original `File`, Blob preview and explicit retry action; node removal or page teardown aborts pending requests and releases Blob URLs. An asset persists in the library, but its canvas position still does not. Existing library-item drag does not upload again, and audio remains outside this change. No new provider request, billing action, server upload protocol or schema is introduced.

## GG-166 addendum · expandable canvas prompt (2026-09-28)

Keep the compact canvas prompt's existing automatic growth up to 188px and internal scrolling. Once its content actually overflows, show a small expand action beside the scrollbar. The action grows only the prompt area upward within the anchored composer, with a viewport-aware height limit; the lower settings, model and Generate row follows below it. In expanded state the same action collapses it, and the text, cursor and submission behavior remain. Reserve the small action space at all times so the button's appearance does not reflow the prompt. This adds an optional reading/editing state to GG-141's compact composer; the default height and existing generation/upload boundaries remain.

## GG-174 addendum · balanced canvas composer spacing (2026-09-29)

The operator's screenshot shows the space below the prompt much larger than the space between the reference tray and the first prompt line. Reduce the separate prompt-to-toolbar gap from GG-166's 18px on desktop and 14px on narrow screens to 2px in both layouts. Keep the prompt's own bottom padding and the scrollbar track inset unchanged, so the last visible line and scrollbar endpoint still have room before the settings, model and Generate row. The reference tray, prompt growth and expansion, controls, and generation behavior do not change. This supersedes only GG-166's outer gap values.

## GG-183 addendum · video preview geometry and metadata (2026-09-29)

The operator observed a portrait video letterboxed inside a wide selected card. Once the browser decodes the intrinsic dimensions, the video node and its selected outline must follow the full uncropped video image. An unmeasured 238×158 placeholder saved during loading is not a user resize; restore it as pending measurement and replace it with the intrinsic ratio. Preserve a genuinely resized node when its dimensions already match that ratio. For legacy mismatched dimensions, correct the frame to the video ratio before showing it as measured.

Remove FPS from the video metadata row and stop parsing local files for it. Original pixel width/height and total duration remain available from the HTML video element. This supersedes the GG-146 FPS display and MediaInfo parser rules without changing upload, playback, or asset persistence.

## GG-188 addendum · generator shimmer and rounded output (2026-09-29)

The operator selected CodeFronts' Dark Mode Skeleton demo as the motion reference for image generation. Replace GG-185's breathing reflection on an empty generator with one light, neutral sweep that travels across the same reserved card surface. Adapt the demo's light-theme treatment to GoodGood's white canvas; keep the animation confined to the generator while a job is queued, running or refining, and leave a static gray placeholder under reduced-motion preference. No artificial percentage or previous output is shown during generation.

The generator's card and successful first output now share a restrained, size-aware rounded clipping edge, with the existing hover/selection outline flush to that edge. GG-188 initially applied this only to the image-generator node while GG-136 kept ordinary images square; GG-190 later extended the same corners to ordinary images and video previews in ADR 0110. Keep the same intrinsic image ratio, node sizing, connection handle, metadata, toolbar and saved project contract. React Flow custom nodes accept ordinary CSS styling; shadcn/ui's Aspect Ratio illustrates rounded images but would impose a second ratio wrapper around a node that already tracks its image. Use the existing generator container and CSS instead of adding a component or dependency.

## GG-189 addendum · adaptive Nano settings and media ratio wrapper (2026-09-29)

The operator changes the canvas generator's default aspect ratio for Nano Banana 2 and Nano Banana Pro to `自适应`; existing canvas drafts keep their saved choice and the lobby creation defaults remain unchanged. Persist the domain value `adaptive`, distinct from the localized label. For Nano provider requests this means omitting `aspect_ratio`, allowing the model's documented default to follow a reference image or produce a square output without one; never send `adaptive` as a provider enum. Explicit ratios retain the existing contract. Both Nano models offer 1, 2 and 4 outputs, each billed from an active quote before submission. Pro multi-output uses the existing per-image provider task fan-out and requires active 2/4 price versions derived from the managed model's per-image specification. If a price is unavailable, fail closed without generating or charging.

The canvas image settings panel opens below its trigger and the canvas view makes room if the panel approaches the viewport bottom; it must not flip above. This direction is a shared convention for future generator settings, including video. The already installed shadcn/ui Aspect Ratio primitive is suitable for media whose width owns its height. The present image, video and generator nodes instead have React Flow-owned width and height, updated by source metadata and proportional resize. Adding Radix's padding-derived height here would introduce a second geometry source and can disturb the selected frame or ResizeObserver. Keep the existing single geometry source and intrinsic media rendering for these nodes; use shadcn Aspect Ratio when a future node has width-driven height. Preserve each node type's existing corner decision. This supersedes the earlier suggestion to add the wrapper directly to the generator.

## GG-191 addendum · Nano canvas default resolution (2026-09-29)

New canvas image generators start with `自适应 · 2K` for Nano Banana 2 and Nano Banana Pro. This replaces the canvas generator's initial `1K` resolution in GG-189; the count remains one. While a new generator's resolution has not been explicitly chosen, switching its model uses `2K` for either Nano model and the existing `1K` default for GPT Image models. A manual resolution choice takes precedence over later model switches. A saved or copied generator keeps its stored ratio and resolution; reopening a project must never rewrite existing drafts to the new defaults. The lobby `/create`, billing quotes, provider parameters and price versions do not change.

## GG-196 addendum · borderless generator during generation (2026-09-29)

While an image-generation job is queued, running or refining, show the generator's rounded gray surface and shimmer without an external selection outline, even when the node remains selected. This supersedes GG-188's selected-outline treatment only during those three active job states. The node remains selected so its composer, keyboard behavior and reference connections continue to work. Idle, failed and successfully generated states retain their existing outline behavior; do not change node geometry, animation or generation flow.

## GG-197 addendum · fan stacked multi-image canvas results (2026-09-29)

For a canvas generation that succeeds with more than one image, retain GG-182's ownership model: the first output belongs to its generator and each additional output remains an independent result node with its own asset, resize control, position and reference connection. Replace the default horizontal spacing with a compact stack offset toward the right; preserve a visible pointer target for every card even when adaptive outputs have different widths. The operator's [fan spread reference](https://codefronts.com/components/tailwind-stacked-cards/tailwind-fan-spread-hand-of-cards/) informs a restrained low-pivot rotation and a small hover or keyboard-focus lift that brings the targeted card to the front. Existing user-moved positions and saved project positions take precedence over the initial stack layout. The first output retains its generator's existing input connection only; later result nodes keep their existing output connections.

When a later generation on the same generator succeeds, move only the previous batch's additional outputs that still occupy their original stack positions into a horizontal row, leaving user-moved cards, their sizes, assets and edges untouched. Do not rearrange prior results while the later job is pending or failed. Single-image generation and `/create` result layouts keep their existing behavior. This revises only GG-182's initial placement of additional canvas outputs and adds no provider request or billing action.

## GG-198 addendum · one-node generation batch stack (2026-09-29)

The operator found that GG-197's independent result nodes let one generated batch be pulled apart and obscured its batch identity. Supersede that layout for new canvas generator submissions: all outputs of the current successful job render inside the originating generator node as one movable stack. Do not create additional React Flow result nodes for its second through fourth outputs. The job remains the durable owner of every output, so no generated asset is discarded. Historical standalone result nodes remain readable, while redundant GG-197 nodes matching the generator's current job are folded away during live normalization or project restore.

The stack uses natural, unrotated cards with a small rightward offset and one metadata row for the generator. Hovering, keyboard focusing or clicking a visible rear card swaps its slot with the current front card using a short spatial transition; the batch itself does not move or split. Clicking a generated canvas image never navigates to the asset detail route, including historical result nodes. The current front output supplies the single displayed pixel size; rear cards do not repeat filenames or dimensions. Keep the generator's prompt, settings, input references, node size, project persistence, asset-library records and billing behavior unchanged. Reduced motion applies the slot change without a spatial transition.

## GG-199 addendum · explicit batch expand toggle (2026-09-30)

The operator replaces GG-198's hover, focus and click-driven front-image swapping. A successful multi-output generator now keeps its original output order and starts as a compact rightward stack. A small icon control at the batch's lower-right corner explicitly expands every image into a rightward row within the same React Flow node; activating it again collapses the row. The batch still moves as one node, and the control must not initiate canvas dragging. The control has a meaningful accessible label, keyboard activation and expanded state. The position change uses a short transition, disabled under reduced-motion preferences. Expansion is transient view state and resets to compact when the job changes or the project reloads. Continue showing one generator metadata row and the first output's true pixel size. Do not add asset navigation, per-output metadata, rotation, output handles, provider calls or persisted fields. This supersedes only GG-198's automatic swapping behavior.

## GG-200 addendum · bright connected-edge hover (2026-09-30)

The operator explicitly adds one chromatic interaction state to the otherwise neutral reference edges. A completed edge remains thin neutral gray by default and changes to bright blue `#1687ff` only while its existing React Flow interaction area is hovered. Apply the state to the visible edge path through CSS rather than pointer-move React state, so the wide transparent hit path and render cadence remain unchanged. Preserve the Bézier geometry, animated dash flow, one-second scissors control, along-path positioning, deletion path, and neutral connection preview. Use a short color transition, removed with reduced-motion preference. This is a narrow exception to the achromatic canvas rule and introduces no saved state, upload, generation or billing behavior.

## GG-203 addendum · canvas eight-image Nano batches (2026-09-30)

The canvas image-settings count choices display numbers only. Nano Banana 2 and Nano Banana Pro now offer `1 / 2 / 4 / 8`, with one still the default. GPT canvas models and the lobby composer retain their existing `1 / 2 / 4` choices. Preserve saved count values and resolve an unsupported choice when changing to another model; do not silently submit eight to a GPT adapter.

Eight Nano outputs use eight existing single-image provider requests in one recoverable task set, never a new native `n=8` parameter. All eight outputs must succeed before the existing atomic batch is stored and settled; failures retain the existing release policy. Before enqueueing, admission requires an active count-eight quote for the exact managed model, resolution and enabled line. Migration 0051 appends initial quotes at eight times each active single-image price and opens the generation-batch and price-record count constraints. Later managed-price edits publish count-eight versions for Nano adapters only. Missing quotes fail closed. Canvas project JSON accepts the new draft value without changing its schema version, while legacy lobby draft/project schemas and selection controls remain unchanged. The existing single-node stack and explicit expand/collapse control render all returned outputs. No request is submitted without the user's generation action.

## GG-204 addendum · full responsive image settings (2026-09-30)

The canvas image-settings popover must show all available parameters without its own scrolling. Keep the resolution, aspect ratio and count order and existing Radix selection behavior. Retain four portrait-shaped ratio cards per row when space permits; use more columns and restrained compact spacing on shorter screens, keeping text readable, both glyph/text rows centered and cards taller than their width. The visible canvas area excludes the open asset sidebar, and layout is recalculated when the window, sidebar or composer size changes.

Keep GG-189's downward opening rather than flipping above the trigger. Move the canvas view when necessary to make room for the full panel; measure its untransformed dimensions so entry animation does not underestimate its extent. This supersedes the earlier height-limited scrolling and fixed four-column size on constrained screens, without changing parameters, quotes, generation, or project content persistence.

## GG-205 addendum · numeric count in settings summary (2026-09-30)

Remove the count unit from the canvas image-settings trigger's visible parameter summary. A multi-image choice reads, for example, `自适应 · 2K · 8`; the default count of one continues to omit the third item. Its accessible name identifies the number as the count. This extends GG-203's numeric choices to the summary without changing capabilities, defaults, quotes or submission.

## GG-208 addendum · always show count in settings summary (2026-09-30)

The image-settings summary always includes the effective generation count, including the default `1`, e.g. `自适应 · 2K · 1`. This supersedes GG-205's omission of the single-image count. Keep numeric labels without `张` and the accessible `数量 X` description. Generation defaults, capabilities, quotes, persistence and submission remain unchanged.

## GG-209 addendum · compact batch edges and front-image control (2026-09-30)

Refine GG-199's collapsed batch presentation: keep the complete first image in front and show at most two subtly offset, unrotated rear card edges, regardless of output count. Retain every output in the same generator node and reveal all outputs through the existing explicit rightward expand action. Anchor the expand/collapse control to the first image's lower-right corner in both states, rather than the last output. Preserve ordering, the single metadata row, true first-output dimensions, keyboard access, reduced motion and transient expansion. Assets, jobs, persistence, provider calls and billing do not change.

## GG-211 addendum · canvas GPT resolution routing and options (2026-09-30)

Canvas image submissions carry the versioned `canvas-image-v1` routing policy, persisted with their immutable batch. For GPT models this selects the O1Key `-sp` route for 1K/2K and `-sd` for 4K, with the unsuffixed model as the single approved 4K backup. The documented GPT Image 2 IDs include `-c-`: `gpt-image-2-c-sp` and `gpt-image-2-c-sd`. Preserve the product model ID and managed customer quote independently of the provider ID. The lobby's explicit lines and existing accepted attempts keep their pinned route.

Only an explicit structured no-channel rejection before any task has been accepted allows the backup. Persist the rejected attempt and the backup attempt before its POST; never switch on timeout, an unknown submission, authentication, balance, rate limit, invalid parameters, moderation or an ordinary server error. Recovery uses the accepted attempt's provider model and route. Preserve at-most-once submission and atomic batch billing.

Add canvas GPT quality and background controls using existing shadcn primitives. GPT 2.5 offers `low / medium / high / xhigh / max`; GPT Image 2 exposes only its documented `low / medium / high`. New GPT canvas drafts default to medium, old drafts/jobs retain their effective values. Background uses O1Key's documented `auto / transparent`; transparent selects PNG since JPEG cannot retain alpha. Do not mislabel an opaque-background enum as preserving the reference background, or send an undocumented enum. Draft persistence, history, quotes, frozen requests and restore include these options. Keep downward, complete responsive settings. Source: [O1Key image documentation](https://cf-api.o1key.com/docs/#image-gpt-image), retrieved 2026-09-30 without credentials or a generation request.

## GG-212 addendum · canvas count stepper through twelve (2026-09-30)

Every canvas image model exposes integer output counts from 1 through 12 via a compact decrement/input/increment control composed from existing shadcn primitives. Default remains one and lobby controls remain 1/2/4. Each count requires an immutable count-specific quote derived from the same active single-image model, resolution, line and quality price; missing quotes fail closed and existing accepted prices remain frozen. Use recoverable single-image provider fan-out for new canvas batches rather than assume native `n=12`. Exactly the selected count must succeed before existing atomic storage and settlement; preserve the single movable batch, output order and explicit expand/collapse.

## GG-213 addendum · adaptive GPT size, auto quality and transparency switch (2026-09-30)

Canvas adaptive ratio choices display centered text alone. All canvas image models offer the internal `adaptive` ratio; for new versioned GPT canvas requests the provider receives `size: auto`, while fixed ratios keep concrete pixel sizes. The resolution selection still determines the quote and provider route; decoded outputs supply actual pixel metadata. Keep legacy lobby ratio choices and existing explicit saved settings.

New canvas generator quality defaults to `auto`, replacing GG-211 medium. Display automatic, low, medium, high, extra-high and highest as 自动/低/中/高/超高/极高, backed by auto/low/medium/high/xhigh/max. GPT Image2 exposes only its documented auto/low/medium/high; GPT2.5 exposes all six. Replace background choices with an existing shadcn switch, off by default (`background: auto`). Turning it on freezes `background: transparent` and `output_format: png`; `trans` is not an upstream enum. Turning off retains a valid current PNG format. Persist draft options, frozen requests and restored explicit choices. Continue downward responsive complete settings with no added scroll. Source: [O1Key documentation](https://cf-api.o1key.com/docs/#image-gpt-image), retrieved 2026-09-30 without provider requests.

## GG-214 addendum · Seedream 5.0 Pro normal generation and stacked outputs (2026-09-30)

Add canvas product `seedream-5.0-pro` using the documented O1Key model `dola-seedream-5-0-pro-260628-ep`. The operator chose normal generation by default and compatibility with multiple returned layer images. Do not activate or expose layer_decomposition in this slice. Use PNG and omit watermark entirely; references are up to ten uploaded public URL strings, n is one. Settings expose only1K/2K resolution and aspect ratio: adaptive uses the selected size bucket (normal generation has no size:auto), fixed choices use the eight documented ratio/pixel tables. No count, quality, background,1.5K or4K controls. Use the existing local ByteDance icon.

The operator approved document base prices: normal output1K30/2K60 credits, first reference free and each additional reference2 credits. Freeze the quoted base version and reference supplement at submission; accepted prices and other model billing remain unchanged. Future explicit layer decomposition uses15/30 credits per actual returned image including the base, but is not enabled by this task. Normal Seedream requests retain requestedCount1; provider outputs1..17 are accepted for the requested compatibility and stay one atomic movable batch, ordered by complete valid z_index or original provider order. Decode actual dimensions and reuse the existing collapsed stack/explicit expand. Do not widen strict output counts for other models or add layer editing/schema features. Source: operator-provided [O1Key documentation](https://cf-api.o1key.com/docs/),2026-09-30. No production authority or provider requests are included.

## GG-233 addendum · canvas asset cards and explicit addition (2026-09-30)

The operator replaces GG-151/GG-155/GG-162's filename rows and centered cropped thumbnails with image-first cards. Images show their complete original aspect ratio with no visible filename; folders remain identifiable in rounded 1:1 cards. A light-gray rounded plus card leads the collection and opens a white menu with only 上传文件 and 链接. The link form accepts an image direct URL and submits with an arrow. Use one column in a narrow panel and two when its own width permits. Preserve authorized library reads, thumbnail hover/focus previews, dragging ready assets and inline rename; double-clicking or pressing F2 on the image enters the only visible image-name editor.

Explicit file selection uses the existing private JPEG/PNG/MP4/MP3 upload and completion interfaces, each capped at 20 MiB. Link submission downloads a public HTTP(S) JPEG/PNG in the browser with CORS, omitted credentials, no referrer, bounded bytes and a timeout, then sends the resulting File through the same image upload. Do not add a server remote-fetch proxy or mark a remote URL ready. Downloads and failed submissions preserve recoverable input; upload failures allow per-file retry. Only confirmed ready IDs may enter the collection or be archived into the folder captured at submission. If archive fails after upload, retain its ready ID and retry archive alone. Refresh the real collection after completion; additions do not insert canvas nodes or submit generation. Closing the panel aborts unfinished link downloads but does not cancel already-started private uploads; their durable library results remain available on reopening. The standing instruction permits source/diff review and test definitions only, with operator manual acceptance pending and no service, database, provider or production operation.

## GG-234 addendum · existing hover appearance at rest (2026-09-30)

The operator asks the canvas asset cards to keep their current hover appearance even while the pointer is away. The plus and folder cards now use their existing hover fill #eaeaec at rest; media cards retain brightness(0.97) at rest. This replaces only GG-233's default/hover appearance. Preserve pressed/focus/disabled states and all existing card layout, previews, drag, rename and upload behavior. The larger tooltip preview still opens only on hover or focus. This is a local CSS refinement, reviewed through source/diff only under the standing no-retest instruction; manual acceptance remains pending.

## GG-235 addendum · recoverable media and compact masonry (2026-09-30)

The operator reports missing media after refresh in the canvas asset panel and requests waterfall packing to close gaps below media with different heights. This changes GG233 regular rows to a compact masonry grid while preserving original aspect ratios, the lead add card/folders, keyboard/drag/rename/upload behavior and GG234 default colors/brightness. Media failures must recover when their source identity or list refresh changes, expose an explicit bounded retry, and keep authorized image content as a one-time fallback when preview delivery fails. Video thumbnails prepare a real first frame and report decoded dimensions without autoplay at rest; failed/expired video reads may refresh the authorized list to obtain fresh signatures. Do not delete or fabricate unavailable media, edit canvas nodes/sync, or change provider/data/services. Source/diff review follows the existing canvas delivery constraint; actual failure cause needs read-only evidence and must not be inferred from a placeholder. The read-only diagnosis then confirmed failed local Docker published ports, with image preview503/socket hang up and local S3 ECONNRESET while in-container health stayed200. The root coordinator restored only the two existing local object-storage/Valkey containers after confirming no active jobs, preserving their named volumes. Read-only media and readiness checks succeeded; no backend source, migration, user data, provider or production change followed. UI remains source-reviewed with manual acceptance pending.

## GG-238 addendum · square addition tile and explicit in-canvas image viewer (2026-09-30)

The operator replaces the canvas asset panel hover/focus preview with an explicit top-right expansion button on image cards. Fix the existing addition tile to fill one masonry column with a1:1 ratio even when Radix asChild overrides its data-slot. Preserve the lead menu/upload/link behavior, GG234 gray styling and GG235 original-ratio packing/media recovery. Clicking expand opens a focused image viewer over the current canvas, with a vertical image rail on the right, bounded wheel/arrow navigation and Escape/close focus return. Scope the rail to the currently visible images in existing order; retain owner-checked preview/content URLs without new list/persistence endpoints or routes. Extract a small common image viewer using the asset detail stage/rail behavior, and reuse it in the existing uploaded-image asset preview as a second real caller. Keep generated asset details, metadata/download routing and video/audio preview behavior intact. No editor/node/sync, backend, provider, service, data or production change. Deliver through source/diff review only under the current canvas no-retest constraint; authenticated manual acceptance stays pending.
