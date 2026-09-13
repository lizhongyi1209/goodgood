# ADR 0057: Personal account shell and enterprise main navigation

- Status: Accepted
- Date: 2026-09-13
- Refines: ADR 0046 navigation, not its persistence or authorization boundaries

## Decision

Every identity, including `site_owner`, uses the same personal-account shell.
Remove the global desktop/mobile Workspace selector. Enterprise management and
eligible credit distribution are main-sidebar entries, not a second enterprise
sidebar or a switch of creative identity. Creation defaults to `/create`.

Enterprise management uses the shared shell and compact horizontal content tabs:
overview, members/budgets, usage, team Assets. A management-only organization
directory handles multiple memberships and pending invitations. Commercial
enterprise identity can expose the entry but cannot authorize manager reads;
active organization owners/admins retain management authority independently.
Platform ownership alone does not grant access to company creative data.

Retain existing scoped URLs for historical enterprise work, with membership
validation and explicit context. Do not migrate records, change balances,
budgets, business relationships, or backend authorization in this UI change.
Accepting an invitation refreshes the directory without entering company
creation automatically. Existing company work stays company-owned.

Use DESIGN_SYSTEM tokens, 20px headings, neutral ordinary actions, compact
responsive member rows, restrained summary surfaces, and existing Radix dialogs.
Member budgets remain distinct from direct-child payment-credit distribution.

## Consequences

Main navigation does not transfer creative data. In-memory personal creation
and polling remain mounted while visiting enterprise management or distribution.
Direct manager URLs use the same shell and authenticated backend checks.
The release remains local and owner-reviewed; deployment is not authorized.
