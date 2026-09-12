# ADR 0052 — Video counts and concurrent independent runs

- Status: Accepted
- Date: 2026-09-13
- Task: GG-039

## Context

The owner requests video output counts 1/2/4 and concurrency. GG-036's local
page-smoke boundary previously blocked another submission while one task ran.
The provider transport accepts one task per request, not a native count field.

## Decision

Video count defaults to 1 and is selected in the output parameter group.
Every click freezes current inputs and allocates 1/2/4 independent ordered slots,
then starts all requests concurrently. New batches remain possible while earlier
ones run. Results and failures update only their own slots. There is no product
concurrent-run ceiling. Never automatically repeat an uncertain POST.
Polling interruption retains the known task ID and supports query-only recovery.

## Consequences

This supersedes ADR 0050's single-active-task limitation only; its loopback,
explicit credentials, default/production-off, text-only and no persistence/
billing restrictions remain. More outputs can incur more provider charges;
tests use stubs and do not create billable tasks. Video count is session-only,
separate from image count and provider model capabilities. Durable mixed-media
projects/assets/billing remain outside this slice.
