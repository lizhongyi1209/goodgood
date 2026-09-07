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
local-auth seeder. A thirteenth migration adds the irreversible verified
deletion request and queue-cancellation marker. A fourteenth adds the
non-content deletion register and the leased submitted-job wait step. A
fifteenth adds the private-object step, generated-asset deletion marker, and
bounded object evidence; a sixteenth tightens step-specific evidence
constraints without rewriting the applied migration. A seventeenth adds the
leased creative-record step, aggregate record evidence, and a narrowly guarded
ledger-to-job link removal bound to the deletion register. An eighteenth adds
external disable/delete evidence to local identity mappings and the leased
provider-neutral external-identity step. A nineteenth adds the final local
anonymization/completion step, the owner anonymization timestamp, aggregate
local-removal and credit-expiry evidence, and the deletion register's exact
12-month audit-retention deadline. The Drizzle schema mirrors the durable
schema across all nineteen migrations.
A fuller project-backed creation session record and entitlements remain
canonical contracts for later slices.

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
revoked rows are currently retained until the ADR 0022 asynchronous retention
job is implemented; the accepted deletion threshold is 30 days after expiry or
revocation.
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
`seedLocalFixtures` routine with `GOODGOOD_ALLOW_LOCAL_AUTH=true`.

## Entities

### User

Identity, locale, `pending | active | suspended` access state, the current
`seed` account tier, and created/updated timestamps. Authentication
provider data remains separate from product profile data. New M8 owners default
to pending but still receive the one-time welcome grant; creation authorization
requires an approved access state. Current plan, entitlements, account tier,
system role, and credit are resolved through their own records rather than a
browser-writable user balance.
After completed account deletion, the row remains only as a pseudonymous
referential-integrity anchor: status stays suspended, locale resets to the
default, `anonymized_at` is set, and email becomes the deterministic
`deleted-<request UUID without hyphens>@deleted.goodgood.invalid` placeholder.
The original address and every local authentication mapping/session are gone.

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
only after signed-token and verified-email validation. The persisted `subject`
is that verified ID token's `sub`; C6-2I may use it as Authing `user_id` only
when the row issuer exactly equals the adapter's configured OIDC issuer.
Migration 0018 adds
`external_disabled_at` and `external_deleted_at`. Delete evidence is valid only
after disable evidence. These timestamps are retry evidence, not a replacement
for the local mapping: issuer/subject stay present until the later GoodGood
anonymization step runs after external success.

C6-2J adds no table, column, enum, or durable state. Its import-only cycle reads
and advances the existing deletion request/register/step records exclusively
through the five repositories already defined by migrations 0014-0019. The
cycle result and logs are operational aggregate evidence, not a new source of
truth and not persisted user data.

C6-2M also adds no durable state. Its production-only one-shot runtime and
inactive schedule source reuse those same leases and rows. Host locks, exit
codes, systemd status, and aggregate journal events are operational signals,
not account-deletion completion evidence and not a replacement for the
PostgreSQL register.

### AuthLoginAttempt

Hashed OIDC state, hash of the initiating browser's short-lived HttpOnly
binding cookie, PKCE verifier, nonce, validated relative return path,
expiration, consumption timestamp, and creation timestamp. State and browser
binding must match in the same atomic one-time update before code exchange, so
login CSRF, replay, and expired callbacks do not continue authentication. A
consumed attempt is retained for 24 hours after consumption; an unconsumed
attempt is retained for 24 hours after expiry, then a bounded cleanup removes
it.

### AuthSession

Owner and authentication-identity references, SHA-256 hash of an opaque
GoodGood session token, expiration, revocation, last-seen, and creation
timestamps. Raw session tokens and Authing/Google tokens are never stored in
the database. Expired or revoked session rows are retained for 30 days after
the terminal event, then a bounded cleanup removes them.

### AccountDeletionRequest

Implemented locally by migration `0013_m8_account_deletion_requests.sql`. The
additive record owns the verified request/confirmation times, opaque mail
reference, creating site owner, target owner, linked administrative action,
30-day deadline, `processing | completed` lifecycle state, creation-time
session/job/credit counts, idempotency evidence, and completion time. It is
separate from
`User.status`; account access remains exactly `pending | active | suspended`.
The first request creator is the persisted site owner acting from
`/admin/users`. Verification evidence is limited to the registered-email
request time, same-address reply-confirmation time within 24 hours, and mail
provider message/reference ID; email subject/body are not copied into this
record. The verification metadata, request creation, immediate suspension/
session revocation, eligible queued-job cancellation, credit release, and
outbox invalidation commit in the defined transaction boundary; abandoning a
browser confirmation persists none of them. Once created, the request has no
`cancelled`, `withdrawn`, or `reopened` transition. A database constraint or
locked server check rejects
`actor_owner_id = target_owner_id`; site-owner deletion is not represented by
this browser workflow.

The local site-owner account-list projection exposes only request ID, lifecycle
state, creation time, and deadline. It deliberately omits the verified email,
mail reference, operation hash, and downstream retry evidence from the browser
dashboard.

The current request repository implements irreversible request creation, its
immediate PostgreSQL effects, and atomic creation of all current local deletion-
register step rows. Private-object, creative-record, fake-adapter external-
identity progression, and final local anonymization/completion now exist
locally. Completion replaces the mail reference with fixed non-personal
evidence. An opt-in Authing provider adapter and production-only one-shot
runtime wiring now exist locally, while a real-tenant credential, disposable-
target evidence, installation, and activation remain additive follow-up work.
The register export and isolated local replay boundary
now exist. C6-2L binds each export to one production database archive and an
immutable application image through a strict encrypted recovery-point manifest;
no new database table is required.

### DeletionRegister

Implemented locally by migration
`0014_m8_account_deletion_lifecycle_foundation.sql`. The non-content register
stores only request ID, internal target-owner UUID, `processing | completed`
state, 30-day deadline, completion timestamp, exact 12-month
`audit_retention_until`, and timestamps. Its request and owner identifiers have
no foreign key to content/identity rows, allowing the register to survive their
future removal. It contains no prompt, image, object key, email, mail reference,
raw provider subject, credential, or session token. Independent export,
and local restore replay are implemented by C6-2K without a new table. The
version-1 export allowlists exactly the register fields above, sorts by request
UUID, records its export time/count, and binds the canonical payload with
SHA-256. Replay requires that digest again as independent expected evidence.
Completed records restore the five terminal step rows and source completion/
retention times after local identity/content removal. Processing records
restore suspension, session revocation, and pending steps but deliberately keep
the recovery candidate blocked. C6-2L places the artifact beside its database
dump and strict manifest in one Restic snapshot, with root-only permissions,
one-hour freshness, component-order, and digest checks before replay. Natural
`14 daily / 8 weekly / 12 monthly` snapshot expiry remains the outer removal
boundary. Installing the revised tools and collecting production recovery
evidence remain release work.

### AccountDeletionStep

Implemented locally by migrations 0014-0019. The current steps are
`wait_for_submitted_jobs`, `delete_private_objects`, and
`delete_creative_records`, followed by `delete_external_identities` and
`anonymize_goodgood_account`, each with
`pending | running | completed` state,
attempt/next-attempt times, last active-job count, bounded block code, lease
owner/expiry, and completion time. The object step additionally stores the
latest inventory version/SHA-256, current-pass target/failure counts, and a
cumulative successfully recorded object count. Claiming uses row locking with
`SKIP LOCKED`.
Resolution locks every non-terminal job whose attempt crossed the provider
submission guard; any such job returns the step to pending, while an empty set
completes only this wait step. The object step cannot be claimed until the wait
step completes. It deletes a bounded set of distinct live object keys first,
then marks every associated Asset/ReferenceAsset row and increments aggregate
step evidence in PostgreSQL. A pending reference upload whose signed PUT window
and its short clock-skew grace have not expired stays live and keeps the object step pending; after expiry, the
same key is deleted and marked normally. Storage failure returns the step to
pending; lease/evidence ambiguity leaves it reclaimable for an idempotent retry.
The creative step cannot be claimed until the object step completes. It binds a
fresh inventory, requires zero live private objects, and transactionally deletes
the full owner creative graph in explicit foreign-key order. Its target,
failure, and deleted record counts include projects, batches, jobs, assets,
drafts, references, attempts, job events, and outbox rows. No step completes the
request/register. The external-identity step becomes claimable only after
creative completion and stores target, disabled, deleted, and last-failed
aggregate counts. Per-mapping timestamps preserve partial progress: disable is
recorded before delete, delete requires prior disable evidence, and the local
issuer/subject row remains after external success. The service requires an
injected provider-neutral adapter and never selects a provider by itself. The
repository now contains an opt-in server-only Authing adapter with a public-cloud
management-host default, exact issuer binding, and injectable client boundary;
the production-only one-shot runtime selects it only after exact file-backed
configuration and PostgreSQL/R2 preflight. No management credential is
persisted in GoodGood or checked into the repository.
The final step requires every predecessor complete, no creative graph, only
externally deleted identity mappings, revoked sessions, and zero reserved
credit. Its transaction deletes local sessions and identity mappings, expires
remaining available credit through a new append-only ledger event, closes the
credit account, anonymizes the owner/request direct fields, and completes the
request/register. The step stores only aggregate deleted-session,
deleted-identity, and expired-credit amounts.

### AccountDeletionInventoryPreview

C6-2D is deliberately not a new durable table. After
`wait_for_submitted_jobs = completed`, a repeatable-read, read-only snapshot
counts the target owner's projects, generation jobs, assets, root draft,
reference rows, and distinct private object keys whose object-deletion marker
is still empty. The
version-1 SHA-256 canonical set additionally includes generation-batch IDs so a
job's parent record cannot change without changing the evidence. Only the six
counts, inventory version, and digest cross the repository/service boundary;
owner/request/row IDs and object keys remain internal. A future destructive
step must recompute and bind a fresh inventory rather than treating this local
preview as durable authorization.

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
updated transactionally and may be rebuilt. Final account deletion requires no
reservation, expires the remaining available balance, and closes the account
at zero.

### CreditLedgerEntry

Append-only `grant | reserve | settle | release | refund | expire | adjust`
entry with owner/account, signed amount, idempotency key, reason, related job,
payment or prior entry, actor, and timestamp. Adjustments compensate with new
entries; existing entries are never edited or deleted.

Migration 0017 preserves that rule for every normal product path. The sole
exception is the reviewed account-deletion transaction: while its creative step
owns an unexpired lease and the private-object step is complete, a job-linked
entry may remove only `related_job_id` and atomically set
`account_deletion_request_id` plus `creative_link_deleted_at`. A trigger rejects
changes to amounts, reasons, entry/prior-entry relationships, payment references,
owner/account links, actors, hashes, metadata, or timestamps. This lets the job
row disappear while preserving reconciliation evidence. C6-2H does not widen
that exception: it appends one ordinary immutable `expire` entry and leaves all
existing ledger rows unchanged. Their opaque owner link now resolves only to
the pseudonymous retained User row.

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
ready-reference snapshot, stable model/ratio/resolution/count, monotonic
version, 30-day sliding expiry, and timestamps. The version is an optimistic
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

### GenerationJob

Durable execution record: idempotency key, owner, session/project, stable
GoodGood model ID, immutable input and price snapshots, credit reservation,
state, progress, attempt count, normalized error, and
submitted/started/completed timestamps.

### GenerationAttempt

One dispatch attempt for a generation job: ordinal, route version, provider,
provider model/version, provider task ID, state, request/result hashes,
normalized error, estimated and actual provider cost, and timestamps. A retry
or fallback adds an attempt; it does not overwrite prior execution evidence.
For the non-idempotent O1Key route, `submitted` is persisted immediately before
the generation POST. A `submitted` attempt without `provider_task_id` is
intentionally unrecoverable and becomes `SUBMISSION_UNKNOWN`; reclaiming it
must not create another upstream task.

### GenerationBatch

One user submission. Owns prompt snapshot, ordered reference links, parameters,
requested count, submission order, and produced asset IDs. A batch exists even
when its job fails.

### Asset

One output image: owner, batch, storage key, checksum, MIME, pixel dimensions,
aspect ratio, byte size, moderation state, visibility, object-deletion time,
and timestamps. New generated Assets start `not_reviewed`. Ordinary owner
presentation joins include only `not_reviewed | accepted` rows whose private
bytes have not been recorded deleted; `quarantined | rejected` rows never
produce user-facing signed URLs.

### ContentPolicyAcceptance

Immutable evidence that one owner accepted one exact server-owned policy
version and SHA-256 document hash through the web boundary. The compound
`owner_id + policy_version` key prevents ambiguous replacement. This record is
an access precondition for new reference upload, generation, and retry; it is
not a semantic review result. The only alternate source is the explicit local-
fixture seeder; production never enables that seeder.

### ContentReport

One owner report about one of that same owner's generated Assets. Stores only a
fixed category, lifecycle state, resolution, idempotency/operation hashes, and
timestamps; it deliberately stores no prompt, image bytes, object key, or
free-form description. At most one open report exists for an Asset. Creating it
atomically changes that Asset to `quarantined`. Resolved reports record either
`dismissed` or `removed` and an exact 12-month retention deadline.

### ContentModerationAction

Append-only site-owner evidence for `review_opened`, `restore_asset`, or
`remove_asset`, including actor/target/Asset relations, previous/resulting
moderation states, a bounded reason, idempotency/operation hashes, and time. A
removed Asset relation may later become null when account deletion removes the
creative graph; the audit record and report remain.

### Project

Named resumable context with owner, create idempotency key/hash, latest prompt,
ordered ready-reference snapshot, model/ratio/resolution/count, status,
version, and timestamps. Current covers are derived from the newest successful
project batch rather than stored separately. Batches reference the project and
are restored newest-first by submission time.

### ProjectAsset

Optional explicit relation when assets may be collected across batches/projects.
Contains ordering and membership metadata; never duplicate image bytes.

## State invariants

- Job state: `queued | running | refining | succeeded | failed | cancelled`.
- Asset moderation state: `not_reviewed | accepted | quarantined | rejected`.
  Technical validation creates `not_reviewed`; only an audited manual restore
  creates `accepted`. Reporting atomically creates `quarantined`, and confirmed
  byte-first removal creates `rejected`.
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
  batch/job creation. Success settles, failure releases, and partial success
  follows an explicit per-output policy.
- The M6 live path reserves 10 credits in the same transaction as a new Banana
  2 job, settles after the accepted Asset is inserted, and releases when the
  job reaches a no-Asset failure. `SUBMISSION_UNKNOWN` releases the customer's
  reservation but does not infer or record an upstream refund.
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
- Account-deletion progress is not an access state. A verified request first
  suspends access and revokes sessions, then deletes owner-scoped creative
  records and private bytes and deletes or anonymizes the owner within 30 days
  through idempotent, retryable steps.
- Before durable request creation, cancellation leaves no product mutation.
  After creation, deletion progress is monotonic and has no withdrawal,
  account-reopen, or restoration transition; incident evidence cannot mutate
  that invariant.
- Credit-ledger and administrative audit history is append-only during normal
  operations. Account deletion severs its personal linkage, retains the
  anonymized evidence for 12 months after completion, and then removes or
  irreversibly aggregates it through a controlled maintenance path.
- A restored backup cannot serve traffic until the independent deletion
  register has been replayed and deleted identities/content are proven absent.
- Once an O1Key attempt has crossed its persisted submission guard, account
  deletion cannot cancel, resubmit, or replace it. Existing polling/result
  ingestion reaches a terminal state and closes its reservation exactly once;
  any resulting private Asset joins the deletion set and is never exposed to
  the suspended owner. Destructive content deletion waits for every such
  attempt to become terminal within the existing 30-day account deadline.
- A queued job that has not crossed the provider-submission guard becomes
  terminal `cancelled`, releases its reservation, and makes its outbox work
  ineligible in the same PostgreSQL transaction that creates the deletion
  request. A stale Valkey delivery is acknowledged only after observing that
  terminal state and never calls the provider.
- Ledger, payment, queue, and callback writes are idempotent.
- Project creation is owner-scoped and idempotent; batches cannot be reassigned
  from one project to another by a browser request.
- Batch order is submission order, newest first in UI.
- Asset aspect ratio and pixel dimensions are source data, not inferred from CSS.
- Deleting a project does not automatically delete globally retained assets.
- Object deletion is asynchronous and only occurs after authorization and
  reference checks.
- A reference present in any generation or project snapshot is protected from
  cleanup. Snapshot writers serialize with cleanup and revalidate readiness in
  the same transaction so a newly referenced object cannot be claimed by a
  concurrent cleanup run.
- Reference cleanup deletes private bytes before setting `object_deleted_at`.
  A failed deletion retains the evidence row and `OBJECT_DELETE_FAILED` for a
  later bounded retry; repeated successful execution is a no-op.

## UI label mapping

Persist domain values (`1K`, `2K`, `4K`, raw ratio, model ID). Translate to UI
copy at the presentation boundary (`标准`, `高清`, `超清`). This keeps records
stable across localization and copy changes.
