# ADR 0037: Treat validated uploads as reusable reference materials

- Status: Accepted
- Date: 2026-09-08
- Refines: ADR 0003, ADR 0022, and ADR 0026
- Related task: GG-017

## Context

GoodGood already uploads reference images to private object storage and records
owner-scoped `ReferenceAsset` rows. Those records are currently only reachable
through a draft, project, or generation snapshot. The asset library lists only
generated outputs, so a creator must upload the same source again when starting
another creation. In addition, the existing cleanup policy may delete a ready
upload after 30 days when it is not referenced by a retained snapshot.

This makes durable upload storage invisible to the creator and unnecessarily
reduces the reuse value of their material.

## Decision

- Every successfully decoded, accepted reference upload is an owner-scoped,
  reusable material. It appears in the asset library independently of whether a
  draft, project, or generation currently references it.
- The asset library keeps generated images and uploaded materials as distinct
  product types. The existing batch/gallery views apply to generated images;
  the material view lists accepted reference uploads newest first.
- The creation composer offers both local upload and selection from the owner's
  existing materials. Reusing a material adds its stable reference ID to the
  ordered tray and does not upload the bytes again.
- A tray still contains at most 10 references. Selecting an ID already present
  is idempotent, and selection order is preserved for newly added materials.
- Ready, accepted material objects are retained until an explicit owner deletion
  workflow exists. Reference cleanup is limited to incomplete, rejected, or
  expired upload attempts. Previously staged `REFERENCE_ORPHANED` rows whose
  objects have not yet been deleted are restored to ready state.
- Material list and read URLs remain authenticated and owner scoped. The API
  signs private objects on read; credentials and raw object keys are not exposed.

## Consequences

- Creators can upload a source once and reuse it across creations and projects.
- Generated assets and user-uploaded materials can evolve separately without
  overloading generated-output detail routes or metadata.
- Accepted uploads now consume storage until a later explicit deletion feature;
  storage reporting and deletion controls are intentionally outside this slice.
- Content-level duplicate detection is not added. This change prevents repeated
  uploads through reuse by ID, but a creator may still deliberately upload the
  same bytes as a new material.
- No schema migration is required because `ReferenceAsset` already contains the
  required owner, object, validation, name, dimensions, and timestamp evidence.

