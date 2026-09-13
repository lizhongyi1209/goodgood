# ADR 0067 — Site-owner management inside the workspace

Status: Accepted, local candidate; 2026-09-13, GG-059.

## Context

The owner requests one `站长管理` entry in the lobby, with enterprise, model and
account management displayed in the existing right-hand workspace. Independent
admin pages interrupt navigation and discard the mounted creation session.

## Decision

Replace the site-owner's three navigation entries with `站长管理`. It opens
enterprise management by default and exposes enterprise/model/account links
inside the right-hand content. Existing `/organizations` and `/admin/models`,
`/admin/users` URLs mount the same workspace shell, using its history navigation
and session. Organization detail tabs remain inside this management area.

This supersedes ADR 0066's standalone-page/header decision, retaining its local
login recovery and the absence of direct header logout. Return to creation uses
the existing workspace navigation; do not add another management landing URL.
Preserve in-memory creation, references, projects and tracked generation jobs.
Ordinary enterprise managers keep their existing enterprise entry. Presentation
does not grant membership or site-owner permission; all API gates remain intact.
Embedded admin views reuse the workspace session and omit standalone chrome.
GG-060's owner refinement removes the duplicate visible `站长管理` content title:
the sidebar provides that context, the upper row only switches functions, and the
current content page has the sole primary title. Keep accessible navigation names.
On narrow screens, replace the lobby's direct sign-out avatar with a creation
return while in site-owner management, so the hidden sidebar does not trap users.

## Consequences

Management switches no longer reload the document. Existing direct URLs and
Back/Forward still resolve correctly. Admin views retain their loading, error,
retry and mutation workflows. No price, account, ledger or history conversion;
no migration, production deployment or paid provider request is included.
