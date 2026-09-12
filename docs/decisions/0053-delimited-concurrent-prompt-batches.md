# ADR 0053 — Delimited concurrent prompt batches

- Status: Accepted
- Date: 2026-09-13
- Task: GG-040

## Decision

An exact `---` line (optional spaces/tabs around it) separates concurrent
prompts in both creation modes. Inline hyphens and longer rules remain literal.
Trim segments, ignore empty segments, preserve duplicate prompts and order;
an all-empty input submits nothing. No separate mode switch is required.
Every segment shares the frozen selected parameters/references. Total output
count is nonempty prompt count × selected 1/2/4 count. Image requests retain
one durable job per segment with its existing multi-output count; local video
requests fan out to one request per output. Failure/retry stays segment-local.

The composer shows a quiet batch summary when a separator exists and the image
quote multiplies the authoritative per-segment quote, without changing prices
or server-owned reservations. Acceptance is per job, not one atomic batch-wide
reservation; siblings may succeed when another fails or credit runs out.
The image composer/draft/project retains the full source prompt. A validated
optional composerPrompt updates project context only; asset/job/provider prompt
remains the individual segment. Existing 4000-character image composer/draft/
project limits remain, and no database migration is needed.
Segment retry retains a current delimited project context when it contains the
frozen segment; it never retries other segments or sends the context to a model.

## Boundaries

This expands the single-prompt-per-click decision in UX flows and ADR 0052.
Video remains the default-off, text-only local GG-036 boundary; no pricing,
durable media, real-provider test, production deployment or concurrency ceiling
is introduced. Tests use stubs only. More outputs can incur more charges.
