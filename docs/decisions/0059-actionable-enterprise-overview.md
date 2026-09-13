# ADR 0059: Actionable enterprise administrator overview

- Status: Accepted
- Date: 2026-09-13
- Refines: ADR 0057 overview content only; ADR 0058 allocation scope unchanged

## Decision

Replace the duplicate members/usage/Assets shortcut cards with four compact
metrics, actionable attention items, member usage, and recent company outputs.
Keep the shared personal shell, horizontal navigation, manager authorization,
organization budgets and permanent direct-account transfers unchanged.

Core metrics are current company available credit, this month's settled spend,
actual persisted successful outputs, and members who actually created this month.
Unallocated capacity is supporting credit context, not a second primary metric.
The first page-only slice labels unconnected period aggregation explicitly;
neither limited usage/Asset pages nor active membership count may impersonate
complete monthly statistics. Show member budget's cumulative settled usage with
an explicit cumulative label until period statistics are implemented.

Attention prioritizes unconfigured/exhausted company credit, exhausted/unassigned active
member budget and pending invitations expiring within 48 hours. Exclude removed
or suspended members and already expired/revoked invitations. Actions locate
the corresponding member/dialog or management tab, never auto-submit mutations.
Ordinary no-attention and no-work states stay quiet without fabricated examples.
Dashboard `account: null` means no credit account exists, not a transient read
failure; show unconfigured credit and ask the site owner to fund the enterprise.

Read recent company outputs through the existing manager-only Asset boundary,
not creator impersonation or personal Asset APIs. Local read failure remains
inside the output section and cannot replace known credit/member facts with zero.
Output inspection is read-only and uses existing focused dialog primitives.

## Consequences

This accepted UI change does not authorize fixture database/queue writes,
provider requests, account/credit mutations, new production routes or deployment.
Complete period aggregation is the next backend slice after page acceptance.
Temporary unconnected indicators remain distinct from real zero and read failure.
