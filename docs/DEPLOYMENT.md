# Development and deployment

## Environments

| Environment | Purpose | Data |
| --- | --- | --- |
| Local | Feature development and API contract tests | Local/test only |
| Host candidate | Exact-digest, inactive-slot and no-customer release rehearsal | No imported staging data; production state invariants are read-only until the reviewed migration step |
| Production | Customer traffic | Production data |

Never use production credentials in local `.env` files or browser bundles.

Local proves application behavior and container compatibility. ADR 0021 removes
the permanent remote staging environment after M7; it does not remove
production-shaped verification. Public DNS/TLS, ESA, selected cloud
permissions, signed storage, callbacks, cross-border paths, resource limits,
backup restore, and rollback cannot be accepted from local evidence. They are
proved through a bounded no-customer conversion and exact-candidate checks on
the Hong Kong host.

## Local workflow

1. Clone the private/approved GitHub repository.
2. Install Node.js `>=22.13.0` and run `npm ci`.
3. Create `.env.local` from `.env.example` when direct Node integrations are
   introduced. Compose overrides may instead use shell environment variables
   or an ignored `.env` file.
4. Run `npm run dev:local`.
5. Before pushing, run `npm run check:local`.

The UI build itself needs no credentials. Durable local generation uses the
Compose defaults or the runtime variable names in `.env.example`. Its migration
role recreates the two fixed local fixture owners only when the local-auth opt-in
is true, and its web role maps configured tokens to those records. Both roles
must set
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
browser path for this receipt operation. ADR 0020's separately authorized
site-owner page may append free test-credit grants only; it never calls or
reimplements manual payment.

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
| `bootstrap-site-owner` | Opt-in, dry-run-first assignment of the sole initial site owner after normal login | One-time audited production bootstrap before browser account management |
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
`gemini-3.1-flash-image-c-sp` model, one output, all 14 product-defined aspect
ratios, and `1K` / `2K` / `4K`. Promotion must verify there is no active attempt
from the prior route version before the Worker switches to the expanded route.
The worker accepts
exactly one of `GENERATION_API_KEY` or `GENERATION_API_KEY_FILE`; deployment must
prefer a dedicated least-privilege Bearer credential from its secret store. It
must not enter checked-in Compose values, an image layer, browser JavaScript,
logs, or retained test output.

M5's local acceptance required no Cloudflare R2 bucket. The worker reads
already validated reference bytes from private RustFS and uploads them
server-to-server through O1Key's temporary attachment endpoint. Its returned
HTTPS URL is public for 24 hours, must be used only for the requested model
operation, and is not a GoodGood persistence record. Generated outputs are
downloaded back into private GoodGood storage. ADR 0012 now selects private
Cloudflare R2 as M7 staging's authoritative object store without changing the
local RustFS development path.

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
intentionally uses a loopback address. M7 browser signatures use the exact R2
S3 API endpoint; the disabled public asset hostname is not a signing endpoint.

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

ADR 0020 keeps that public Authing login surface but changes GoodGood admission
for M8 production. A verified first login must create a pending owner, issue a
limited GoodGood session, and append the existing 100-credit welcome grant
without enabling creation APIs. Approval is a separate site-owner action; do
not implement it as an Authing connection toggle or infer it from email,
registration order, or balance. The production preflight and seed gate must
prove that unapproved sessions cannot reach generation, reference, draft,
project, asset, or credit-reservation capabilities.

The site-owner role requires an explicit, audited bootstrap against an existing
verified GoodGood owner before `/admin/users` is usable. Never make the first
registrant the site owner automatically, hard-code the operator email in
source, or accept a browser-supplied role. First let the intended site owner
complete normal Authing login, then run the maintenance command without
`--execute` and review its masked dry-run result:

```bash
docker compose --profile maintenance run --rm bootstrap-site-owner \
  --email owner@example.com \
  --operator initial-production-operator \
  --reference site-owner-bootstrap-2026-09
```

Repeat the exact command with `--execute` only after the dry run identifies the
expected account. The stable reference makes exact replay a no-op; a different
account or reference fails after one owner exists. The transaction activates
the account and appends immutable role plus administrative audit evidence.
After bootstrap, routine review and promotional credit grants occur in the
site-owner page. Test-credit grants append ledger and admin audit evidence and
never invoke `billing:manual-payment` or create a payment order.

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

### Authing credential rotation

Treat the Authing application secret and user-pool management secret as
singleton credentials: rotating either one immediately revokes its predecessor.
The application detail page masks the secret by default. The repeated mask is
not credential material; explicitly use the adjacent reveal control and verify
the revealed value's expected shape before installing it. Never write the
masked display into the staging secret file.

Transfer an application replacement through invisible operator input, never a
command argument, environment variable, transcript, temporary local file, or
Git.
Install it at the release-file-selected source path as
`root:goodgood-runtime-secrets` mode `0640`, verify its nonzero expected byte
length without printing it, and recreate only the `web` role because the worker
does not mount this secret. Then run the network staging preflight and a full
GoodGood logout plus fresh Authing login; readiness alone and discovery
preflight do not prove that the replacement can exchange an authorization code.

GoodGood does not consume the user-pool management secret. Before rotating it,
audit other clients of the isolated Authing tenant; after rotation, no GoodGood
host file or process restart is required. Record only the rotation result and
redacted verification evidence, never either secret.

For ADR 0021's clean production conversion, reuse the current Authing
application and identity directory rather than creating another tenant or
application. Rotate its OIDC client secret. GoodGood sessions use random opaque
tokens with only their hashes in PostgreSQL, not a shared signing secret; prove
that fresh production state imports no old `auth_sessions` row.
Keep the existing issuer, client ID, hosted Google connection, and passwordless
email method. Before seed admission, the GoodGood login callback allowlist must
contain `https://goodgood.o1key.com/api/auth/callback` and the logout allowlist
must contain `https://goodgood.o1key.com/`; remove loopback and obsolete staging
GoodGood URLs. Do not use the production Authing application for later local
testing.

Do not delete Authing directory identities during the GoodGood data reset. The
fresh production database contains no identity bindings or sessions, so a
returning Authing identity provisions a new pending GoodGood owner with the
standard welcome grant and no inherited test role, credit, or content. The
intended site owner logs in through that same path before the dry-run-first
bootstrap. No console or credential change is authorized by this documentation
alone.

Before conversion only, an operator-run real-tenant loopback test may add exactly
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

With `OBJECT_STORAGE_PROVISIONING_MODE=manage`, local web and worker ensure the
private RustFS bucket exists and install the exact browser origins from
`OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS` as its CORS rule. M7 staging instead
requires `OBJECT_STORAGE_PROVISIONING_MODE=verify`: startup performs only
`HeadBucket`, while a separately reviewed Cloudflare setting owns R2 CORS.
`OBJECT_STORAGE_PUBLIC_ENDPOINT` is the browser-reachable S3 endpoint used to
sign short-lived direct uploads and private reads. Production/staging must use
their exact HTTPS application origins rather than `*`, and must verify the
selected provider's CORS/IAM behavior in staging.

`stack:down` removes containers and the bridge while preserving named volumes.
`docker compose down --volumes` removes local database, queue, and object data
and is therefore the intentional destructive reset. The application roles run
read-only as UID 1000 with only a temporary `/tmp` filesystem and no source bind
mounts.

Compose also runs a one-shot `migrate` role after PostgreSQL becomes healthy.
It records every SQL filename and checksum in `goodgood_schema_migrations`, then
removes the historical fixed-UUID fixtures in migration 0012. Only the base
local Compose role then runs the separate idempotent fixture seeder; staging and
production leave the migrated database with no owner, identity, session, credit
account, or ledger row until a real login provisions one. Web and worker start
only after migration success. The mock generation role now
implements authenticated, idempotent create/status behavior plus deterministic
success, rejection, slow, and timeout paths. It serves only the checked-in test
image; it is not a production provider.

The current forward chain contains twelve migrations: M3 generation, M4 owner
identity, M4 reference assets, M4 projects/batch association, M4 OIDC login
attempts/sessions plus same-browser callback binding, and reference-cleanup
evidence, followed by owner-scoped creation drafts and the M6 immutable price/
append-only credit-ledger foundation. Migration 0009 seeds the accepted
10-credit Banana 2 price separately for 1K, 2K, and 4K, plus one idempotent
100-credit welcome grant for every existing owner; first-login provisioning
does the same for new owners. Migration 0010 seeds the immutable CNY 10 /
500-credit product and adds payment orders plus webhook evidence. Its
`fake-sandbox` provider value is local test data, not a selected production
provider or credential. Migration 0011 adds account admission and site-owner
administration; migration 0012 removes the legacy local fixtures without
modifying the earlier applied checksums. The manual payment role uses these existing tables and
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
binaries. Vinext 1.0 beta's standalone tracer currently omits its React peer
packages, so the image explicitly copies the locked React/React DOM/RSC peers
and their small runtime dependency tree. Those three React packages must move
together and currently use the patched `19.2.8` line. CI imports them from the
finished image before scanning or publishing it. The image runs as the
unprivileged `node` user and does not require a source bind mount.

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
| `web` | `GET /api/health/live` on `PORT` | `GET /api/health/ready` on `PORT` | PostgreSQL, Valkey, the selected private object bucket, and provider are reachable |
| `worker` | `GET /health/live` on `WORKER_HEALTH_PORT` | `GET /health/ready` on `WORKER_HEALTH_PORT` | Queue, PostgreSQL, the selected private object bucket, and provider bootstrap passed |
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
Registry as `ghcr.io/<repository>:<full-git-sha>` only after `check:local` and
both security scans pass. Pinned Trivy 0.70.0 first scans the locked production
dependency graph, excluding generated caches and development-only packages.
CI then builds the real production image on every event and scans its operating
system and packaged libraries. Either scan fails for a fixable `HIGH` or
`CRITICAL` finding; findings without an available fix remain visible but do not
block releases. Pull requests receive no registry write permission. The publish
job uses only the repository-scoped `GITHUB_TOKEN` with `packages: write`; no
personal access token or Docker Hub credential is required. All referenced
GitHub, Docker, and Aqua Security actions are pinned to full commit hashes.

The runtime base is an exact Node.js version and multi-platform image digest.
The final image removes npm and npx because every runtime role invokes Node
directly; this prevents the package-manager build toolchain from becoming an
unnecessary production attack surface. Refresh the version and digest together,
then rerun both scans whenever the base image is updated.

The workflow summary records the pushed digest, source revision, latest
migration filename, and a checksum of the checked-in runtime configuration
contract. After publication, CI runtime-smokes and scans that exact digest again
instead of treating the separately built verification image as sufficient. It
then uploads one uncompressed `artifact-security-evidence.json` workflow
artifact and records its GitHub artifact ID and SHA-256. Image labels retain the
same release evidence plus the repository source.
Deploy by digest, for example
`ghcr.io/<repository>@sha256:<digest>`, rather than by a mutable branch tag.
GHCR package visibility and access must remain aligned with the private source
repository before staging receives pull credentials.

## Staging configuration and release commands

`compose.staging.yaml` is the application-only staging topology. It never
builds source and has no local-auth, mock-provider, or fake-payment defaults.
It pulls one exact `ghcr.io/lizhongyi1209/goodgood@sha256:...` image for web,
worker, migration, and maintenance roles. Web and worker health ports are bound
to host loopback so the selected TLS reverse proxy remains the only public
entry. PostgreSQL, the Redis-compatible queue, and S3-compatible storage may be
managed services or separately operated same-host services, but they are not
silently created with local credentials by this Compose file.

Keep three kinds of staging material separate:

| Material | Example | Rule |
| --- | --- | --- |
| Release identity | `infra/staging/release.env.example` | Copy one successful CI summary exactly: image digest, source SHA, migration filename, runtime-contract checksum, runtime-file path, and secret-file source paths. No credential belongs here. |
| Runtime configuration | `infra/staging/runtime.env.example` | Store outside the checkout, mode `0600`; contains server endpoints and secret-bearing connection values. Never commit it or use the local placeholders unchanged. |
| Mounted secrets | Authing client-secret, O1Key key, and two R2 S3 credential files | Separate non-empty regular files, owned by `root:goodgood-runtime-secrets` with mode `0640`; Compose mounts only the roles that need each file at the exact `/run/secrets/...` paths and adds that group's numeric GID. Do not put these values in an environment variable or command argument. |

On the staging host, a conventional layout is
`/etc/goodgood/staging/release.env`,
`/etc/goodgood/staging/runtime.env`, and
`/etc/goodgood/staging/secrets/`. The release and runtime examples are checked
in, while real `.env` files and the secret directory are excluded from both Git
and the Docker build context. Percent-encode reserved characters in connection
URL credentials rather than relying on shell or Compose expansion.

`bootstrap-ubuntu-host.sh` creates the dedicated `goodgood-runtime-secrets`
group but does not add the SSH administrator to it. Before preflight, install
all four application secret files with that group and record its numeric GID in
the release file:

```bash
secret_gid="$(getent group goodgood-runtime-secrets | cut -d: -f3)"
sudo chown root:goodgood-runtime-secrets /etc/goodgood/staging/secrets/{auth-client-secret,o1key-api-key,r2-access-key-id,r2-secret-access-key}
sudo chmod 0640 /etc/goodgood/staging/secrets/{auth-client-secret,o1key-api-key,r2-access-key-id,r2-secret-access-key}
printf 'GOODGOOD_STAGING_SECRET_GID=%s\n' "${secret_gid}"
```

Copy the printed non-secret assignment into `release.env`. Do not use the
host's `docker`, `sudo`, or administrator group for this purpose.

The local contract preflight rejects a tag or `latest`, malformed release
evidence, unreadable or incorrectly grouped secret files, release/runtime file
mixing, a runtime revision override, local auth, inline Authing/O1Key secrets,
mock generation, inline R2 secrets, insecure or custom-domain storage
endpoints, non-`auto` R2 region, bucket-management mode, wildcard upload CORS,
loopback dependencies, and the fake payment sandbox. It prints only public
configuration and check results:

```bash
npm run staging:preflight -- \
  --release-file /etc/goodgood/staging/release.env \
  --runtime-env-file /etc/goodgood/staging/runtime.env

npm run staging:preflight -- \
  --release-file /etc/goodgood/staging/release.env \
  --runtime-env-file /etc/goodgood/staging/runtime.env \
  --network
```

`--network` additionally runs the existing Authing discovery/capability gate.
It still cannot prove hosted-page controls, email delivery, Google account
association, storage IAM/CORS, or cross-border behavior; retain those as manual
staging evidence. Before executing a release, authenticate Docker to GHCR with
a package-read credential held outside the repository.

The release command is dry-run by default. Review the JSON plan, then execute
the exact same arguments with `--execute`:

```bash
npm run staging:release -- deploy \
  --release-file /etc/goodgood/staging/release.env \
  --runtime-env-file /etc/goodgood/staging/runtime.env

npm run staging:release -- deploy \
  --release-file /etc/goodgood/staging/release.env \
  --runtime-env-file /etc/goodgood/staging/runtime.env \
  --execute
```

Execution repeats the local checks, requires the live Authing preflight, checks
Compose interpolation, pulls the digest, verifies that its OCI labels exactly
match the release SHA/migration/configuration evidence, runs migrations once,
and only then starts web and worker with `--wait`. It never builds on the host.

Keep a read-only copy of each previously deployed release file. Rollback takes
one selected prior file and the runtime file compatible with that release. It
pulls and verifies the prior digest and replaces web/worker, but deliberately
does not reverse a database migration:

```bash
npm run staging:release -- rollback \
  --release-file /etc/goodgood/staging/releases/previous.env \
  --runtime-env-file /etc/goodgood/staging/runtime.env

npm run staging:release -- rollback \
  --release-file /etc/goodgood/staging/releases/previous.env \
  --runtime-env-file /etc/goodgood/staging/runtime.env \
  --execute
```

Use rollback only when the prior application image is compatible with the
current additive schema. For an irreversible or incompatible migration, keep
the application on the current image and use a reviewed forward fix. The first
single-stack staging deploy may briefly replace containers; public
zero/low-downtime traffic switching still requires the selected reverse-proxy
and blue/green host layout described below.

The deployed maintenance role preserves the dry-run-first manual-payment
contract. After the release is healthy, a trusted operator can invoke it with
the same release file and the `maintenance` profile; customer checkout remains
absent until ICP and Alipay prerequisites pass.

## Early infrastructure direction

ADR 0021 converts the purchased M7 Hong Kong host into the initial unpaid
seed-production control plane after a clean-data, no-customer rehearsal. This
supersedes the immediate separate ECS/RDS/Tair purchase while retaining ADR
0018's managed topology as a future scale-out direction. The applicable
filed-domain and mainland access questions remain part of the later
paid-commercialization review.

- Edge: Alibaba Cloud ESA.
- Application/control plane: the existing Alibaba Cloud Hong Kong Simple
  Application Server for initial unpaid seed production.
- Generation plane: existing US OVH server.
- Images: private Cloudflare R2 with direct presigned delivery, as accepted in
  ADR 0012. Reuse the existing `goodgood` bucket only after exact inventory,
  approved test-object deletion, empty verification, and credential rotation.
- Initial database/queue: bounded PostgreSQL and Valkey containers on the same
  host. Managed ApsaraDB RDS plus Tair remains the future scale-out target.

The purchased M7 host has 2 vCPUs, 4 GiB memory, a 50 GiB ESSD system disk, a
fixed public IPv4 address, and a 200 Mbps peak BGP public-bandwidth
specification. It is acceptable for initial seed production only when builds
run in CI, runtime resources are bounded, large image bytes bypass the
application process, and the accepted single-host availability risk is visible.
The peak bandwidth is not a sustained service guarantee.

M7 used this host with disposable test accounts and credentials. Before seed
production, freeze it, record and verify an encrypted off-host archive, create
fresh production state and object boundaries, rotate production secrets, and
rehearse recovery and release behavior. Do not import M7 business rows or
objects into production. No live reset or deletion is authorized merely by the
architecture decision.

### Alibaba Cloud staging host baseline

ADR 0011's Ubuntu 24.04 host is bootstrapped with
`infra/staging/bootstrap-ubuntu-host.sh` only after the `goodgood` key-only sudo
account has passed a separate SSH session and root SSH has been disabled. The
script applies current OS packages, configures a 2 GiB low-swappiness safety
swap, installs Docker Engine and Compose from Docker's signed apt repository,
bounds local Docker logs, enables unattended security upgrades, and limits UFW
ingress to SSH, HTTP, and HTTPS. It installs Nginx but leaves it stopped and
disabled until a reviewed TLS virtual host replaces the distribution default.

Docker-published ports can bypass UFW. The Alibaba Cloud firewall remains the
outer boundary, and every database, queue, object-storage administration, web,
and worker port must stay unexposed or bind explicitly to loopback. Only the
reviewed Nginx origin may listen publicly on 80/443.

Prepare the origin private key and CSR on the server so the private key never
crosses an operator workstation:

```bash
sudo install -o root -g root -m 0755 \
  /tmp/install-nginx-origin.sh \
  /usr/local/sbin/goodgood-staging-nginx
sudo /usr/local/sbin/goodgood-staging-nginx prepare
```

Use the resulting `/etc/goodgood/staging/tls/goodgood-origin.csr` with
Cloudflare Origin CA for exactly `goodgood.o1key.com`, then place only the
signed PEM certificate at `/tmp/goodgood-origin.pem`. Copy the reviewed Nginx
site and Cloudflare allowlist to `/tmp`, then activate them:

```bash
sudo /usr/local/sbin/goodgood-staging-nginx activate \
  /tmp/goodgood.conf \
  /tmp/cloudflare-origin-only.conf \
  /tmp/goodgood-origin.pem
```

Activation rejects a mismatched hostname/key, a certificate expiring within 30
days, or an invalid Nginx configuration before enabling the service. The site
accepts application traffic only from the checked-in Cloudflare IPv4/IPv6
ranges, redirects HTTP to HTTPS, terminates TLS 1.2/1.3, and proxies only to
`127.0.0.1:3000`. Re-synchronize the allowlist from Cloudflare's authoritative
`ips-v4` and `ips-v6` lists whenever Cloudflare announces a range change. Keep
the proxied DNS record enabled and set the Cloudflare origin mode to Full
(strict); an Origin CA certificate is intentionally not browser-trusted when
Cloudflare proxying is bypassed.

### Same-host staging dependencies

`compose.staging.dependencies.yaml` is the separately operated, test-data-only
dependency stack accepted by ADR 0011. It pins PostgreSQL 17.11, Valkey 8.1.9,
and the pre-ADR-0012 RustFS fallback by digest. Each service has CPU, memory,
swap, and PID limits sized for the 2-vCPU / 4-GiB staging host. PostgreSQL and
Valkey publish no host port. The RustFS console is disabled and its S3 API binds
only to `127.0.0.1:9000`; it is not an Nginx route or M7's authoritative store.

Dependencies share the internal Docker network
`goodgood-staging-private`. The application topology treats that network as
external: migration and maintenance roles join only the private network, while
web and worker also join a separate egress bridge for Authing, R2, and O1Key.
Use the service names `postgres` and `valkey` in the staging runtime file; do
not replace them with host loopback addresses. Object-storage endpoints use the
external R2 S3 API hostname fixed by ADR 0012, never `object-storage`.

RustFS alone also joins `goodgood-staging-storage-origin`. Docker suppresses a
host port published by a container attached only to an `internal` network, so
this second bridge makes the loopback S3 binding reachable to host Nginx. The
installer verifies that RustFS is the bridge's only member and performs a real
loopback readiness request; PostgreSQL and Valkey remain on the internal
network only.

Install or re-verify the stack from a checksum-verified copy of the two
repository files:

```bash
sudo install -o root -g root -m 0755 \
  /tmp/install-staging-dependencies.sh \
  /usr/local/sbin/goodgood-staging-dependencies
sudo /usr/local/sbin/goodgood-staging-dependencies \
  /tmp/compose.staging.dependencies.yaml
```

The installer creates three random credential files under
`/etc/goodgood/staging/secrets/dependencies/` and never prints them. The
PostgreSQL file is operator-owned mode `0600`; the two RustFS files are mode
`0400` and owned by uid/gid `10001`, the fixed non-root identity in the pinned
RustFS image. RustFS and PostgreSQL receive credentials through mounted files,
not container environment values. The installer also writes the mode-`0600`
`/etc/goodgood/staging/dependency-runtime.env` fragment containing the exact
`DATABASE_URL` and `REDIS_URL` values needed later in `runtime.env`. Copy those
two lines on the host without displaying their values in terminal logs; then
add the separately supplied R2, Authing, and O1Key configuration. The installer
is idempotent and refuses to invent replacement credentials when persistent
data already exists.

Valkey intentionally has no password in this topology because it has no host
binding and lives only on the internal dependency network. The web and worker
already require queue access, so a shared password would not isolate a
compromised application container; network membership is the boundary. Do not
attach unrelated containers to this network.

This single-node RustFS instance has no storage redundancy and is not a paid-
production design. It remains temporarily for rollback inspection only; do not
write new staging user objects to it after the R2 cutover.

### Private Cloudflare R2 staging assets

ADR 0012 fixes M7 storage to the existing private `goodgood` bucket. Disable
both its `r2.dev` public URL and direct `assets-goodgood.o1key.com` custom-domain
access. Reserve that asset hostname for a later authenticated delivery layer.
Both `OBJECT_STORAGE_ENDPOINT` and `OBJECT_STORAGE_PUBLIC_ENDPOINT` must be:

```text
https://3b918f80852289d9879e7f73bccc2e22.r2.cloudflarestorage.com
```

Use region `auto`, path-style addressing, and
`OBJECT_STORAGE_PROVISIONING_MODE=verify`. Create an R2 S3 API token with
Object Read & Write permission scoped only to the `goodgood` bucket. Store its
Access Key ID and Secret Access Key in the two release-file-referenced host
files; do not grant application credentials account-wide Admin permission.

Configure this exact bucket CORS policy separately in the Cloudflare dashboard:

```json
[
  {
    "AllowedOrigins": ["https://goodgood.o1key.com"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type", "x-amz-*"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 300
  }
]
```

Startup deliberately verifies only `HeadBucket`; it does not own bucket
creation or CORS. Before release, prove a browser OPTIONS/PUT from the exact app
origin, authenticated signed GET, cross-owner denial, and lifecycle cleanup.

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

For a host size or provider migration: snapshot and back up PostgreSQL and
private objects, create the target instance, validate it, stop writes briefly
when persistence is local, switch the public origin only after readiness passes,
and retain the old instance until rollback evidence is complete.

### Selected production runtime adapter

ADR 0017 selects `nginx-compose-blue-green-v1` as the initial runtime adapter.
ADR 0021 keeps it as the preferred adapter on the existing Hong Kong host, but
the inactive-Web overlap and resource limits must be revalidated against the
2-vCPU / 4-GiB boundary before an executable adapter is enabled.

- Host Nginx is the only origin ingress behind Alibaba Cloud ESA.
- Two independent application-only Compose projects use fixed loopback ports:
  blue Web/Worker health on `3100/3101`, green on `3200/3201`.
- PostgreSQL, Valkey, and private R2 remain outside both slots.
- One root-owned release lock serializes changes. Root-owned release state
  retains the active slot, exact candidate identity, and prior upstream bytes.
- Start only the inactive Web candidate. Keep its Worker stopped until isolated
  candidate checks and the single reviewed forward migration pass.
- Stop the active Worker with bounded grace, start the candidate Worker, and
  restore the prior Worker if its readiness fails. Never run both production
  Workers intentionally as a blue/green validation mechanism.
- Replace the Nginx upstream include atomically on the same filesystem, run
  `nginx -t`, and reload only after validation. Restore the retained include if
  validation fails.
- After the switch, repeat public synthetic, queue, database, and credit
  fingerprints. Rollback restores the prior upstream and Worker without a
  schema downgrade.

`production:release-plan` reports this adapter, its selected infrastructure
profile, and ordered phases only after the complete paid-production gate passes.
`production:seed-release-plan` reports the same phases only after the narrower
seed-production gate passes and labels the result as a seed dry run. Both remain
non-executable and have no process-spawn or execution flag. Do not create live
Compose/Nginx release tooling until the current host has fresh production state,
passes its no-customer conversion, and the executable adapter passes a separate
resource-headroom review.

Passing `candidate-health-invariants` evidence must set
`runtimeAdapter: nginx-compose-blue-green-v1` and prove isolated candidate
startup, exactly one migration, live/ready, public synthetic, queue, database,
and credit checks. Passing `rollback-rehearsal` evidence must name a distinct
retained prior revision and prove Web/Worker rollback, queue recovery, unchanged
database/credit fingerprints, and `schemaDowngradeAttempted: false`.

The separate initial-conversion planner binds the accepted source/target volume
names, reused `goodgood` bucket, production Authing URLs, static maintenance
asset, approvals, and evidence references. Its checked-in example is
intentionally unresolved and authorizes nothing:

```bash
npm run production:conversion-plan -- plan \
  --manifest-file infra/production/conversion-manifest.example.json
```

The expected non-zero result lists every pending item. Copy the example outside
the checkout for a later review, replace references without adding credentials,
and obtain exact-target approvals separately. This command has no execute flag,
does not connect to the host, and cannot activate maintenance or delete data.
`infra/production/maintenance/index.html` is the standalone, dependency-free
public asset to be installed and activated only by the later reviewed runbook.

The exact local conversion work package is defined by
`infra/production/CONVERSION_RUNBOOK.md`. It adds separate, resource-bounded
production PostgreSQL/Valkey state; blue/green application Compose with fixed
loopback ports and five-minute Worker drain; a fail-closed static-maintenance
Nginx boundary; metadata-only R2 inventory and exact deletion preview; isolated
encrypted PostgreSQL backup/restore automation; Authing and production-secret
rotation checklists; and checkpoints before every irreversible boundary. The
application R2 inventory covers current object versions only. The conversion
must additionally prove in Cloudflare that no unlisted historical version or
delete marker exists, or produce a separately reviewed all-version inventory.

Run the deterministic repository rehearsal with:

```bash
npm run production:work-package -- rehearse
```

Success reports nine passing contract groups while retaining
`executed:false` and `executionAvailable:false`. It parses no live credential,
opens no network connection, runs no child process, and changes no host, R2, or
Authing state. The package deliberately supplies neither R2 deletion nor public-
traffic-open execution. Both require later exact-target approvals and separately
reviewed operator actions during the four-hour maintenance window.

`compose.production.dependencies.yaml` keeps PostgreSQL and Valkey on the
internal `goodgood-production-state` network without host ports and creates only
the production-named volumes. `compose.production.yaml` joins application slots
to that external state network, gives network egress only to roles that require
it, keeps the Web/Worker ports on loopback, and does not include local mock
services. The production backup timer runs at minute 00 and 30 with no more than
five minutes of randomized delay, retaining all points within 24 hours plus 14
daily, 8 weekly, and 12 monthly points in the isolated Restic `/production`
prefix. A successful off-host restore drill remains mandatory before opening.

### Selected seed-production infrastructure baseline

ADR 0021 selects the already purchased Ubuntu 24.04 Hong Kong Simple
Application Server for initial unpaid seed production:

- keep the existing 2-vCPU, 4-GiB, 50-GiB ESSD and 200-Mbps peak-bandwidth
  allocation; do not infer sustained bandwidth or high availability;
- run Nginx, Web, Worker, PostgreSQL, and Valkey on the host with explicit CPU,
  memory, process, log, and disk bounds. PostgreSQL remains authoritative and
  Valkey remains reconstructable coordination;
- keep private Cloudflare R2 outside the host for image bytes. Reuse the
  existing `goodgood` bucket only after it is inventoried, cleared of every test
  object under exact-target approval, verified empty, and assigned rotated
  production-only credentials;
- keep encrypted database recovery off-host and prove restore before seed
  admission. Single-host operation does not waive ADR 0015's recovery gate;
- keep customer checkout disabled. Open login does not create workload because
  pending owners cannot generate until site-owner approval.

Do not configure a per-user pending-job cap, global queue-depth cap, or fixed
generation-concurrency ceiling during the first observation period. The durable
queue remains a recovery and momentary-backpressure mechanism. The current
Worker starts accepted jobs concurrently without a fixed count ceiling. Each
job still passes through the existing transactional lease, at-most-once
provider-submission guard, and exact credit settlement. On SIGINT/SIGTERM the
Worker stops taking queue items and waits for every in-flight promise before
closing shared resources. The staging Worker receives five minutes of
container stop grace for the configured three-minute provider poll timeout;
the eventual reviewed production topology must preserve at least that relation.

Reject only new generation submissions when host `MemAvailable` is below 500
MiB or root-filesystem usage is at least 80%. Do not cancel or resubmit in-flight
provider work. Keep non-generating surfaces available when their dependencies
are healthy, and require an operator to clear the protection state after
reviewing the cause. CPU use has no initial rejection threshold. Monitoring
must record active jobs, submission rate, transient queue depth/age, application
and provider latency/failures, PostgreSQL/Valkey pressure, restarts, host memory,
root disk, and backup freshness so later capacity decisions use observed data.
The Node production Web runtime reads `/proc/meminfo` and root-filesystem
statistics immediately before submit/retry persistence. When either boundary
trips—or those observations are unavailable—it returns the normalized
recoverable resource-protection error and latches until the operator reviews the
cause and restarts Web. Other healthy handlers stay available. The thresholds
are deliberate product policy rather than environment-tunable capacity limits.

ADR 0018's `alibaba-managed-state-v1` profile remains the future scale-out
target: separate x86 ECS, RDS PostgreSQL 17 High-availability Edition, and
private Tair standard master-replica. Capacity observations may justify
vertical growth first, but neither a threshold nor this document authorizes a
purchase.

### Controlled-alpha release gate

ADR 0024 adds `controlled-alpha-v1` before the complete seed-production gate.
It is deliberately evaluated by a different command:

```bash
npm run production:alpha-gate -- --evidence-file \
  /var/lib/goodgood-production/controlled-alpha/readiness.json
```

Use `infra/production/controlled-alpha-readiness-evidence.example.json` only as
a schema template; it is intentionally blocked. Passing evidence must bind the
same immutable image, full revision, migration, and runtime-config checksum as
the deployed candidate. It requires current artifact/preflight evidence plus
the maintenance-closed admission/disclosure baseline, one controlled non-owner
journey, fresh encrypted recovery and maintenance re-entry, and the minimum
operator signal/manual-response handoff. Evidence stores no email, prompt,
image, object key, signed URL, cookie, or credential.

The controlled-alpha artifact lifetime is seven days and its preflight lifetime
is 72 hours, conditional on a fresh read-only baseline proving the protected
release/runtime identity is unchanged. Any identity change invalidates both.
The full seed and paid gates retain their existing evidence lifetimes.

This command is a verifier, not a release action. It has no execute flag and
does not remove maintenance. `production:seed-gate` and
`production:seed-release-plan` remain the full seed-production controls and
continue to fail while their deferred privacy, deletion, content-report,
monitoring, incident, and rollback evidence is absent. The step-by-step live
procedure is `infra/production/CONTROLLED_ALPHA_RUNBOOK.md`; C7 retains a
separate `publicTrafficOpen` approval.

### Production retention and account deletion

ADR 0022 accepts the production policy. Migrations 0013-0019, the administration
POST boundary, and the two-confirmation `/admin/users` control implement and
verify request creation, the non-content wait step, private-object deletion, and
transactional creative-record deletion plus a fake-adapter external-identity
step and final GoodGood-local anonymization/completion locally, but no production
deployment or operator execution is authorized.
Consumed login attempts are deleted 24 hours after consumption, unconsumed
attempts 24 hours after expiry, expired/revoked sessions after 30 days, expired
root drafts through a daily pass after their 30-day sliding expiry, and
unreferenced private references through the existing bounded 30-day cleanup.
Normal projects, generations, assets, and private bytes remain while the account
lifecycle is open, regardless of access state, and has no verified deletion
request.

A verified account-deletion request must immediately suspend access, revoke
sessions, and block Authing-backed re-entry. A retry-safe workflow then has 30
days to delete or anonymize the GoodGood owner, delete its creative records and
all owned private R2 bytes, and complete Authing disablement plus deletion or
anonymization. Credit-ledger and administrative audit evidence is anonymized and
retained for 12 months after deletion completion before controlled removal or
irreversible aggregation. Deletion progress is not a fourth account status.

The first entry point is the existing site-owner-only `/admin/users` page with
two distinct confirmation steps. Request creation remains a POST-only,
CSRF-protected, idempotent administration mutation and must reject the acting
site owner on the server. It opens the lifecycle and stops access; it does not
execute or attest the downstream destructive steps synchronously. There is no
member self-service route in this phase. Deleting a site-owner account requires
a separate exact-target runbook and approval.

For the seed phase, verify the account holder manually: receive the request from
the account's current registered email, reply to that same address, and require
the user's explicit confirmation reply within 24 hours. If the address changes,
does not match, or the reply is late, restart verification and do not create the
request. Record only request/confirmation timestamps and the mail provider
message/reference ID. Do not copy email subject/body into GoodGood, application
logs, or release evidence. This policy does not itself install or authorize an
email connector.

At request creation, deny new login, generation submission, and user retry. Do
not cancel or resubmit an O1Key task whose persisted submission guard has
already crossed the billable boundary, and do not start a fallback. Keep the
Worker available only to finish the existing bounded poll/result-ingest path
and settle or release credit exactly once. Any late result stays private and
unreadable to the suspended owner, then joins the deletion set. Do not run the
destructive content phase until all provider-submitted attempts are terminal;
a stuck task keeps the request incomplete and alerts the operator without
moving the 30-day deadline.

Cancel every accepted job that has not crossed the persisted provider-
submission guard in the deletion-request PostgreSQL transaction. Release its
reserved credit exactly once, set terminal `cancelled`, and make its outbox work
ineligible; issue no O1Key request. Do not claim atomic mutation across
PostgreSQL and Valkey. A stale at-least-once Valkey delivery must re-read the
terminal database state, call no provider, and acknowledge the item. Exercise
both race outcomes around the submission guard before production scheduling.

Treat the final `/admin/users` request submit as the irreversible boundary.
Before it, cancelling either confirmation persists no verification metadata or
product mutation. After it, provide no withdrawal, reopen, or restore command,
endpoint, or lifecycle transition. A mistaken committed request is handled by
the incident runbook for alerting, evidence, and process correction while the
deletion lifecycle continues; the runbook must not reconstruct sessions, jobs,
credit, content, or remove deletion-register evidence.

Before installing any cleanup timer, add and review the additive schema,
operator runbook, exact dry-run/execute boundaries, lock/lease behavior,
resource bounds, non-personal evidence format, named alert owner, and rollback
behavior. The first production execution requires independent verification.
The existing reference cleanup is not silently scheduled by this decision.

Migration 0014 does not install a timer or runtime command. Its in-process local
service can only inspect aggregate lifecycle counts and advance
`wait_for_submitted_jobs`; it has no object-storage, Authing, or content-deletion
dependency. Production migration and invocation remain unauthorized.

C6-2D adds only an in-process local inventory preview. It may run after the wait
step is complete and returns six aggregate counts plus a versioned SHA-256 from
a read-only PostgreSQL snapshot. It neither persists the preview nor lists
object keys to an operator, and it has no R2/Authing client, destructive SQL,
runtime entry point, timer, deployment setting, or production authorization.
Any later execution must recompute and bind current evidence in its own reviewed
boundary.

C6-2E remains an imported in-process service with no CLI or timer. Its real
integration test uses only the workstation's disposable `goodgood-local` RustFS
bucket, creates random-prefix fixtures, proves a redacted failed attempt, and
deletes one object per bounded pass. An unexpired pending upload key remains
present until its signed PUT window and clock-skew grace are made expired; the next pass deletes it
and every exact target then returns 404. Test cleanup leaves that random prefix
empty.

C6-2F is also import-only. Its leased PostgreSQL pass starts only after private-
object completion, deletes one disposable owner's complete creative graph in a
single foreign-key-ordered transaction, and retains the GoodGood/Authing identity,
request/register, sessions, credit account, ledger, payment, and administrative
evidence. A failed pass rolls back all row and ledger-link changes before a
bounded retry. Neither slice connects to the production `goodgood` bucket, reads
production credentials, changes a host unit, deploys an image, installs a timer,
or authorizes production invocation.

C6-2G remains import-only and requires an explicitly injected identity adapter;
there is no default Authing implementation. Its disposable in-memory test
directory proves disable-before-delete ordering, partial-failure retry, local
mapping retention, lease loss, and redacted logs after creative completion. It
adds no Authing management endpoint, credential, network call, runtime command,
timer, host unit, or production authorization. Before any real adapter is
written, review Authing's exact management API, least-privilege application
credential, rate/error contract, deletion semantics, and isolated test-tenant
evidence as a separate approved slice.

C6-2H is also import-only. After fake external deletion evidence, its disposable
local integration transaction expires available credit, closes the account,
deletes revoked sessions and local identity mappings, pseudonymizes the owner,
scrubs the request mail reference, and fixes register retention at 12 months.
Failure rollback and retry are proven against local PostgreSQL. Existing ledger
and administrative evidence is not rewritten. There is no CLI, route, timer,
host unit, credential loader, network call, migration execution against the
Hong Kong database, or production authorization in this slice.

C6-2I adds the opt-in `authing-node-sdk` adapter but no process selects it yet.
Its public-cloud management host defaults to `https://api.authing.cn`; any
configured non-loopback host must be an HTTPS origin. The explicit insecure
exception accepts HTTP only on loopback and exists solely for the disposable
fake-endpoint suite. The adapter requires an exact expected OIDC issuer and uses
the verified OIDC subject only as `user_id`. It performs only user lookup,
status update to `Suspended`, and one-user batch deletion, and validates every
business response before returning success.

C6-2J remains import-only. It composes the existing five deletion passes into a
single bounded invocation with aggregate before/after observation, fixed-code
alerts, and redacted completion output. It always requires an injected identity
adapter and has no default Authing selection. No package command, executable
runtime entry point, timer, systemd unit, Compose role, credential path,
production endpoint, or Hong Kong invocation is added. Production scheduling,
exclusive-worker operation, alert delivery, and runbook evidence require later
reviewed slices.

C6-2K is also import-only. It can create a version-1 deletion-register artifact
from a PostgreSQL pool and replay an artifact against an already migrated,
isolated database, but it does not write a host file or alter the production
backup/restore shell scripts. The artifact contains internal UUIDs and therefore
must later be placed only in encrypted, root-restricted off-host recovery
storage. A restore invocation must receive the exact expected SHA-256 from
independent trusted evidence; the embedded digest alone is insufficient. Any
processing record returns `ready: false`. No restored candidate may gain a
network or health-check path until replay returns ready and absence verification
passes. Packaging, artifact freshness/retention, Restic snapshot binding, host
permissions, and production restore-drill wiring were completed in local source
by C6-2L.

C6-2L changes a production automated backup from one plaintext staging file to
one transient root-only three-file recovery point:

```text
production-auto-<UTC>.dump
production-auto-<UTC>.account-deletion-register.json
production-auto-<UTC>.recovery-manifest.json
```

The dump is created and validated first. The register is exported afterward by
the exact immutable image in the protected production `release.env`, using only
the internal `goodgood-production-state` network. If GoodGood application
containers are running, every one must match the configured reference and local
image ID; if Web/Worker are intentionally stopped for maintenance, the already-
local configured image remains usable. A network-none command
then creates and verifies the strict manifest. All files must be root-owned,
non-symlink regular files with mode `0600`; Restic encrypts the three paths in
one snapshot tagged `production`, `automated`, `postgresql`,
`deletion-register`, and `recovery-point`, after which the host plaintexts are
removed. A failed or partial invocation removes only files it created and never
overwrites or deletes a pre-existing target.

`restore-latest-drill` selects only snapshots with all five tags and exactly
three exact paths sharing one stem. It rejects snapshots older than one hour,
restores every file as root-only `0600`, and requires the manifest's immutable
GoodGood image to exist locally (`--pull never`). PostgreSQL still restores in
a `network=none`, read-only, tmpfs-backed container. The bound application image
shares only that container's network namespace, verifies the files and manifest,
and replays the deletion register over loopback before row-count evidence is
accepted. Any processing record or mismatch prevents `recovery_ready=true`.
The former one-file production snapshots have no recovery-point tags and are
not eligible for this drill, though normal retention still ages them out.

This is reviewed local source only. Do not replace the installed production
scripts or application image, create a new snapshot, run a restore drill, or
change the existing timers without a separate Hong Kong execution approval.
The first approved rollout must publish an image containing
`server/runtime/account-deletion-recovery.mjs`, install both reviewed scripts,
create a fresh three-file snapshot, and complete the isolated drill before
claiming production recovery evidence.

C6-2M adds the next production source boundary but does not activate it.
`server/runtime/account-deletion-cycle.mjs` is production-only and executes
exactly one fixed-bounds C6-2J cycle. It rejects inline secrets, reads only the
four exact container secret paths, accepts only the internal
`postgres:5432/goodgood` database, exact HTTPS OIDC issuer, and the private
Cloudflare R2 `goodgood` bucket in verify mode. Its dedicated resources use a
two-connection PostgreSQL pool and one private S3 client; no Redis, O1Key
provider, public storage client, or OIDC application secret is loaded.
PostgreSQL `SELECT 1` and R2 `HeadBucket` must pass before the Authing adapter
is constructed.

`compose.production.account-deletion.yaml` is deliberately separate from the
normal blue/green application file so absent management credentials cannot
block Web/Worker release parsing. The one-shot role has no port, uses
`pull_policy: never`, mounts only the application R2 credential and these
future dedicated management files, and is read-only with 0.5 CPU, 384 MiB, and
128 PID limits:

```text
/etc/goodgood/production/secrets/account-deletion/authing-access-key-id
/etc/goodgood/production/secrets/account-deletion/authing-access-key-secret
```

Both must eventually be root-owned, non-symlink files in the production
secret-reader group with mode `0640`; neither belongs in `release.env`,
`runtime.env`, shell arguments, or logs. The root wrapper also verifies the
existing production R2 secret files, protected release/runtime files, exact
GoodGood GHCR digest, and already-local image. It takes a nonblocking
`/run/lock/goodgood-production-account-deletion.lock` before invoking the
standalone Compose role. The runtime returns `0` only for `ok`, `2` for
`attention`, `3` for `aborted`, and `1` for a fixed-code runtime failure; lock
overlap returns `75`.

The checked-in systemd service is a four-minute oneshot and the persistent
timer requests one run every five minutes with up to 30 seconds of jitter.
The failed unit plus `account_deletion.*` aggregate JSON journal events are the
vendor-neutral monitoring handoff; this repository does not select a
notification destination or acknowledge incidents. Before installing or
enabling anything, publish and retain the exact new image, prove an acceptable
least-privilege Authing credential against one separately approved disposable
identity, restrict the role's outbound path to Authing management and the
production R2 endpoint, assign the alert owner, and test firing plus resolved
delivery. Source deployment uses the reviewed names
`/opt/goodgood-production/compose.production.account-deletion.yaml`,
`/usr/local/sbin/goodgood-production-account-deletion-cycle`, and the two
`goodgood-production-account-deletion.*` units. C6-2M does not perform any of
those host actions.

Do not reuse the OIDC application App Secret for this adapter. The current
official Authing SDK contract instead requires an AK/SK accepted by the user
pool management API. Authing documents the user-pool AK/SK as globally powerful
and describes fine-grained collaborator-admin AK/SK availability separately;
therefore production enabling remains blocked until the actual tenant proves a
credential limited to the three required user methods, or the operator
explicitly accepts and mitigates the global-key risk. Any accepted credential
must be separately rotated, mounted only into the deletion worker from root-
owned `0640` files, excluded from environment variables/logs/commands/Web, and
paired with egress restricted to Authing management plus the production R2
endpoint. C6-2M defines the future exact paths, loader, one-shot Compose role,
wrapper, and inactive units, but adds no secret value, real-tenant call,
installation, timer activation, or Hong Kong change.

C6-2N tested that boundary against the actual Authing user pool on 2026-09-07
after the operator separately approved one controlled, non-owner internal
administrator. Its custom administrator role was associated only with
`/api/v3/get-user`, `/api/v3/update-user`, and
`/api/v3/delete-users-batch`. The live API nevertheless exposed no deployable
least-privilege credential:

- `create-access-key` with `type: userpool` returned an enabled, activated
  credential whose Access Key ID exactly equalled the global user-pool ID. It
  was not separately identifiable or safely revocable and must be treated as a
  global user-pool secret, not collaborator evidence.
- The console implementation uses `type: tenant-co-admin`, but that request
  returned HTTP `422` / API code `4004` for the internal administrator because
  it is not a multi-tenant collaborator.
- Authing's published OpenAPI still describes fine-grained collaborator AK/SK
  as under development. The exposed creation endpoint does not override that
  warning or prove a service credential boundary.

The proof therefore stopped before creating the disposable deletion target or
calling lookup, suspension, or deletion with a scoped credential. No credential
was installed on the Hong Kong host, no production runtime was invoked, and the
timer remains disabled. Do not place the global user-pool secret into the
dedicated deletion secret files. Enabling remains blocked until Authing supplies
a separately revocable collaborator credential, or the operator makes a new
explicit risk decision with reviewed compensating controls or changes the
identity-provider boundary. The policy and non-owner role assignment may remain
as inert configuration, but they are not release evidence by themselves.

Encrypted backups continue to age out as 14 daily / 8 weekly / 12 monthly
recovery points. Every restore remains network-isolated until an independently
retained deletion register has been replayed and deleted identities/content are
proven absent. Keep that non-content register until no retained recovery point
predates the deletion. Verify O1Key's provider-side retention/deletion contract
before seed admission; the current 24-hour result-ingestion window is not itself
proof of provider erasure.

C6-2O performed that public-contract review read-only on 2026-09-07. The current
O1Key API documentation says that an uploaded attachment receives a public URL
valid for 24 hours, readable with unauthenticated GET/HEAD until expiry, and that
generated image URLs are retained for 24 hours. Its asynchronous image section
documents `POST /async/v1/generateImage` and
`GET /async/v1/tasks/{task_id}` but no DELETE operation. The same-date public
`/api/status` responses from both documented API entry points report
`privacy_policy_enabled: false` and `user_agreement_enabled: false`; the public
documentation contains no separate deletion or privacy terms.

Treat those facts as delivery/retrieval lifetimes only. They do not establish
physical erasure of attachment bytes, prompts, task records, generated outputs,
logs, caches, backups, or copies held by the selected upstream model processor.
Before seed admission, obtain written O1Key evidence naming each data class,
processor/subprocessor, storage region where applicable, retention period,
deletion trigger, backup/log treatment, and account-deletion response path. A
reviewed provider-boundary change is the alternative. Until one of those paths
passes, `retention-deletion-policy` remains blocked. The review used no API key,
created no task, generated no asset, and changed no provider or production
configuration.

### Seed moderation and abuse boundary

ADR 0023 and migration 0020 implement the deliberately lightweight seed
boundary. The existing defense layers remain:

- Authing registration may be open, but every new GoodGood account remains
  pending and every creative API resolves only an active account. The site owner
  can approve, suspend, or restore with an explicit durable audit reason.
- Welcome and operator-granted credits are finite, reserve transactionally, and
  cannot overdraw. This bounds ordinary provider spend without adding a hidden
  job-count or concurrency quota.
- References and generated Assets remain owner-private. Reference intent limits
  count and bytes, completion verifies declared size, fully decodes JPEG/PNG/WebP,
  checks actual MIME and dimensions, and generated output is bounded and fully
  decoded before private storage.
- O1Key failures containing moderation/policy/safety rejection indicators become
  the non-retryable `MODEL_REJECTED` product error without exposing raw provider
  text.
- Host memory/disk protection may reject only new submissions under ADR 0021;
  it is a capacity guard, not an abuse or content policy.

Do not misclassify technical validation as content review. Reference completion
and generated-Asset ingestion now record `moderation_state = not_reviewed`.
That state remains owner-private and usable; the selected
`gemini-3.1-flash-image-c-sp` request sends no invented moderation field and
keeps the provider's default safety behavior. GoodGood intentionally adds no
keyword blocklist, local semantic classifier, or third-party moderation
processor. It also adds no fixed per-user pending-job, global queue-depth, or
generation-concurrency ceiling.

Every active account must accept the exact server-owned `seed-v1` version/hash
before reference upload, generation, or retry. A member can report only their
own generated Asset with one fixed category. Creation atomically quarantines
that Asset and stores no prompt, bytes, object key, or free-form allegation.
Ordinary user joins expose only `not_reviewed | accepted`. The site owner sees a
bounded metadata queue in `/admin/users`; opening one exact private preview is
an audited POST. The only resolution actions are reasoned restore to `accepted`
or byte-first removal to `rejected`. Storage failure leaves the Asset
quarantined and the report open. Existing reasoned account suspension handles
repeat or severe violations without a new account state.

Do not mark `moderation-abuse-controls` pass from source tests. A production
rehearsal for the exact candidate must prove policy acceptance enforcement,
owner-only reporting, immediate hiding, audited exact review, both resolution
paths, private-byte absence after removal, account suspension availability,
retained provider default safety, and normalized provider rejection. Evidence
contains only fixed booleans plus policy version/hash and no customer content.

### Clean staging-to-production conversion

There is no ongoing remote staging hostname in the selected phase.
`staging-goodgood.o1key.com` remains reserved and inactive;
`goodgood.o1key.com` continues on the current host and becomes production only
after the clean conversion passes. The decision does not itself authorize a
server connection, reset, deletion, credential change, or traffic transition.

Show a public maintenance page for the entire initial conversion and impose a
four-hour execution limit. Normal application, login, and generation traffic
remain unavailable; expose only the private health/operator paths required by
the reviewed runbook. If the complete gate has not passed at four hours, stop
the attempt and keep the public site in maintenance. Restore the old staging
stack only on a private operator path for diagnosis, never as production, then
fix the cause and schedule another window.

Execute the eventual conversion only through a reviewed runbook:

1. Freeze staging writes and record the exact revision, migration and runtime
   configuration versions, account/credit counts, and object inventory.
2. Produce and restore-verify a final encrypted off-host staging archive. Keep
   it for seven days after conversion passes, then delete it only through a
   separate exact-target approval.
3. Create fresh production PostgreSQL and Valkey state and run all migrations;
   import no staging business or session rows, verify migration 0012 leaves no
   local fixture owner/identity/credit row, and never enable the local seeder.
4. Inventory every object in the existing private `goodgood` R2 bucket, preview
   the exact deletion set, obtain separate destructive approval, delete the test
   objects, and verify the bucket is empty. Rotate its scoped credentials before
   the first production upload.
5. Rotate or replace Authing, provider, storage, backup, database, session, and
   operational secrets for the production role.
6. Run production preflight, then complete normal Authing login and the
   dry-run-first audited site-owner bootstrap.
7. Verify pending-user isolation, approval, credit, upload, generation, signed
   read, backup/restore, candidate health, public synthetic checks, and rollback.
8. Remove the maintenance page only when every required check passes; otherwise
   stop at the four-hour limit without publishing either state as production.
9. Delete old test database, queue, and object state only after a separate
   approval names the exact targets. Delete the final encrypted archive after
   its seven-day safety window under another exact-target approval.

Local development uses local/test-only data, dependencies, and credentials.
Never copy the production database or production secrets to the operator
workstation. CI publishes the immutable image digest; production pulls that
digest and never treats a local source tree as the release artifact.

## Backups and rollback

- Automated PostgreSQL backups plus tested restore procedure.
- Object storage versioning/lifecycle policy where cost permits.
- Migration backup before destructive changes.
- Keep application rollback independent of irreversible schema rollback; prefer
  additive migrations and forward fixes.
- Record deployed commit, migration version, and runtime configuration version.

Install the reviewed staging PostgreSQL tool without modifying the running
dependency Compose definition:

```bash
sudo install -o root -g root -m 0755 \
  /tmp/postgres-backup-restore.sh \
  /usr/local/sbin/goodgood-staging-postgres
```

Create a new custom-format archive at an explicit, non-existing path, then run
the isolated restore drill against that exact archive:

```bash
sudo /usr/local/sbin/goodgood-staging-postgres backup \
  /var/backups/goodgood/staging-20260903T120000Z.dump
sudo /usr/local/sbin/goodgood-staging-postgres restore-drill \
  /var/backups/goodgood/staging-20260903T120000Z.dump
```

Replace the timestamp instead of reusing an existing filename. The tool accepts
only `staging-*.dump` directly under `/var/backups/goodgood`, refuses symlinks
and overwrite, and retains the archive as `root:root 0600` under a `0700`
directory. It verifies the archive catalog before publishing the file.

The restore drill requires zero active GoodGood sessions and zero active
generation jobs so its source/restore row-count comparison cannot race customer
writes. It starts the same immutable PostgreSQL image as a fixed-name,
no-network, read-only container whose database, socket, and temporary files use
bounded `tmpfs`; no port or Docker volume is created. `pg_restore` runs in one
transaction, and the drill compares the complete public table set and every
table's row count before reporting migration and aggregate counts. An exit trap
removes only that fixed disposable container. It never stops, writes to, or
restores over the running staging database. Keep retained archives out of Git
and include them in the operator's encrypted backup retention and access policy.

### Automated encrypted staging database backups

ADR 0014 selects a separate private Cloudflare R2 bucket named
`goodgood-postgres-backups`. Do not reuse the `goodgood` application-object
bucket or any application credential. In Cloudflare, create the bucket first,
keep public development/custom-domain access disabled, and create a distinct
Object Read & Write token scoped only to this bucket. Restic needs list, read,
create, overwrite, and delete access to apply retention and prune. Do not add a
bucket lifecycle expiry rule over Restic's internal objects.

Keep a second copy of the Restic password in the approved operator password
manager; losing that password makes the client-encrypted repository
unrecoverable. The application checkout, application containers, and
application R2 credential must never receive the password or backup R2 secret.
M7 intentionally adds no staging-only outbound alert channel. A failed backup
stays failed in systemd and retains root-journal evidence. ADR 0016 delegates
the unified M8 monitoring and notification route to a separate agent; do not add
QQ Mail or a parallel SMTP path while that handoff is being provisioned and
proved.

Copy the reviewed `infra/staging` directory to a temporary root-readable host
location and install the source-owned tools and units:

```bash
sudo bash /tmp/staging/install-postgres-backup-automation.sh /tmp/staging
```

The installer accepts only Ubuntu 24.04, installs the Ubuntu-maintained Restic
package, installs root-owned scripts and systemd units, verifies the units, and
deliberately leaves the timer disabled. It also reinstalls the checksum-reviewed
manual backup/restore tool used by the automated path.

Copy `/etc/goodgood/staging/postgres-backup.env.example` to
`/etc/goodgood/staging/postgres-backup.env`, replace its R2 account-ID
placeholder, and first create these three backup files with `root:root`
ownership and mode `0600`:

```text
/etc/goodgood/staging/secrets/backups/restic-password
/etc/goodgood/staging/secrets/backups/r2-access-key-id
/etc/goodgood/staging/secrets/backups/r2-secret-access-key
```

The first file must contain at least 32 random characters. The next two contain
only the raw bucket-scoped R2 access-key ID and secret-access key. The backup
runner rejects extra keys, shell expansion, inline secrets, unexpected
backup-secret paths, the application asset bucket, and non-R2 endpoints.

Initialize and exercise the repository directly:

```bash
sudo /usr/local/sbin/goodgood-staging-postgres-backup-automated init
sudo /usr/local/sbin/goodgood-staging-postgres-backup-automated run
sudo /usr/local/sbin/goodgood-staging-postgres-backup-automated check
sudo /usr/local/sbin/goodgood-staging-postgres-backup-automated restore-latest-drill
```

Run the restore drill only after logging out all GoodGood sessions and proving
there are no non-terminal jobs, as required by the manual drill. It downloads
and decrypts the latest snapshot to one new root-only archive, invokes the same
no-network/read-only/`tmpfs` comparison, and removes the plaintext archive on
success or failure. It never restores over the live database.

After repository initialization and the off-host restore proof, exercise the
timer-shaped service path before enabling the timer:

```bash
sudo systemctl start goodgood-postgres-backup.service
sudo journalctl --unit goodgood-postgres-backup.service --since today --no-pager
```

The daily service creates a consistent PostgreSQL archive without stopping the
database, validates its catalog, backs it up with Restic tags `automated` and
`postgresql`, applies `14 daily / 8 weekly / 3 monthly` retention grouped by
host and tags, prunes, and runs a full encrypted-repository data check. Its
local plaintext archive is transient. The timer targets 18:17 UTC (02:17 China
Standard Time) with up to 20 minutes of random delay and catches up once after
a missed schedule.

Only after the initial backup, full check, off-host restore drill, and
timer-shaped service execution all pass, activate and inspect the timer:

```bash
sudo systemctl enable --now goodgood-postgres-backup.timer
sudo systemctl list-timers goodgood-postgres-backup.timer --all
sudo systemctl is-enabled goodgood-postgres-backup.timer
sudo systemctl is-active goodgood-postgres-backup.timer
sudo systemctl --failed
sudo find /var/backups/goodgood -maxdepth 1 -type f -name 'staging-auto-*.dump' -print
```

Passing M7 evidence records only the repository ID/snapshot prefix, timestamps,
archive byte count/checksum, retention result, restore table/row/migration
counts, and timer next-run time. Redact credentials, Restic key material,
database rows, signed URLs, and public host address. A
same-host archive or a successful upload without a restore drill does not pass
the gate. This staging policy does not approve production retention or recovery
objectives.

## Mainland carrier measurement

Measure China Telecom, China Unicom, and China Mobile during a recorded
representative peak period. For API evidence, keep one fixed set of mainland
eyeball probes across repeated rounds and record the carrier ASN, cities,
successful/failed request counts, and end-to-end plus first-byte p50/p95. Treat
a selected probe that goes offline as probe availability, not an application
HTTP error, while still reporting it explicitly.

Public distributed probes are acceptable for API reachability and latency but
not automatically for object throughput. Upload and download evidence must come
from a real browser on each carrier connection, transfer the complete synthetic
non-user payload through the production-shaped signed R2 paths, and verify the
byte count or digest before computing Mbps. Delete the synthetic object after
the test. Never retain a signed query, object key, credential, or response body
in the repository or operator transcript. A probe that supports only
HEAD/GET/OPTIONS, truncates the returned body, or produces physically
implausible timing is explicitly non-qualifying for throughput.

## Observability

ADR 0016 delegates the monitoring platform, collector, dashboard, and
notification-route implementation to a separate agent. GoodGood does not add a
monitoring center or vendor configuration in this slice. Keep telemetry
credentials and notification secrets outside Git and outside application
containers. Do not expose a public metrics endpoint or include queries,
cookies, authorization values, prompts, email addresses, signed URLs, object
keys, or response bodies in telemetry.

The production web process returns a server-owned `X-Request-Id` on every
request and uses it as the customer support ID. Completion logs use normalized
route templates rather than identifier-bearing paths. Provider cost comes from
the provider usage evidence until a supported cost feed exists; customer-credit
amounts must not be relabeled as upstream spend.

Minimum production signals:

- HTTP error rate and p95 latency.
- Generation queue depth, age, success rate, provider latency, and cost.
- Callback failures and duplicate events.
- Database connections/storage and Redis memory.
- Object upload/download failures and ESA cache/origin metrics.
- Structured logs correlated by request ID, job ID, user ID, and provider task ID.

Before seed or paid traffic, the external `monitoring-handoff` evidence must prove
30-day log and 90-day metric retention, all required dashboard panels, alert
ownership/runbooks, and one acknowledged firing and resolved notification.
Severity 1 acknowledgement is due within 15 minutes;
Severity 2 is due within four business hours. Preserve local journals as a
diagnostic fallback, but do not count them as active notification.

The production PostgreSQL gate requires an RPO of at most one hour, an RTO of
at most four hours, and at least `14 daily / 8 weekly / 12 monthly` encrypted
off-host recovery points. The M7 daily staging timer is not production evidence.

### Seed- and paid-production release gates

ADR 0019 first added an earlier seed-production gate. It retains the exact
candidate, production preflight, secrets/access, privacy/retention, abuse and
admission controls, production recovery, monitoring handoff, incident
ownership, candidate-health, and rollback requirements below. It does not
require Alipay evidence because checkout and payment collection stay disabled.
Passing that narrower gate authorizes only reviewed seed accounts; it must not
be reported as paid-production approval. ADR 0020 replaces a numeric cohort cap
with reviewed admission. Authing registration may be open, but every new owner
remains pending and cannot use production capabilities until the site owner
approves it. Accounts and their creative content are production data from first
login and therefore remain in the access, privacy, deletion, backup/restore,
redaction, and incident-response scope even while pending. ADR 0022 now supplies
the retention/deletion policy. Its local request UI/API, complete leased
lifecycle, optional Authing adapter, aggregate cycle, and isolated register
replay pass, but production credential/runtime selection, cleanup timers,
provider coordination, encrypted register-artifact backup/restore wiring,
alert delivery, and first production evidence must pass before the corresponding
readiness item can change from blocked to pass.

For the exact immutable candidate digest, require the repository/security/image
gates, matching migration and runtime-contract labels, production preflight,
fresh backup and isolated restore within RPO/RTO, live dashboards, acknowledged
firing/resolved alert tests, separate candidate readiness, public synthetic
checks, queue/database/credit invariants, and a compatible prior-release
rollback rehearsal. Never downgrade the schema during rollback.

Customer checkout remains disabled until ICP/domain, privacy/security review,
support ownership, and the real domestic Alipay merchant sandbox gates pass.
Alert failure never authorizes an automatic deploy, rollback, database restore,
credit grant, or provider resubmission.

#### Production preflight evidence

Use `infra/production/release.env.example` and
`infra/production/runtime.env.example` only as templates. Install their live
copies as `/etc/goodgood/production/release.env` and `runtime.env`, owned by
`root:root` with mode `0600`. Install the four distinct credential files under
`/etc/goodgood/production/secrets/` as `root:<production-secret-group>` mode
`0640`, and record only that group's numeric GID in `release.env`. Symlinks,
empty files, unexpected paths, oversized files, inline application credentials,
and reused credential files fail closed.

From a clean checkout at the exact candidate revision on the Linux release
host, make the immutable digest available to Docker without rebuilding it, then
run:

```bash
npm run production:preflight -- \
  --release-file /etc/goodgood/production/release.env \
  --runtime-env-file /etc/goodgood/production/runtime.env \
  --evidence-reference preflight:CHANGE_TO_OPERATOR_RECORD
```

The command is read-only: it checks the Git revision and derived runtime
contract, inspects the existing candidate image labels, validates the
production origin/callback, file ownership and modes, rejects local auth, fake
payment, loopback dependencies, mutable or mismatched candidates, placeholder
values, non-R2 object storage, and inline Authing/O1Key/R2 credentials, then
runs live Authing OIDC discovery. It never pulls, builds, deploys, migrates, or
starts the candidate.

Only an all-pass report contains an evidence object. Copy that object unchanged
into the matching release's readiness manifest. The object is bound to the full
candidate Git revision and expires after 24 hours under the outer gate. Failed
reports contain no evidence object and never echo credential values, database
or queue URLs, Authing client IDs, or provider responses. The reference must be
a short non-secret operator-record identifier; do not use a signed URL or put a
token in it.

#### Artifact-security evidence ingestion

Use only the raw `artifact-security-evidence.json` file downloaded from the
matching completed GitHub Actions run. The CI upload is intentionally
uncompressed so its workflow-artifact digest covers the exact bytes passed to
the importer. Do not recreate or edit this file locally. The artifact remains
available for 30 days, but the outer production gate accepts its evidence for
only 24 hours.

Run the importer beside the non-secret readiness manifest. Public repositories
need no token. For a private repository, store a read-only GitHub token in a
small regular non-symlink file readable only by the current operator and pass
its path; never put the token itself on the command line:

```powershell
npm run production:artifact-evidence -- `
  --artifact-file C:\ProgramData\GoodGood\artifact-security-evidence.json `
  --evidence-file C:\ProgramData\GoodGood\production-readiness.json `
  --github-token-file C:\ProgramData\GoodGood\github-actions-read-token
```

The importer calls GitHub's Actions API and requires the exact repository,
workflow, `main` revision, run attempt, successful verify/publish jobs, required
security steps, and one non-expired artifact. It hashes the supplied bytes and
compares the result and byte count with GitHub's immutable artifact record.
Only an all-pass report contains an `artifact-security` evidence object. Copy
that object unchanged into the matching readiness manifest. API errors, a
failed scan, a different candidate, or locally modified bytes emit no evidence
and do not expose token or response detail.

Run the repository-owned seed gate against a non-secret evidence manifest for
the unpaid, reviewed-account launch:

```powershell
npm run production:seed-gate -- --evidence-file C:\ProgramData\GoodGood\production-readiness.json
```

Run the unchanged full gate separately before any paid-production approval:

```powershell
npm run production:gate -- --evidence-file C:\ProgramData\GoodGood\production-readiness.json
```

`infra/production/readiness-evidence.example.json` documents schema version 3
and intentionally exits nonzero. A live manifest must pin the exact GHCR digest,
full Git revision, migration filename, and runtime-contract checksum. Every
evidence item present must be a known ID, appear exactly once, and use only a
short non-secret reference. Every check required by the selected gate must be
present, be `pass`, and remain within its declared freshness window.
Artifact-security, production-preflight, candidate-health, and rollback proof
must also bind to that same Git revision. A missing or delegated
`monitoring-handoff` fails both gates. The seed gate alone excludes
`icp-production-domain` and `alipay-merchant-sandbox`; those entries may remain
`blocked` or be omitted while checkout is disabled. The full gate still requires
both to pass. Neither command has a bypass flag, and deferred paid evidence must
never be relabeled as passing.

Passing recovery evidence records observed RPO/RTO minutes and the minimum
`14 daily / 8 weekly / 12 monthly` recovery-point counts. Passing monitoring
handoff evidence records a stable non-personal owner alias, 30/90-day
log/metric retention, observed synthetic request and generation signals,
owned alert runbooks, and acknowledged firing/resolved delivery. Incident
ownership names distinct primary and secondary aliases and preserves the
15-minute Severity 1 and four-business-hour Severity 2 objectives.

Evidence references point to access-controlled operator records; they do not
embed credentials, signed URLs, customer content, or entire reports. Each CLI
emits a machine-readable JSON decision. The corresponding read-only production
orchestration planners consume only their fixed gate:

```powershell
npm run production:seed-release-plan -- plan `
  --evidence-file C:\ProgramData\GoodGood\production-readiness.json

npm run production:release-plan -- plan `
  --evidence-file C:\ProgramData\GoodGood\production-readiness.json
```

If any item required by the selected gate is missing, stale, failed, or blocked,
the result contains no plan and exits nonzero. A passing seed result uses the
distinct `seed-production-release-dry-run` action and does not represent paid
approval. A fully passing selected gate yields digest-bound phases for ADR
0017's exclusive release lock, inactive Web slot, one forward migration,
candidate checks, single-Worker handoff, atomic Nginx switch, public invariant
checks, and observation or slot reversion. The command always reports
`executed: false` and `executionAvailable: false`; it accepts no execution flag
and cannot change production. Implementing those phases still requires the
separately reviewed host/state-service and executable release change.
