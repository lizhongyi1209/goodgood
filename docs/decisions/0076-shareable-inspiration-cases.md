# ADR 0076: Shareable image effect cases

- Status: Accepted
- Task: GG-073
- Date: 2026-09-14

## Context

The owner requests shareable before/after examples with immutable prompt and
parameters, reusable effects, likes and owner deletion in the inspiration board.
This extends ADR0075's private-only works boundary for explicitly published cases.

## Decision

Add /inspiration in the existing shell with an image-first case directory and
detail Sheet. Active users can publish their own accepted personal generated
image from image detail, with title/description and an optional selected original
reference from that generation. Text-to-image cases may have no before image.
Publication preview clearly shows shared images, prompt/parameters and author
display name/@handle/avatar; publication consent covers only this selected case.
Snapshot author presentation on publish without email/provider identity. Other
profile details and unselected references remain private. No public profile URL.

Only authenticated active users browse/read signed media. Persist source IDs and
immutable prompt/model/line/resolution/ratio/quality/output options and original
reference count server-side, never trust browser-supplied generated metadata.
Publish is idempotent per owner/asset. Saved cases protect original references
under the existing reference lifecycle lock. Future asset removal must preserve
or intentionally withdraw any linked publication before deleting its bytes.

Use loads prompt and parameters into personal creation with no original reference
IDs or signatures, no project linkage, no historical price version and count1.
User replaces references and confirms current model/price before generating.
Existing unsaved changes and active jobs retain their recovery/confirmation flow.
Unavailable historical models remain explicit and can be changed in settings.

Likes use unique case/user rows and explicit desired boolean, avoiding double
toggle on retries. Authors can withdraw their own cases; site owners can soft
delete any case with an audit event. Withdrawal removes directory/detail/media
access and future likes/uses without touching source assets, jobs or billing.
Author withdrawal allows a fresh publication; owner-removed sources cannot be
immediately republished to bypass removal. Withdrawal retries are idempotent.
Do not implement friends, followers, public profiles, reports or social feeds.

## Consequences

Adds cases/likes/events persistence and private authenticated shared-read APIs.
Explicit publication is separate from private works and profile visibility.
Local implementation only; no production publication, deployment or paid call.
