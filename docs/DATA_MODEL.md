# Data model contract

The M3 PostgreSQL migration physically implements the initial local user,
`GenerationBatch`, `GenerationJob`, `GenerationAttempt`, `Asset`, append-only
job events, and the queue outbox. The additive M4 identity migration introduces
`AuthIdentity` and a second local user so authenticated owner isolation can be
proved without binding GoodGood to a production identity provider. The third M4
migration adds owner-scoped `ReferenceAsset` upload and validation evidence.
The fourth migration adds owner-scoped `Project` state and a nullable project
relation on generation batches. The fifth migration adds short-lived OIDC login
attempts and hashed, revocable GoodGood sessions. The sixth forward migration
binds every usable login attempt to its initiating browser. The Drizzle schema
is completed by a seventh migration that adds bounded reference-cleanup lease,
attempt, failure, eligibility, and object-deletion evidence. An eighth migration
adds one expiring root creation draft per owner with optimistic versioning. The
ninth migration begins M6 with immutable generation price versions, exact
credit-account caches, an append-only credit ledger, nullable price/reservation
links on existing batches and jobs, the accepted Banana 2 prices, and the
one-time welcome grant for existing owners. A tenth migration adds immutable
payment-product versions, owner-scoped orders, append-only webhook evidence,
and the local fake payment settlement path. An eleventh migration adds three-state admission, the seed
tier projection, immutable site-owner assignment, and append-only account
administration evidence. A twelfth forward migration removes the two historical
fixed-UUID local fixtures after verifying that they have no non-fixture identity
or credit history. Local development recreates them only through an explicit
local-auth seeder. Migration 0013 adds GPT IMAGE 2's single-output prices.
Migration 0014 adds ordered multi-Asset jobs and GPT count-2/count-4 prices.
Migration 0015 appends an earlier-effective immutable copy of the same
count-2/count-4 prices so they are active for the full Shanghai launch day.
Migration 0016 adds Nano Banana 2 count-2/count-4 prices at 20/40 credits for
each resolution. Migration 0017 adds `thinking_level` and `google_search` to
generation batches, projects, and root drafts, defaults old rows to `low` and
false, and constrains enabled values to Nano Banana 2. New application-created
Nano snapshots use `high`; the database default remains `low` only for backward
compatibility with historical rows and non-Nano model constraints. The Drizzle schema
mirrors that durable schema. Migration 0018 adds `quality`, `background`, and
`output_format` to the same three snapshots, defaults old rows to
`auto` / `auto` / `png`, constrains non-default values to GPT IMAGE 2, and
rejects transparent JPEG. Migration 0019 adds Nano Banana Pro's immutable
single-output prices. GG-030 migration 0024 adds workspaces, organization
memberships, verified-email invitations, append-only enterprise audit, a
deterministic existing-user backfill, and an insert trigger for each new
user's personal Workspace. Migration 0025 adds organization credit accounts,
member budgets, and their append-only ledgers. Migration 0026 adds Workspace
and creator scope to existing creative records and backfills every old record
to its creator's personal Workspace. Migration 0027 extends the enterprise
audit action constraint with manager Asset downloads. The Drizzle schema mirrors this branch's
durable schema. A fuller project-backed creation session record and entitlements
remain canonical contracts for later slices.

`migrations/0001_m3_generation.sql` is additive and safe to rerun through the
checksum-tracked migration runner. Rollback during local development is to stop
the new application image and restore the pre-migration database snapshot or
reset the explicitly disposable local volume. Deployed environments use a
forward fix; the M3 tables are not dropped automatically.

`migrations/0002_m4_authenticated_owners.sql` is also additive and rerunnable.
It creates the external-identity mapping and local-only owner fixtures without
rewriting M3 records. Rollback uses the same database-snapshot or explicitly
disposable-volume procedure; deployed environments use a forward fix.

`migrations/0003_m4_reference_assets.sql` adds private object identity,
declared and detected metadata, validation evidence, expiry, and lifecycle
state without rewriting generation records. The same snapshot/forward-fix
rollback rule applies; rejected upload records are evidence, not silently
deleted rows.

`migrations/0004_m4_projects.sql` adds resumable project state and the optional
batch-to-project relation without rewriting existing generation rows. Project
creation idempotency is unique per owner. Rollback uses the same snapshot or
explicitly disposable-volume procedure; deployed environments keep the
additive columns and use a forward fix.

`migrations/0005_m4_oidc_sessions.sql` adds one-time OIDC state/PKCE evidence
and server-owned sessions without rewriting users or external identities. Only
the session-token hash is stored; provider tokens are not persisted. Expired or
revoked rows are retained until an asynchronous retention job is introduced.
Rollback follows the snapshot/forward-fix rule used by the other additive M4
migrations.

`migrations/0006_m4_oidc_login_binding.sql` adds a required hash of a
short-lived browser-binding cookie to each login attempt. Any attempt created
before this protection is marked consumed during migration, so deployment
cannot make a legacy unbound callback usable. The migration is additive and
uses the same forward-fix rollback rule.

`migrations/0007_m4_reference_cleanup.sql` adds cleanup eligibility, lease,
attempt, failure, and terminal object-deletion evidence to `ReferenceAsset`,
plus a partial due-candidate index. It never drops the evidence row or rewrites
generation/project snapshots. Rollback follows the same snapshot/forward-fix
rule; an application rollback can leave the additive nullable columns in place.

`migrations/0008_m4_creation_drafts.sql` adds one owner-keyed root draft with
prompt, ordered ready-reference snapshot, stable generation settings,
monotonic version, and sliding expiration. It does not rewrite projects or
generation history. Rollback follows the additive forward-fix rule; a prior
application can ignore the table while retained draft rows expire naturally.

`migrations/0009_m6_credit_ledger.sql` is additive. It adds immutable
`PriceVersion` rows; owner/unit `CreditAccount` caches; append-only signed
`CreditLedgerEntry` rows; and nullable quoted-price/reservation links on
existing generation records. It seeds version 1 of the accepted 10-credit
Banana 2 price separately for 1K, 2K, and 4K, and appends one non-expiring
100-credit `welcome-v1` grant for every existing owner. New owners receive the
same idempotent grant during identity provisioning. It does not seed a payment-
provider identifier. Database triggers reject price or ledger update/delete,
while unique indexes enforce one reservation, one settle-or-release, and one
full refund in the current single-output slice. Existing pre-M6 jobs remain
valid and unmetered; every newly created job uses the live runtime meter.
Rollback uses a database snapshot or forward fix; deployed history is never
removed to undo a ledger change.

`migrations/0010_m6_payment_sandbox.sql` is additive. It seeds version 1 of the
accepted `credits-500-cny` product with CNY 1000 minor units and 500 credits,
then adds `PaymentOrder` snapshots and append-only `PaymentWebhookEvent`
evidence. Product rows and webhook events reject update/delete. Order identity,
ownership, product, money, credit, provider, and idempotency snapshots cannot be
rewritten or deleted; the current state machine permits only `pending -> paid`.
A partial unique index permits one payment-authored ledger grant per public
order. Rollback uses a snapshot or forward fix rather than deleting financial
history.

The pre-checkout manual payment command requires no additional schema. It uses
`provider = 'manual'`, stores the independently verified receipt/reference as
`provider_order_id`, snapshots the active immutable payment product, and links
the paid order to one append-only operator-authored grant. The existing
provider/order and account/idempotency constraints make exact replay a no-op and
prevent the same receipt from funding another order. Manual payment evidence is
an operational bridge, not a browser-writable balance or a fake provider event.

Migration `0011_m8_account_admission.sql` separates account access, system role,
and product tier. New-owner provisioning changes from immediate active access
to `pending` review while preserving the idempotent 100-credit welcome grant.
Existing `disabled` rows migrate to `suspended`; the only valid access values
are `pending | active | suspended`, and the initial tier is `seed`. The
migration also adds immutable site-owner assignment and administrative-action
evidence before the browser surface can mutate access or grant test credit.

Migration `0012_m8_remove_legacy_local_fixtures.sql` is the forward-only boundary
between the prototype-era fixtures and clean production state. It removes only
the two reserved local owner UUIDs, their `goodgood-local` identities, and their
standard welcome-credit rows. It fails closed when either reserved owner has
unexpected identity or credit history; a disposable local database must then be
reset instead of broadening the deletion. Production never recreates these
records. The local Compose migration role opts in to the separate, idempotent
`seedLocalFixtures` routine with `GOODGOOD_ALLOW_LOCAL_AUTH=true`. It verifies
fixture identity/account/grant existence while preserving balances and Assets
changed by local testing, so a normal restart does not rewrite test history.

Migration `0013_gg007_gpt_image_2_prices.sql` adds immutable 10-credit
single-output prices for GPT IMAGE 2 at 1K, 2K, and 4K.

Migration `0014_gg009_multi_output_assets.sql` backfills existing Assets with
ordinal 1, replaces the one-Asset-per-job unique index with unique
`(job_id, ordinal)`, and adds immutable GPT IMAGE 2 count-2/count-4 prices of
20/40 credits for every resolution. It preserves every existing Asset and
ledger row. Because the old worker's `ON CONFLICT (job_id)` statement depends
on the removed unique index, a production rollout must drain/stop old workers
before applying this migration and start only the matching candidate afterward;
an application rollback requires a reviewed forward fix or database snapshot.

Migration `0015_gg009_activate_multi_output_prices.sql` is an append-only price
correction. Migration 0014's immutable rows begin at `2026-09-08 00:00 UTC`,
which leaves the first eight hours of the Shanghai validation day without an
active multi-output quote. Migration 0015 adds equal version-2 prices effective
from `2026-09-07 00:00 UTC`; it neither updates nor deletes financial history.

Migration `0016_gg010_nano_multi_output_prices.sql` adds immutable Nano Banana 2
count-2/count-4 prices of 20/40 credits for 1K, 2K, and 4K. It changes no
existing price, ledger, batch, attempt, or Asset row.

## GG-030 additions (foundation through management implemented locally)

### Workspace

Stable ownership/authorization scope with `personal | organization` kind,
stable public identity, name, `active | suspended` state, and timestamps. Every
existing User gains exactly one personal Workspace through an additive,
idempotent backfill. Organization Workspaces never reuse a User ID as their
identity.

### WorkspaceMembership

Workspace, User, organization role `org_owner | org_admin | org_member`, active
membership state, inviter/activation evidence, and timestamps. Personal
Workspace ownership is unique and is not managed through organization APIs.
Organization role, platform system role, user access, business identity, tier,
and credit remain independent. Removing a membership closes its effective
interval rather than deleting history; the last active organization owner
cannot be removed without an atomic ownership transfer.

### WorkspaceInvitation

Organization Workspace, normalized invited email, intended role, inviting User,
`pending | accepted | revoked | expired` state, expiry, idempotency identity/hash,
and timestamps. Acceptance requires an authenticated User whose verified
normalized email is equal, then creates or activates exactly one membership in
the same transaction. It stores no password, authentication code, or SMTP
credential and reveals no cross-account existence to an unauthorized caller.

### WorkspaceCreditAccount and WorkspaceCreditLedgerEntry

The target credit subject is a Workspace. Personal rows preserve the current
owner ledger semantics; an organization row is funded only by a separately
authorized grant or later accepted purchase path. The ledger remains
append-only and the cached available/reserved balances remain rebuildable.
GG-027 `transfer_in | transfer_out` entries, when integrated, are permanent
owner-account movements and are not member budgets.

Migration `0025_gg030_workspace_credits.sql` implements the organization side
without altering `credit_accounts` or `credit_ledger_entries`. The cached
organization projection stores available, reserved, and allocated balances;
allocated means the sum of member limits not yet settled. An allocation changes
allocated balance, reserve moves available to reserved, settlement reduces both
reserved and allocated, and release moves reserved back to available. Database
checks forbid a negative projection or allocation beyond total pool value.

### MemberBudget and MemberBudgetEvent

One effective spending projection per organization membership: cumulative
limit, settled use, reserved use, version, and status. Append-only events record
allocate, reclaim, reserve, settle, and release with actor, reason, related job,
idempotency identity/hash, and timestamp. Allocated but unspent capacity is an
earmark over the organization pool, not owned credit and not transferable by
the member.

The repository locks the Workspace, account, membership, and budget in one
transaction. It appends the organization ledger entry and matching member event
with the same job evidence; concurrent reservations therefore cannot spend the
same organization or member capacity twice. Migration 0026 links that job
evidence to a generation job in the same Workspace, so financial history cannot
silently reference another tenant's work.

Removing a member closes the budget and reclaims its immediately spendable
remainder in the membership transaction. Any in-flight reservation remains
auditable; its later settlement or release removes the final closed-budget
allocation. Reaccepting a new invitation reopens the same historical budget at
its settled floor before a manager grants new capacity.

### WorkspaceAuditEvent

Append-only enterprise administration evidence for organization creation,
invitation, acceptance, role/status change, budget change, enterprise grant,
and manager Asset download. It records server-derived actor, workspace, target,
action, reason where required, idempotency evidence, safe metadata, and time;
it never stores authentication secrets, signed URLs, prompts, or image bytes.

Existing `CreationDraft`, `ReferenceAsset`, `Project`, `GenerationBatch`,
`GenerationJob`, and `Asset` now carry a Workspace identity and retain the
actual creating User. Migration 0026 maps every current creative record to its
creator's personal Workspace without changing public IDs, object keys, balance,
order, or history. Personal credit records stay owner-scoped and unchanged;
organization credit lives in its separate Workspace-scoped tables.

## Entities

### User

Identity, locale, `pending | active | suspended` access state, the current
`seed` account tier, and created/updated timestamps. Authentication
provider data remains separate from product profile data. New M8 owners default
to pending but still receive the one-time welcome grant; creation authorization
requires an approved access state. Current plan, entitlements, account tier,
system role, and credit are resolved through their own records rather than a
browser-writable user balance.

### SystemRoleAssignment

Owner, stable `site_owner` role, bootstrap source, external operator ID, reason,
idempotency identity/hash, and timestamp. The initial assignment is immutable;
ordinary owners have the implicit `member` role. Administrative authority is
independent of account tier, credit, email domain, and registration order. The
role is never assignable through the public browser surface.

### AccountTier

The current user projection stores stable tier value `seed`, presented as
`内测用户`. Future paid product tiers and effective-interval history require a
later additive model; no tier may imply administrative authority. Visible
Chinese labels map from stable backend values.

### AccountAccessDecision

The append-only `AdministrativeAction` stores target owner, prior and resulting
access state, site-owner actor, reason, idempotency key/hash, and timestamp for
approval, suspension, and restoration. `User.status` caches the effective
state; review history is never rewritten or deleted to change that projection.

### AdministrativeAction

Append-only audit envelope for site-owner account operations: action type,
actor, target owner, prior/resulting state or credit amount, validated reason,
idempotency identity/hash, and timestamp. A promotional credit action links to
its `CreditLedgerEntry`; it never links to or creates a `PaymentOrder`.

### AuthIdentity

External issuer and subject mapped to one internal GoodGood owner, with creation
and last-authenticated timestamps. Provider claims do not replace the internal
user ID in domain tables. The current seeded identities are local-only fixtures;
production identities are provisioned from the accepted Authing OIDC issuer
only after signed-token and verified-email validation.

### AuthLoginAttempt

Hashed OIDC state, hash of the initiating browser's short-lived HttpOnly
binding cookie, PKCE verifier, nonce, validated relative return path,
expiration, consumption timestamp, and creation timestamp. State and browser
binding must match in the same atomic one-time update before code exchange, so
login CSRF, replay, and expired callbacks do not continue authentication.

### AuthSession

Owner and authentication-identity references, SHA-256 hash of an opaque
GoodGood session token, expiration, revocation, last-seen, and creation
timestamps. Raw session tokens and Authing/Google tokens are never stored in
the database.

### PlanEntitlement

Owner, product plan/version, effective interval, capability and quota snapshot,
status, source subscription/payment reference, and timestamps. Provider product
or price IDs are integration data, not GoodGood plan IDs.

### PriceVersion

Immutable product price definition for a stable GoodGood model, resolution,
count, plan context, and effective interval. A submitted batch stores the
quoted price version and amount so later price changes do not rewrite history.
When more than one immutable version is effective, the server deterministically
quotes the latest `effective_from`, then the highest version. No price amount is
accepted from the browser.

### CreditAccount

Owner, currency/unit, cached available and reserved balances, version, status,
and timestamps. The append-only ledger is authoritative; cached balances are
updated transactionally and may be rebuilt.

### CreditLedgerEntry

Append-only `grant | reserve | settle | release | refund | expire | adjust`
entry with owner/account, signed amount, idempotency key, reason, related job,
payment or prior entry, actor, and timestamp. Adjustments compensate with new
entries; existing entries are never edited or deleted.

Signed amounts have one exact interpretation: `reserve` moves a negative amount
from available to reserved; `settle` removes a negative amount from reserved;
`release` moves a positive amount from reserved back to available; `grant` and
`refund` add a positive amount to available. Cached balances and the append are
one transaction. An operation hash makes same-key/same-input replay a no-op and
same-key/different-input replay a conflict.

### PaymentProductVersion

Immutable stable product ID, version, currency, exact minor-unit amount, credit
unit/amount, effective interval, and creation time. The active version is chosen
server-side; an order request never supplies either amount.

### PaymentOrder

Owner, GoodGood product/price snapshot, money amount/currency, payment provider
and provider order ID, state, idempotency key, related ledger entries, and
created/updated/paid timestamps. The current fake-sandbox lifecycle is
`pending -> paid`; product and amount snapshots are immutable, reads use only
the owner-scoped public ID, and paid credit is linked to exactly one ledger
grant. Before public checkout, the `manual` provider uses an externally verified
business receipt as its provider order ID; the fake sandbox and later Alipay
adapters retain their own provider identifiers.

### PaymentWebhookEvent

Append-only provider/event ID, event type, exact payload hash, related order,
whether this event applied the paid transition, and receipt time. Payment
webhooks are untrusted until timestamp, HMAC signature, amount, currency, and
replay protections pass.

### CreationDraft

One unprojected root composer draft per authenticated owner: prompt, ordered
ready-reference snapshot, stable model/ratio/resolution/count plus model-owned
generation options, monotonic version, 30-day sliding expiry, and timestamps.
The version is an optimistic
write precondition so a stale tab cannot silently replace a newer draft.
Unexpired reference snapshots protect their private objects from reference
cleanup. Saving as a project or explicitly starting a clean creation removes
the root draft without changing the saved project.

### CreationSession

A temporary or project-backed creative context. Contains owner, optional
project ID, current prompt draft, selected model/ratio/resolution/count, and
created/updated timestamps. The current local slice materializes only the
minimal unprojected `CreationDraft` and the resumable `Project`; a fuller
session table spanning project edits, batches, and transient generation state
remains deferred.

### ReferenceAsset

Owner, private object key, original filename, declared and decoded MIME type,
declared and verified byte size, decoded dimensions, checksum, upload expiry,
`pending | ready | rejected | expired` upload state, moderation state, error
code, cleanup eligibility and lease, attempt/failure evidence, terminal private
object deletion time, and timestamps. Ordinal is not global asset metadata:
stable `参考图 1…10`
order is stored in each submitted `GenerationBatch.reference_snapshot` with the
reference ID and object key.
Every `ready + accepted` row whose object remains present is also a reusable
material visible to its owner. It is not an orphan merely because no current
draft, project, or generation snapshot references it; later deletion requires
an explicit owner deletion workflow.
An edited reference is stored as another ordinary `ReferenceAsset` after the
same upload and decoded-validation lifecycle. The source row and object remain
unchanged, while the current draft or project reference snapshot may point to
the new row at the same ordinal. Crop bounds and transient brush, sticker,
arrow, and bbox layers are not persisted in this slice; only flattened output
pixels become durable.

### GenerationJob

Durable execution record: idempotency key, owner, session/project, stable
GoodGood model ID, immutable input and price snapshots, credit reservation,
state, progress, attempt count, normalized error, and
submitted/started/completed timestamps.

### GenerationAttempt

One dispatch attempt for a generation job: ordinal, route version, provider,
provider model/version, provider task evidence, state, request/result hashes,
normalized error, estimated and actual provider cost, and timestamps. A retry
or fallback adds an attempt; it does not overwrite prior execution evidence.
For the non-idempotent O1Key route, `submitted` is persisted immediately before
the generation POST. A `submitted` attempt without `provider_task_id` is
intentionally unrecoverable and becomes `SUBMISSION_UNKNOWN`; reclaiming it
must not create another upstream task.
For Nano Banana 2 multi-output, `provider_task_id` stores a versioned ordered
task-set token. The worker advances it with a compare-and-swap after every
returned upstream ID and writes a submission-started variant immediately before
the next POST. A safe partial token therefore resumes only the missing suffix;
a submission-started token or unknown response is terminal because its upstream
outcome cannot be reconstructed.

### GenerationBatch

One user submission. Owns prompt snapshot, ordered reference links, parameters
including model-owned options, requested count, submission order, and produced
asset IDs. A batch exists even when its job fails.

### Asset

One output image: owner, batch, job-local positive ordinal, storage key,
checksum, MIME, pixel dimensions, aspect ratio, byte size, moderation state,
visibility, and timestamps. `(job, ordinal)` is unique and presentation returns
the accepted Asset array in ordinal order.

### Project

Named resumable context with owner, create idempotency key/hash, latest prompt,
ordered ready-reference snapshot, model/ratio/resolution/count plus model-owned
generation options, status, version, and timestamps. Current covers are derived
from the newest successful
project batch rather than stored separately. Batches reference the project and
are restored newest-first by submission time.

### ProjectAsset

Optional explicit relation when assets may be collected across batches/projects.
Contains ordering and membership metadata; never duplicate image bytes.

## State invariants

- Job state: `queued | running | refining | succeeded | failed | cancelled`.
- Job transitions are append-auditable and terminal states do not regress.
- M3 user retry creates a new batch/job linked through `retry_of_job_id` and
  copies the failed immutable input server-side; each job keeps its own
  attempt evidence. Later provider fallback within one job adds another attempt.
- An explicit retry of an O1Key `SUBMISSION_UNKNOWN` job is a new upstream
  submission and may be charged independently. New API usage records remain
  external reconciliation evidence until M6 persists actual provider cost.
- Provider fallback stays within explicitly equivalent routes for the selected
  GoodGood model; it never silently changes the product model family.
- Price snapshots and settled ledger entries are immutable.
- Generation submission reserves credit in the same logical transaction as the
  batch/job creation. Current success settles only after the complete requested
  Asset set is committed; failure releases the full batch reservation.
- The M6/GG-007/GG-009 path reserves 10/20/40 credits for Banana 2 or GPT IMAGE 2
  count 1/2/4. GG-021 publishes 15-credit single-output Nano Banana Pro prices
  for all three resolution tiers without enabling that model's provider route.
  An enabled path settles after every requested accepted Asset
  is inserted atomically and releases when the job reaches a no-Asset failure.
  `SUBMISSION_UNKNOWN` releases the customer's reservation but does not infer
  or record an upstream refund.
- The authenticated billing read projects cached available/reserved balances
  and active price rows into decimal strings. Internal account, owner, ledger,
  and provider-route identifiers never enter the browser contract; the read
  does not create an account or grant credit.
- Browser values and provider usage reports never directly mutate balances.
- Pending accounts may hold welcome credit but cannot reserve or consume it.
  Approval is checked at the shared server capability boundary, not inferred
  from a visible page or a positive balance.
- System role, account access state, and account tier are independent. Neither
  paid tier nor credit balance confers administrative authority.
- Account review and promotional grants are server-authorized, idempotent, and
  append-auditable. Test grants never create payment evidence.
- Ledger, payment, queue, and callback writes are idempotent.
- A browser Workspace ID never grants access; the current active personal owner
  or organization membership is resolved on every protected read/write.
- A generation and its project, batch, Assets, credit account, member budget,
  and creator must agree on one Workspace. A mismatch fails before provider work
  and cannot be repaired by silently reassigning a browser-submitted record.
- Organization available credit and member remaining/reserved budget cannot be
  negative. Allocation, reserve, settle, release, and reclaim update all
  affected projections and append evidence in one transaction.
- Organization generation never consumes personal credit. Welcome or personal
  test grants never become organization balance through backfill.
- Manager Asset review includes organization-generated outputs and immutable
  prompt/parameter snapshots, but excludes personal Workspaces and creator-only
  raw reusable reference reads.
- Closing a membership blocks new organization access and signed reads while
  preserving organization Assets, usage, ledger, and audit history.
- Project creation is owner-scoped and idempotent; batches cannot be reassigned
  from one project to another by a browser request.
- Batch order is submission order, newest first in UI.
- Asset aspect ratio and pixel dimensions are source data, not inferred from CSS.
- Provider pixel sizes are derived from the selected model/ratio/resolution
  capability at submission time. Persisted creative state does not store an
  O1Key model name or provider size string. Migration
  `0013_gg007_gpt_image_2_prices.sql` adds immutable 10-credit GPT IMAGE 2 prices.
- Deleting a project does not automatically delete globally retained assets.
- Object deletion is asynchronous and only occurs after authorization and
  reference checks.
- Ready, accepted references are durable reusable materials and never enter
  incomplete-upload cleanup. Pending/rejected/expired rows referenced by durable
  state remain protected defensively. Snapshot writers serialize with cleanup
  and revalidate readiness in the same transaction.
- Reference cleanup deletes private bytes before setting `object_deleted_at`.
  A failed deletion retains the evidence row and `OBJECT_DELETE_FAILED` for a
  later bounded retry; repeated successful execution is a no-op.

## Resolution presentation

Persist and display the domain values `1K`, `2K`, and `4K`; keep raw ratio and
model ID as stable domain data. Each accepted Asset's `pixel_width` and
`pixel_height` are decoded source data and accompany the requested resolution
in asset presentation. The UI may omit missing compatibility dimensions but
must never infer them from the nominal tier, model, ratio, or CSS.
