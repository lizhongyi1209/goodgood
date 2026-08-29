# Data model contract

The physical database schema is not implemented. These are the canonical domain
entities that future migrations must preserve.

## Entities

### User

Identity, locale, status, created/updated timestamps. Authentication provider
data remains separate from product profile data. Current plan, entitlements,
and credit are resolved through their own records rather than a browser-writable
user balance.

### PlanEntitlement

Owner, product plan/version, effective interval, capability and quota snapshot,
status, source subscription/payment reference, and timestamps. Provider product
or price IDs are integration data, not GoodGood plan IDs.

### PriceVersion

Immutable product price definition for a stable GoodGood model, resolution,
count, plan context, and effective interval. A submitted batch stores the
quoted price version and amount so later price changes do not rewrite history.

### CreditAccount

Owner, currency/unit, cached available and reserved balances, version, status,
and timestamps. The append-only ledger is authoritative; cached balances are
updated transactionally and may be rebuilt.

### CreditLedgerEntry

Append-only `grant | reserve | settle | release | refund | expire | adjust`
entry with owner/account, signed amount, idempotency key, reason, related job,
payment or prior entry, actor, and timestamp. Adjustments compensate with new
entries; existing entries are never edited or deleted.

### PaymentOrder

Owner, GoodGood product/price snapshot, money amount/currency, payment provider
and provider order ID, state, idempotency key, related ledger entries, and
created/paid/closed timestamps. Payment webhooks are untrusted until their
signature and replay protections pass.

### CreationSession

A temporary or project-backed creative context. Contains owner, optional
project ID, current prompt draft, selected model/ratio/resolution/count, and
created/updated timestamps.

### ReferenceAsset

Owner, object key, MIME/type metadata, dimensions, byte size, ordinal, upload
status, moderation status, and timestamps. Ordinal is stable within a submitted
batch and maps to `参考图 1…10`.

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

### GenerationBatch

One user submission. Owns prompt snapshot, ordered reference links, parameters,
requested count, submission order, and produced asset IDs. A batch exists even
when its job fails.

### Asset

One output image: owner, batch, storage key, checksum, MIME, pixel dimensions,
aspect ratio, byte size, moderation state, visibility, and timestamps.

### Project

Named resumable context with owner, cover asset, latest state snapshot, status,
and timestamps. Project batches are ordered by submission time.

### ProjectAsset

Optional explicit relation when assets may be collected across batches/projects.
Contains ordering and membership metadata; never duplicate image bytes.

## State invariants

- Job state: `queued | running | refining | succeeded | failed | cancelled`.
- Job transitions are append-auditable and terminal states do not regress.
- A retry creates a new attempt while preserving the original batch input.
- Provider fallback stays within explicitly equivalent routes for the selected
  GoodGood model; it never silently changes the product model family.
- Price snapshots and settled ledger entries are immutable.
- Generation submission reserves credit in the same logical transaction as the
  batch/job creation. Success settles, failure releases, and partial success
  follows an explicit per-output policy.
- Browser values and provider usage reports never directly mutate balances.
- Ledger, payment, queue, and callback writes are idempotent.
- Batch order is submission order, newest first in UI.
- Asset aspect ratio and pixel dimensions are source data, not inferred from CSS.
- Deleting a project does not automatically delete globally retained assets.
- Object deletion is asynchronous and only occurs after authorization and
  reference checks.

## UI label mapping

Persist domain values (`1K`, `2K`, `4K`, raw ratio, model ID). Translate to UI
copy at the presentation boundary (`标准`, `高清`, `超清`). This keeps records
stable across localization and copy changes.
