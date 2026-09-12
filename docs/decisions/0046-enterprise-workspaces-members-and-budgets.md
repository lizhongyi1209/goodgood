# ADR 0046: Enterprise workspaces, members, budgets, and asset review

- Status: Accepted
- Date: 2026-09-10
- Refines: ADR 0003, ADR 0006, ADR 0020, and ADR 0043
- Parallel dependency: ADR 0045 changes identity proof but not this enterprise domain

## Context

GoodGood currently treats one authenticated user as the owner of every credit
account, draft, reference, project, generation, and Asset. The site owner can
review accounts and append promotional credit, but a company cannot represent
its employees, control a shared creative budget, or inspect work produced for
the company.

The requested enterprise journey starts with a verified company principal,
continues through employee invitation and credit allocation, and lets company
managers inspect employee consumption and generated Assets. It must preserve
personal privacy, existing production records, append-only billing evidence,
and the distinction between platform administration and company authority.

Parallel GG-027/ADR 0043 uses `enterprise | distributor` as a commercial
account classification and permanently transfers payment-funded credit between
direct parent/child accounts. That relationship is not employment and its
zero-sum transfer cannot provide a revocable employee spending limit. Parallel
GG-029/ADR 0045 replaces identity proof with GoodGood-owned email OTP, but keeps
stable internal users and GoodGood sessions. The enterprise domain must consume
that provider-neutral identity boundary without editing authentication
challenges or waiting for a specific login provider.

## Decision

Introduce a stable Workspace authorization and ownership boundary. Every user
has one personal Workspace, and an enterprise is represented by a separate
organization Workspace. A user may belong to more than one organization while
retaining the personal Workspace. New domain values are stable backend values;
Chinese UI labels do not become authorization enums.

Keep roles and states separate:

- `site_owner` remains the GoodGood platform role and does not confer routine
  access to enterprise creative content;
- organization roles are `org_owner | org_admin | org_member` and apply only
  inside one organization Workspace;
- user access, organization status, membership status, commercial business
  identity, product tier, and credit are independent checks;
- an accepted GG-027 `enterprise` business identity may be required before a
  user can become the initial organization owner, but it never replaces a
  membership or grants access to another user's personal data.

The platform site owner creates an organization for an already verified user
and assigns the first `org_owner`. The first release does not promote by signup
order or email domain. An organization owner or admin invites a normalized
email. The invite never provisions a password or an unverified user. It becomes
an active membership only when a GoodGood session with the same verified email
accepts it. This remains compatible with the current Authing path and GG-029's
future `email_otp` path. Invitation-notification email is not required for the
first behavioral closure and must use a separate notifier boundary if added;
GG-030 does not reuse authentication codes or SMTP secrets.

An organization owns one credit pool. Each active member, including managers
who create, has a revocable non-negative spending limit. The UI may call this
`分配积分`, but allocation is an earmarked budget, not a CreditLedger transfer:

- increasing a member's remaining allocation cannot exceed the organization's
  unallocated available capacity;
- reducing or revoking an allocation may reclaim only the member's unspent and
  unreserved amount;
- generation atomically reserves both organization credit and member budget,
  settles both after the complete accepted Asset set, and releases both on a
  no-Asset failure;
- enterprise work never silently falls back to the member's personal credit;
- welcome, personal test credit, and personal payment history never enter an
  organization automatically. Any enterprise trial grant is separately
  authorized and audited against the organization account.

All durable creative records gain a Workspace identity and retain the creating
user separately. Existing owner records are backfilled to that owner's personal
Workspace without changing stable owner IDs, balances, history, object bytes,
or creation order. Authorization derives the user from the GoodGood session
and validates the current Workspace membership server-side. Browser-supplied
Workspace IDs are selectors, never authority.

Creative ownership and visibility follow the selected Workspace at submission:

- personal Workspace content remains visible only to that user;
- organization generated outputs, prompt and parameter snapshots belong to the
  organization and retain the creator ID;
- organization owners/admins may inspect organization generation activity and
  generated Assets by member; ordinary members see only their own work in the
  first release;
- reusable raw reference materials remain creator-restricted in the first
  release. Manager review does not mint signed reads for those source objects;
- removing or suspending a member stops new access, generation, and signed URL
  issuance, but does not transfer or erase company records. Personal records
  remain unaffected.

Every organization creation, invitation, invite acceptance, role/status change,
budget change, enterprise grant, and manager Asset download is append-audited
with a server-derived actor, reason where applicable, idempotency identity/hash,
and timestamp. Normal corrections append compensating records rather than
rewriting history.

The first release excludes departments, automatic monthly renewal, bulk import,
report export, enterprise SSO, customer checkout, in-product procurement,
impersonation, personal-to-company migration, complex sharing, and the deferred
global deletion/reporting program.

## Consequences

- Existing owner-scoped repositories must move deliberately to a Workspace
  boundary; adding a nullable organization flag to only some tables is not
  sufficient because billing, drafts, references, projects, jobs, and Assets
  could otherwise disagree about ownership.
- Database constraints and tests must ensure a generation batch, job, project,
  Asset, credit reservation, and member budget reservation all name the same
  Workspace and creator where required.
- Concurrent budget changes and generation need ordered locks or an equivalent
  serializable guard so organization balance and earmarked member capacity
  cannot overspend.
- The enterprise console is separate from `/admin/users`. Platform account
  review remains site-owner-only; organization routes authorize membership and
  role on every request.
- Previously issued short-lived signed object URLs expire normally after a
  membership is removed. New URLs fail closed immediately; stronger instant
  object revocation would require a later delivery-topology decision.
- GG-030 can implement and test its domain on current verified sessions. Final
  integration must reconcile migrations and interfaces with GG-027/GG-029; it
  must not copy or merge either worktree wholesale.
