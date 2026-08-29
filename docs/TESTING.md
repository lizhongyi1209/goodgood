# Testing strategy

## Current baseline

The suite validates the production build, rendered metadata, shared UI
primitive behavior, documentation continuity, stable model/ratio mappings,
job-state transitions, and deterministic mock success/failure/retry behavior.
It does not yet prove durable API, queue, storage, ownership, or billing flows.

Use:

```bash
npm ci
npm run check:local
```

`check:local` is the cross-platform gate intended for local computers and
GitHub Actions. It runs lint, the full TypeScript check, the production build,
and automated tests. The existing Sites lifecycle scripts remain available for
the current hosted prototype.

The timestamped result of the latest verified gate belongs in
`IMPLEMENTATION_PLAN.md`, not in this stable strategy document.

## Required test layers

### Unit

- Model capability/label mapping.
- Ratio mode, official output dimensions, and resolution mapping.
- Eight-line textarea height calculation.
- Reference maximum, ordering, and validation.
- Job-state transition rules and normalized errors.
- Newest-first batch ordering.

### Component

- Empty creation state.
- Composer open/closed drawer without value loss.
- Reference tray from 0, 1, 9, 10, and over-limit inputs.
- Generation skeleton count and ratio.
- Inline failed batch preserves prompt/settings and retries.
- Project restore and `新建创作` behavior.
- Asset batch/gallery ratio rendering.
- Detail wheel, arrow keys, focus, and close restoration.

### API/integration

- Auth and ownership on every write/read.
- Signed upload lifecycle and invalid-file rejection.
- Idempotent generation creation.
- Provider timeout/rejection normalization.
- Callback verification and duplicate callback handling.
- Database transaction creates batch/job/assets consistently.
- Credit reservation, settlement, release, refund, and insufficient-credit
  paths are transactional and idempotent.
- Equivalent provider fallback preserves the selected GoodGood model and
  records every attempt.

### Local container integration

- A clean checkout starts the documented web, worker, PostgreSQL,
  Redis-compatible, object-storage, and mock-provider services.
- The production Linux image runs without source bind mounts or undeclared host
  dependencies.
- Migrations initialize an empty database and tolerate the documented rerun or
  recovery procedure.
- Killing a worker during a job does not lose the batch or charge twice.
- Duplicate queue delivery and duplicate completion callbacks have no adverse
  effect.
- Provider 500, rejection, malformed result, timeout, and unreachable states
  normalize to the documented recovery behavior.
- Object storage or database failure preserves enough durable evidence for
  reconciliation.

### Documentation continuity

- `AGENTS.md` and `docs/README.md` keep the current implementation plan
  discoverable.
- The plan retains a dated checkpoint, active phase, next action, blockers,
  milestones, and new-session recovery instructions.
- Every numbered ADR file is listed in `docs/decisions/README.md`.
- Automated structure checks do not replace the required human/agent review of
  whether the checkpoint and topic contracts are factually current.

### End to end

1. New user -> prompt -> one successful asset -> asset library.
2. Ten references -> submit -> success; eleventh is blocked.
3. Provider timeout -> inline error -> retry -> success.
4. Generate multiple ratios -> batch and gallery preserve geometry.
5. Save project -> clean start -> restore -> continue.
6. Open detail from creation and assets -> navigate -> download.

### Staging-only verification

- Public DNS, TLS, ESA routing, and health/readiness behavior.
- Signed reference upload and private asset delivery against the selected
  object-storage provider.
- Signed US gateway callback plus polling reconciliation when delivery is lost.
- Payment sandbox redirect/webhook and replay handling.
- Hong Kong-to-US provider latency and failure behavior.
- Mainland China Telecom, China Unicom, and China Mobile samples for API p50/p95,
  upload/download throughput, and error rate at representative peak times.
- PostgreSQL backup restoration and application rollback using the prior image.

## Release gate

- Dependency install is locked and reproducible.
- Lint, full TypeScript check, build, and automated tests pass.
- No secrets or real user assets in the diff.
- Database migrations are reviewed and have rollback/forward-fix notes.
- Staging checks use test accounts and test buckets.
- A smoke test passes after deployment before traffic switch.
- The exact revision-tagged production image has already passed the staging
  smoke test; production does not rebuild it.
- `IMPLEMENTATION_PLAN.md` records the completed slice, verification result,
  remaining debt, and next action.
