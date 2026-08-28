# ADR 0003: Session, batch, asset, and project are distinct

- Status: Accepted
- Date: 2026-08-27

## Context

Users generate repeatedly around one visual goal. A flat generation history
cannot preserve creative continuity, while a parameter-heavy asset view obscures
the images users need to select.

## Decision

Creation is a continuous session, each submission is a batch, each image is an
asset, and a project is a resumable saved context. Completed assets enter the
library automatically. Projects can be restored and always allow a clean start.

## Consequences

- Database and URLs need separate stable IDs for all four concepts.
- Asset library offers batch and image-focused gallery modes.
- Project save/restore includes state, not just an image folder.
