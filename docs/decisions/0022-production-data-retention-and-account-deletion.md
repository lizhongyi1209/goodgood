# ADR 0022: Production data retention and account deletion

- Status: Accepted
- Date: 2026-09-06
- Amended: 2026-09-06 to select the site-owner request entry point, two-step
  confirmation, registered-email verification, and submitted-generation
  finalization, unsubmitted-queue cancellation, and the irreversible request-
  creation boundary
- Refines: ADR 0019's privacy and deletion gate for unpaid seed production
- Refines: ADR 0020's account lifecycle without adding another access state
- Refines: ADR 0021's production backup and private-object boundaries

## Context

The C6-1 production audit verified GoodGood's runtime security and production
data map, but the seed gate remained closed because account-data lifetimes,
deletion handling, backup propagation, and recurring cleanup had no accepted
product policy. Existing code already gives creation drafts a sliding 30-day
expiry, makes unreferenced private reference objects eligible after 30 days,
and retains encrypted production recovery points as 14 daily, 8 weekly, and 12
monthly snapshots. It does not yet provide a complete account-deletion
workflow or scheduled database/object cleanup.

Seed-user records and creative content are production data from first login,
including while the account is pending. The policy must cover PostgreSQL,
private R2 objects, Authing identity access, external generation processing,
operator evidence, and restored backups without weakening financial or
administrative accountability.

## Decision

Adopt the following production retention baseline for unpaid seed production:

- Delete a consumed OIDC login attempt 24 hours after consumption and an
  unconsumed attempt 24 hours after expiry.
- Delete an expired or revoked GoodGood session 30 days after that terminal
  event. Active, unexpired sessions remain governed by their normal expiry and
  revocation rules.
- Keep the existing 30-day sliding expiry for the root creation draft. Run a
  bounded cleanup daily to remove expired draft rows.
- Keep the existing 30-day age threshold for unreferenced private reference
  objects. Run the existing bounded, lease-protected cleanup daily; referenced
  project, generation, and unexpired-draft snapshots remain protected.
- Retain projects, generation records, generated assets, and their private
  bytes while the account lifecycle remains open, regardless of whether access
  is pending, active, or suspended, and no verified deletion request is open.
  Ordinary project removal does not imply global asset deletion.
- After a verified account-deletion request, immediately stop GoodGood access,
  revoke current sessions, and prevent new Authing-backed access. Complete
  deletion or anonymization of the GoodGood account within 30 days, while
  deleting its creative records and all owned private bytes. Complete the
  corresponding Authing identity disablement and deletion/anonymization within
  the same period.
- Anonymize credit-ledger and site-owner administrative audit records during
  account deletion, preserving only the non-identifying amounts, reasons,
  event relationships, and integrity evidence needed for reconciliation.
  Retain those anonymized records for 12 months after deletion completion,
  then remove or irreversibly aggregate them through a controlled maintenance
  path.
- Keep encrypted PostgreSQL recovery points on the accepted 14 daily / 8
  weekly / 12 monthly schedule. A verified deletion does not rewrite immutable
  backup archives. Before any restored snapshot can serve application traffic,
  replay the independent deletion register against the isolated restore and
  verify that deleted identities and content cannot reappear. Retain the
  non-content register until no recovery point from before that deletion
  remains. Natural backup expiry is the outer removal boundary for historical
  backup copies.
- Continue ingesting successful provider results within O1Key's current
  default 24-hour result window. Before seed admission, verify and document the
  provider-side retention/deletion contract; do not claim that GoodGood erased
  a provider-held copy without evidence.

Account access state remains exactly `pending | active | suspended`.
Deletion-request progress is a separate lifecycle and must not become a fourth
access status. Opening a verified request uses suspension/revocation for the
immediate access stop, while a separate durable request and non-content
deletion register track verification, deadlines, retries, Authing completion,
private-object deletion, anonymization, and backup replay.

The first deletion-request entry point is the existing site-owner-only
`/admin/users` account-management page. A site owner records a request only
after separately verifying that it came from the account holder. The selected
account and deletion consequences must be shown across two distinct
confirmation steps before the request is created; dismissal or navigation away
performs no mutation. Creation of the durable request is the point that
suspends access and revokes GoodGood sessions. It does not synchronously claim
that content, R2 bytes, Authing identity data, or backups have already been
deleted.

Account-holder verification is a manual registered-email round trip. The user
must send the request from the same email address currently stored on the
GoodGood account. The site owner replies to that same address, and the user
must reply with explicit deletion confirmation within 24 hours. A different
sender, a changed account address, or a late/missing reply does not create a
deletion request; verification restarts from the current registered address.
GoodGood records only the request and confirmation timestamps plus the mail
provider's message/reference ID needed for audit. It does not copy the email
subject or body into the product database, application logs, or release
evidence. Those metadata enter GoodGood only in the transaction that creates
the durable deletion request; abandoning either browser confirmation leaves no
product record or account mutation.

Creating the durable deletion request immediately revokes GoodGood sessions and
blocks login, new generation, and user retry. A generation attempt already
submitted to O1Key is not cancelled and is never resubmitted merely because of
deletion. The Worker may only finish its existing bounded polling/result-ingest
path and normal terminal credit settlement or release; it must not start a new
provider fallback or billable retry. Any resulting Asset remains private and
unavailable to the suspended owner, then is removed with the account's other
creative data. Destructive account/content steps wait until every already-
submitted attempt is terminal, without extending the overall 30-day deletion
deadline. A guarded submission whose upstream outcome cannot be established
still follows `SUBMISSION_UNKNOWN`, releases the customer reservation, and is
never automatically submitted again.

An accepted job that is still queued and has not crossed the persisted provider
submission guard is cancelled when the deletion request is created. In the same
PostgreSQL transaction, its reserved customer credit is released exactly once,
the job becomes terminal `cancelled`, and its outbox work becomes ineligible for
dispatch. No provider request is made. PostgreSQL remains the source of truth;
it is not technically possible to atomically delete a Valkey item in that same
database transaction. A stale or concurrent Valkey delivery must therefore see
the terminal job, perform no provider action, and be acknowledged as a no-op.
The owner/job locks and submission guard decide the race: if submission crossed
the guard first, the submitted-task finalization rule applies; otherwise the
queued cancellation commits first.

All account-holder verification and both browser confirmations happen before
the durable request is created. Either browser step can be dismissed before
the final submit with no GoodGood mutation. Once that final submit commits, the
deletion request cannot be withdrawn: there is no cancel/reopen lifecycle
transition, administration control, or API. An operator who discovers a
mistake after creation opens a separate incident process for containment,
audit, and process correction. The incident does not pause or undo deletion,
restore access or sessions, resurrect jobs or outbox work, re-reserve or grant
credit, restore deleted content, or remove the deletion register.

Do not add a public self-service deletion page in this first slice. The browser
and administration API must both refuse to create a deletion request targeting
the acting site owner. Deletion of a site-owner account remains a separate
out-of-band operation requiring its own reviewed runbook and exact approval;
the account page does not provide that capability.

The implementation must be idempotent, owner-scoped, and fail closed. It must
delete private bytes before recording their successful removal, keep bounded
retry evidence for partial storage or Authing failures, and never expose object
keys, identity claims, credentials, or deleted content in operator evidence.
Cleanup scheduling needs a named operator, alerting, dry-run evidence where
applicable, and an independently verified first production execution.

This decision and its amendment authorize policy only. The later local C6-2A
implementation adds migration 0013 and the POST request-creation boundary, and
C6-2B adds its two-confirmation site-owner UI and read-only request projection.
C6-2C adds migration 0014's non-content register and leased submitted-job wait
step without executing deletion. C6-2D adds a local read-only deletion-inventory
preview whose boundary returns only aggregate counts and a versioned digest.
C6-2E adds migrations 0015-0016 and a bounded local private-object step verified
only against disposable RustFS data; it deletes bytes before database evidence
and exposes no object key. C6-2F adds migration 0017 and a leased local creative-
record step after object completion. It deletes the owner-scoped graph in one
foreign-key-ordered transaction, retains audit/financial evidence, and permits
only a trigger-guarded removal of retained ledger-to-job links. It also makes
new creative writes serialize with request creation and keeps an unexpired
signed upload key in the object step until that PUT window closes. C6-2G adds
migration 0018 and a provider-neutral leased external-identity step after
creative completion. It records disable success before delete, retains the
local identity mapping through external success, and was verified only with a
disposable fake identity directory; no Authing tenant or production endpoint
was contacted. C6-2H adds migration 0019 and the final leased local transaction.
It removes revoked GoodGood sessions and externally completed local identity
mappings, replaces the owner email with a request-scoped pseudonym, expires and
closes remaining credit through an append-only event, scrubs the mail reference,
and atomically completes the step/request/register with exact 12-month
retention. Existing ledger and administrative rows need no field rewrite:
their only account linkage is the opaque internal owner UUID whose retained
User row no longer contains the original email or authentication identity.
Their amounts, reasons, relationships, metadata, and integrity evidence remain
unchanged as required. Verification used only disposable local PostgreSQL/
RustFS and a fake identity directory.
C6-2I adds the opt-in official-SDK Authing adapter without selecting a runtime
credential. C6-2J composes the five leased passes into one bounded,
aggregate-only import boundary. C6-2K adds a strict versioned register export
and a trusted-digest-bound, serializable replay for migrated isolated restores.
Completed tombstones remove restored local identity/content/credit state and
recreate terminal register evidence; processing tombstones restore access
blocking and pending steps while making the recovery candidate ineligible for
traffic. A disposable two-database PostgreSQL test proves both outcomes and
repeat idempotency. C6-2L binds the dump, register export, trusted digests,
timestamps, and immutable application image in a strict root-only three-file
manifest stored by one encrypted Restic snapshot. The reviewed restore source
requires a fresh exact snapshot and replays through the network-none PostgreSQL
namespace before readiness. This implements the accepted backup-replay decision
without changing it. C6-2M adds an inactive production-only one-shot runtime,
dedicated Compose boundary, exclusive host lock, fixed result/exit contract,
and five-minute systemd schedule source. It implements the accepted bounded,
retryable scheduling direction without changing this decision. No Authing
management credential was selected or stored, and production installation,
execution, timer activation, real-tenant mutation, alert delivery, and evidence
remain unauthorized.
C6-2N completes the approved live Authing credential-boundary review without
changing this decision. The exact three-method custom administrator role exists,
but Authing's `userpool` access-key creation aliases the globally powerful
user-pool ID and its `tenant-co-admin` creation rejects the internal
administrator with `422` / API code `4004`. No disposable deletion target was
created and no production credential or timer was installed. Authing identity
execution therefore remains blocked pending a separately revocable
collaborator credential or a new explicit operator risk/provider decision; the
global user-pool secret is not accepted by this ADR as least-privilege evidence.
C6-2O completes the read-only public O1Key retention-contract review without
changing this decision. Current documentation proves only a 24-hour public URL
lifetime for temporary attachments and a 24-hour generated-image URL lifetime;
it exposes asynchronous submit/query operations but no task deletion route.
Both documented API hosts currently report privacy policy and user agreement
disabled. No published term establishes erasure timing for prompts, reference
bytes, task/result records, generated outputs, logs, caches, backups, or selected
upstream processors. Provider-side erasure therefore remains a named external
contract blocker pending written O1Key evidence for those data classes or a
reviewed provider-boundary change. The review used no credential, task,
generation, asset, or configuration mutation.
Neither the decision nor that local code
authorizes any production deletion,
migration, timer installation, Authing mutation, generation, traffic opening,
or release-readiness status. The design still requires the reviewed downstream
slices. Until the complete lifecycle, scheduling, provider-contract review, and
production evidence pass,
`retention-deletion-policy` remains blocked.

## Consequences

- GoodGood gains one explicit lifecycle for transient authentication data,
  drafts, references, durable creative content, audit evidence, and backups.
- Account deletion can no longer be modeled by rewriting the three-state
  access enum or by deleting a `User` row first; dependent bytes, external
  identity access, anonymization, and retry evidence must be orchestrated.
- The existing account-management page gains the future request-entry control;
  no separate user-facing route is introduced. Two-step confirmation and
  backend self-target rejection are mandatory. The local backend rejection,
  POST boundary, page control, confirmations, and read-only request state now
  exist.
- Verification is intentionally manual for the seed phase. It requires a
  registered-email request and a reply-confirmation within 24 hours while
  retaining message metadata rather than email content.
- A submitted provider task is allowed to reconcile exactly once before its
  private result is deleted. Deletion never causes cancellation, resubmission,
  fallback, a second charge, or premature removal of its credit/job evidence.
- A queued job that has not crossed provider submission is cancelled with its
  credit release in PostgreSQL. Valkey delivery is at-least-once, so any stale
  queue item is harmless terminal-job delivery rather than a cross-store
  atomicity claim.
- The final browser submit is the irreversible boundary. Before it, cancellation
  leaves no GoodGood mutation; after it, no product or operator path withdraws
  the request or reconstructs account, session, job, credit, or content state.
  Mistakes are handled as incidents without reversing the deletion lifecycle.
- Append-only ledger and administrative records remain immutable during normal
  product operations. The reviewed deletion path is the narrow exception that
  severs personal linkage, followed by a fixed 12-month anonymized retention
  period.
- Backup restore drills must add deletion-register replay before a restored
  database is eligible for traffic.
- The existing reference-cleanup mechanism can be scheduled only after its
  production timer, alert owner, and first dry-run/execution evidence are
  reviewed. Authentication/draft/account cleanup still requires new additive
  implementation and tests.
