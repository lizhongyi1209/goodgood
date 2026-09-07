# ADR 0031: Allow repeated parallel generation submissions

- Status: Accepted
- Date: 2026-09-08
- Refines: ADR 0003, ADR 0004, and ADR 0008
- Related task: GG-008

## Context

GoodGood already creates one durable batch and one independently billed job for
each generation request. The worker accepts separate jobs concurrently without a
fixed product count ceiling. The creation client nevertheless retains only one
observed job and disables the Feihong send action while that job is active. A
creator therefore cannot submit the next image promptly, and merely enabling the
button would let a later observation overwrite the earlier job's loading or
failure state.

The operator requires rapid repeated submission with no product-side concurrency
limit. The current one-image-per-request and 10-credit reservation remain in
force; this decision does not turn one click into a multi-output request.

## Decision

- Keep the Feihong send action available while other generation jobs are active.
- Freeze prompt, ordered references, model, ratio, resolution, and count for each
  click, then create a separate client run and durable backend job.
- Track active and failed runs independently. A pending client ID may be replaced
  by the durable server job ID without changing the run's identity or position.
- Render every active run's ratio-correct placeholder and every failed run's own
  recovery strip. Completion order must not erase or reorder newer submissions.
- Do not impose a client, API, queue, per-user, or worker concurrent-job count
  ceiling. Existing host admission protection and per-job credit reservation may
  still reject an individual request.
- `重新生成` retries only the selected failed immutable snapshot and remains guarded
  against duplicate activation. `修改设置` restores only that failed run's values.
- Destructive new-session and project-switch actions remain blocked while any
  run is active, so in-flight work stays attached to its current creative context.

## Consequences

- Creators can click repeatedly and continue editing the composer while prior
  requests render. Each accepted click can reserve and spend another 10 credits.
- Frontend state becomes a run registry instead of one mutable job slot. This
  preserves loading, errors, retry targets, project association, and credit
  refresh for overlapping jobs.
- Resource admission is still governed by the existing memory/disk fail-closed
  protection. Adding abuse or fairness limits later requires a separate product
  decision with explicit user-visible behavior.
- This ADR authorizes local implementation and verification only. Production
  deployment remains a separate owner-approved state.
