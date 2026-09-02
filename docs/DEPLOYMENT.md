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

The UI build itself needs no credentials. Durable local generation uses the
Compose defaults or the runtime variable names in `.env.example`. Its web role
requires the explicitly local authentication mode and maps configured tokens to
the seeded local identity records. It must also set
`GOODGOOD_ALLOW_LOCAL_AUTH=true`; this explicit opt-in is test infrastructure,
not a production identity configuration. Windows users may run the
cross-platform local scripts directly; the original Sites lifecycle scripts
require a Linux shell.

When `npm run dev:local` runs without `GOODGOOD_AUTH_MODE`, the development-only
session endpoint exposes a local preview identity so the visual prototype
remains inspectable without secrets. This preview is not accepted by durable
APIs and is impossible when `NODE_ENV=production`; use Compose for
authenticated persistence work.

Base Compose explicitly enables the local fake payment provider only on the web
role. `GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET` signs test callbacks and defaults
to a local-only value; override it only with another non-production test value.
Do not copy `GOODGOOD_FAKE_PAYMENT_ENABLED=true`, its secret, or the fake
provider into staging or production. Those environments must use the selected
provider's secret store, signature contract, and isolated sandbox credentials.

ADR 0010 selects domestic Alipay for eventual customer checkout after the
GoodGood production domain is ICP-filed and the merchant product is approved.
Until then, keep checkout absent. A trusted operator may record an already
received and independently invoiced payment from the repository runtime. For
local use, prefer the Compose maintenance role because it selects the GoodGood
database and runs migrations without requiring a host `DATABASE_URL`. Add
`--build` when the application image is missing or stale. Both commands below
default to a read-only preview:

```bash
docker compose --profile maintenance run --rm --build manual-payment --email actual-customer@example.com --operator actual-operator-id --reference actual-receipt-reference
docker compose --profile maintenance run --rm manual-payment --email actual-customer@example.com --operator actual-operator-id --reference actual-receipt-reference --execute
```

The direct Node/npm entry point is for an already configured runtime. It fails
closed when `DATABASE_URL` is absent. For example, after exporting the exact
target database URL through the environment or secret store:

```bash
npm run billing:manual-payment -- --email actual-customer@example.com --operator actual-operator-id --reference actual-receipt-reference
npm run billing:manual-payment -- --email actual-customer@example.com --operator actual-operator-id --reference actual-receipt-reference --execute
```

Review the first JSON result before running the second command. Replace all
`actual-*` values: the email must already belong to exactly one active GoodGood
owner, the operator ID must identify the person performing the operation, and
the reference must be the unique external receipt evidence. The command
accepts a stable product ID through optional `--product-id`; it never accepts
money or credit amounts. The receipt/reference is immutable payment evidence
and must not contain a secret. Exact replay is safe. Run the same bundled role
inside the application image in deployed environments; database migrations must
already be complete. This operator bridge collects no money and issues no
invoice, so confirm both outside GoodGood before `--execute`. Do not add a
browser admin endpoint until an explicit administrator identity and
authorization milestone exists.

## Local production-shaped runtime

Introduce Docker during the first backend milestones rather than packaging only
after feature completion. Windows development uses Docker Desktop's Linux
engine. The target local stack is:

| Service | Local responsibility | Production direction |
| --- | --- | --- |
| `web` | UI and authenticated, owner-scoped local API | Hong Kong authenticated application process |
| `worker` | Queue consumption and generation orchestration | Independently restartable/scalable worker process |
| `reference-cleanup` | Opt-in, one-shot dry-run or bounded reference-byte cleanup | Scheduled maintenance only after staging policy/capacity approval |
| `manual-payment` | Opt-in, one-shot preview or recording of an independently confirmed receipt | Temporary trusted-operator bridge until approved domestic Alipay checkout |
| PostgreSQL | Domain, job, and ledger persistence | Durable database with automated backups |
| Redis-compatible service | Queue/job coordination | Recoverable coordination; PostgreSQL remains authoritative |
| S3-compatible object storage | References and generated asset tests | Private object storage with signed direct transfer |
| Mock generation service | Deterministic success/failure/timeout tests | Replaced by scoped US generation gateway adapter |

Use one application image for `web` and `worker` initially, with different
commands. Keep state, uploads, logs, and secrets outside the image. A clean
checkout must be able to start the documented local stack without relying on
undeclared software or production credentials.

M5's O1Key image path is selectable only through an explicit worker override;
the base Compose stack remains fixed to the mock provider. The accepted MVP uses
`https://cf-api.o1key.com`, the special-price
`gemini-3.1-flash-image-c-sp` model, 1:1, 1K, and one output. The worker accepts
exactly one of `GENERATION_API_KEY` or `GENERATION_API_KEY_FILE`; deployment must
prefer a dedicated least-privilege Bearer credential from its secret store. It
must not enter checked-in Compose values, an image layer, browser JavaScript,
logs, or retained test output.

No Cloudflare R2 bucket is required for this MVP. The worker reads already
validated reference bytes from private RustFS and uploads them server-to-server
through O1Key's temporary attachment endpoint. Its returned HTTPS URL is public
for 24 hours, must be used only for the requested model operation, and is not a
GoodGood persistence record. Generated outputs are downloaded back into private
GoodGood storage. Production object-storage selection remains an M7 staging
decision rather than an implicit R2 commitment.

O1Key generation POSTs are not idempotent: every accepted POST creates a new
task and charge, and a lost response cannot be recovered by
`X-Oneapi-Request-Id`. ADR 0008 accepts this for the MVP. The worker persists an
at-most-once submission guard immediately before POST and does not automatically
resubmit a guarded attempt without a durable `task_id`; an explicit user retry
is a new billable task. Query and ingest every known task within the default
24-hour result-data retention window. Use the New API usage record to audit
upstream charge/refund outcomes alongside GoodGood's customer-credit ledger;
never place exported usage records or credentials in the repository. A
customer-credit release, especially for `SUBMISSION_UNKNOWN`, is not evidence
that the upstream charge was refunded.

Authenticated API reads return fresh private-object signatures. Restored
reference thumbnails, generated assets, and project-cover images use native
browser image requests for those signatures; do not route them through the
Vinext/Next server image optimizer or enable its private-IP bypass. Local RustFS
intentionally uses a loopback address, while the production browser endpoint
must be the selected public HTTPS object origin.

For one local credentialed smoke, run from an interactive terminal:

```bash
npm run stack:o1key-local -- --web-port 3000
```

The launcher requests the O1Key key with invisible input, writes it to a
permission-limited temporary file, and mounts that file into only the worker at
`/run/secrets/goodgood_o1key_api_key`. It uses the isolated Compose project
`goodgood-o1key-local`, so it does not replace the normal local or Authing stack.
After the operator presses Enter, it stops the isolated containers while
preserving named volumes and removes the temporary key file. This proves only a
local path; do not retain the provider attachment URL, generated user asset, or
credential in test output.

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

The `reference-cleanup` and `manual-payment` roles have no host ports and run
only when the `maintenance` profile is invoked.

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

The local web role validates either of two configured Bearer tokens against the
`auth_identities` mapping. For browser continuity it issues the configured
default token as an HttpOnly, same-site local cookie when the UI is first
loaded. The process refuses local mode unless `GOODGOOD_ALLOW_LOCAL_AUTH=true`,
and refuses OIDC mode if that switch is true. Do not enable this local adapter
in staging or production. The OIDC adapter verifies the selected provider's
signed identity and emits the same provider-neutral owner context through a
server-owned GoodGood session.

### Production authentication configuration

ADR 0007 selects Authing-hosted authentication through standard OIDC. The
Authing application must expose only Google and passwordless email
verification-code login/registration. Disable passwords, usernames, phone/SMS,
WeChat, and all other connections. Enable provider-side association by verified
email so Google and email-code access resolve to one Authing subject; GoodGood
does not merge distinct subjects by email.

Configure the backend with names from `.env.example`:

| Variable | Production meaning |
| --- | --- |
| `GOODGOOD_ALLOW_LOCAL_AUTH` | Must be absent or `false`; staging/production preflight rejects `true` |
| `GOODGOOD_AUTH_MODE` | `oidc`; `local` is forbidden outside local tests |
| `GOODGOOD_AUTH_ISSUER` | Exact Authing application issuer, including `/oidc` when present |
| `GOODGOOD_AUTH_CLIENT_ID` | Authing OIDC application ID |
| `GOODGOOD_AUTH_CLIENT_SECRET` | Server-only secret from the deployment secret store; mutually exclusive with the file variant |
| `GOODGOOD_AUTH_CLIENT_SECRET_FILE` | Preferred mounted-secret path; the file must contain only the server-side application secret |
| `GOODGOOD_AUTH_REDIRECT_URI` | Exact HTTPS GoodGood callback ending in `/api/auth/callback` |
| `GOODGOOD_AUTH_COOKIE_NAME` | Must start with `__Host-` for an HTTPS callback; default `__Host-goodgood_session` |
| `GOODGOOD_AUTH_COOKIE_SECURE` | Must be `true` for an HTTPS callback and in staging/production |
| `GOODGOOD_AUTH_LOGIN_TTL_SECONDS` | Optional one-time login-attempt lifetime; default 600 |
| `GOODGOOD_AUTH_SESSION_TTL_SECONDS` | Optional GoodGood session lifetime; default 30 days |

Use Authorization Code return type `code`; the backend always adds PKCE,
`state`, and `nonce`. Register the exact GoodGood callback in Authing and the
Authing-provided Google callback in Google Cloud. Until an approved ICP-filed
domain exists, use the Authing-provided application domain for the hosted login
page. Do not configure an Authing custom domain or put credentials in `.env`,
Compose environment values, an image layer, or browser JavaScript. Mount a
secret file or use the platform secret store instead. Email sender/template behavior,
Google consent, account association, logout, expiration, and callback failure
must be verified with isolated staging accounts before production traffic.
The web process refuses to start an HTTPS OIDC configuration unless its session
cookie is both Secure and `__Host-` prefixed; the preflight rejects the same
configuration before contacting discovery.

GoodGood derives the logout callback as the application origin root from
`GOODGOOD_AUTH_REDIRECT_URI`. Register that exact root URL in Authing's
`Logout URLs` allowlist. On explicit logout, GoodGood revokes its own session
first and then sends the top-level browser to the Authing application endpoint
`/login/profile/logout` with the server-owned application ID and callback. No ID
Token is retained for logout, and the browser cannot choose the return target.

Configure Authing to sign ID Tokens with `RS256`. GoodGood accepts only RS256
tokens verified through the discovery document's JWKS URI; do not select a
shared-secret ID Token algorithm. The token endpoint may advertise
`client_secret_basic` or `client_secret_post`. When the discovery field is
absent, the OIDC default is `client_secret_basic`.

### Authentication staging preflight

Load the staging values above through the deployment secret store, then run
this command from the exact revision that will be deployed:

```bash
npm run auth:preflight
```

The command performs discovery and exits nonzero unless it can prove the exact
issuer, HTTPS callback and endpoints, `/api/auth/callback` path, Secure
`__Host-` cookie, Authorization Code flow, S256 PKCE, requested scopes, a
supported server-side client authentication method, RS256 signing, and the
authorization request contract. It also proves the derived logout callback and
hosted Authing logout URL contract. Its JSON report contains only the public
issuer, callback, cookie policy, capability results, and manual evidence IDs;
it never prints the client ID or client secret. `--allow-loopback` exists only
for explicit local verification and automated fixtures. It accepts HTTP and a
non-`Secure` cookie only on `localhost` or `127.0.0.1`, and is forbidden when
`NODE_ENV=production`.
The deployed OIDC client independently revalidates the same required provider
capabilities when building authorization requests and exchanging codes. It
caches discovery for no more than five minutes, so a later Authing setting
change fails closed without requiring a fresh deploy; failed discovery does not
persist a new state/PKCE login attempt.

For an operator-run real-tenant loopback test, add exactly
`http://127.0.0.1:3000/api/auth/callback` to Authing's login callback allowlist
and `http://127.0.0.1:3000/` to its logout allowlist, then run:

```bash
npm run stack:authing-local -- --issuer https://tenant.authing.cn/oidc --client-id application-id
```

The launcher asks for the application secret using invisible terminal input.
It writes the value to a permission-restricted operating-system temporary file,
mounts that file into only the web container at
`/run/secrets/goodgood_auth_client_secret`, and deletes it when the operator
presses Enter or startup fails. It never supplies the secret as a command-line
argument or Compose environment value. The launcher runs the public OIDC
preflight, builds and starts the stack, then stops the containers without
deleting named data volumes. This is local integration evidence, not proof of
the required public HTTPS staging callback, TLS, DNS, or network path.
If the default port is occupied, the operator may pass `--web-port <port>`, but
both Authing allowlist URLs must use that exact port before the run begins.

Discovery cannot prove which controls are enabled on the hosted login page.
Complete and retain this manual evidence in the isolated Authing staging app:

| Control | Required setting | Evidence |
| --- | --- | --- |
| Hosted login/logout | Authing-provided application domain; no custom domain yet; exact GoodGood origin root in `Logout URLs` | Application-domain, callback allowlist, and app-setting screenshot |
| Native login/registration | Only `邮箱 + 验证码`; disable password, username, phone/SMS, scan-code, and every other native method | `应用 -> 自建应用 -> 应用详情 -> 登录控制` screenshot |
| Social identity | Exactly Google; first-use registration allowed | Authing Google connection screenshot |
| Google callback | Google Cloud authorized redirect URI exactly equals the callback shown by the Authing Google connection | Both redacted settings, with no client secret |
| Account association | Enable Google account association by email field matching; GoodGood still refuses to merge different OIDC subjects by email | Setting screenshot plus same-subject smoke result |
| Email delivery | Staging sender/template works and verification codes expire and cannot be replayed | Redacted test-mail record |
| Protocol | Authorization Code, return type `code`, S256 PKCE, RS256 ID Token, exact GoodGood callback | Preflight JSON plus redacted Authing settings |

The console paths and behavior above follow Authing's current
[Login Control](https://docs.authing.cn/v2/guides/app-new/create-app/login-control.html),
[Google connection](https://docs.authing.cn/v2/en/guides/connections/social/google/),
[account association](https://docs.authing.cn/v2/guides/connections/account-association.html),
[OIDC PKCE](https://docs.authing.cn/v2/federation/oidc/pkce/), and
[hosted logout](https://docs.authing.cn/v2/guides/basics/authenticate-first-user/how-to-logout-user.html)
documentation. Treat the saved staging evidence, not the menu wording, as the
release contract if the console navigation changes.

Run the interactive smoke matrix with isolated addresses in both account-order
directions: email-code first then Google, and Google first then email-code.
Record that both methods return the same Authing OIDC `sub` for the same
verified email and therefore the same GoodGood owner. Also verify first login,
repeat login, user cancellation, expired and replayed callback, unverified
email rejection, logout revocation, and expired GoodGood session recovery.
For every callback failure, confirm the short-lived browser-binding cookie is
expired while any previously valid GoodGood session remains unchanged.
For logout, confirm both the GoodGood cookie/session revocation and the Authing
hosted-session exit before starting the next login.
Remove codes, cookies, tokens, client secrets, and full test addresses from all
retained evidence.

At startup, web and worker ensure the private RustFS bucket exists and install
the exact browser origins from `OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS` as its
PUT-only CORS rule. `OBJECT_STORAGE_PUBLIC_ENDPOINT` is the browser-reachable
endpoint used to sign short-lived direct uploads and private reads; it must not
point at the Compose-only service hostname. Production/staging must use their
exact HTTPS application origins rather than `*`, and must verify the selected
provider's CORS/IAM behavior in staging.

`stack:down` removes containers and the bridge while preserving named volumes.
`docker compose down --volumes` removes local database, queue, and object data
and is therefore the intentional destructive reset. The application roles run
read-only as UID 1000 with only a temporary `/tmp` filesystem and no source bind
mounts.

Compose also runs a one-shot `migrate` role after PostgreSQL becomes healthy.
It records every SQL filename and checksum in `goodgood_schema_migrations`, then
web and worker start only after migration success. The mock generation role now
implements authenticated, idempotent create/status behavior plus deterministic
success, rejection, slow, and timeout paths. It serves only the checked-in test
image; it is not a production provider.

The current additive chain contains ten migrations: M3 generation, M4 owner
identity, M4 reference assets, M4 projects/batch association, M4 OIDC login
attempts/sessions plus same-browser callback binding, and reference-cleanup
evidence, followed by owner-scoped creation drafts and the M6 immutable price/
append-only credit-ledger foundation. Migration 0009 seeds the accepted
10-credit Banana 2 price separately for 1K, 2K, and 4K, plus one idempotent
100-credit welcome grant for every existing owner; first-login provisioning
does the same for new owners. Migration 0010 seeds the immutable CNY 10 /
500-credit product and adds payment orders plus webhook evidence. Its
`fake-sandbox` provider value is local test data, not a selected production
provider or credential. The manual payment role uses these existing tables and
adds no migration: `manual` is an operator-recorded receipt source, not a
provider sandbox or customer checkout.
Local rollback
restores a database snapshot or an explicitly disposable volume; deployed
environments use a forward fix rather than dropping owner data.

### Creation draft retention

Each authenticated owner may have one unprojected root draft. Successful writes
move its expiry 30 days forward and increment a monotonic version. Expired rows
are ignored by reads and no longer protect referenced private objects; physical
row removal can be added to a later bounded database-maintenance pass. The
browser clears the active row after saving the root context as a project or
confirming a clean creation. Draft persistence is not a backup of project edits
or active generation jobs.

### Reference retention maintenance

Reference cleanup is deliberately absent from normal Compose startup and has
no schedule. The `maintenance` profile exposes a one-shot role whose default is
read-only:

```bash
docker compose --profile maintenance run --rm reference-cleanup
docker compose --profile maintenance run --rm reference-cleanup --execute
```

The first command emits `reference.cleanup_preview` with counts only. Run the
second command only after reviewing that dry-run; it is the explicit destructive
step that deletes eligible private reference bytes. With the same runtime
environment loaded outside Compose, `npm run references:cleanup` is the
equivalent dry-run and `npm run references:cleanup -- --execute` executes it.

Server-owned policy defaults are a 100-row batch, 30-day age threshold for
unreferenced ready uploads, 60-minute staging grace, and five-minute claim
lease. They can be bounded through `REFERENCE_CLEANUP_BATCH_SIZE`,
`REFERENCE_ORPHAN_RETENTION_DAYS`, `REFERENCE_CLEANUP_GRACE_MINUTES`, and
`REFERENCE_CLEANUP_LEASE_SECONDS`. Expired pending, rejected, and expired rows
are also eligible, but any reference ID present in a generation, project, or
unexpired creation-draft snapshot is protected at both staging and claim time.
Snapshot writers share a
database lifecycle lock with cleanup and revalidate ready references inside the
write transaction. Object deletion happens before `object_deleted_at` is
recorded; `OBJECT_DELETE_FAILED` remains retry evidence. Keep scheduling off
until a staging dry-run, storage lifecycle comparison, batch-duration metrics,
and alert ownership are accepted.

### Application image and process commands

The application image is built from the repository root and contains Vinext's
standalone output plus six locked, bundled Node entry points for web, worker,
migration, reference cleanup, manual payment, and mock generation. Bundling keeps the PostgreSQL, Valkey, and S3
clients compact; Sharp and its platform package are copied as locked native
runtime dependencies so the Linux image decodes untrusted reference bytes on
Linux rather than relying on host
binaries. The image runs as the unprivileged `node` user and does not require a
source bind mount.

```bash
docker build --build-arg GOODGOOD_REVISION=local -t goodgood:local .
docker run --rm --name goodgood-web -p 3000:3000 \
  -e GOODGOOD_ALLOW_LOCAL_AUTH=true \
  -e GOODGOOD_AUTH_MODE=local \
  -e GOODGOOD_LOCAL_AUTH_TOKENS=goodgood-local-user-a-token=local-user-a \
  -e GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN=goodgood-local-user-a-token \
  goodgood:local
docker run --rm --name goodgood-worker -e GOODGOOD_PROCESS=worker -p 3001:3001 goodgood:local node server/runtime/worker.mjs
```

The equivalent process commands outside the image are `npm run start:web`
after `npm run build:local`, and `npm run start:worker`. Both roles handle
`SIGTERM` for container shutdown. The image-level health check selects its role
with `GOODGOOD_PROCESS`.

| Role | Liveness | Readiness | Current readiness meaning |
| --- | --- | --- | --- |
| `web` | `GET /api/health/live` on `PORT` | `GET /api/health/ready` on `PORT` | PostgreSQL, Valkey, RustFS bucket, and mock provider are reachable |
| `worker` | `GET /health/live` on `WORKER_HEALTH_PORT` | `GET /health/ready` on `WORKER_HEALTH_PORT` | Queue, PostgreSQL, RustFS bucket, and provider bootstrap passed |
| `mock-generation` | `GET /health/live` on `MOCK_GENERATION_PORT` | `GET /health/ready` on `MOCK_GENERATION_PORT` | Mock runtime bootstrap completed and it is not shutting down |

Liveness never depends on PostgreSQL, Valkey, object storage, or a generation
provider. Current readiness does. A transient runtime dependency failure does not
delete PostgreSQL evidence; the worker reconciles expired leases and pending
outbox rows when dependencies recover.

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

The repository CI publishes trusted `main` revisions to GitHub Container
Registry as `ghcr.io/<repository>:<full-git-sha>` after `check:local` passes.
Pull requests run the same quality gate and a real image build but receive no
registry write permission. The publish job uses only the repository-scoped
`GITHUB_TOKEN` with `packages: write`; no personal access token or Docker Hub
credential is required. All referenced GitHub and Docker actions are pinned to
full commit hashes.

The workflow summary records the pushed digest, source revision, latest
migration filename, and a checksum of the checked-in runtime configuration
contract. Image labels retain the same evidence plus the repository source.
Deploy by digest, for example
`ghcr.io/<repository>@sha256:<digest>`, rather than by a mutable branch tag.
GHCR package visibility and access must remain aligned with the private source
repository before staging receives pull credentials.

## Early infrastructure direction

ADR 0010 changes the payment sequence, not the already accepted staging
location. Hong Kong remains the first test-data staging control plane. The
filed production-domain placement and any mainland production access topology
must be decided with the ICP filing work; Hong Kong staging alone is not ICP
filing evidence.

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
