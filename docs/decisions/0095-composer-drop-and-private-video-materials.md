# ADR 0095: Composer drop upload and private video materials

- Status: Accepted
- Date: 2026-09-23
- Task: GG-104

## Context

ADR 0094 added immediate image previews but the composer does not accept external file drops, does not check the upload size before staging a preview, and hides the upload error in a thumbnail title. The confirmed composer layout places the reference tray below the prompt and the image/video switch above it. Video references use session blob URLs only, so they cannot be reused after reload.

## Decision

- Put the reference tray above the prompt row and the image/video switch below it in both composers. Keep the tray outside the textarea and the parameters attached below the composer.
- Accept external image/video drops on the composer without conflicting with the existing image reorder gesture. Check file type and upload size before staging each file. Show an immediate local preview and a visible upload state or actionable failure; each file uploads independently.
- Keep validated image originals in the existing private material store with its 20 MiB per-file limit. The 10,000,000-byte model input limit in ADR 0094 remains a separate server-side derivative constraint.
- Add owner-scoped private video originals and a reusable listing. Validate declared and stored size/type before making a video ready. Do not send video references to the current text-only video generation preview.

## Consequences

Successful videos survive page reload and appear in the owner's uploaded materials and video picker. Failed/pending uploads remain visible only in the current composer session. Existing production records require no conversion; the new storage record is additive. Uploading large videos consumes private object storage and must remain bounded by size, signed URL expiry and owner checks.
