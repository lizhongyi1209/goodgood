# ADR 0075: Private personal profile

- Status: Accepted
- Task: GG-072
- Date: 2026-09-14

## Context

The owner requests avatar, display name and @handle with their own image works,
as a foundation for later social features. Current identity is an email menu.

## Decision

Add /profile inside the creator shell, accessible from the account menu on
desktop and mobile. Only the authenticated active user can read or edit their
profile. Names and handles are separate from email and provider identity.
Handles are unique, case-normalized ASCII letters, digits and underscores,
3–24 characters. Unconfigured profiles show an invitation to set a handle;
reads do not create rows or rewrite existing users. Saves use optimistic versions.

Reuse private validated personal reference uploads for avatars; store only the
reference ID and sign read URLs on demand. Never accept arbitrary image URLs or
another user's/enterprise reference. Protect saved avatars from reference cleanup
under the existing lifecycle lock. Avatar previews use centered circular crops.

Show personal accepted generated images newest first, preserving aspect ratio,
and reuse focused image detail with return to profile. All personal images are
shown automatically; no publication switch, public route, friends, follows,
likes, biography or cross-user lookup in this slice. Enterprise works stay out.

## Consequences

Adds a profile table and private owner API. Existing accounts, billing, model
prices and asset ownership remain intact. A future public/social scope needs a
separate publication/privacy decision; a handle does not make assets public.

## GG-252 default handle and avatar limit (2026-10-01)

Unconfigured users display `goder`. The shared default may repeat; custom handles
retain the existing uniqueness, syntax and normalization rules. Migration 0057
replaces the global handle constraint with a unique index excluding `goder`,
without rewriting existing profiles. Reading an unconfigured profile still does
not create a row. Avatar uploads and new avatar bindings are limited to 2 MB;
existing saved avatars remain readable. See [task](../tasks/GG-252-personal-info-cleanup.md).

## GG-254 single username and short account ID (2026-10-01)

The user replaces nickname/@handle with one editable username (`displayName`),
default `mimi`. Existing custom display names remain; the old default
`GoodGood 用户` is presented as `mimi` without a bulk rewrite. The historical
handle column stays compatible, but is no longer exposed or accepted in profile
writes. Personal home/works and its menu entry are retired; `/profile` is a
compatibility link opening the existing account dialog after returning to
`/create`; no new account page is introduced.

Each account receives an immutable unique integer 0–999999 in a forward
migration, displayed with six decimal digits. UUID ownership/foreign keys do
not change. Existing accounts are backfilled in created-at/UUID order; new IDs
come from a transactional locked counter, so failed registrations do not waste
capacity. IDs are never recycled, and exceeding one million assigned accounts
fails closed. Allocation is private and does not add a public account lookup.

Username uses a plain contenteditable text area with a nearby confirm icon;
avatar selection uses a local preview and uploads only on confirm. Outside
pointer/focus and Escape discard an unconfirmed draft. Pending confirmed writes
cannot start a second edit. Guidance appears below the active edit; saves keep
the existing optimistic version and owned-avatar checks. See
[task](../tasks/GG-254-account-identity-editor.md).
