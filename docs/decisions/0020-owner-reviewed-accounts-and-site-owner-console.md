# ADR 0020: Owner-reviewed accounts and a site-owner console

- Status: Accepted
- Date: 2026-09-05
- Refines: ADR 0019 for seed admission, account access, and promotional credit

## Context

ADR 0019 selected an invitation-only Hong Kong seed-production launch but left
the exact admission workflow, cohort cap, seed-credit allowance, and data
treatment for operator confirmation. GoodGood currently provisions every valid
Authing identity as an active owner, grants 100 welcome credits, and rejects a
non-active owner before issuing a usable application session. The existing
manual-payment command is intentionally not a promotional-credit tool, and the
product has no administrator identity or browser route.

The operator wants registration and login to remain open with no fixed first-
cohort limit. Every new account must wait for explicit review before it can use
the creation product. The operator also wants routine review and test-credit
grants through a small account-management page rather than command-line work,
while keeping that page visible and callable only by the site owner. Seed-user
content must be treated as production data.

## Decision

Allow any user who passes the accepted Authing Google or email-verification-code
flow to create a GoodGood account and session. New owners start in a stable
`pending` access state and receive the existing idempotent, non-expiring
100-credit `welcome-v1` grant. Credit existence does not authorize consumption:
until a site owner approves the account, every owner-scoped creation capability
fails closed. A pending user may read only the minimum safe account/review state
needed to understand that login succeeded, see that the 100 credits are waiting,
retry the status read, and log out.

Do not enforce a numeric registration or seed-account cap. Seed admission is
bounded by explicit review: only an approved account becomes eligible to upload
references, save drafts or projects, read assets, submit or retry generation,
or reserve and settle credit. Suspending or otherwise removing access must also
stop new product mutations without rewriting prior production history.

Keep three concepts separate in domain data and authorization:

- **system role** controls administrative authority; the initial privileged
  role is the site owner and ordinary accounts never inherit it from a UI label,
  email domain, registration order, or credit balance;
- **access state** controls whether the owner may use the creation product;
- **account tier** describes the product level and remains separate from
  administrative authority so later paid plans cannot accidentally grant site
  administration.

The initial stable values are now fixed. Access state is exactly `pending`,
`active`, or `suspended`; there is no rejected state. System role is
`site_owner` or the implicit ordinary `member` role. The initial product tier
is `seed` (`内测用户` in Chinese UI); later paid tiers require a separate
product decision and never imply the site-owner role.

Add one simple site-owner account-management surface. Its route and APIs must
authorize the persisted site-owner role server-side before listing or mutating
any user data. Routine capabilities are: inspect accounts and their review
state, approve or remove access, inspect the minimum useful credit summary, and
append test credit with an explicit reason. The first view supports email
search and access-state filtering and shows email, registration time, last
login, access state, tier, system role, available credit, and reserved credit.
It exposes only the valid transitions `pending -> active`, `active ->
suspended`, and `suspended -> active`, plus recent review/grant history.

Bootstrap exactly one initial `site_owner` only after that person has completed
one normal login. A dry-run-first, explicit `--execute` server command selects
the existing owner by exact normalized email and requires an operator ID plus a
stable reference. It activates the owner and appends immutable role and
administrative audit evidence atomically. The first registrant is never
promoted automatically, and routine work after bootstrap uses the web page.

Test-credit grants offer 100, 500, and 1000 presets plus a positive integer
custom amount. One grant is limited to 5000 credits and requires a 2-200
character reason. It appends the existing credit ledger and linked
administrative action in one transaction.

Promotional credit uses the existing append-only credit ledger but never
creates a `PaymentOrder`, claims money was received, or reuses the manual-
payment command. Every browser-originated administrative mutation requires a
server-derived site-owner actor, a CSRF-safe authenticated request, an
idempotency key, validated server-owned limits, and durable audit evidence.
There is no direct balance edit: corrections and grants append new entries.

Treat approved and pending seed accounts, identity/session evidence, prompts,
references, projects, generated assets, credit records, review decisions, and
administrative audit records as production data. They enter the production
access-control, retention/deletion, backup/restore, monitoring-redaction, and
incident-response boundaries. A seed label does not make user content
disposable test data.

## Consequences

- Open login does not create open generation capacity or uncontrolled provider
  spend; review status is enforced at every server capability boundary.
- The pending experience becomes a real authenticated product state rather than
  an authentication failure or a hidden composer.
- The site owner can perform routine review and test-credit work in the product,
  but initial owner authority still needs a separately reviewed bootstrap path;
  GoodGood must not make the first registrant an administrator automatically.
- The prior active/disabled model is replaced by the three confirmed states;
  existing disabled rows migrate to suspended. Session response, route guards,
  credit operations, tests, and the additive migration are part of the M8
  admission-control slice.
- Admin search and display expose personal data only to the site owner and must
  remain excluded from URLs, logs, metrics, and client-side persistence.
