# ADR 0034: Stable generation slots and explicit local download

- Status: Accepted (download path amended twice on 2026-09-08)
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
- A user-initiated download first requests a fresh, owner-authorized signed read
  URL for the stable Asset ID. The browser then fetches and validates the
  complete image directly from private object storage before handing a Blob
  object URL to its download manager. The object URL remains valid until after
  the browser has accepted the download. A preview URL retained in page state,
  direct navigation to a private image URL, and direct File System Access API
  writes are not download paths.

## Consequences

- Parallel jobs may complete out of order without moving earlier or later
  submissions, and the loading silhouette matches the final image layout.
- The client retains terminal successful runs for the current in-memory
  creation session so stable slot identity survives completion; durable jobs
  remain the source of truth after refresh or project restore.
- Whether a save dialog appears follows the browser's download preference, but
  the flow still downloads without opening an image tab. Because no destination
  file is opened before the signed image has been read and validated, a network
  or validation failure cannot leave a pre-created zero-byte target file.
- This amends the original native-picker preference after repeated real Chrome
  on Windows checks created a destination file before a later failure and left
  a zero-byte artifact, even after cross-origin reads and committed-size checks
  had been added.
- A second real-browser diagnosis found that the visible preview could remain in
  Chrome's cache after its 15-minute signed URL expired. Download must therefore
  resolve a new URL by Asset ID at click time instead of reusing the preview URL.
  The GoodGood API returns only that short-lived URL; large image bytes still
  travel directly from object storage to the browser.
- This ADR authorizes local implementation and verification only. Production
  deployment and any real billable provider test require separate approval.
