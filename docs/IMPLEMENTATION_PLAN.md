# Production implementation plan

- Last synchronized: 2026-08-30
- Current phase: M3 is completed; M4 is next
- Current objective: replace the server-owned M3 test identity with an
  authenticated owner context and prove owner isolation before adding uploads

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

- M3 now completes the narrow production-shaped path from browser submission to
  idempotent Node API, PostgreSQL batch/job/outbox transaction, Valkey delivery,
  worker, authenticated HTTP mock provider, RustFS object write, Asset record,
  signed object read, browser polling, creation stream, and asset-library cue.
- The physical PostgreSQL schema covers the server-owned test user, generation
  batches, jobs, attempts, assets, append-only job events, and queue outbox. The
  versioned migration records a checksum and tolerates rerun; Compose runs it as
  an explicit one-shot release step before web and worker start.
- Submission idempotency is owner-scoped and rejects key reuse with a different
  payload. Outbox dispatch may duplicate safely. Worker leases, reconciliation,
  deterministic object keys, terminal guards, and unique asset/attempt indexes
  tolerate duplicate delivery and resume an interrupted provider task after a
  forced worker restart.
- The M3 mock provider exposes deterministic success, rejection, slow, and
  timeout outcomes. Provider responses are normalized before reaching the UI;
  inline failure preserves the immutable snapshot. Retry copies the failed
  snapshot server-side into a linked durable job rather than trusting changed
  browser values.
- M3 intentionally accepts only the local test identity, `nano-banana-2`, 4:5,
  2K, one image, and no references. The composer retains the confirmed product
  controls, but unsupported M3 combinations receive a local validation message.
- Projects, reference uploads, production users/authorization, most asset
  library state, and saves remain in React memory. Billing and the US generation
  gateway are not implemented.
- Web and worker readiness now check PostgreSQL, Valkey, the RustFS bucket, and
  mock-provider access. Liveness remains dependency-independent. The production
  Node server owns M3 TCP-backed API requests; the existing Cloudflare/Sites
  prototype cannot host this PostgreSQL/Valkey slice and is not M3 deployment
  evidence.
- The production image bundles the four Node runtime entry points with locked
  dependencies instead of copying the full root production graph. The final
  revision-labelled `goodgood:local` image is 91,162,899 bytes, runs as the
  non-root `node` user with a read-only root filesystem, and has no host mounts.
- On 2026-08-30, `npm run check:local` passed on Windows with Node.js 24.12.0:
  lint, full TypeScript check, production build, and 25 tests completed with 24
  passing and the opt-in Compose integration test skipped by design.
- The real Linux Compose stack reached healthy on temporary loopback ports.
  `npm run stack:verify` passed, and the opt-in M3 integration test passed its
  migration-rerun, success, signed asset read, idempotency conflict, duplicate
  delivery, provider rejection, retry, timeout, and forced worker-restart cases.
  Named test volumes remain available for continuity; they were not deleted.
- The existing Vinext 0.0.50 `image-size` 2.0.2 advisory remains. M3 ingests only
  the checked-in trusted mock image and validates content type/size; a tested
  Vinext upgrade plus runtime-image scan is still required before untrusted
  uploads or staging.
- Next action: begin M4 with an authenticated identity adapter and owner-scoped
  generation/asset read-write tests, replacing the fixed test-user context
  before adding signed reference uploads or durable projects.
- Blockers: none for the next identity-boundary slice. Production identity
  provider selection must be recorded before M4 can be completed.

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
| M3 | Durable asynchronous generation vertical slice | Completed | One model and one image pass API, PostgreSQL/outbox, Valkey, worker restart, mock provider, RustFS, Asset, polling, inline failure/retry, duplicate, and timeout tests on 2026-08-30 |
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
