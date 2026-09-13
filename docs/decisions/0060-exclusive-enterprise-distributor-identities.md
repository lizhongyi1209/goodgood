# ADR 0060: Exclusive enterprise and distributor business identities

- Status: Accepted
- Date: 2026-09-13
- Supersedes: ADR 0043 shared enterprise/distributor transfer capability and
  ADR 0058 enterprise allocation navigation; accounting and personal shell stay.

## Decision

Each account has one current business identity: personal (no business assignment),
enterprise or distributor. Enterprise and distributor cannot be combined.
Short-term users needing both use two separate accounts with different identities;
do not introduce identity switching, composite roles or linked-account automation.
Existing single-active-assignment uniqueness and audited atomic role replacement
already enforce this; no migration or automatic role changes.

Enterprise management contains overview, members/budgets, usage and team Assets.
Remove direct-account and transfer-history tabs. Only an active distributor may
read the distribution workspace or submit personal payment-funded transfers.
New direct-parent relationships require an active distributor parent. Company
member roles remain scoped collaboration permissions, not another business
identity; this change does not erase or reassign memberships or company data.

Legacy enterprise allocation URLs canonicalize to enterprise management for
enterprise/personal users, and to the corresponding distributor tab for a
distributor. Legacy distribution URLs for an enterprise return to its enterprise
directory without loading distribution APIs. Preserve mounted creative state.

Recheck current distributor capability before returning a replayed transfer.
Historical transfers, relationships, payment provenance, credit balances and
company budgets remain untouched. Role changes do not transfer data or money.
Site ownership remains separate operational authority and does not by itself
grant the distributor capability.

## Consequences

Update shell, navigation, distributor-only presentation/preview, admin help and
eligible-parent reads, backend authorization and tests together. Removing an
entry does not delete history. No production deployment, provider request, role
mutation or test-account creation is authorized here.
