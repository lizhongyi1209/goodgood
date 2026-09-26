# ADR 0107: Asset selection actions and tag retirement

- Status: Accepted for GG-121 local correction
- Date: 2026-09-26
- Task: GG-121
- Supersedes: ADR 0102's user-facing tag feature and ADR 0106's selection toolbar composition; makes a narrow destructive-action exception to ADR 0105.

## Context

After reviewing the first unified asset page, the operator removed the tag
feature and specified a simpler selection toolbar based on the supplied asset
reference: download, move, and delete, without a More action. The delete action
must have a red background with white icon and text. The operator explicitly
confirmed that deletion must permanently remove uploaded images, videos, and
audio as well as generated images.

## Decision

- Remove tag editing, upload tag input, and tag search from the asset interface.
  Existing tag metadata remains stored and readable for compatibility; this
  correction does not erase data or require a migration. Folder movement keeps
  any existing tag metadata intact.
- The selected-file toolbar presents count, Download, Move, Delete, and a close
  control in that order. The single-file `用于创作` action remains in the file's
  own menu. The toolbar has no More action.
- Use a red fill and white icon/text for the selected-file Delete action. This
  explicit destructive-action exception is limited to this control; other
  interface palette decisions in ADR 0105 remain in force.
- Keep an explicit confirmation before permanent deletion, including the
  existing non-refund notice when generated images are selected. Generated
  images retain their own endpoint. Uploaded files use a new owner/workspace
  scoped deletion boundary, clear folder metadata, and remove stored bytes.
  Reference rows stay as inaccessible tombstones because other records can
  retain foreign keys to them; video/audio rows are removed. Database changes
  commit before object deletion to avoid a visible row pointing at missing
  bytes. A storage failure is reported as incomplete and needs cleanup; the UI
  refreshes even after that error so the removed row does not remain selectable.

## Consequences

The asset page no longer offers a way to create or search tags. Stored tags
remain untouched until a separate data-retention decision. Uploaded deletion
does not require a schema migration, but existing project/profile references to
deleted material can no longer read its bytes. The operator will manually
inspect the updated browser UI; no production release is implied.
