# GG-063 quality pricing errors

GG-074 missing/removed/non-hidden preset rejects new submissions before reserve.
Insufficient balance, unavailable model/line, stale price or unready references
use existing billing/generation errors. Idempotent replay returns the accepted
job; failed-job retry retains private input. Preset provider failures never expose
provider error text that might echo hidden content. Editor publish errors retain
all fields; list/recipe/library read errors offer retry.

GG-073 separates directory/detail loading, empty/error/retry and action errors.
Consent/input/source/before failures retain publish fields; withdrawn or hidden
cases return404, forbidden removal403 and removed-source republish403. Like
failures preserve prior state. Recipes with unavailable domain options return409.
Unknown errors return safe503 without SQL/provider/storage secrets. Use does not
submit generation; current pricing/provider failures remain in creator recovery.

GG-072 has independent profile/works loading, empty, error and retry states.
PROFILE_INVALID/PROFILE_AVATAR_INVALID preserve edits; PROFILE_HANDLE_TAKEN409
asks for a different handle; PROFILE_CONFLICT409 offers reload before editing.
Unauthenticated access uses the existing session-expired flow. Unexpected server
errors return safe PROFILE_UNAVAILABLE503 without SQL/storage/provider details.

GG-070 card summaries show unpriced/disabled and legacy-unit states explicitly.
Existing save conflicts/errors preserve right-sheet fields; errors remain above
the pinned save footer. Loading disables card mutation actions; cancel/Esc
restores trigger focus. Pricing validation/persistence semantics are unchanged.

GG-069 accepts integer discounts 1–100 only. Invalid/malformed prices or a
route with no positive price fail before draft mutation. Blank specifications
remain blank; exact rounding keeps positive prices at least 0.01 RMB. Inline
errors retain all inputs; existing save/loading/conflict handling is unchanged.

GG-068 rejects malformed/unknown video route configs and missing enabled-route
specifications. Disabling both routes prevents model enable. Unsupported video
resolution fails before provider transport; editing/switching preserves input.

GG-067 rejects unknown/mixed billing units, incomplete enabled-model prices and
nonpositive token rates as MODEL_REQUEST_INVALID. Missing/invalid
completion_tokens is unresolved, never zero or inferred from total_tokens.
Malformed response JSON and extraction errors stay inline with input preserved.
No generation or ledger operation occurs in the pricing calculator.

Reject incomplete/unsupported/nonpositive quality prices before persistence.
Enabled quality lines require all model-owned tiers and resolutions. GPT 2 rejects
xhigh/max before provider POST. Stale price versions reject new submission without
credits reserved; already accepted jobs retain original quote and failure release.

# Error handling and recovery

GG-071 read failures retain search/date controls and offer inline retry; request
IDs accompany normalized API failures. ADMIN_REQUEST_INVALID rejects invalid
dates/ranges over 90 days, filters, cursor and limits before SQL. Missing detail
returns ADMIN_RECORD_NOT_FOUND. Cross-user logs require an authenticated active
site owner; no prompts, raw upstream messages or credentials enter response DTOs.

## Principles

- Tell the user what failed, what was preserved, and the next useful action.
- Place persistent failure beside the task/result it belongs to.
- Never expose raw provider payloads, stack traces, credentials, bucket keys, or
  internal hostnames to the user.
- Every server error has a normalized code and request/job ID for support.

## Error categories

GG-052 model edits reject invalid IDs/templates/prices with
`MODEL_REQUEST_INVALID`, and concurrent edits with `MODEL_VERSION_CONFLICT`;
the dialog keeps input and offers list refresh/reopen. Directory read failures
have inline retry; unauthorized accounts never reach model mutation. New image
submissions reject unavailable entries/specifications as `MODEL_DISABLED` or
a stale displayed quote as `PRICE_CHANGED` before reserving credit. Preserve
prompt/references/settings and refresh the catalog/quote before retrying.
Already accepted jobs retain their original quote despite later price or enable
changes. The denomination migration rejects undrained jobs/reservations/pending
orders atomically; never bypass the guard or rewrite historical records.

GG-054 and GG-062 apply `MODEL_DISABLED` to disabled/unpriced/unknown image lines before
credit reservation. Banana and GPT image templates accept the three stable line IDs.
Admin activation requires confirmed mapping and complete line prices;
invalid changes retain the dialog input. Stale quotes are checked within the
chosen line. Restored unavailable choices preserve state and offer another line;
there is no automatic fallback. Accepted jobs continue their pinned line and
quote after model/line disable, including restart and failure credit release.

GG-056 archiving rejects non-owners before persistence, stale versions with
`MODEL_VERSION_CONFLICT`, and missing/archived entries with `MODEL_DISABLED`.
Normal saves and new generation also reject archived catalog IDs. Failures
roll back both catalog update and audit; refresh the list to recover. No automatic
price changes or line enabling accompanies confirmed Banana 2 mappings.

GG-044 directory loading/empty/error lives in the enterprise content area,
not a global Workspace control. Retry reads the authenticated directory only.
Direct company access is still authorized by manager APIs; denial offers the
enterprise list without enumerating other companies. Invitation/budget failures
stay in their compact dialog with email/member, amount and reason preserved;
stale tab/directory reads cannot overwrite newer results. No recovery switches
creative identity, transfers records or submits generation.

GG-045 keeps allocation errors inside the relevant distribution
content. A successful transfer followed by a failed list read retains the
confirmed balance and public transfer ID; it warns against repeat allocation
and offers a read-only refresh. An empty counterparty filter with more pages
explicitly says only loaded records are empty and retains load-more/all-records.
Failed pagination preserves loaded rows and the counterparty filter.

GG-046 simulated lists/history are explicitly preview-only. Allocation dialogs
can be inspected, but final submission is disabled with a text explanation and
a handler guard. Mock loads never fall back to real reads or writes.

GG-049 returns `BUSINESS_ROLE_REQUIRED / 403` for enterprise/personal distribution
reads, new transfers and historical transfer replays. Suspended distributors stay
denied. New parent bindings reject a non-distributor with the existing admin
conflict code and no relationship mutation. Old enterprise allocation links use
read-only navigation recovery; it never assigns a role or deletes history.

GG-048 overview keeps missing monthly aggregates and unconfigured credit accounts
distinct from real zero. Dashboard `account: null` means no credit account exists,
not a failed request; ask the site owner to fund it, never claim healthy credit.
Recent-output loading/failure/retry is local to its panel and preserves
balance/member facts; late or unmounted requests are ignored. Image detail has
loading, failure, remount retry and read-only signed-address refresh. None of
these recovery actions creates assets, generation tasks or allocations.

| Category | Example code | UI placement | Default recovery |
| --- | --- | --- | --- |
| Input | `INVALID_PROMPT` | Composer field/toast | Focus and correct |
| Generation capability | `M3_SLICE_UNSUPPORTED` | Composer/toast | Keep inputs and choose a model-supported ratio/count combination |
| Reference upload | `UPLOAD_TYPE_INVALID`, `UPLOAD_DECODE_INVALID`, `UPLOAD_TOO_LARGE` | Reference tray item | Remove/replace |
| Reference readiness | `REFERENCE_NOT_READY` | Composer/toast | Wait for upload or remove failed item |
| Reference cleanup | `OBJECT_DELETE_FAILED` | Operator evidence/logs | Keep row, release lease, retry a later bounded run |
| Quota | `INSUFFICIENT_POINTS` | Submission action | Explain and manage plan |
| Price | `PRICE_NOT_AVAILABLE` | Submission action | Keep inputs and retry after configuration recovers |
| Provider timeout | `MODEL_TIMEOUT` | Failed batch in stream | Retry |
| Submission unknown | `SUBMISSION_UNKNOWN` | Failed batch in stream | Do not auto-submit; explicitly create a new billable task or edit settings |
| Provider rejected | `MODEL_REJECTED` | Failed batch in stream | Edit prompt/settings |
| Rate/capacity | `CAPACITY_BUSY` | Failed/pending batch | Backoff retry |
| Seedance request invalid | `INVALID_VIDEO_REQUEST` | Video input boundary | Preserve input and identify the incompatible field |
| Seedance unavailable | `PROVIDER_UNAVAILABLE` | Video provider boundary | Do not infer acceptance; retain the selected line and input |
| Seedance malformed response | `PROVIDER_MALFORMED_RESPONSE` | Video provider boundary | Fail closed without inventing material/task identity |
| Persistence | `SAVE_FAILED` | Affected asset/project | Retry without clearing |
| Draft persistence | `DRAFT_UNAVAILABLE` | Composer-attached status | Keep current page state and retry |
| Draft conflict | `DRAFT_CONFLICT` | Composer-attached alert | Keep current tab or restore newer server draft |
| Asset library | `ASSET_LIBRARY_UNAVAILABLE` | Asset library state | Retry the owner-scoped read |
| Reference materials | `REFERENCE_LIBRARY_UNAVAILABLE` | Material section or picker | Keep composer state and retry the owner-scoped read |
| Reference editor | `REFERENCE_NOT_FOUND`, image decode/export/upload failure | Focused editor footer/stage | Keep edits, retry or reduce the crop when output exceeds 20 MiB |
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

GG-043 material inspection failures stay in the read-only preview dialog with
`重新加载`; closing or retrying does not remove the material, create an asset,
or submit generation. Retry only reloads its existing browser-readable URL.

GG-040 validates nonempty segments before fan-out. Empty segments are ignored;
an all-delimiter prompt creates no request and keeps the input for correction.
Each segment keeps the existing independent failure strip or video slot.
There is no batch-wide rollback: a rejected/insufficient-credit segment does not
cancel accepted siblings. Retry only the selected segment, never the whole source.

Each failed batch remains visible in the active result region as its own compact
inline status strip. One run's failure, retry, or settings recovery never clears
another active or failed run, and failure strips do not enter or redistribute
the completed-image masonry. Each strip contains:

- Short title, useful explanation, requested/failed count, normalized error
  code, and job ID.
- `重新生成` using the preserved immutable input snapshot rather than the
  current composer draft.
- `修改设置` restoring a mutable copy of that snapshot before returning to the
  parameter drawer.

For a full-batch failure, show one strip for that run rather than one repeated
error per requested output. Multiple failed runs therefore show multiple
strips. Current GPT and Nano Banana multi-output is atomic: a short, malformed, or partly
unstorable provider result fails the whole batch and exposes no partial Assets.
A later partial-result policy must define output-level charging first.

A toast may announce a transient validation problem, but must not replace this
panel for asynchronous generation failure.

## Local image download

Image download is a user-initiated browser operation. The browser first reads
an owner-authorized fresh signed URL by stable Asset ID, then reads and validates
the complete object before its download manager receives an in-memory Blob URL.
The expiring preview URL retained in page state is never reused for download.
A URL-resolution, signed-object read, empty-body, or Blob creation failure keeps
the current image/detail state and shows `下载失败，请重试`; it must not navigate
the current page, open the signed image URL in another tab, or create a
destination file. The console records only the Asset ID, safe error message, and
one of `resolve-url / fetch / read / validate / prepare / start`; signed URLs are
excluded. Whether a separate save dialog appears follows the browser's download
preference. Once the browser has accepted the download the app reports
`图片下载已开始`; browser-side cancellation is not observable by the page.
Local managed object storage permits the reviewed app origins to read signed
objects with `GET`/`HEAD` as well as upload with `PUT`. The browser rejects an
empty response before creating the Blob download. The object URL is released
only after a delay so the browser cannot race the download against immediate
resource revocation.

The M3 mock contract maps a provider rejection to `MODEL_REJECTED`, a bounded
poll deadline to `MODEL_TIMEOUT`, provider reachability/capacity to
`CAPACITY_BUSY`, and malformed provider results to `INTERNAL_ERROR`. Database,
queue, and object-storage diagnostics remain server-side. Queue dispatch failure
leaves the committed outbox row pending; an object-storage failure leaves the
non-terminal job and attempt evidence recoverable for worker reconciliation.
Dispatchers claim outbox rows atomically before publishing them, and recovery
does not reopen a fresh dispatch until the Worker lease window has elapsed.
Duplicate deliveries of the same active job are ignored, and an unexpired lease
cannot be reclaimed by the same Worker identity.
The generation API admits Nano Banana 2's 14 ratios and all three GPT image models' seven
ratios with `1 / 2 / 4` outputs at `1K` / `2K` / `4K`. Unknown
model combinations return `M3_SLICE_UNSUPPORTED` before a job, credit
reservation, or provider POST is created. The adapter repeats this validation.
Nano sends the admitted ratio and resolution values in one single-image task
per output and never sends `n`; each GPT route sends the corresponding exact pixel size
and native count in one task.
Nano's omitted thinking/search values normalize to `high` and false before
persistence. Explicit historical `low` remains valid so a frozen retry can omit
the upstream field. Invalid thinking values, non-boolean search values, or enabled
Nano-only options on another model return `M3_SLICE_UNSUPPORTED` before credit
reservation or provider submission. The provider adapter repeats this
fail-closed model isolation check.

The GG-036 Seedance page-smoke route fails closed unless the process is
non-production, the request targets loopback, the explicit preview flag is true,
and an absolute file credential is readable. Cross-origin writes are rejected.
Provider rejection or polling failure appears in the local video result while
the prompt and parameters stay intact; the browser never retries the POST or
falls back to the image route. Reference media blocks the temporary text-only
submission instead of sending browser-only or private URLs upstream.
GPT's omitted quality/background/output-format values normalize to
`auto` / `auto` / `png`. Invalid enum values, GPT-only options on another model,
or `transparent` plus `jpeg` return `M3_SLICE_UNSUPPORTED` before a batch,
credit reservation, or provider POST exists. The UI also auto-corrects that
incompatible pair to PNG and disables JPEG while transparency is selected.

The M5 O1Key contract normalizes `SUBMITTED`, `IN_PROGRESS`, `SUCCESS`, and
`FAILURE` polling responses. Unknown error names and malformed or conflicting
terminal payloads become `INTERNAL_ERROR`; raw O1Key errors never reach the
browser. A bounded poll deadline becomes `MODEL_TIMEOUT` even when the last
observation was still submitted or processing. GPT success must contain exactly
the requested ordered output count. Every Nano task must return one image and
the ordered task set must total the requested count; either mismatch becomes
`INTERNAL_ERROR`. The
image API documents no callback path.
After a durable task ID, a single `FAILURE` observation remains provisional
until the same normalized failure repeats on consecutive polls. A later
non-failure observation clears it. A `SUCCESS` result URL also receives a small
bounded download retry before a persistent transfer/decode error becomes
terminal. Neither recovery path repeats the billable generation POST.
An interrupted generation POST, a 5xx response, or a successful response
without a usable `task_id` becomes `SUBMISSION_UNKNOWN`. The attempt guard is
already durable at that point, so worker recovery fails it instead of issuing a
second POST. The inline retry states that it creates a new potentially charged
task. For Nano multi-output, each known task ID is persisted and a
submission-started marker is written immediately before the next POST; a restart
may submit only the provably unstarted suffix. If that marker remains or any
later POST has an unknown outcome, the entire batch fails as
`SUBMISSION_UNKNOWN` without exposing
partial Assets or repeating that POST. GoodGood releases the customer's full
reservation when this no-Asset job becomes terminal; that customer policy does
not assert or record an upstream
refund, so New API usage reconciliation is still required. Reference-upload
failures happen before this billable guard and retain their ordinary retry
behavior.
Before acceptance, downloaded results are bounded and fully decoded as JPEG,
PNG, or WebP; empty, oversized, truncated, type-mismatched, or excessive-pixel
outputs normalize to `INTERNAL_ERROR` and never become an Asset. An active
attempt whose persisted route differs from the configured worker route is
deferred for reconciliation rather than polled through a different provider.
After a valid output is stored, the Worker records success only if the database
accepts the asset and terminal transition. If a failed, cancelled, or missing
job rejects completion, the unaccepted object is deleted and the execution is
reported as superseded. Cleanup failure is emitted as `OBJECT_DELETE_FAILED`
with orphan evidence for operator reconciliation. A lost lease or an already
succeeded job preserves the deterministic object because another accepted
execution may own it.

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

GG-057 fixes the explicit local `/api/auth/login` entry: validate the return
path first, retain a valid existing session, otherwise issue only the configured
local default HttpOnly cookie and redirect. No default returns
`AUTH_NOT_CONFIGURED`; unsafe destinations return `AUTH_RETURN_TO_INVALID`.
Unexpected session lookup failures are propagated without issuing a fallback
identity. OIDC/email modes never enter this branch. Direct management links and
`返回创作` use stable page destinations instead of replaying login history.

The GG-029 email candidate requires exact same-origin POST, bounded JSON, a
valid single mailbox, and a short-lived HttpOnly browser-binding cookie.
Malformed, expired, consumed, replaced, cross-browser, and incorrect codes all
normalize to `EMAIL_CODE_INVALID`; failed guesses still commit their counter.
Shared limits return `EMAIL_RATE_LIMITED` with `Retry-After`. A definite SMTP
rejection returns `EMAIL_SEND_UNAVAILABLE` and invalidates that challenge;
connection/timeout ambiguity is stored as `unknown`, remains verifiable if a
message arrives, and is never auto-retried. No response contains the raw code,
SMTP error body, secret, or complete mailbox after the request step.

In `email_otp` mode, send and verify are same-origin JSON POSTs with a 2 KiB
body limit. Invalid mailbox input fails before SMTP. Wrong, expired, replayed,
replaced, cross-browser, and exhausted codes normalize to
`EMAIL_CODE_INVALID`; no response reveals whether the mailbox already has an
account. Shared limit failures return `EMAIL_RATE_LIMITED` and a bounded
`retryAfterSeconds`. SMTP rejection returns stable unavailable copy, while an
uncertain timeout leaves the exact challenge verifiable without automatic
resend. Provider errors, credentials, full mailbox addresses in audit subjects,
and codes are not returned. Disabling sends does not invalidate existing
sessions or already issued challenges; disabling registration is disclosed
only after a valid unbound mailbox challenge is verified.

The read-only email-auth operations command emits one redacted JSON report and
uses stable alert codes: `EMAIL_AUTH_GLOBAL_BUDGET_HIGH`,
`EMAIL_AUTH_DELIVERY_FAILURE_STREAK`, and `EMAIL_AUTH_CLEANUP_OVERDUE`.
Operators and the separately owned monitoring layer may group repeated reports
by code; this repository slice does not add an alert transport. Status-command
failure emits only `EMAIL_AUTH_STATUS_FAILED`; cleanup-command failure emits
only `EMAIL_AUTH_CLEANUP_FAILED`. Neither path prints a database error,
connection string, mailbox, code, SMTP response, or secret. Suspending a
specific account revokes that owner's active sessions atomically; it never
causes a global session purge.

The existing-owner binding command fails closed before writes for malformed or
count-mismatched manifests, digest mismatch, duplicate owner/email entries,
missing owners, stored-email mismatch, absent prior identity, unverified or
out-of-order site-owner mapping, existing binding conflicts, and partial replay.
Expected failures use stable `EMAIL_BINDING_*` codes; unexpected database or file
errors collapse to `EMAIL_BINDING_FAILED`. Command failure output never includes
the database URL, raw manifest, full mailbox, external reference, or provider
detail. All inserts are one transaction, so a failed execution creates neither a
partial identity set nor any business/credit mutation.

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
Reference-material lists authenticate before lookup, return only accepted ready
rows for that owner, and normalize database or signing failures to
`REFERENCE_LIBRARY_UNAVAILABLE`. The browser keeps its existing tray and offers
retry; no object key or cross-owner existence signal is exposed.
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

`GET /api/billing/activities` uses the same active-owner boundary. Invalid
filter, limit, mismatched-filter cursor, or an owner-missing cursor returns
non-retryable `CREDIT_ACTIVITY_REQUEST_INVALID`; unavailable account or storage
remains retryable and exposes a support ID, not ledger details. A first-page
failure keeps the page shell and offers retry. A load-more failure retains all
previous rows and retries only that cursor. No read error mutates balance or
falls back to payment behavior.

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

GG-030 enterprise endpoints authenticate the GoodGood session before resolving
the requested Workspace. Missing, foreign, suspended, or removed memberships
normalize to `WORKSPACE_ACCESS_DENIED` without disclosing the organization,
member, invitation, budget, or Asset. Platform site-owner authority is not an
implicit content bypass.

Invitation creation validates normalized email, role, expiry, actor capability,
and idempotency before mutation. A same-workspace pending invite for the same
email is replayed or explicitly replaced; conflicting reuse returns
`ORGANIZATION_IDEMPOTENCY_CONFLICT`. Acceptance derives the verified email from
the session. Missing, expired, revoked, already-consumed by another user, or
email-mismatched invitations return `INVITATION_UNAVAILABLE` without identifying
another account. Failure preserves the current signed-in state and offers return
to personal creation; it never creates credentials or calls an authentication
code endpoint.

Membership transitions reject the last-owner removal with
`ORGANIZATION_OWNER_REQUIRED`, invalid transitions with
`MEMBERSHIP_TRANSITION_INVALID`, and stale versions with
`MEMBERSHIP_CONFLICT`. Suspending a member blocks new Workspace reads/writes and
signed URLs but does not suspend their GoodGood user or erase company history.

Budget updates require a current member, integer limit, reason, version, and
idempotency key. `MEMBER_BUDGET_INSUFFICIENT` identifies a member limit shortfall;
`ORGANIZATION_CREDIT_INSUFFICIENT` identifies company pool capacity. A failed
allocation or generation rolls back budget and credit evidence together and
keeps the dialog/composer input. No error falls back to personal credit,
GG-027 transfer, direct cache edit, payment order, or provider submission.

`ORGANIZATION_CREDIT_UNAVAILABLE` and `MEMBER_BUDGET_UNAVAILABLE` distinguish a
disabled projection from a shortfall without exposing another Workspace.
`MEMBER_BUDGET_CONFLICT` rejects a stale version, unchanged limit, or reclaim
below settled plus reserved use. A second, different close for one reservation
returns `ORGANIZATION_CREDIT_RESERVATION_CLOSED`; a same-key/same-operation
replay returns the recorded result. Settlement and release remain allowed for
an in-flight reservation after Workspace suspension so the ledger cannot stay
half closed.

Manager usage and Asset reads retain the current list on transient failures and
offer retry. An Asset not in the validated organization scope returns the same
not-found response as an unknown ID. Raw reference objects remain creator-only;
a manager-facing result never contains their object keys or signed URLs.

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

An automated PostgreSQL backup failure leaves the source database untouched,
removes only the transient plaintext archive created by that invocation, exits
nonzero, and leaves the service failed in systemd with root-journal evidence.
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

## Business-role and credit-transfer failures

- A missing/ended business role returns `BUSINESS_ROLE_REQUIRED` before any
  child or balance detail is read. Ordinary callers must not learn whether an
  arbitrary account belongs to another hierarchy.
- A target that is not the caller's active direct child returns
  `DIRECT_CHILD_NOT_FOUND`. Self, indirect, ended, or foreign relationships use
  the same public outcome; the server may retain a more precise audited reason.
- Pending/suspended parent or child state returns `ACCOUNT_ACCESS_REQUIRED` and
  produces no transfer row or ledger entry.
- A positive amount larger than payment-funded available credit returns
  `INSUFFICIENT_TRANSFERABLE_POINTS`, even when aggregate available credit is
  higher. Copy explains that welcome/test/promotion credit cannot be allocated;
  it does not suggest changing an off-platform price.
- A relationship or source balance changed after the browser read returns
  `CREDIT_TRANSFER_CONFLICT`. The browser keeps the form values, refreshes the
  summary/child row, and requires an explicit resubmission.
- Same-key/same-transfer retry returns the original completed transfer.
  Same-key/different-input reuse returns
  `CREDIT_TRANSFER_IDEMPOTENCY_CONFLICT` without mutation.
- Missing mutation CSRF evidence returns `DISTRIBUTION_CSRF_CHECK_FAILED` before
  parsing or writing a transfer. Malformed child IDs, amounts, remarks, limits,
  or opaque cursors return `CREDIT_TRANSFER_REQUEST_INVALID`.
- Site-owner attempts to create a self-link, active cycle, unchanged relationship,
  parent without an active business role, second active parent, or duplicate
  business-role interval fail with stable 409 codes such as
  `ADMIN_RELATIONSHIP_SELF_FORBIDDEN`, `ADMIN_RELATIONSHIP_CYCLE`,
  `ADMIN_RELATIONSHIP_UNCHANGED`, `ADMIN_PARENT_BUSINESS_ROLE_REQUIRED`, and
  `ADMIN_BUSINESS_ROLE_UNCHANGED`. They write no partial relationship/audit state.
- Parent debit, child credit, source allocations, paired ledger entries, and the
  public transfer/audit record are one transaction. Any failure rolls back all
  of them; there is no pending or partially completed user-facing transfer.

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
- Direct-child transfers additionally use a parent-scoped idempotency key and
  deterministic two-account locking. Retrying a committed request returns its
  immutable public transfer; a concurrent generation reservation or transfer
  rechecks the source projection under lock and cannot overdraw it.

In the current M3 implementation, user retry is represented by a new durable
job linked with `retry_of_job_id`; the backend copies the failed snapshot rather
than trusting a browser-resubmitted replacement. Provider fallback within one
job is deferred to the real gateway milestone.
