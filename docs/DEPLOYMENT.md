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
3. Create `.env.local` from `.env.example` when direct Node integrations are
   introduced. Compose overrides may instead use shell environment variables
   or an ignored `.env` file.
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

### Complete Compose stack

The checked-in `compose.yaml` pins every third-party image by exact tag and
multi-platform digest. It uses PostgreSQL 17.11, Valkey 8.1.9, and RustFS
1.0.0-rc.3. Application traffic uses service DNS on the Compose bridge; every
host publication is loopback-only.

| Service | Default host port | Persistent state |
| --- | ---: | --- |
| `web` | `127.0.0.1:3000` | None |
| `worker` health | `127.0.0.1:3001` | None |
| `mock-generation` health | `127.0.0.1:3002` | None |
| `postgres` | `127.0.0.1:5432` | `postgres-data` |
| `valkey` | `127.0.0.1:6379` | `valkey-data` |
| `object-storage` API / console | `127.0.0.1:9000` / `9001` | `object-storage-data` |

```bash
npm run stack:config
npm run stack:up
npm run stack:verify
npm run stack:down
```

The defaults in `compose.yaml` are explicitly local-only credentials. Override
their documented names through the shell or an untracked `.env`; never reuse
them outside local development. Port names are also overridable, which avoids
stopping an unrelated local service when a default is occupied.

`stack:down` removes containers and the bridge while preserving named volumes.
`docker compose down --volumes` removes local database, queue, and object data
and is therefore the intentional destructive reset. The application roles run
read-only as UID 1000 with only a temporary `/tmp` filesystem and no source bind
mounts.

The mock generation role currently exposes only liveness/readiness and graceful
shutdown. Deterministic create/status outcomes begin in M3; the web and worker
adapters remain deliberately disconnected in this foundation slice.

### Application image and process commands

The application image is built from the repository root and contains Vinext's
standalone output with only its traced runtime dependencies. It runs as the
unprivileged `node` user and does not require a source bind mount.

```bash
docker build --build-arg GOODGOOD_REVISION=local -t goodgood:local .
docker run --rm --name goodgood-web -p 3000:3000 goodgood:local
docker run --rm --name goodgood-worker -e GOODGOOD_PROCESS=worker -p 3001:3001 goodgood:local node server/runtime/worker.mjs
```

The equivalent process commands outside the image are `npm run start:web`
after `npm run build:local`, and `npm run start:worker`. Both roles handle
`SIGTERM` for container shutdown. The image-level health check selects its role
with `GOODGOOD_PROCESS`.

| Role | Liveness | Readiness | Current readiness meaning |
| --- | --- | --- | --- |
| `web` | `GET /api/health/live` on `PORT` | `GET /api/health/ready` on `PORT` | The production build loaded and can serve requests |
| `worker` | `GET /health/live` on `WORKER_HEALTH_PORT` | `GET /health/ready` on `WORKER_HEALTH_PORT` | Worker bootstrap completed and it is not shutting down |
| `mock-generation` | `GET /health/live` on `MOCK_GENERATION_PORT` | `GET /health/ready` on `MOCK_GENERATION_PORT` | Mock runtime bootstrap completed and it is not shutting down |

Liveness never depends on PostgreSQL, Redis, object storage, or a generation
provider. Readiness will add role-specific dependency checks when their
adapters exist; for M2 it deliberately reports only the runtime check. The
worker and mock-provider processes are runtime shells in this slice, not a
claim that durable queue consumption or provider behavior already exists.

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
