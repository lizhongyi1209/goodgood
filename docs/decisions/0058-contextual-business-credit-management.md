# ADR 0058: Contextual enterprise and distributor credit management

- Status: Accepted
- Date: 2026-09-13
- Refines: ADR 0057 navigation and ADR 0043 presentation only

## Decision

Remove the standalone `积分分配` main-navigation entry. Enterprise business
accounts access direct accounts and transfer history inside `企业管理`;
distributor accounts access `客户与下级` and `划拨记录` inside `分销管理`.
Allocation is a row action with the existing explicit confirmation dialog.
Row-level history uses an ephemeral counterparty filter, never emails in URLs.

Keep employee spending limits in the company `成员与额度` view. They remain
revocable organization budgets, not permanent transfers. Direct-account credit
comes from the authenticated account's payment-funded transferable balance,
not a selected company's pool. Name this scope explicitly on account tabs.
Company membership never creates a business parent/child relationship.

Company owners/admins retain company-management rights independently from
commercial identity; neither site ownership nor company membership alone grants
allocation. Enterprise allocation tabs are available to an active enterprise
business account even when it has no manageable organization. A distributor
who also manages a company keeps the two navigation capabilities independent.
Every server read/write retains existing authentication and role/relationship
checks; no persistence, credit, provenance or API contract changes.

Use `/organizations/accounts` and `/organizations/transfers` for account-wide
enterprise management, and `/distribution` / `/distribution/transfers` for
distributor views. Existing enterprise `/distribution` links canonicalize into
enterprise account tabs without reloading the creative session. Keep company
detail URLs and the personal main shell. Use DESIGN_SYSTEM density and dialogs,
small account facts, neutral row actions and responsive labeled lists.

## Consequences

Reuse the same allocation boundary and dialog rather than duplicate money
logic. History filtering applies to the loaded cursor pages: explicitly disclose
when more history remains, retain load-more and an unfiltered history entry.
This local UI task does not authorize transfers, provider generation, fixture
queue writes or deployment, and introduces no checkout/commission/CRM domain.
