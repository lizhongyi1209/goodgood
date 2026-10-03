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
