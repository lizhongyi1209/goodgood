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
| Account access | `ACCOUNT_DISABLED` | Global blocking state | Contact support |
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

The M5 O1Key contract normalizes `SUBMITTED`, `IN_PROGRESS`, `SUCCESS`, and
`FAILURE` polling responses. Unknown error names and malformed or conflicting
terminal payloads become `INTERNAL_ERROR`; raw O1Key errors never reach the
browser. A bounded poll deadline becomes `MODEL_TIMEOUT` even when the last
observation was still submitted or processing. Partial-result behavior is not
claimed for the one-output MVP, and the image API documents no callback path.
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

Log the internal cause server-side with the same request/job IDs. Keep user copy
stable even if provider wording changes.

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

## Idempotency and retries

- Browser-to-GoodGood submission carries an owner-scoped idempotency key, so a
  network retry does not create a duplicate GoodGood job.
- O1Key generation submission has no upstream idempotency key. The worker
  persists its at-most-once guard before POST and never automatically resubmits
  a guarded attempt without `task_id`.
- Polling retries are bounded. User retry creates a visible new job linked to
  the previous failure; for O1Key it is also a new billable upstream task.
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
