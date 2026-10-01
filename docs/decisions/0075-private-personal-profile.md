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
