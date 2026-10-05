# ADR 0135 · Canvas node groups

- Status: Accepted for GG-323 source implementation
- Date: 2026-10-03
- Extends: ADR0108 canvas interaction and ADR0114 project persistence

The user requests persistent grouping of box-selected canvas nodes, whole-group
movement, double-click renaming and an optional emoji to the left of the name.
React Flow already supports parent-relative positions and inherited movement.

Use that installed open-source API with a custom `group` node. The selection
toolbar creates a group without moving the selected content. Groups have a quiet
gray frame, a compact drag header, an inline name editor and an emoji popover.
Keep child nodes independently editable/connectable. Regrouping flattens existing
membership; do not introduce nested groups. Ungrouping or deleting only the frame
preserves the members and their absolute positions. Explicitly selected members
still follow the usual deletion rules. Group bounds follow member footprints.

Persist optional `parentId` on members and `name`/optional `emoji` plus geometry
on group nodes in the existing page JSON. Validate same-page, non-nested group
parents and forbid group connections. Preserve page history, clipboard and
project-cover geometry. No database migration or provider request is required.
New server validation activates only after a separately authorized Web update.

The Impeccable Operate workflow refines the existing white/gray canvas; it does
not replace its identity or add a chromatic interface accent. Emoji content is
the user's optional label, independent of interface color tokens.

## GG-326 · Manual frame layout and drag surfaces

The user extends this decision on 2026-10-03: offer the full emoji catalog,
manual frame dimensions, a default cursor over the center and whole-group
movement from the frame itself. Use the already locked Emoji Mart native data
with a Chinese picker, categories and search, loaded only when opened. Bundle
data and locale locally; do not fetch an external catalog at runtime.

New and legacy groups default to automatic visible-content bounds. Resizing a
corner switches to persisted `groupSizing: "manual"`; preserve the user's empty
space and expand only when visible content exceeds the frame. An “适应内容”
action restores automatic sizing. Native resizing compensates child-relative
positions when top/left edges change, preserving content in canvas coordinates.
Prevent shrinking past visible content and the existing group padding.

Title and four edge strips move the group through the existing drag handle.
Four corner handles resize; the center passes through to the normal canvas
interaction with the default cursor. No scaling of members or nested groups.
Manual sizing survives history, clipboard and project restoration. The optional
group-only enum extends existing JSON validation without a schema migration;
activating Web validation remains a separately authorized runtime action.

## GG-332 · Outside title and toolbar, inside corner grips

The user refines visual placement on 2026-10-03. Place the group name and optional
emoji at the frame's upper-left outside edge, using the existing node-title
typography/spacing. Keep double-click/keyboard renaming and title dragging.
Move emoji editing, manual-mode fit-to-content and ungrouping to the selected
node's top quick toolbar through the installed NodeToolbar, positioned above
the title. Keep emoji content before the name; it is also editable in the toolbar.

Replace the four border-centered square handles with the text editor's small
diagonal grip icon, inset inside each corner and oriented toward that corner.
Keep native resizing, pointer target size, directional cursors, keyboard support
and stable callbacks. Existing auto/manual bounds, whitespace, child positions,
history and saved geometry remain unchanged. GG-330 already activated group
server validation; this layout refinement needs no runtime or backend update.

## GG-333 · Vertically centered automatic frames

With the title outside the frame, remove the old 60px top reservation. Automatic
groups use the same 28px padding above and below the members' visible envelope,
including member labels and expanded stacks. When the 120px minimum height adds
empty space, distribute it evenly about the visible content's vertical center.
Keep integer frame geometry and a one-pixel tolerance for outward rounding.
Horizontal sizing and member absolute positions remain unchanged.

Manual frames retain the user's placement/whitespace. Their containment envelope
is actual visible content plus padding, independent of automatic centering and
minimum frame dimensions; native/keyboard resize still enforces 200px/120px.
This prevents small manual groups from moving/expanding solely to match the
automatic center. Only actual overflow expands a manual frame. Existing auto
groups normalize on the next fit without moving their members; persistence and
backend contracts do not change.

## GG-334 · Invisible corner resizing

On 2026-10-03 the user replaces GG-332's visible inside grips with the image
nodes' transparent four-corner controls. Selected groups reuse the existing
media hit area, native diagonal cursors and zoom compensation; hover/drag
shows no icon or background. Empty labeled buttons preserve keyboard resizing
and show an outline only on keyboard focus. Title/edge dragging, stable native
callbacks, member containment, saved manual geometry and GG-333 automatic
centering remain unchanged. No runtime or persistence change is required.

## GG-363 · Reusable reference groups (2026-10-04)

The user accepts GG-362: at least two selected sourceImage/imageResult nodes expose a single right-center output on the selection envelope. Keep this handle inside the leading image's React Flow node context, at the common bounds; freeze member IDs at connect-start. Cancelled/invalid drops never create a group. A valid image-generator drop groups the same nodes without moving them and retains one visible group edge. Existing pure-image groups reuse their own reference handle. Mixed groups and generator batches are not implicit reference sources.

This supersedes the original blanket group-connection prohibition in the browser graph. Group member order is fixed at creation; later additions append and movement does not reorder it. Group edges retain target-local excluded member IDs; tray removal excludes only that member, removing the last input disconnects the edge. Reconnecting starts a fresh relationship. Ungrouping expands active inputs into ordinary image edges, preserving inputs and positions. Regrouping that deletes an old group similarly preserves its active references; moving only some members out updates the remaining group's future inputs.

Cloud persistence uses a reversible compatibility adapter: encode each active member as an ordinary same-page reference edge with a reserved batchref ID, and order group children in the document by reference order. On restore collapse these edges to one group edge and infer target exclusions from omitted members. Browser-only order/exclusion fields never reach existing Web validation. Converted reference IDs follow each encoded member edge. All-excluded/empty edges disappear. No SQL migration, new Web validator or runtime update is needed; existing ownership checks remain. History and clipboard retain the native group edge and remap member IDs.

Deduplicate actual images against direct and connected inputs before checking the ten-image capacity; an oversized batch changes nothing and explains how many to remove. Invalid or failed members block generation, pending members remain placeholders. Resolve groups to independent references; never form a collage or submit generation during connect/restore. Frozen generation input snapshots remain unchanged when group membership changes.

## GG-370 · Candidate pools at dedicated batch targets (2026-10-05)

Group connections to ordinary targets still supply all members. At a dedicated batch target, a group connected to a candidate input supplies independent candidates, one per combination; common input supplies all active members. Keep source group ordering and target-local exclusions, preserve handles through reversible cloud flattening, and validate ten images per expanded request rather than aggregate candidates. No grouping/connect/restore action submits generation. See ADR0108 GG-370.

## GG-371 · Asset folder albums (2026-10-05)

An asset-library folder can be dragged into the canvas as one album, previewing all its authorized image members without placing dozens of independent visible nodes. Album membership is a snapshot at drop, using a reserved album ID and existing group wire with hidden sourceImage children. It can connect once to a dedicated batch candidate port, providing all members as candidates. Do not load album pools into ordinary/common inputs implicitly. All actual asset IDs remain authorized and persisted; reconstruct hidden child presentation on restore/copy, keep album bounds independent of unmounted children, and move/delete/copy albums as units. No new server fields or runtime activation.

## GG-375 · Album movement and media-node presentation (2026-10-05)

The user refines album presentation: place the folder icon and name above the frame at the upper-left, and the image count at the upper-right, using existing image-node metadata typography and spacing. Album chrome and thumbnails form the same native whole-album drag surface; a click still opens the existing image preview, and the scroll area retains wheel browsing. Explicit album pointer targets override the ordinary group's transparent center without changing ordinary groups. Use the existing media reference output handle, including its hit area, hover/focus and connected visibility. Thumbnail numbers remain lower-left, with white numerals on a black circular background. The bottom copy is exactly “连接到节点，一次性载入所有图片”.

This supersedes GG-371's inner header and title/footer-only drag presentation. Snapshot membership, hidden children, whole-album movement/history, candidate-only connection validation and persistence remain unchanged. No new data fields, server behavior, runtime activation or provider request.
