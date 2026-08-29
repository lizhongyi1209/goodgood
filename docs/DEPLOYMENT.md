# Development and deployment

## Environments

| Environment | Purpose | Data |
| --- | --- | --- |
| Local | Feature development and API contract tests | Local/test only |
| Staging | Real network, storage, callback, and migration verification | Isolated test data |
| Production | Customer traffic | Production data |

Never use production credentials in local `.env` files or browser bundles.

Local proves application behavior and container compatibility. Staging is a
required delivery stage, not an optional preview: public DNS/TLS, ESA, AWS
permissions, signed storage, callbacks, cross-border paths, payment sandboxes,
resource limits, and backup restore cannot be accepted from local evidence.

## Local workflow

1. Clone the private/approved GitHub repository.
2. Install Node.js `>=22.13.0` and run `npm ci`.
3. Create `.env.local` from `.env.example` when integrations are introduced.
4. Run `npm run dev:local`.
5. Before pushing, run `npm run check:local`.

The current prototype needs no model or database credentials. Windows users may
run the cross-platform local scripts directly; the original Sites lifecycle
scripts require a Linux shell.

## Local production-shaped runtime

Introduce Docker during the first backend milestones rather than packaging only
after feature completion. Windows development uses Docker Desktop's Linux
engine. The target local stack is:

| Service | Local responsibility | Production direction |
| --- | --- | --- |
| `web` | UI and authenticated API | Hong Kong application process |
| `worker` | Queue consumption and generation orchestration | Independently restartable/scalable worker process |
| PostgreSQL | Domain, job, and ledger persistence | Durable database with automated backups |
| Redis-compatible service | Queue/job coordination | Recoverable coordination; PostgreSQL remains authoritative |
| S3-compatible object storage | References and generated asset tests | Private object storage with signed direct transfer |
| Mock generation service | Deterministic success/failure/timeout tests | Replaced by scoped US generation gateway adapter |

Use one application image for `web` and `worker` initially, with different
commands. Keep state, uploads, logs, and secrets outside the image. A clean
checkout must be able to start the documented local stack without relying on
undeclared software or production credentials.

## Source and release flow

```text
feature branch -> pull request -> CI -> staging deploy -> smoke test
               -> approved main -> production deploy -> health check
```

Do not build production artifacts manually on the production server. CI should
produce a versioned artifact or container image; the server pulls that exact
version.

Build the Linux image once, tag it with an immutable source revision, and
promote the same digest from CI to staging and production. Do not use `latest`
as a production release identity. Database migrations run as an explicit
release step, not implicitly and concurrently in every app replica.

## Early infrastructure direction

- Edge: Alibaba Cloud ESA.
- Application/control plane: Hong Kong AWS/Lightsail initially.
- Generation plane: existing US OVH server.
- Images: direct object storage delivery (Tencent COS or the finalized provider).
- Database/queue: PostgreSQL plus Redis-compatible durable job coordination.

A 2 vCPU / 4 GB Lightsail instance is acceptable for early control-plane tests
only when builds run in CI and image bytes bypass it. Attach a static IP from
day one.

The first Hong Kong purchase is a month-to-month staging environment with test
accounts, test buckets, and test payment credentials. Do not purchase long-term
production capacity until the staging gate has measured mainland carrier access
and Hong Kong-to-US behavior. An all-in-one Compose host is acceptable for
staging test data; paid production must meet the durability, backup, and
recovery contracts below.

## Staging purchase gate

Create the first Hong Kong staging environment only after:

- a clean local checkout starts the documented container stack;
- migrations build an empty database and can be rerun safely;
- the narrow async generation slice passes success, failure, timeout,
  duplicate, and restart tests;
- the production Linux image starts with health and readiness checks;
- CI verifies and publishes a revision-tagged image without embedded secrets;
- environment variables and recovery commands are documented.

## Zero/low-downtime deployment

1. Build and test before touching the running instance.
2. Start the new version on a separate container/port.
3. Run health/readiness checks and compatible migrations.
4. Switch the reverse proxy to the healthy version.
5. Keep the prior version available for rollback.
6. Observe errors, queue latency, and database health before cleanup.

For a Lightsail size upgrade: snapshot, create a larger instance, validate, stop
writes briefly if the database is local, move the static IP, verify, and retain
the old instance temporarily.

## Backups and rollback

- Automated PostgreSQL backups plus tested restore procedure.
- Object storage versioning/lifecycle policy where cost permits.
- Migration backup before destructive changes.
- Keep application rollback independent of irreversible schema rollback; prefer
  additive migrations and forward fixes.
- Record deployed commit, migration version, and runtime configuration version.

## Observability

Minimum production signals:

- HTTP error rate and p95 latency.
- Generation queue depth, age, success rate, provider latency, and cost.
- Callback failures and duplicate events.
- Database connections/storage and Redis memory.
- Object upload/download failures and ESA cache/origin metrics.
- Structured logs correlated by request ID, job ID, user ID, and provider task ID.
