# ADR 0104: Inspiration feature retirement and table drop

- Status: Accepted for GG-117 documentation; production execution requires separate authorization
- Date: 2026-09-25
- Task: GG-117
- Retires: ADR 0076, ADR 0077, ADR 0078
- Relates to: ADR 0103 (generated asset hard delete)

## Context

GG-073 through GG-077 built the 灵感板: an authenticated directory where a user
could publish one of their own accepted generated images as a case, and other
active users could browse, like, replicate and reuse it. ADR 0076 defined
publication, ADR 0077 the dedicated editor and private prompt presets, and
ADR 0078 the visibility tiers and view/use statistics.

On 2026-09-25 the operator directed that the board be taken down and its tables
dropped, to be rebuilt later rather than migrated. The feature is retired, not
converted: no case is carried into a successor model and no compatibility
surface is preserved.

ADR 0103 hard-deleted one generated asset and returned HTTP 409
`ASSET_PUBLISHED` when an active case referenced it. That check depended on
`inspiration_cases` existing, so dropping the table without removing the check
would turn a designed conflict into a runtime SQL error.

## Decision

- The feature is removed outright. `app/inspiration/`, `app/api/inspiration/`,
  `features/inspiration/`, `server/inspiration/`, `shared/contracts/inspiration.mjs`,
  the navigation entries and the `app/page.tsx` call sites all go, and the
  inspiration test files go with them.
- Five tables are dropped, children before parents so no foreign key is left
  dangling: `inspiration_interactions`, `inspiration_generation_prompts`,
  `inspiration_likes`, `inspiration_events`, then `inspiration_cases`.
  `inspiration_cases` itself references `assets(id)`, `reference_assets(id)` and
  `users(id)`. The four child tables hold no foreign keys among themselves, so
  their relative order carries no meaning; the order above is the one written in
  `migrations/0047_gg117_drop_inspiration.sql` and the migration governs if the
  two ever disagree.
- Published cases are discarded. There is no export, no archival table and no
  backfill; the migration is one-way and destructive on the rows it drops.
- The `ASSET_PUBLISHED` check in `deleteGeneratedAsset` and its test are removed
  in this same change. After the drop no inbound reference from a publication
  can block asset deletion, so `server/assets/api.mjs` deletes the
  `asset_organization` row and then the `assets` row without a publication
  probe. ADR 0103's decision to retain the owning job, batch and credit ledger
  entries is unchanged; only its publication conflict is retired with the
  feature.
- Migrations `0036_gg073_inspiration_cases.sql`,
  `0037_gg074_inspiration_presets.sql` and
  `0038_gg077_inspiration_visibility_statistics.sql` remain in the repository
  as the immutable record of what existed. The new drop migration supersedes
  them forward; they are not edited or deleted.
- Local implementation is not production execution. Applying the drop to any
  live database destroys real user publications and needs its own explicit
  operator authorization.

## Consequences

Anyone who published a case loses it permanently, including the before/after
pairing and the author snapshot. The board's routes stop resolving, so the
sidebar entry, the mobile bar entry and the image-detail 发布灵感案例 control are
removed rather than left to 404. Retaining the `assets`, `generation_jobs` and
`credit_ledger` rows means the underlying images and their billing history
survive the drop; only the publication layer disappears.

ADR 0076, ADR 0077 and ADR 0078 are retired by this decision and are marked so
in place, with their text left intact as history. Rebuilding a shareable
inspiration capability later starts from a new ADR rather than by reviving
these.
