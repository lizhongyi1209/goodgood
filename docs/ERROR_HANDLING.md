# Error handling and recovery

## Principles

- Tell the user what failed, what was preserved, and the next useful action.
- Place persistent failure beside the task/result it belongs to.
- Never expose raw provider payloads, stack traces, credentials, bucket keys, or
  internal hostnames to the user.
- Every server error has a normalized code and request/job ID for support.

## Error categories

| Category | Example code | UI placement | Default recovery |
| --- | --- | --- | --- |
| Input | `INVALID_PROMPT` | Composer field/toast | Focus and correct |
| Generation capability | `M3_SLICE_UNSUPPORTED` | Composer/toast | Keep inputs and choose a listed ratio/resolution with Nano Banana 2 and one output |
| Reference upload | `UPLOAD_TYPE_INVALID`, `UPLOAD_DECODE_INVALID`, `UPLOAD_TOO_LARGE` | Reference tray item | Remove/replace |
| Reference readiness | `REFERENCE_NOT_READY` | Composer/toast | Wait for upload or remove failed item |
| Reference cleanup | `OBJECT_DELETE_FAILED` | Operator evidence/logs | Keep row, release lease, retry a later bounded run |
| Quota | `INSUFFICIENT_POINTS` | Submission action | Explain and manage plan |
| Price | `PRICE_NOT_AVAILABLE` | Submission action | Keep inputs and retry after configuration recovers |
| Provider timeout | `MODEL_TIMEOUT` | Failed batch in stream | Retry |
| Submission unknown | `SUBMISSION_UNKNOWN` | Failed batch in stream | Do not auto-submit; explicitly create a new billable task or edit settings |
| Provider rejected | `MODEL_REJECTED` | Failed batch in stream | Edit prompt/settings |
| Rate/capacity | `CAPACITY_BUSY` | Failed/pending batch | Backoff retry |
| Persistence | `SAVE_FAILED` | Affected asset/project | Retry without clearing |
| Draft persistence | `DRAFT_UNAVAILABLE` | Composer-attached status | Keep current page state and retry |
| Draft conflict | `DRAFT_CONFLICT` | Composer-attached alert | Keep current tab or restore newer server draft |
| Asset library | `ASSET_LIBRARY_UNAVAILABLE` | Asset library state | Retry the owner-scoped read |
| Authentication | `SESSION_EXPIRED` | Global blocking state | Sign in, restore draft |
| Login callback | `AUTH_CALLBACK_INVALID` | Global sign-in state | Restart Google/email-code sign-in |
| Login provider | `AUTH_PROVIDER_UNAVAILABLE` | Global sign-in state | Retry later |
| Account association | `ACCOUNT_LINK_REQUIRED` | Global sign-in state | Complete provider-side account linking/support |
| Account review | `ACCOUNT_PENDING` | Authenticated review state | Refresh later or log out |
| Account access | `ACCOUNT_SUSPENDED` | Authenticated blocking state | Contact the site owner or log out |
| Administration | `ADMIN_ACCESS_DENIED` | Non-enumerating route recovery | Return to the workspace |
| Administration | `ADMIN_REQUEST_INVALID` | Account row/dialog | Correct input without losing context |
| Unknown | `INTERNAL_ERROR` | Affected operation | Retry + request ID |

## Generation failure contract

The failed batch remains visible in the active result region as a compact inline
status strip. It does not enter or redistribute the completed-image masonry.
The strip contains:

- Short title, useful explanation, requested/failed count, normalized error
  code, and job ID.
- `重新生成` using the preserved immutable input snapshot rather than the
  current composer draft.
- `修改设置` restoring a mutable copy of that snapshot before returning to the
  parameter drawer.

For a full-batch failure, show one strip rather than one repeated error per
requested output. If results are partial, successful assets remain available
and the strip summarizes completed versus failed outputs.

A toast may announce a transient validation problem, but must not replace this
panel for asynchronous generation failure.

The M3 mock contract maps a provider rejection to `MODEL_REJECTED`, a bounded
poll deadline to `MODEL_TIMEOUT`, provider reachability/capacity to
`CAPACITY_BUSY`, and malformed provider results to `INTERNAL_ERROR`. Database,
queue, and object-storage diagnostics remain server-side. Queue dispatch failure
leaves the committed outbox row pending; an object-storage failure leaves the
non-terminal job and attempt evidence recoverable for worker reconciliation.
The generation API admits only the 14 listed aspect ratios and `1K` / `2K` /
`4K`; it keeps Nano Banana 2 and one output fixed. Unknown capability values
return `M3_SLICE_UNSUPPORTED` before a job, credit reservation, or provider POST
is created. The adapter repeats this validation and sends admitted ratio and
resolution values unchanged.

The M5 O1Key contract normalizes `SUBMITTED`, `IN_PROGRESS`, `SUCCESS`, and
`FAILURE` polling responses. Unknown error names and malformed or conflicting
terminal payloads become `INTERNAL_ERROR`; raw O1Key errors never reach the
browser. A bounded poll deadline becomes `MODEL_TIMEOUT` even when the last
observation was still submitted or processing. Partial-result behavior is not
claimed for the one-output MVP, and the image API documents no callback path.
After a durable task ID, a single `FAILURE` observation remains provisional
until the same normalized failure repeats on consecutive polls. A later
non-failure observation clears it. A `SUCCESS` result URL also receives a small
bounded download retry before a persistent transfer/decode error becomes
terminal. Neither recovery path repeats the billable generation POST.
An interrupted generation POST, a 5xx response, or a successful response
without a usable `task_id` becomes `SUBMISSION_UNKNOWN`. The attempt guard is
already durable at that point, so worker recovery fails it instead of issuing a
second POST. The inline retry states that it creates a new potentially charged
task. GoodGood releases the customer's 10-credit reservation when this no-Asset
job becomes terminal; that customer policy does not assert or record an upstream
refund, so New API usage reconciliation is still required. Reference-upload
failures happen before this billable guard and retain their ordinary retry
behavior.
Before acceptance, downloaded results are bounded and fully decoded as JPEG,
PNG, or WebP; empty, oversized, truncated, type-mismatched, or excessive-pixel
outputs normalize to `INTERNAL_ERROR` and never become an Asset. An active
attempt whose persisted route differs from the configured worker route is
deferred for reconciliation rather than polled through a different provider.

## API error envelope

Target response shape:

```json
{
  "error": {
    "code": "MODEL_TIMEOUT",
    "message": "本次生成未完成，请重试。",
    "retryable": true,
    "requestId": "req_...",
    "jobId": "job_..."
  }
}
```

The production Node runtime also returns the same server-owned value in
`X-Request-Id`; it never accepts a caller-supplied value as correlation. This
request ID is the support ID a customer may report. Log the internal cause
server-side with the same request/job IDs. Keep user copy stable even if
provider wording changes.

Generation endpoints authenticate before reading or mutating owner data.
Missing, malformed, unknown, and unmapped credentials normalize to
`SESSION_EXPIRED` without revealing whether an external identity exists.
In OIDC mode, provider bearer tokens are never accepted as GoodGood API
credentials. Login state is stored as a hash and consumed once before code
exchange; expired, missing, replayed, signature-invalid, issuer/audience/nonce
mismatched, and unverified-email callbacks normalize to stable authentication
errors. Every configured OIDC callback outcome expires the one-time browser
binding cookie, including cancellation and invalid/expired state; it does not
expire an otherwise valid GoodGood session. Raw Authing or Google responses,
codes, tokens, and client secrets stay server-side. If a verified email already belongs to another internal owner,
GoodGood returns `ACCOUNT_LINK_REQUIRED` rather than silently merging subjects.
Missing or drifted OIDC capabilities normalize to
`AUTH_PROVIDER_UNAVAILABLE`. Login discovery and capability validation complete
before the one-time state/PKCE attempt is persisted, so a rejected provider
configuration does not leave an unusable login attempt.
Explicit logout revokes the GoodGood session and expires its cookie before the
browser navigates to Authing. The provider logout URL and return target are
server-owned; callers cannot supply them. If that navigation is interrupted,
the local session remains revoked and reloading returns the global signed-out
recovery surface.
Authentication configuration errors are operator/startup failures, not user
session failures. Local mode requires `GOODGOOD_ALLOW_LOCAL_AUTH=true`; OIDC
mode rejects that switch. HTTPS OIDC callbacks additionally require a Secure
cookie whose name starts with `__Host-`. The runtime and staging preflight fail
closed instead of falling back to local identities or contacting discovery
with an unsafe configuration.

ADR 0020 separates authentication from creation admission. A valid new Authing
identity receives a GoodGood session and `pending` account projection rather
than an authentication failure. Pending users receive stable review-state copy,
may refresh that state and log out, and can see that welcome credit is waiting;
all product capabilities reject before owner data or provider capacity is read
or mutated. `ACCOUNT_PENDING` and `ACCOUNT_SUSPENDED` are stable 403 capability
failures; the safe session read still allows either account to see its own
state and log out. Approval or restoration takes effect on a fresh authorized
request and does not require creating another external identity.
Cross-owner job and retry requests normalize to `GENERATION_NOT_FOUND`, so one
owner cannot use response differences to enumerate another owner's records.
Reference completion likewise returns `REFERENCE_NOT_FOUND` across owners.
Generation resolves only ready references owned by the caller and returns the
same `REFERENCE_NOT_READY` response for missing, foreign, pending, rejected, or
expired IDs, avoiding cross-owner enumeration. Failed decoded/type/size/
dimension checks mark the pending record rejected before the normalized error
is returned; a missing object stays retryable because direct upload may not have
completed yet.

`GET /api/billing` authenticates before reading the owner account. A missing or
inactive account becomes retryable `CREDIT_ACCOUNT_UNAVAILABLE`; an unavailable
active quote becomes retryable `PRICE_NOT_AVAILABLE`; unexpected read failures
normalize to retryable `BILLING_UNAVAILABLE`. None of these errors grants
credit, creates an account, exposes internal identifiers, or blocks the rest of
the workspace. The account surface keeps a stable footprint and offers retry;
an exact zero balance is rendered as data rather than treated as a failure.

Payment product and order APIs authenticate before owner-scoped access.
Malformed requests and missing idempotency keys use stable 400 responses;
same-key/different-product reuse returns `PAYMENT_IDEMPOTENCY_CONFLICT`.
Cross-owner and malformed public order IDs both normalize to
`PAYMENT_ORDER_NOT_FOUND`. The local fake callback authenticates the provider,
not a browser session: disabled sandbox, missing/invalid HMAC, stale timestamp,
unsupported event, unknown order, event-ID conflict, or amount/currency mismatch
all fail before credit is granted. Any database failure rolls the order state,
ledger grant, and event append back together. An identical event replay returns
the stored result; a different success event for an already-paid order records
non-application and does not grant again.

The manual payment command is an operator boundary, not an authenticated
customer route. It defaults to a non-mutating preview and requires explicit
`--execute`. Missing, ambiguous, or inactive owner email, unavailable product,
invalid operator/reference input, and reuse of a receipt for another owner or
product all fail before an order or grant is written. Exact replay returns the
already-paid order without another ledger entry. The command never accepts a
money amount, credit amount, or browser session, and it does not reinterpret a
failed database transaction as a successful receipt.

Site-owner account-management endpoints authenticate the GoodGood session and
authorize the persisted system role before resolving list filters or a target
owner. A non-owner receives `ADMIN_ACCESS_DENIED` without account-list or target
existence detail. Review and test-credit mutations require a current CSRF-safe
request, idempotency key, target stable ID, and validated reason. Same-key/same-
operation replay returns the recorded result; conflicting reuse fails without
mutation. Grant failure rolls back the ledger entry and administrative audit
together, preserves the selected account and dialog input, and returns a
support ID. No error path falls back to a payment order, direct balance update,
or command-line receipt semantics.
Invalid access transitions return `ADMIN_STATUS_TRANSITION_INVALID`; a site
owner cannot suspend their own account. Test-credit amount outside the positive
integer range 1-5000 returns `ADMIN_CREDIT_AMOUNT_INVALID` before ledger work.

Draft read, save, and delete derive the owner only from the GoodGood session.
`DRAFT_UNAVAILABLE` never clears the current composer; the inline recovery
retries the blocked read or write. Each mutation carries the last observed
version. A stale mutation returns `DRAFT_CONFLICT` plus the safely presented
current server draft, pauses further autosave, and requires an explicit
`保留当前内容` or `恢复云端草稿` choice. Foreign references normalize to
`DRAFT_REFERENCE_NOT_READY` without disclosing ownership. Direct project routes
do not consume or overwrite the root draft. Restored reference thumbnails use
their fresh private-object signatures browser-direct. A client-side thumbnail
load failure keeps the reference record and tray item available for retry or
removal; it must not clear the draft or weaken server-side private-network
protections.

Project list, create, read, and update endpoints authenticate before accessing
state. Cross-owner read/update and generation continuation normalize to
`PROJECT_NOT_FOUND` before reference validation, so request ordering cannot
reveal whether another owner's project exists. `SAVE_FAILED` keeps the drawer
open and preserves the current prompt, references, parameters, and batches for
retry. A foreign, missing, or already assigned batch returns
`PROJECT_BATCH_CONFLICT` without reassigning any row.
An addressable project-detail read keeps its stable URL while loading. If the
read fails, the creation state is not replaced; the route-level error offers
retry, return to `/projects`, and `新建创作`. Authentication expiry preserves
the requested path so a successful sign-in can re-enter the same owner-scoped
restore flow.
Before an in-app new-session clear or different-project restore, a changed
prompt, references, settings, or unprojected generation opens one blocking
confirmation. Closing it or choosing `继续编辑` performs no mutation. The discard
action is explicit, and active generation blocks the destructive transition
rather than detaching its visible task state.

Asset-list reads authenticate before accessing state and derive the owner only
from the GoodGood session. An owner with no accepted successful outputs receives
an empty list. Database or private-object signing failures normalize to
`ASSET_LIBRARY_UNAVAILABLE`; the browser preserves its current asset state and
offers a retry without exposing object keys or internal error detail.
Fresh signed asset URLs use the same browser-direct private-object image
primitive rather than the server image optimizer. A client-side image load
failure keeps the asset record and its surrounding batch layout intact; it must
not reinterpret an accepted generation as a provider failure or weaken
server-side private-network protections.
An addressable `/assets/:assetId` read resolves only within that owner-scoped
list. A missing or inaccessible stable ID stays on its URL and presents the same
non-enumerating message with retry and return-to-`/assets` recovery; no foreign
asset metadata is disclosed.

Reference cleanup is an operator boundary and never turns a browser-side tray
removal into an immediate object deletion. Dry-run performs no mutation.
Execution leases a bounded candidate set, deletes each private object first,
and records `object_deleted_at` only while it still owns that lease. Storage
failure records `OBJECT_DELETE_FAILED`, increments attempt evidence, releases
the lease, and exits nonzero after the batch so a later run can retry. Losing a
lease also makes the command fail instead of asserting deletion evidence it no
longer owns. Project, generation, and unexpired creation-draft snapshots remain
authoritative protection; cleanup does not expose object keys in a user
response.

ADR 0022 account deletion is a separate operator lifecycle. Migration 0013 and
the local POST administration boundary implement request creation and its
immediate PostgreSQL transaction. Migration 0014 adds the non-content register
and leased submitted-job wait step; migrations 0015-0016 add the local private-
object deletion step and strict evidence constraints. Migration 0017 adds local
creative-row deletion. Migration 0018 adds the provider-neutral external-
identity disable/delete state machine. C6-2I adds an opt-in Authing adapter but
does not wire it to a runtime. Migration 0019 adds final local anonymization/
completion after external success. Once
a request is verified, failure to complete a downstream step
must not restore access: the account remains suspended, current sessions stay
revoked, and new Authing-backed entry remains blocked. PostgreSQL, private R2,
and Authing steps are individually idempotent and retain only bounded,
non-content retry evidence. Private bytes are deleted before their successful
completion is recorded. A timeout or partial failure keeps the request open,
alerts the named operator, and never marks the 30-day outcome complete.

The Authing adapter fails closed with fixed local codes rather than propagating
provider messages: `AUTHING_IDENTITY_LOOKUP_FAILED`,
`AUTHING_IDENTITY_LOOKUP_INVALID`, `AUTHING_IDENTITY_ISSUER_MISMATCH`,
`AUTHING_IDENTITY_DISABLE_FAILED`, or `AUTHING_IDENTITY_DELETE_FAILED`.
Only Authing's documented user-not-found `apiCode` 2004 is normalized to an
idempotent no-op. A delete race or ambiguous delete error remains retryable; the
next lookup may then prove absence. A response whose user ID or suspended status
does not match the exact request never becomes GoodGood completion evidence.

The C6-2J cycle reports only these orchestration-level alert codes:
`ACCOUNT_DELETION_OBSERVATION_FAILED`, `ACCOUNT_DELETION_CYCLE_ABORTED`,
`ACCOUNT_DELETION_PASS_FAILED`, `ACCOUNT_DELETION_LEASE_LOST`, and
`ACCOUNT_DELETION_DEADLINE_OVERDUE`. Initial observation failure aborts every
mutation. An unexpected phase exception aborts later phases but still attempts
the final aggregate observation. Handled item/step failures and lease loss stay
inside their existing retry state machine; the cycle continues so later phases
can independently enforce their database prerequisites. Provider/database
messages, request IDs, owner IDs, identity values, and object keys are never
copied into cycle alerts or completion summaries. Alert delivery is not yet
wired to a production notification route.

C6-2M maps a completed cycle to process exit `0`, an aggregate `attention`
result to `2`, and an aborted result to `3`. Configuration, dependency,
construction, or cleanup failure returns `1` and emits only
`ACCOUNT_DELETION_RUNTIME_FAILED`; an asynchronous database-pool failure emits
only `ACCOUNT_DELETION_DATABASE_POOL_FAILED`. The public runtime completion
event contains only status, fixed alert codes, before/after lifecycle counts,
and aggregate claimed/completed/deferred/failed/lost-lease totals. It discards
phase objects and any accidental identifier field.

The host wrapper emits only fixed `ACCOUNT_DELETION_*` codes. Lock contention
is `ACCOUNT_DELETION_CYCLE_OVERLAP` with exit `75`; invalid ownership, mode,
configuration, credential mount, or immutable image fails before the container
starts. The systemd four-minute outer timeout is also a failure signal; expired
database leases make a later invocation reclaimable, and retry semantics still
require provider lookup/object absence before recording success. The persistent
timer may invoke the oneshot again but never performs an immediate shell retry,
identity restore, content restore, or billable generation. The external
monitoring agent must consume the failed unit plus fixed journal events and
prove firing/resolved delivery before activation can count as production
evidence.

The `/admin/users` request entry is POST-only and requires the same persisted
site-owner and CSRF boundary as other administration mutations. Either of its
two implemented browser confirmation steps may be cancelled without mutation.
Failed final submits keep the evidence, both confirmations, and the original
idempotency key available for a safe retry. The server
rejects acting-site-owner targets even if the client control is forged or
stale. Successful request creation says only that access stopped and deletion
is pending; the read-only account row retains that state and deadline after a
refresh and never reports downstream erasure before step evidence exists.
An email from any address other than the account's current registered address,
a missing reply, or a reply after 24 hours fails verification without changing
access or creating the request. The site owner restarts the round trip instead
of extending or overriding the expired evidence. Email subject/body must not
enter application logs or database error detail.

The final request-creation submit is irreversible. A duplicate submit is an
idempotent read of the same request, not a withdrawal or second deletion. No
failure handler may reactivate the account, recreate sessions, reverse queued-
job cancellation or credit release, restore content, or remove the deletion
register. An erroneous committed request opens a separate incident record and
alert for investigation while the deletion workflow remains active.

The local wait-step runner uses expiring database leases. A live submitted job
returns the step to `pending` with `SUBMITTED_JOBS_ACTIVE` and a later retry
time. A lost lease records no completion. An unexpected database failure leaves
the step `running` only until its lease expires, after which another bounded pass
may reclaim it. Completing the wait step never marks the overall request or
register completed and never triggers a destructive side effect.

The local deletion-inventory preview fails closed with
`ACCOUNT_DELETION_INVENTORY_NOT_READY` unless the request and register are still
processing and `wait_for_submitted_jobs` is completed. Its database reads use a
single read-only, repeatable-read transaction; a query failure rolls that
transaction back and returns no partial count or digest. The service rejects an
invalid count/hash contract and emits only the whitelisted aggregate result, so
an internal object key or identifier cannot escape through an accidental extra
repository field. No preview failure changes deletion lifecycle state.

The private-object step is claimable only after the submitted-job wait step.
It persists a freshly recomputed inventory hash and bounded target count before
calling storage. For each distinct key, the storage delete happens before all
matching asset/reference rows receive `object_deleted_at`; only then does the
step's deleted count advance. `OBJECT_DELETE_FAILED` contains no key/provider
message and returns the step to pending. An evidence-write error or expired
lease never marks success: the idempotent storage delete is retried after lease
recovery. Normal bounded continuation with remaining objects is pending without
a false failure code. A pending reference upload remains protected until its
signed PUT expiry plus a short clock-skew grace, so the worker cannot mark its key terminal and then lose the
only evidence needed to remove a late upload. Request/register state stays
processing throughout.

The creative-record step is claimable only after private-object completion. It
locks the owner, reference lifecycle, step, and graph rows; requires a matching
fresh inventory digest and zero live object keys; then validates ownership and
deletes the graph inside one transaction. Any drift, cross-owner edge, foreign-
key error, count mismatch, database failure, or expired lease produces no
partial deletion. The transaction rolls back, the step returns to pending with
only `CREATIVE_DELETE_FAILED` and aggregate counts, and no prompt, object key,
owner/request ID, SQL detail, or exception message enters its service log.
Successful deletion retains ledger and audit rows. The only ledger mutation is
the trigger-guarded removal of a deleted job link bound to the current request;
normal update/delete attempts remain rejected.

The external-identity step is claimable only after creative deletion completes.
It calls an injected adapter to disable before delete and writes each local
timestamp only after the corresponding external call succeeds. Missing external
records are an adapter-level idempotent success; a provider exception records
only `IDENTITY_DELETE_FAILED` plus aggregate counts and returns the step to
pending. An evidence-write failure or lost lease cannot claim success; the next
worker repeats the idempotent external call. Logs contain only fixed event/error
codes and never issuer, subject, endpoint, credential, request/owner ID, or raw
provider text. Local identity rows remain available for retry through external
completion and are not anonymized by this step.

The final local step is claimable only after all four predecessors complete.
It fails closed if creative rows remain, a session is not revoked, any local
identity lacks external-delete evidence, a site-owner role is present, a credit
unit has no reviewed policy, or reserved credit is nonzero. Any expiry,
session/identity removal, owner/request anonymization, or completion-marker
failure rolls the one PostgreSQL transaction back. The leased step returns to
pending with only `LOCAL_ANONYMIZATION_FAILED`; logs omit request/owner IDs,
email, identity claims, SQL detail, and exception text. Success appends a credit
expiry event rather than rewriting ledger history, preserves administrative
evidence unchanged, and completes the request/register exactly once. A lost
lease records no completion, and a repeated pass is a no-op.

A provider-submitted generation is not interrupted by account deletion. The
Worker may retry only the existing bounded poll/result download, never the
provider submission or a fallback. Success still inserts the private Asset and
settles reserved credit once; failure, including `SUBMISSION_UNKNOWN`, releases
the reservation under the existing rule. The suspended owner cannot read a
late result, and the deletion workflow must remove it before completion. A
stuck submitted task keeps deletion incomplete and alerts the operator rather
than deleting its reconciliation evidence or exceeding the 30-day deadline.

A queued job that has not crossed the provider-submission guard is cancelled
with its credit release and outbox invalidation in the deletion-request
PostgreSQL transaction. If Valkey still delivers an older queue item, the Worker
must observe terminal `cancelled`, make no provider request, acknowledge the
delivery, and leave the prior credit release unchanged. A race never guesses:
the committed submission guard selects submitted-task reconciliation; a
committed cancellation prevents later submission.

A backup restore containing an already deleted identity or content fails
closed in network isolation. Replay the independent deletion register and
verify absence before candidate health or recovery evidence can pass. Immutable
encrypted archives are not rewritten in place; they expire through the accepted
14 daily / 8 weekly / 12 monthly policy. Provider-side erasure is reported only
when the provider contract or a provider response supplies evidence.

C6-2K rejects malformed, unknown-field, duplicate-owner/request, future-dated,
or digest-mismatched register exports before database mutation. Replay also
requires a separately supplied expected SHA-256 and rejects count drift,
identity conflicts, site-owner targets, state regression, unsupported credit
units, residual reservations, or residual local identity/content. Every record
is applied in one serializable transaction; any unexpected error rolls back the
whole artifact. Public failures expose only
`ACCOUNT_DELETION_REGISTER_EXPORT_FAILED` or
`ACCOUNT_DELETION_REGISTER_REPLAY_FAILED`, never UUIDs, emails, subjects,
prompts, object keys, or database messages. A processing tombstone is not an
error, but it always returns `ready: false`; recovery must stay isolated until
the ordinary lifecycle completes and a newer bound export replays cleanly.

C6-2L also rejects a production recovery point before replay when it does not
contain exactly one dump, one deletion-register artifact, and one manifest with
the same timestamp stem; when the snapshot or manifest is older than the
one-hour RPO; when dump/export/manifest timestamps are out of order or more than
15 minutes apart; when any file is not a root-owned, non-symlink `0600` regular
file; when either digest or aggregate register metadata differs; or when the
manifest image is mutable, unavailable locally, or differs from the approved
GoodGood GHCR namespace. The restore helper never pulls an image during the
isolated drill. All such failures leave production untouched, remove only files
created by that invocation, keep the restore container non-serving, and report
fixed recovery codes rather than paths, UUIDs, database errors, or content.

An automated PostgreSQL recovery-point failure leaves the source database
untouched, removes only the transient dump/register/manifest files created by
that invocation, preserves any pre-existing collision target, exits nonzero,
and leaves the service failed in systemd with root-journal evidence.
It does not retry a database dump, weaken retention, initialize a replacement
repository, initiate a restore, or send a staging-only outbound alert. The unit
does not print its secret URL, R2 credential, Restic password, database content,
or public host address. ADR 0016 delegates the M8 monitoring platform and
notification route to a separate agent, but the existing staging unit remains
unchanged until the resulting external route and a firing/resolved delivery
test are installed and acknowledged. Alerting never initiates a restore or
billable retry.

A production image that cannot resolve its packaged runtime modules fails the
CI image-import smoke before publication. If a later staging-only dependency
or health failure still appears after label verification and migration, the
release command exits nonzero and the operator re-applies the retained prior
release file without reversing the additive schema. The failed candidate never
replaces the active release record.

Artifact-security ingestion emits no evidence when the downloaded artifact is
malformed, its bytes differ from GitHub's immutable SHA-256, the workflow is not
a completed successful `main` run, the candidate identity differs, or any
required verify/publish step is absent or failed. GitHub API, token, and response
details are reduced to non-secret check failures. The production release
planner returns `plan: null`, `executed: false`, and a failed gate when any
required evidence is not current. It deliberately rejects execution arguments
and cannot pull, migrate, start, switch, or roll back production.
Its ADR 0017 adapter permits only one active production Worker. A candidate Web
failure leaves the active slot untouched; a candidate Worker handoff failure
restores the prior Worker before any Nginx switch. Invalid proposed Nginx
configuration restores the retained upstream bytes without reload. A post-switch
failure reverts the upstream and Worker, repeats public/state fingerprints, and
never attempts a schema downgrade. Failure to prove any of those outcomes emits
no passing candidate-health or rollback evidence.

ADR 0021's single-host seed profile fails closed before conversion when the
existing Hong Kong host cannot prove its expected x86_64, 2-vCPU, 4-GiB,
50-GiB, private-R2, off-host-backup, and bounded PostgreSQL/Valkey contract. It
must also stop if a proposed reset would import staging business data, reuse a
staging R2 credential, reclassify a non-empty `goodgood` bucket, target an
unresolved path/volume/object, or run without an exact inventory, verified
archive, and explicit destructive approval. Resource-headroom failure leaves
the active release unchanged.

Single-host backup success alone does not emit production recovery evidence;
the encrypted off-host copy and isolated restore drill must still prove at most
one hour RPO, at most four hours RTO, and 14 daily / 8 weekly / 12 monthly
recovery points. The final staging archive is deleted only after its seven-day
safety window and a separate exact-target approval. ADR 0018's managed
ECS/RDS/Tair profile remains a scale-out option, never an automatic fallback or
purchase.

The initial observation phase has no fixed job-count or concurrency rejection.
If host `MemAvailable` is below 500 MiB or root-disk use reaches 80%, reject only
new generation submissions with the normalized inline recoverable error and a
support ID. Never cancel, automatically retry, or resubmit existing provider
work in response to resource pressure. Safe login, account administration, and
asset reads remain available while their dependencies are healthy. Clearing the
protection state requires an operator decision after inspecting monitoring;
capacity pressure never triggers an automatic purchase or deployment.

The Node production Web runtime implements this as a pre-write admission check
for generation submission and retry. It emits
`GENERATION_CAPACITY_PROTECTED` with HTTP 503 and `retryable: true`, records one
redacted `generation.resource_protection_activated` event, and latches the
process in protection after either threshold or an unreadable host-resource
probe. A healthy observation does not clear an already latched process: the
operator inspects the cause and restarts Web deliberately. Generation reads,
login, site-owner administration, and other non-generation handlers do not pass
through this check. Worker jobs already accepted continue independently.

Production conversion stops before seed admission if the reused Authing
application still allows a GoodGood loopback/obsolete staging callback, the
production login/logout URLs differ from `goodgood.o1key.com`, the client secret
was not rotated, it appears inline, or any old hashed GoodGood session was
imported into fresh state.
Never recover by importing old GoodGood identity bindings or sessions. A valid
existing Authing identity is provisioned through the normal fresh pending-owner
path; unexpected inherited role, credit, or content is a failed clean
conversion.

The initial conversion begins and fails closed in public maintenance mode. If
any required clean-state, identity, storage, backup, generation, health, or
rollback check fails—or the four-hour execution limit is reached—the public
site remains in maintenance and the attempt stops. Do not reopen the former
staging stack publicly, import its data, or waive a check to meet the deadline.
It may run only on a private operator path for diagnosis before another reviewed
window.

The production maintenance controller cannot reopen traffic. It rejects a
symbolic-link or incorrectly owned marker, validates the installed asset and
Nginx site, and reloads only after `nginx -t`. If reload fails or the local
origin does not return the reviewed HTTP 503 response, it stops Nginx and leaves
the marker in place. Public opening is a separate, unimplemented approval
boundary. The R2 inventory path is similarly read-only: malformed metadata,
duplicate keys, summary/hash drift, a truncated page without a continuation
token, or unknown historical-version scope stops conversion. Its deletion plan
binds the exact current-object hash but has no execution path; a changed object
set requires a new inventory and approval.

The content-policy boundary fails closed with
`CONTENT_POLICY_ACCEPTANCE_REQUIRED` before a reference intent, generation, or
retry transaction writes creative state. A stale displayed version/hash returns
`CONTENT_POLICY_VERSION_CONFLICT`; an existing same-version record with another
hash returns `CONTENT_POLICY_ACCEPTANCE_CONFLICT`. The browser preserves the
composer and reloads the canonical policy. It never substitutes embedded or
cached policy copy for unavailable server state.

An owner report is idempotent and either creates both the report and
`quarantined` Asset state in one transaction or creates neither. Foreign,
missing, deleted, already terminal, or invalid-category targets return stable
`CONTENT_REPORT_*` errors without revealing another owner or object key. Once
quarantined, ordinary generation/project/asset presentation cannot issue a
signed URL for that Asset.

Site-owner preview and resolution are POST-only and require the dedicated CSRF
header plus persisted site-owner authorization. An unavailable exact Asset
remains quarantined. Restore records `accepted` only with append-only action
evidence. Removal calls private object deletion before database success; an
object-store or commit failure never reports completion, never restores the
Asset, and remains safely retryable. Unexpected content-safety failures log
only a fixed event and support/request ID, never provider text, prompt, image,
account identifier, or object key.

## Idempotency and retries

- Browser-to-GoodGood submission carries an owner-scoped idempotency key, so a
  network retry does not create a duplicate GoodGood job.
- O1Key generation submission has no upstream idempotency key. The worker
  persists its at-most-once guard before POST and never automatically resubmits
  a guarded attempt without `task_id`.
- Polling retries are bounded. User retry creates a visible new job linked to
  the previous failure; for O1Key it is also a new billable upstream task.
- Polling an already durable O1Key task and retrying delivery of its returned
  URL do not create a new upstream task or charge.
- Asset and project save operations are idempotent. Current project creation
  carries an owner-scoped idempotency key; repeating the same request returns
  the original project and conflicting key reuse returns 409.
- Credit-ledger operations are server-only and account-scoped. Same-key/
  same-operation replay returns the existing append; same-key/different-
  operation replay fails with `CREDIT_IDEMPOTENCY_CONFLICT`. A reservation
  closes through exactly one settle or release entry, and a settled
  single-output charge accepts at most one full refund. Live generation maps
  unavailable price and insufficient balance errors to the submission action;
  internal ledger consistency errors still fail closed.

In the current M3 implementation, user retry is represented by a new durable
job linked with `retry_of_job_id`; the backend copies the failed snapshot rather
than trusting a browser-resubmitted replacement. Provider fallback within one
job is deferred to the real gateway milestone.
