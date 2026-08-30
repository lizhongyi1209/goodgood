# Production implementation plan

- Last synchronized: 2026-08-30
- Current phase: M2 is completed; M3 is next
- Current objective: begin the durable asynchronous generation slice with a
  physical PostgreSQL schema and rerunnable migration

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
  all 21 tests passed, including M1 domain/mock coverage, web/worker/mock health,
  invalid runtime configuration, container process and Compose contracts,
  host-probe success/failure behavior, documentation continuity, render, and
  primitive checks. Lint and the full TypeScript check passed with no errors. A
  locked `npm ci --dry-run --ignore-scripts` also completed without dependency
  or peer warnings after Linux normalized the cross-platform lockfile.
- Docker CLI 28.3.3, Docker Compose 2.39.2, and Docker Desktop's Linux engine
  completed the M2 image build and smoke test on 2026-08-30. Its configured WSL
  data root remains `E:\Docker\disk image\DockerDesktopWSL`.
- M2 has one multi-stage production `Dockerfile` for all application roles. It
  copies Vinext's traced standalone runtime into the final non-root image,
  embeds a revision label, excludes local state and secrets from the build
  context, and requires no source bind mount.
- `npm run start:web` serves the compiled application and `npm run
  start:worker` starts an independently restartable worker runtime shell.
  `npm run start:mock-generation` starts the local mock-provider runtime shell.
  All handle container termination and become unready before shutdown.
- Web, worker, and mock liveness/readiness endpoints are separate and covered
  by tests. Readiness intentionally proves runtime bootstrap only; dependency
  checks enter with the M3 persistence, queue, storage, and provider adapters.
- The Linux build produced the revision-labelled `goodgood:m2-local` image from
  a clean `npm ci`. Web and worker containers both became `healthy`, returned
  the documented liveness/readiness payloads, ran as UID 1000 with no host
  mounts, and shut down on `SIGTERM`. The standalone image was 89,769,267 bytes.
- `compose.yaml` now starts web, worker, mock generation, PostgreSQL 17.11,
  Valkey 8.1.9, and RustFS 1.0.0-rc.3. Third-party images are pinned by exact
  tag and digest; all host ports are loopback-only; PostgreSQL, Valkey, and
  object storage use named volumes; application roles run read-only as UID
  1000 with no mounts.
- The real six-service stack reached `healthy` through `docker compose up
  --detach --wait`. `npm run stack:verify` reached all six host endpoints using
  temporary port overrides because port 3000 was already occupied, PostgreSQL
  returned the expected database, and a Valkey marker survived forced container
  replacement. The test containers, network, and named volumes were removed
  after verification; downloaded images remain cached locally.
- A registry audit exposed existing framework dependency advisories. Most of
  the root graph is build-only in the standalone image, but Vinext 0.0.50 still
  packages the vulnerable `image-size` 2.0.2 parser and no patched 2.x release
  exists. M2 uses only trusted built-in images; resolve this through a tested
  Vinext upgrade and add a runtime-image scan before accepting untrusted image
  processing or staging.
- No physical database schema or migration, persistence adapter, queue
  consumer, object-storage adapter, or functional mock-provider HTTP contract
  exists yet.
- Next action: start M3 with a versioned, rerunnable PostgreSQL migration for
  the server-owned test identity plus generation batch, job, attempt, and asset
  records, then test initialization against the Compose database. Keep queue,
  storage, and provider behavior out of that schema-only slice.
- Blockers: none.

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
| M2 | Production-shaped local container foundation | Completed | One pinned Compose stack starts healthy web, worker, PostgreSQL, Valkey, RustFS, and mock generation with documented commands; host probes and named-volume persistence passed on 2026-08-30 |
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
