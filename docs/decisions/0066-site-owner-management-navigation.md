# ADR 0066 — Shared site-owner management navigation

Status: Accepted, local candidate; 2026-09-13, GG-057.

## Context

The owner identifies account and model management as one site-owner area and
requests easy switching. Their inconsistent headers obscure that relationship.
Native Back can also revisit a local login URL, where the explicit local mode
currently returns AUTH_NOT_CONFIGURED rather than completing its configured
development sign-in.

## Decision

Share one site-owner header between `/admin/users` and `/admin/models`, labelled
`站长管理`, with persistent `账户管理` and `模型管理` links and an accessible
current-page state. Provide `返回创作` as a direct `/create` link. GG-058's
2026-09-13 owner refinement removes direct header logout; sign-out remains in
the creator account menu and account-access gates.
Use quiet, responsive white chrome and the existing Palace Red selection style.
This supersedes ADR 0061's standalone account-page header restriction only;
other page families keep their accepted navigation. Do not merge these pages
into the creator workspace or introduce another management route.

Explicit local login restores only the configured local default identity when
there is no valid session; retain a valid current identity. Validate return
destinations before issuing cookies. A local configuration with neither a valid
session nor a configured default still fails closed. OIDC and email OTP retain
their existing flow, and persisted site-owner authorization still gates every
management API and page.

## Consequences

Normal management navigation no longer depends on old login entries in browser
history. A revisited local login URL redirects to the requested page using the
existing development identity configuration. No account role, price, balance,
asset or historical record changes. Production deployment and real-provider
testing require their separately authorized scope and fresh verification.
