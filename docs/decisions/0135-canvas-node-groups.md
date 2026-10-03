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
