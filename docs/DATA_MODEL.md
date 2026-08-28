# Data model contract

The physical database schema is not implemented. These are the canonical domain
entities that future migrations must preserve.

## Entities

### User

Identity, locale, plan/points, status, created/updated timestamps. Authentication
provider data remains separate from product profile data.

### CreationSession

A temporary or project-backed creative context. Contains owner, optional
project ID, current prompt draft, selected model/ratio/resolution/count, and
created/updated timestamps.

### ReferenceAsset

Owner, object key, MIME/type metadata, dimensions, byte size, ordinal, upload
status, moderation status, and timestamps. Ordinal is stable within a submitted
batch and maps to `参考图 1…10`.

### GenerationJob

Durable execution record: idempotency key, owner, session/project, provider,
provider task ID, model/version, immutable input snapshot, state, progress,
attempt count, normalized error, submitted/started/completed timestamps.

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
- Batch order is submission order, newest first in UI.
- Asset aspect ratio and pixel dimensions are source data, not inferred from CSS.
- Deleting a project does not automatically delete globally retained assets.
- Object deletion is asynchronous and only occurs after authorization and
  reference checks.

## UI label mapping

Persist domain values (`1K`, `2K`, `4K`, raw ratio, model ID). Translate to UI
copy at the presentation boundary (`标准`, `高清`, `超清`). This keeps records
stable across localization and copy changes.
