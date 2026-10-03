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
