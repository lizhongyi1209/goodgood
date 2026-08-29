# Production implementation plan

- Last synchronized: 2026-08-30
- Current phase: M2 is ready to start
- Current objective: establish the production-shaped local Linux container
  foundation around the verified M1 domain seams

## Purpose and update contract

This is the single source of truth for delivery status, the active milestone,
the next smallest useful slice, and the latest verification result. Stable
product and engineering contracts remain in their topic documents and ADRs;
this file does not override them.

At the end of every code or infrastructure task, update this file in the same
change with:

1. the milestone status;
2. the completed slice and any newly discovered debt;
3. the exact verification performed and its result;
4. the next smallest useful slice or a concrete blocker.

Do not turn this file into a commit log. Git history owns detailed history;
this file owns the current handoff state.

## Current checkpoint

- The application is still an interactive frontend prototype. Generation now
  runs through typed in-memory repository/provider boundaries; projects,
  assets, and saves remain simulated in React memory.
- Authentication, durable persistence, object uploads, billing, the job queue,
  and the US generation API are not implemented.
- M1 extracted the composer, stable model/ratio/resolution contracts, immutable
  generation snapshots, auditable job-state transitions, UI mappings, and a
  deterministic mock repository/provider boundary. `app/page.tsx` still owns
  prototype project, asset, and view orchestration.
- All creation and asset imagery now uses the framework image boundary without
  lint suppressions. Provider marks come from LobeHub's peer-free static SVG
  distribution, so the unused LobeHub UI/Emoji peer chain is no longer part of
  the install graph.
- On 2026-08-30, `npm run check:local` passed on Windows with Node.js 24.12.0:
  all 13 tests passed, including model/ratio/job mapping, mock success/failure
  and retry, documentation continuity, render, and primitive checks. Lint and
  the full TypeScript check passed with no warnings or errors. A locked
  `npm ci --dry-run --ignore-scripts` also completed without dependency or peer
  warnings.
- Docker CLI 28.3.3 and Docker Compose 2.39.2 are installed on the primary
  Windows workstation. Docker Desktop's Linux engine was confirmed stopped on
  2026-08-30 and must be started before container verification. Its configured
  WSL data root is `E:\Docker\disk image\DockerDesktopWSL`; the Docker VHDX files used
  8.095 GiB there on 2026-08-29, while Docker's C-drive configuration/log files
  used 0.045 GiB. At that check, E had 178.21 GiB free and C had about 30.52 GiB
  free.
- No production Dockerfile, Compose stack, physical database schema, or
  production environment variables exist yet.
- Next action: begin M2 with one production Linux application image, explicit
  web and worker process commands, and health/readiness behavior before adding
  the Compose dependency stack.
- Blockers: no product or architecture blocker. Local container verification
  waits on starting Docker Desktop's Linux engine.

## Accepted delivery decisions

- Develop local-first, but introduce Linux containers during the first backend
  milestones rather than at the end.
- Keep one modular repository and one versioned application image initially.
  Run the web/API and queue worker as separate processes from that same image.
- Use PostgreSQL as authoritative state, Redis-compatible coordination for
  jobs, and S3-compatible object storage. State and secrets never live inside
  the application image.
- Support a mock generation adapter for deterministic local tests and a US
  gateway adapter for integration and staging.
- Build the production image once in CI, tag it with an immutable revision, and
  promote the same image through staging and production.
- A Hong Kong staging environment is mandatory before production. It verifies
  public callbacks, TLS/DNS/ESA, AWS permissions, object storage, backup and
  restore, cross-border behavior, and payment sandboxes that local tests cannot
  prove.
- Do not introduce Kubernetes or speculative microservices for the initial
  paid product.

## Milestones

| ID | Outcome | Status | Exit evidence |
| --- | --- | --- | --- |
| M0 | Decisions, delivery plan, continuity guard, and current baseline recorded | Completed | Topic docs and ADRs synchronized; documentation continuity is covered by an automated test; local quality gate passed on 2026-08-29 |
| M1 | Domain contracts and mocked boundaries extracted from the prototype | Completed | Composer and domain seams extracted; stable model/ratio/job mappings and mock repository/provider success, failure, and retry have unit tests; image/dependency warnings cleared; clean install check, lint, typecheck, build, and 13 tests passed on 2026-08-30 |
| M2 | Production-shaped local container foundation | Ready | Clean checkout starts web, worker, PostgreSQL, Redis, object storage, and mock generation with documented commands |
| M3 | Durable asynchronous generation vertical slice | Pending | One model and one image complete through API, job, queue, worker, storage, asset, polling, and inline failure recovery |
| M4 | Production identity, ownership, references, and projects persist safely | Pending | Auth and ownership tests cover every read/write; signed upload validation and project restore pass |
| M5 | US generation gateway integration and recovery | Pending | Scoped credentials, idempotency, signed callbacks/polling reconciliation, timeout, duplicate, restart, and partial-result cases pass |
| M6 | Versioned pricing, credit ledger, and payment sandbox | Pending | Reserve/settle/release/refund are transactional and idempotent; browser cannot authorize its own spend |
| M7 | Hong Kong staging | Pending | Versioned image deploys; public network, three-carrier sampling, storage, callbacks, migrations, backup restore, and smoke tests pass with test data |
| M8 | Paid production readiness | Pending | Security/compliance review, observability, rollback, retention, support IDs, and production release gate are complete |

Only mark a milestone `Completed` when its exit evidence exists. Use `Blocked`
only with a named external dependency or missing decision.

## First vertical slice contract

M3 intentionally starts narrow:

```text
prompt
  -> generation API with a server-owned test identity context
  -> GenerationBatch + GenerationJob transaction
  -> durable queue
  -> worker
  -> mock provider
  -> object storage
  -> Asset record
  -> browser polling
  -> creation stream and asset library
```

The first slice supports one test user, one model, one image, and success,
failure, and timeout outcomes. It must also tolerate duplicate submission,
duplicate delivery, worker restart, and repeated completion notification before
adding more models or payment complexity.

## Environment proof boundaries

| Prove locally | Prove in Hong Kong staging |
| --- | --- |
| Domain rules, migrations, queue consumers, storage contracts, provider mocks, retries, idempotency, ownership, ledger rules, UI states, production image startup | Public DNS/TLS, ESA behavior, AWS IAM, signed object URLs, public callbacks, US gateway connectivity, payment sandbox callbacks, resource limits, backup restore, and mainland carrier measurements |

Local success is necessary but never sufficient for a production release.

## New-session recovery

Every new human or agent session should:

1. read `AGENTS.md` and this file;
2. inspect `git status` and preserve existing work;
3. read the topic documents and accepted ADRs relevant to the active milestone;
4. inspect the implementation and tests rather than relying on this summary;
5. continue from the `Next action` in the current checkpoint unless a newer
   user decision changes it.
