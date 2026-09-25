# ADR 0103: Hard delete for generated assets

- Status: Accepted for GG-116 local implementation
- Date: 2026-09-25
- Task: GG-116
- Relates to: ADR 0102 (asset history grouped by date), ADR 0076 (inspiration cases), ADR 0104 (inspiration retirement)

## Context

ADR 0102 grouped `/assets` generation history by calendar date and rendered a
named card per output. The operator asked for the history to show the image
alone — no name, no timestamp, no date headings — ordered newest first, with
download, delete, and enlarge actions revealed on hover.

Enlarge reuses the existing focused image detail view. Download reuses
`saveImageToLocal`. Delete has no prior implementation: `server/assets/api.mjs`
exposed only `listAssets`, `getAssetDownloadUrl`, and `readAssetPreview`, and the
`assets` table carries three `ON DELETE RESTRICT` inbound foreign keys
(`owner_id`, `batch_id`, `job_id`); `inspiration_cases.source_asset_id` was a
fourth at the time. The operator chose hard delete and per-image granularity.

## Decision

- History renders one flat grid of images with no card caption and no date
  grouping. `createdAt` continues to drive ordering only; it is not rendered.
  Losing the caption also loses the only distinct `alt` text, so the alternative
  text becomes neutral rather than the synthesized `生成图片 {batch} · {n}`.
- Delete is a hard delete of one generated asset. In a single transaction the
  API deletes the `asset_organization` row (the table has no foreign key to
  `assets` and would otherwise orphan folder counts and tags) and then the
  `assets` row. The storage object is deleted after the transaction commits, so
  a database failure cannot leave a row pointing at missing bytes.
- The owning `generation_jobs` and `generation_batches` rows are **retained**.
  Job deletion would drag in `generation_job_events` and the settled
  `credit_ledger` entries that record what the operator was charged. Deleting one
  image therefore does not refund credits, and a batch may show fewer surviving
  outputs than its recorded `count`. This is accepted: the action means "delete
  this image", not "delete this generation".
- `inspiration_cases.source_asset_id` referenced `assets(id)` with no cascade and
  soft-deleted rows rather than removing them, so a published case genuinely
  blocked the row delete. The API detected this and returned HTTP 409 with a
  message telling the operator to remove the case first. It never silently
  deleted published content, and it never removed the asset while leaving the
  case dangling. **Retired by ADR 0104**: the feature and all five inspiration
  tables were dropped, so no publication can block a delete any more. The
  `ASSET_PUBLISHED` probe and its test were removed in the same change as the
  table drop; deletion now proceeds directly to the organization and asset rows.
- Authorization reuses the existing owner/workspace resolution. The delete
  lookup mirrors `findOwnerAsset`'s ownership and workspace predicates but does
  not require `j.state = 'succeeded'` or `a.moderation_state = 'accepted'`, so a
  rejected or otherwise unlisted output the operator can still see in history
  remains deletable.
- Retiring the inspiration feature and dropping its tables was originally
  deferred as a separate, destructive task. It has since been executed under
  ADR 0104 / GG-117, which removes the `ASSET_PUBLISHED` behavior recorded
  above; see that decision for the five dropped tables and the child-first
  order.

## Consequences

Deleting is irreversible from the operator's side: bytes are removed from
object storage and no tombstone is written, so the image cannot be restored
after confirmation. Because jobs and batches are kept, `listAssets` continues to
return the batch and the gallery shows the remaining outputs; the UI must
therefore remove the deleted image from client state and re-read the library
rather than assume the batch disappears.

`inspiration_cases` used to prevent deleting any asset that was published as a
case, returning a 409 rather than succeeding. ADR 0104 removed that feature and
its tables, and the check went with them, so deletion is now never blocked by a
publication. The conflict error code no longer exists in `server/assets/api.mjs`.
