# ADR 0034: Stable generation slots and explicit local download

- Status: Accepted
- Date: 2026-09-08
- Supersedes: the separate active-task/completed-masonry presentation rule in ADR 0031 and `UX_FLOWS.md`
- Refines: ADR 0001, ADR 0003, ADR 0027, and ADR 0031
- Related task: GG-013

## Context

The creation stream currently renders active skeletons in a separate masonry
frame above completed images. A multi-image request therefore leaves unused
columns while it runs, then moves every completed result into another frame and
redistributes the gallery. The final state is acceptable, but the transition is
spatially unstable and makes comparison harder.

Creation-card download links also point directly at private signed object URLs.
Browsers may ignore the cross-origin `download` attribute and open the image in
a new tab. The card duplicates an asset-library bookmark even though successful
generation outputs already enter the asset library automatically.

## Decision

- Active skeletons and completed creation images share one masonry stream.
- Each client generation run creates its final number of ratio-correct slots at
  submission time. A successful output replaces the corresponding slot without
  changing its key, column, or relative submission order.
- Completed batches represented by a live client run are excluded from the
  durable-history portion of the same stream so success cannot render twice.
  Refresh may rebuild the same view from durable batches without preserving
  transient client keys.
- A failed run leaves the grid and uses the existing single inline recovery
  strip. Retrying that run restores its slots at the run's existing position.
- Creation-card hover metadata shows decoded pixel dimensions only. A legacy
  asset without decoded dimensions uses the selected model's exact product size
  table as a fallback.
- The creation-card bookmark is removed. Asset-library selection and detail
  actions are unchanged.
- A user-initiated download uses the native file save picker when supported.
  Otherwise the browser fetches the signed image into a Blob and downloads an
  object URL. Direct navigation to the private image URL is not a download path.

## Consequences

- Parallel jobs may complete out of order without moving earlier or later
  submissions, and the loading silhouette matches the final image layout.
- The client retains terminal successful runs for the current in-memory
  creation session so stable slot identity survives completion; durable jobs
  remain the source of truth after refresh or project restore.
- The fallback cannot force a save dialog when a browser is configured for
  automatic downloads, but it still downloads without opening an image tab.
- This ADR authorizes local implementation and verification only. Production
  deployment and any real billable provider test require separate approval.
