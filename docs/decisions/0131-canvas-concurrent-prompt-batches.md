# ADR 0131: Concurrent prompt batches inside canvas image generators

- Status: Accepted for GG-303 source implementation
- Date: 2026-10-02
- Task: GG-303

## Decision

GG-321/ADR0134 supersedes the per-segment multi-image job and compacted-output
presentation below for newly submitted canvas batches: each requested image has
an independent count1 job and a stable result slot, including failed positions.
The original grouping/order/no-automatic-resubmission rules still apply; legacy
multi-image jobs remain readable and individually retryable through slots.

After composing connected text in edge order and the generator's own prompt,
split on a standalone line of exactly `---`, `———` or `－－－`, allowing surrounding
whitespace. Inline hyphens and longer rules remain literal. Normalize line
endings, trim segments, ignore empty segments, retain duplicate prompts and
source order. Native text-editor horizontal rules contribute an explicit `---`
line to the plain-text output. No generation happens without the user's action.

Freeze model, references and selected settings once, then submit one independent
durable image job per nonempty segment concurrently. Each job keeps the selected
image count: total images = segment count × selected count. Multiply the existing
authoritative per-job quote by segment count; prices and independent server-owned
reservations remain unchanged. Acceptance is per job, so partial acceptance and
completion are valid. Do not impose a batch size, total-image or concurrency cap.
Provider/request limits and reference/count choices remain existing boundaries.
For canvas batches the existing 4000-character API limit is evaluated per segment,
superseding ADR0124's combined-source gate; store the full source draft within the
existing 1 MiB project-document envelope, without a new prompt-storage ceiling.
This does not reactivate withdrawn ADR0128/GG-292.

Keep jobs ordered by prompt inside the existing generator node and aggregate
successful outputs in that order, regardless of completion order. Completed
siblings remain usable while others run or fail. Retry only the chosen failed
segment with its frozen input; keep all siblings. Editing/submission locks cover
the whole active batch. Copy, private image reads, crop and reference reuse retain
the job owning each actual output.

Persist ordered jobIds in the existing schemaVersion1/2 JSON graph and check all
new job identities against the same owner/workspace authorization. Legacy jobId
documents remain readable. Local recovery also retains ordered job snapshots;
strip them and unaccepted temporary IDs from cloud writes. Resume accepted active
jobs independently after reload/online; do not automatically resubmit an unknown
submission. No new database schema, provider endpoint or synthetic aggregate job.

## Boundaries

This extends ADR0053's concurrency semantics to canvas image generators, without
changing gallery creation or video separators. Relevant source and regression
tests are edited only. Per the user's standing request, no compilation, checks,
provider requests or browser acceptance run. New cloud validation needs a later
explicitly delegated Web build/activation; current runtime and production remain.
