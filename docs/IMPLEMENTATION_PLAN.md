# Production implementation plan

- Last synchronized: 2026-09-03
- Current phase: M7 is in progress; the Alibaba Cloud Hong Kong host,
  test-data dependency layer, private R2 configuration, Cloudflare Origin CA,
  host-specific Full (strict) rule, reviewed Nginx origin, Authing callbacks,
  all four application secrets, and ADR 0013's reader-group correction are
  operational; the first healthy digest release is live through Cloudflare and
  interactive Google login passes. The first public real-generation attempt
  exposed a provider/result convergence race after its paid task ID was durable;
  ADR 0008's bounded stabilization amendment is now deployed and one complete
  GoodGood-to-O1Key-to-R2 generation, signed reference transfer, and public
  GoodGood/Authing logout path plus an isolated PostgreSQL restore drill and a
  peak-time mainland three-carrier HTTP baseline plus a compatible prior-image
  application rollback pass
- Current objective: rotate the previously disclosed Google OAuth client secret
  before further shared/staging authentication use, then complete the remaining
  M7 operational audit; full-byte real-carrier throughput is deferred at the
  operator's request, while ICP filing/domain work proceeds in parallel

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
- The physical PostgreSQL schema covers users, external auth identities,
  one-time OIDC login attempts, hashed/revocable GoodGood sessions, reference
  assets, generation batches, jobs, attempts, generated assets, append-only job
  events, queue outbox, owner-scoped projects with batch association, and one
  expiring root creation draft per owner, immutable price versions, exact
  credit-account caches, and append-only credit entries. All ten versioned migrations
  record checksums and tolerate rerun;
  Compose runs them as an explicit one-shot release step before web and worker
  start.
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
- M4 now resolves a provider-neutral external `(issuer, subject)` identity to an
  internal GoodGood owner before every generation read/write. The fixed M3
  owner constant is gone. Local Compose has two explicit test identities and an
  HttpOnly default local session; missing/invalid sessions return 401, disabled
  accounts return 403, and cross-owner job/retry/asset lookups return 404. The
  local adapter now additionally requires `GOODGOOD_ALLOW_LOCAL_AUTH=true`,
  while OIDC mode and the staging preflight reject that switch to prevent test
  identities from leaking into a real environment.
- ADR 0007 selects an Authing-hosted login page with only Google and passwordless
  email verification-code registration/login; Auth0 Japan, self-hosting,
  passwords, phone/SMS, and other social providers are excluded. The backend
  implements OIDC discovery and Authorization Code + PKCE with state, nonce,
  same-browser HttpOnly binding, signed issuer/audience token validation, and a
  required verified email. First login provisions `(issuer, subject)` to a
  stable GoodGood owner without silent email merging, then issues an opaque
  GoodGood session whose token is only stored as a hash. Logout revokes it;
  provider tokens never become browser API credentials. Both production Node
  callback entry points now expire the one-time browser-binding cookie after
  success, cancellation, or any invalid/expired callback without clearing an
  otherwise valid GoodGood session. HTTPS OIDC configuration now also fails at
  process startup unless the GoodGood cookie is Secure and `__Host-` prefixed.
- M4 now includes a secret-redacting `npm run auth:preflight` staging gate. It
  fails closed unless real discovery proves the exact issuer, HTTPS endpoints
  and callback, `/api/auth/callback`, Secure `__Host-` cookies, Authorization
  Code, S256 PKCE, requested scopes, supported server-side client
  authentication, RS256 ID-token signing, and the generated authorization
  request contract. Missing token-endpoint authentication metadata now follows
  the OIDC `client_secret_basic` default; unsupported methods are rejected.
  The runtime repeats this capability gate before authorization and exchange,
  refreshes discovery after at most five minutes, and validates discovery before
  persisting a login attempt so provider drift cannot create unusable state.
  Hosted-page methods, Google configuration, email delivery, and same-subject
  cross-method association remain named manual staging evidence because
  discovery cannot prove provider-console controls.
- On 2026-08-31, the real isolated Authing tenant's public discovery passed the
  GoodGood loopback preflight for exact issuer, Authorization Code, S256 PKCE,
  requested scopes, supported server-side client authentication, RS256 support,
  endpoint transport, authorization request parameters, and hosted logout
  construction. The operator separately confirmed RS256 is selected in the
  application console. A hosted-page screenshot showed only email verification
  code and one Google button, with no password, phone, or other social method.
  A subsequent Google-first loopback login used the real application secret and
  completed consent, authorization-code exchange, RS256 token verification,
  verified-email provisioning, callback, and GoodGood session issuance. A
  redacted database check found exactly one real identity, one real owner, and
  one active real session. The operator then logged out through GoodGood and
  completed email verification-code login with the same address. A second
  redacted check still found one Authing subject, one external identity, and one
  GoodGood owner; two sessions existed with the Google session revoked and only
  the email session active. This proves email delivery, email token exchange,
  GoodGood logout revocation, and Google-first same-subject association.
  At the operator's request, the reverse email-first then Google order is
  deferred rather than counted as passing evidence.
- The real-tenant local launcher now accepts only the public issuer, application
  ID, and optional loopback port as command arguments. It requests the Authing
  application secret with invisible terminal input, mounts a permission-limited
  temporary file into only the web container, runs the OIDC preflight, and
  removes the file when the stack stops or startup fails. The base Compose path
  remains fixed to explicitly opted-in local identities; the separate override
  disables them and permits an insecure cookie only for an explicitly allowed
  loopback callback. Production HTTPS still requires `Secure` and `__Host-`.
  The launcher cleanup reuses the same public Compose interpolation values, so
  a failed start can stop its partial stack without requiring credentials to be
  re-entered; named data volumes remain intact.
- Explicit OIDC logout now revokes the hashed GoodGood session and expires its
  cookie before returning a server-constructed Authing hosted-logout URL to the
  browser for top-level navigation. The return target is fixed to the GoodGood
  origin derived from the login callback; no ID Token is retained and callers
  cannot supply a redirect. Local mode keeps its no-provider `204` behavior.
  Real Authing session termination and its logout callback allowlist still
  require staging evidence.
- M4 now persists owner-scoped `ReferenceAsset` upload intents and returns
  short-lived signed PUT URLs for direct browser-to-RustFS transfer. Completion
  re-reads the private object and uses Sharp to verify declared size, decoded
  JPEG/PNG/WebP type, complete pixels, 64–8192 dimensions, 40 MP, and the 20 MB
  limit before marking it ready. Rejected uploads remain auditable; generation
  accepts at most 10 ready references owned by the caller, snapshots their
  stable order/object keys, and gives the worker fresh signed read URLs.
- M4 now persists owner-scoped projects with idempotent creation. Save verifies
  every ready reference and submitted job against the authenticated owner,
  transactionally associates batches, and rejects reassignment. Restore returns
  the latest prompt, ordered ready references, stable parameters, and all jobs
  newest-first with fresh private-object signatures. Continuing generation in
  a project verifies owner access before reference resolution and updates the
  project snapshot in the same transaction as the new batch/job. Project list
  loading, empty, read failure, and drawer save failure preserve useful UI
  state; `新建创作` remains available from the project view and restored context.
- `/projects` and `/projects/:projectId` now mount the shared workspace over the
  owner-scoped project API. Stable IDs are encoded in URLs; direct access and
  refresh wait for authentication before restore; native history supports
  back/forward without discarding an untouched composer; and detail-read failure
  retains the URL with retry, return, and `新建创作` exits. Saving a project
  replaces the current history entry with its stable detail URL, and login keeps
  the requested route as its validated return path. A local browser smoke passed
  index refresh, detail refresh/failure recovery, back/forward, and preservation
  of an unsaved prompt across project-index navigation without console errors.
  After rebuilding the secure Authing loopback stack with its named volumes, the
  operator opened the existing persisted project at its stable detail URL and
  confirmed refresh plus browser back/forward all restore it correctly under the
  real GoodGood session.
- In-app new-session clearing and different-project restore now compare the
  current prompt, ordered reference/status set, stable generation settings, and
  unprojected work against the last clean or persisted composer checkpoint.
  Meaningful differences open a compact explicit-discard dialog; `继续编辑`
  preserves all state, confirmed discard performs the requested transition, and
  active generation blocks it. Returning to the same loaded project does not
  re-read over current edits. Unit coverage passes for clean, prompt, settings,
  reference order, and unprojected work; a local browser smoke passed cancel,
  explicit discard, clean-state bypass, URL behavior, and console-error checks.
  On 2026-09-01, after restarting Docker Desktop and rebuilding the real Authing
  loopback stack, the operator reported the planned prompt-edit/new-creation and
  clean-session/project-restore confirmation smoke completed successfully.
- The authenticated root creation surface now restores and debounces one
  owner-scoped draft containing prompt, ordered ready references, and stable
  settings. The row expires 30 days after its latest write and uses a monotonic
  optimistic version. A stale tab pauses autosave and offers explicit
  `保留当前内容` / `恢复云端草稿` recovery; project detail never hydrates from or
  writes to the root draft, and saving as a project or confirming a clean
  creation clears it. Load/save errors preserve the current page. Unit, browser
  boundary, isolated PostgreSQL/RustFS integration, refresh restore, and
  two-tab conflict/recovery smokes all passed on 2026-09-01.
- `/create` now mounts the same shared workspace as the compatible `/` entry.
  Product navigation and confirmed clean-creation transitions use `/create`
  without duplicating React state; direct load, refresh, and native Back/Forward
  preserve the composer. Route/unit coverage and a local browser smoke passed
  with zero console errors on 2026-09-01.
- A real-Authing-owner loopback smoke now covers one decoded and accepted
  reference, one supported `nano-banana-2` / 4:5 / 2K / single-output batch, one
  succeeded 100% job, one accepted private generated asset, and one active
  project. Redacted database checks prove every record uses the same real owner,
  the reference snapshot resolves to that owner's ready reference, generated
  asset metadata is complete, the batch is associated to the project, and the
  project snapshot exactly matches the immutable batch snapshot. After logout
  and reauthentication, the browser still listed and restored the saved project.
- The asset-library hydration defect exposed by that smoke is now implemented:
  an authenticated `GET /api/assets` repository/API boundary requires the job,
  batch, and accepted generated asset to share the authenticated owner, returns
  only successful outputs newest-first, and signs private reads freshly. The
  authenticated UI loads durable batches after session resolution and on asset
  navigation, with explicit loading, empty, failure, and retry states. Prototype
  fixtures remain confined to preview mode, and the in-memory completion path
  deduplicates against a later durable reload. After rebuilding the secure
  Authing loopback stack without deleting its named volumes, the operator
  logged out, reauthenticated, opened the asset library, and confirmed that the
  previously stored generated asset reappeared with its signed private read.
- The visible asset library and image detail are now addressable at `/assets`
  and `/assets/:assetId`. Opening detail preserves whether its rail came from
  creation or the asset library, plus the asset mode and source scroll position;
  wheel, arrow, and rail changes replace the stable asset-ID URL rather than
  growing history. Close/Back restores the source, Forward and direct refresh
  restore detail, and a missing/inaccessible ID retains its URL with retry and
  return recovery. A 2026-09-01 preview-browser smoke passed batch-to-gallery
  state retention, detail open, arrow-key URL replacement, close, Forward,
  direct refresh, missing-ID recovery, and zero console errors.
  The operator then rebuilt the real Authing loopback stack against its retained
  named volumes and reported the persisted `/assets` and `/assets/:assetId`
  checklist passing, including mode retention, refresh, arrow/wheel URL changes,
  Back/Forward, and missing-ID recovery.
- Bounded reference retention is now implemented as an opt-in one-shot
  maintenance role. Its default is a read-only preview; only explicit
  `--execute` stages eligible expired/rejected/old-unreferenced rows behind a
  grace window, claims at most the configured batch with expiring leases,
  deletes private bytes first, and then records terminal evidence. Failed
  storage deletion keeps `OBJECT_DELETE_FAILED` retry evidence. Generation and
  project snapshot writes share a PostgreSQL lifecycle lock with cleanup and
  revalidate ready rows inside their write transaction; generation, project,
  and unexpired creation-draft snapshots are checked again during staging and
  claim. Unit and isolated PostgreSQL/RustFS
  integration tests passed object deletion, protected-reference survival, and
  repeated-run idempotency. Container dry-run and explicit execution entry
  points both passed; automatic scheduling remains disabled.
- The durable generation capability is now limited to `nano-banana-2`, 1:1,
  1K, and one output for the faster M5 MVP, and accepts up to 10 validated
  references. The composer shows restrained uploading/failure states and blocks
  submission until every retained reference is ready.
- The isolated Authing application, Google connection, hosted login controls,
  account-association setting, and RS256 selection now exist outside the
  repository. Google and email-code token exchange, email delivery, first-login
  provisioning, repeat account login, Google-first same-subject association,
  and GoodGood session revocation now pass on loopback. Email-first association
  remains unverified; the public HTTPS callback/logout path now passes in Hong
  Kong staging. Operator-observed
  authorization cancellation, exact callback replay rejection, expired and
  reused email-code rejection, fresh email-code success, and Authing
  hosted-session exit now pass on loopback. In-app destructive clearing has
  explicit unsaved-change
  confirmation, and authenticated unprojected prompt/reference/settings now
  survive reload through the bounded root draft. The
  durable asset-list boundary and its real-session reauthentication smoke now
  pass. Customer checkout is not implemented; generation metering, credit
  balances, and the temporary operator payment-recording path are implemented.
  The O1Key gateway route is implemented locally and has passed one real
  credentialed URL-output smoke.
- Web and worker readiness now check PostgreSQL, Valkey, the RustFS bucket, and
  mock-provider access. Liveness remains dependency-independent. The production
  Node server owns the TCP-backed API and authenticated owner boundary; the
  existing Cloudflare/Sites prototype cannot host this PostgreSQL/Valkey slice
  and is not deployment evidence for this backend.
- The production image bundles the six Node runtime entry points with locked
  dependencies instead of copying the full root production graph. The latest
  revision-labelled `goodgood:draft-test` verification image is 107,538,314
  bytes, runs as the non-root `node` user with a read-only root filesystem, and
  has no host mounts.
- M7 CI now pins GitHub and Docker actions by full commit, runs the locked
  install plus `check:local` on pull requests and trusted main revisions, and
  performs a real no-push Docker build for pull requests. After verification,
  only a trusted `main` or main-branch manual run receives repository-scoped
  `packages: write` and publishes one GHCR tag named by the full source SHA.
  The image and workflow summary record the immutable digest, source revision,
  latest migration filename, and checked-in runtime-configuration checksum;
  no `latest` tag, personal registry credential, or unpinned external action is
  accepted. Remote CI run 33603482529 passed both jobs for revision
  `8c404ddde09534f488682b42727cbf41d9570dae` and published
  `ghcr.io/lizhongyi1209/goodgood@sha256:43444ff03a20fbdf3dc80cc97181b64aeda05c6b80af706ce334fcd074f374b8`.
  Its summary recorded migration `0010_m6_payment_sandbox.sql` and runtime
  configuration contract
  `a44a7deda34a235a03be37cbf7a38509d02bfe6933d01e1bd5a6b57893c67c8a`.
- M7 now has a separate, application-only `compose.staging.yaml` contract. It
  accepts only the GoodGood GHCR image by exact sha256 digest, mounts Authing
  and O1Key credentials from distinct files, keeps web/worker ports on host
  loopback, and does not inherit a source build, local authentication, mock
  generation, fake payment, or local dependency credentials. Non-secret release
  identity, runtime configuration, and secret-source paths are separated.
  `npm run staging:preflight` fails closed on mutable/mismatched release
  metadata, unsafe transports/CORS, inline provider secrets, loopback
  dependencies, runtime revision overrides, local/test adapters, unreadable
  secret files, or malformed environment files without reporting secret or
  connection values. `npm run staging:release` previews by default; explicit
  deployment repeats the live Authing gate, verifies pulled OCI labels, runs
  one forward migration, and waits for web/worker readiness. Rollback selects a
  prior digest and restarts only compatible application roles; it never attempts
  a schema downgrade.
- On 2026-09-03, the purchased Alibaba Cloud Hong Kong Ubuntu 24.04 staging
  host passed its first SSH and capacity inspection: 2 vCPUs, 3.4 GiB
  guest-visible memory, 49 GiB root filesystem with 44 GiB initially free, and
  only SSH listening publicly at the operating-system boundary. ADR 0011
  records the provider change. A `goodgood` non-root sudo account received the
  bound public key and passed an independent login plus non-interactive sudo
  check before SSH was reloaded. Effective SSH configuration then proved
  public-key authentication enabled and root, password, keyboard-interactive,
  and empty-password login disabled; a fresh `goodgood` session still passed
  while a root-key attempt failed as required. No application, dependency, or
  live credential was installed in this slice.
- The same host then ran the checksum-verified, repository-owned
  `infra/staging/bootstrap-ubuntu-host.sh` and rebooted cleanly. It applied 274
  base updates, upgraded `fwupd`, retained Alibaba's explicit `cloud-init` apt
  hold, installed Docker Engine 29.7.2 and Compose 5.5.0 from Docker's signed
  Ubuntu repository, enabled bounded local-container logs and live restore,
  and gave the existing `goodgood` sudo account Docker access. A persistent 2
  GiB swap now reports swappiness 10 and cache pressure 50. UFW permits only
  22/80/443, Nginx 1.24 is installed but disabled/inactive pending reviewed TLS
  configuration, and only SSH listens publicly at the host boundary. After
  reboot, Docker/containerd, Alibaba Aegis, and Alibaba Cloud Monitor were
  active; systemd reported no failed units, root SSH remained denied, and the
  49 GiB root filesystem retained 41 GiB free. No GoodGood application,
  database, queue, object data, or live credential was deployed in that slice.
- The host now runs the separately operated
  `compose.staging.dependencies.yaml` test-data stack: digest-pinned PostgreSQL
  17.11, Valkey 8.1.9, and RustFS 1.0.0-rc.3 all reached healthy. PostgreSQL and
  Valkey have no host port; RustFS has its console disabled and publishes only
  `127.0.0.1:9000` through a one-member storage-origin bridge, while all three
  share an internal application dependency network. The installer generated
  credentials only on the host, mounted PostgreSQL/RustFS values from files,
  rejected implicit rotation, and verified that no credential appears in
  Docker metadata. Live queries returned PostgreSQL `1`, Valkey `PONG`, and a
  RustFS ready response. Enforced limits are 768 MiB / 0.75 CPU / 256 PIDs for
  PostgreSQL, 256 MiB / 0.25 CPU / 128 PIDs for Valkey, and 1 GiB / 0.75 CPU /
  256 PIDs for RustFS; idle observed usage was about 70 MiB combined. The host
  retained 40 GiB free, 2.8 GiB available memory, unused swap, and no failed
  systemd unit after deployment. This is single-node test-data evidence, not a
  production durability claim.
- The operator selected `goodgood.o1key.com` as the canonical application
  hostname and `assets-goodgood.o1key.com` as the reserved asset hostname.
  Read-only DNS/HTTPS checks confirmed both are Cloudflare-proxied, with the app
  returning 521 while Nginx is intentionally inactive and the asset hostname
  exposing the R2 public custom-domain path. ADR 0012 therefore accepts the
  existing private Cloudflare R2 `goodgood` bucket as M7's authoritative store
  through the account S3 API endpoint and rejects direct custom-domain object
  delivery. The staging contract now requires region `auto`, path style, exact
  app-origin CORS, file-mounted R2 credentials, and verification-only bucket
  startup so the application can use a bucket-scoped Object Read & Write token
  without Admin permission. Local RustFS retains automatic provisioning; its
  same-host staging instance is now explicitly non-authoritative. The remote
  dependency fragment was safely regenerated with only `DATABASE_URL` and
  `REDIS_URL`. A repository-owned Nginx installer, canonical site, and current
  Cloudflare origin allowlist were added; the host generated a matching P-256
  private key and CSR under `/etc/goodgood/staging/tls` and kept the key
  root-owned mode `0600`.
- On 2026-09-03, the signed-in Cloudflare dashboard confirmed the `goodgood`
  bucket has neither a custom domain nor an enabled `r2.dev` URL. Its exact
  CORS rule now permits only `https://goodgood.o1key.com` for `GET`, `PUT`, and
  `HEAD`, with `content-type` and `x-amz-*` request headers, exposed `etag`, and
  a 300-second maximum age. The account-level service token
  `goodgood-staging-r2` is active with Object Read & Write permission scoped
  only to the `goodgood` bucket. Its S3 credentials were transferred without
  entering the repository and installed in the two files referenced by the
  release contract; workstation and remote staging copies were removed after
  installation. ADR 0013 subsequently changes all four application-secret
  files to `root:goodgood-runtime-secrets` mode `0640` so the non-root image
  user can read only deliberately mounted secrets.
- Cloudflare signed the on-host CSR for exactly `goodgood.o1key.com`; the
  resulting Origin CA certificate is valid until 2041-08-30, matches the
  on-host private key, and is installed root-owned beside it. The reviewed
  Nginx site passed `nginx -t`, is enabled and active, and remains restricted to
  Cloudflare source ranges with a loopback application upstream. Rather than
  changing the zone-wide `Full` mode, active configuration rule
  `goodgood-full-strict` sets `Strict` only when the hostname equals
  `goodgood.o1key.com`. A public HTTPS request now reaches Cloudflare and the
  origin and returns the expected application-upstream `502`; the previous
  inactive-origin `521` is gone. Application health is not claimed until the
  digest release starts the loopback web process.
- On 2026-09-02, `npm run check:local` passed on Windows with Node.js 24.12.0:
  lint, full TypeScript check, production build, and 96 tests completed with 95
  passing and the opt-in Compose integration test skipped by design. The
  2026-08-31 checkpoint separately passed both the base Compose configuration
  and the Authing loopback override configuration. The real tenant's public discovery also
  passed all 16 loopback preflight checks without printing either client
  credential; the later Google and email-code loopback token exchanges both
  passed with the operator-entered secret kept outside the repository.
- The rebuilt final Linux image loaded its copied Sharp native dependency as
  the non-root `node` user and decoded a generated 64×64 PNG successfully.
- The real Linux Compose stack reached healthy on temporary loopback ports.
  `npm run stack:verify` passed on an isolated `127.0.0.1:3100` web override,
  and the opt-in integration test passed all eight migration reruns,
  missing-session rejection, signed reference PUT CORS,
  decoded-image validation/rejection evidence, two-owner reference/job
  isolation, referenced generation, signed reference/asset reads, project create
  idempotency, signed project restore, newest-first ordering, project
  continuation, cross-owner project denial, generation idempotency conflict,
  duplicate delivery, provider rejection, retry, timeout, and forced
  worker-restart cases plus owner-isolated draft save/read/delete, stale-version
  conflict, reference cleanup, protected snapshots, cleared-draft reference
  eligibility, and idempotent repeated execution. The latest draft verification
  used an isolated `127.0.0.1:3300` Compose project; its containers, network,
  and three disposable data volumes were removed afterward. The separate real-Authing
  loopback stack and its retained named volumes remain healthy on port 3100.
- The same Compose integration now also proves real PostgreSQL first-login
  provisioning, hashed-session lookup, logout revocation, same-browser login
  binding, local session/account endpoints, and rejection after revocation. A
  local mock OIDC issuer proves signed token verification without any real
  Authing, Google, or email secret. Browser inspection confirmed the no-env
  preview, account card, and unchanged quiet creation state with no console
  errors. Authing's default application domain is the accepted no-ICP path;
  branded custom-domain setup is deferred.
- The existing Vinext 0.0.50 `image-size` 2.0.2 advisory remains. M3 ingests only
  the checked-in trusted mock output. Reference validation does not use that
  package: it decodes with the directly pinned Sharp 0.34.5 dependency and the
  Linux image test passed. A tested Vinext upgrade plus runtime-image scan is
  still required before staging.
- Composer removal still only detaches the item immediately; private-byte
  cleanup follows the asynchronous server policy. Scheduling and production
  retention periods remain deliberately unapproved until a staging dry-run,
  storage-provider lifecycle comparison, duration metrics, and alert owner
  exist.
- M4 exit audit on 2026-09-01 found no remaining local implementation slice.
  Identity/session security, owner isolation, reference upload/cleanup,
  project persistence, durable asset reads, root drafts, unsaved-change
  protection, and addressable routes all have automated, isolated-stack, and
  browser evidence. All requested Authing-operated loopback checks also pass.
  Public transport proof remains required before release but was explicitly
  deferred by the operator to the M7 staging gate.
- M5 now implements the documented O1Key image contract locally. Stable
  `nano-banana-2` maps only to special-price
  `gemini-3.1-flash-image-c-sp`; the faster MVP and durable composer contract are
  1:1, 1K, one output. The adapter uploads validated references as ordered
  multipart attachments, submits the returned 24-hour public HTTPS URLs as
  explicit `fileData`, normalizes O1Key polling states and failures, bounds each
  request and the overall poll, prevents terminal regression, and resumes a
  durable task ID after restart. No R2 bucket is required: RustFS remains the
  private source and destination, while O1Key temporary URLs are transfer-only.
  The worker now selects an explicit persisted mock or O1Key route. The O1Key
  route reads ordered private RustFS reference bytes, uploads them temporarily,
  resumes the durable provider task, bounds and fully decodes JPEG/PNG/WebP
  output, derives its stored extension from decoded type, and reuses the existing
  terminal Asset/job transaction. A route mismatch defers instead of polling the
  wrong provider. The base Compose stack remains mock-backed.
- An isolated `npm run stack:o1key-local` launcher now requests the key through
  invisible terminal input, writes a mode-0600 temporary file, and mounts it into
  only the worker through `compose.o1key-local.yaml`. It uses a separate Compose
  project, preserves named volumes on stop, and deletes the temporary key. The
  merged Compose contract and fake O1Key path pass without a real credential.
- On 2026-09-02, a dedicated O1Key test-token group completed one real
  `nano-banana-2`, 1:1, 1K, single-output generation with one validated
  non-sensitive reference. The route uploaded the reference, persisted and
  polled the provider task to `SUCCESS`, downloaded and fully decoded a
  1024×1024 JPEG, stored 327,299 private bytes in RustFS, committed the durable
  Asset, and restored it through the authenticated asset API. No credential,
  temporary provider attachment URL, or generated user bytes entered the diff.
  The dedicated group was configured to return a URL; an earlier group returned
  undocumented `b64_json` and was correctly rejected by the URL-only contract.
- That smoke exposed a presentation-only defect: Vinext's `next/image` optimizer
  rejected the intentional loopback RustFS signature as a private-IP SSRF risk,
  leaving a gray asset frame even though generation and storage succeeded. A
  shared private-object image primitive now keeps signed reads browser-direct
  instead of weakening global SSRF protection. Fresh asset-library and stable
  detail-route browser checks both decoded the JPEG at 1024×1024 with no console
  errors.
- A subsequent root-draft refresh exposed the same presentation defect for
  references: the immediate `blob:` thumbnail worked, while the restored signed
  RustFS URL was sent through the optimizer and appeared missing. The persisted
  reference row, private object, and draft snapshot were intact. The composer now
  uses the shared browser-direct primitive for both local upload previews and
  restored references. A fresh `/create` browser load restored the prompt and
  `11.jpg`, decoded its signed 2100×2800 source, and produced no console errors.
- O1Key formally confirmed that image submission has no client idempotency key,
  client-task lookup, or callback recovery: repeated POSTs create distinct
  `task_id` values and charges, while `X-Oneapi-Request-Id` is trace-only. The
  operator accepted that limitation for the MVP in ADR 0008. Browser-to-GoodGood
  idempotency remains intact. The worker now persists the O1Key attempt as
  `submitted` immediately before the billable POST; if recovery finds that
  guard without a durable `task_id`, it fails as `SUBMISSION_UNKNOWN` instead of
  silently posting again. Explicit retry is labeled as a new billable task.
  Known tasks continue polling safely and their result data is ingested within
  the provider's default 24-hour retention window.
- The operator confirmed that New API usage records expose per-request charge
  and refund outcomes for the dedicated group. That record is the accepted M5
  operational cost evidence; no credential or exported usage record is retained
  in the repository. GoodGood-owned pricing and ledger reconciliation remain M6.
- M6 now has a persisted pricing and credit foundation. Immutable
  price versions are selected by stable GoodGood model, resolution, count, plan
  context, effective time, and version; no price or spend amount comes from the
  browser. Each batch/job can retain its exact price snapshot and reservation.
  Owner/unit account caches use exact integer credit and are updated in the same
  PostgreSQL transaction as a signed append-only ledger entry. Operation hashes
  make same-key replay a no-op and conflicting key reuse fail closed. One
  reservation closes through either settle or release, and the current
  single-output settlement permits one full refund. Database triggers reject
  price and ledger update/delete. ADR 0009 records the accepted launch policy:
  Nano Banana 2 costs 10 credits per image at 1K, 2K, or 4K; one CNY 10 paid
  product grants 500 credits without a pack bonus; each owner receives one
  non-expiring 100-credit welcome grant; and no higher-cost provider route may
  silently substitute for the special-price route.
- Migration 0009 seeds a separate version-1 price for each resolution and grants
  all existing owners 100 credits once. New identity provisioning appends the
  same idempotent welcome grant in its user transaction. Live job creation
  reserves 10 credits in its batch/job transaction; accepted Asset persistence
  settles it, and a terminal no-Asset failure releases it. This includes a
  customer-credit release for `SUBMISSION_UNKNOWN` without claiming that New
  API refunded the possibly charged upstream submission. Pre-M6 jobs remain
  compatible and unmetered. An authenticated, no-store `GET /api/billing` read
  now returns exact decimal-string available/reserved balances and all three
  active launch quotes without internal IDs. The shared workspace presents the
  balance on desktop and mobile, keeps `10 积分/张` beside the composer, covers
  loading/error/retry/zero states, and refreshes after queue acceptance and
  terminal job outcomes.
- Migration 0010 seeds the immutable `credits-500-cny` version-1 product at CNY
  1000 minor units for 500 credits. Authenticated order creation accepts only
  the stable product ID and an owner-scoped idempotency key, snapshots exact
  money/credit terms, and exposes only a public order ID. The explicitly enabled
  local fake provider verifies a timestamped HMAC over the raw callback body.
  Its `pending -> paid` transition, append-only event evidence, and one
  payment-authored ledger grant commit together; identical replay is a no-op,
  event-ID conflict and amount mismatch fail closed, and later success events
  cannot grant again. There is no customer checkout or real provider adapter.
- ADR 0010 selects domestic Alipay for customer checkout only after ICP filing,
  matching merchant approval, and sandbox verification. Until then, the
  operator-only manual-payment runtime previews by default and can explicitly
  record an already received and independently invoiced payment. It resolves
  one active owner by exact email, accepts only a stable server-owned product
  plus operator/receipt evidence, creates the normal immutable PaymentOrder,
  and settles through the same append-only ledger transaction. It accepts no
  money or credit amount, exposes no browser administrator endpoint, treats an
  exact receipt replay as a no-op, and rejects cross-owner or cross-product
  receipt reuse.
- Focused M6 verification on 2026-09-02 passed all 14 tests, including both real
  PostgreSQL integrations and the public billing/order boundaries. The isolated
  tests applied migrations 0009 and 0010 twice through the checksum runner and
  proved the three launch prices, immutable CNY 10 / 500-credit product, migration and first-
  login grants, exactly-once repeat login, live reserve/settle/release,
  `SUBMISSION_UNKNOWN` release, rejection of stale-worker completion/failure,
  insufficient-credit creation rollback, custom immutable price selection,
  manual grant/refund, idempotent and conflicting replay, mutually exclusive
  closure, exact cached balances, quote snapshots, and database rejection of
  price/ledger/product/order/event mutation. They also proved owner-scoped order
  idempotency, cross-owner denial, signed callback expiry/replay/conflict,
  amount-mismatch rollback, and exactly one paid-credit grant. The disposable
  database container was removed afterward.
- An isolated full Compose run on 2026-09-02 passed the authenticated API,
  PostgreSQL/outbox, Valkey, worker, mock-provider, RustFS, failure/retry, owner
  isolation, OIDC first-login grant, and forced worker-restart paths. Its seven
  metered owner-A jobs all retained a 10-credit quote and produced exactly seven
  reservations, five settlements, and two releases. Authenticated billing reads
  around one authenticated fake-sandbox purchase and those jobs proved one
  500-credit grant, a 50-credit generation spend, zero reserved credit, owner
  isolation, signed callback replay, and the exact final balance. The disposable
  containers, network, and all three named volumes were removed afterward.
- Repository-wide verification on 2026-09-03 passed `npm run check:local` on
  Windows: lint, full TypeScript checking, the production build, and 129 tests
  completed with 125 passing. The opt-in full Compose test and three opt-in M6
  PostgreSQL tests were skipped by the default gate; their payment/manual cases
  passed separately against the isolated database described below, while the
  ledger and Compose cases retain the passing evidence recorded above. The eight
  M7 tests cover success, empty/malformed input, unsafe runtime failures,
  secret redaction, digest deploy/rollback planning, OCI-label mismatch, and
  the Cloudflare-only TLS origin contract. Focused R2/runtime tests additionally
  prove verification-only staging startup, local management, and retry after a
  failed bucket probe.
  Docker Compose parsed the dependency topology and a fully interpolated
  application topology successfully. The checksum-verified dependency files
  then resolved their real server paths and credentials on the staging host;
  the first application release path remains staging evidence.
- Manual-payment verification on 2026-09-02 passed all eight focused payment
  and operator tests against an isolated PostgreSQL 17 database. It proved
  preview non-mutation, paid-order/ledger atomicity, exact replay, cross-owner
  receipt conflict, missing-owner failure, and existing fake-sandbox behavior;
  the disposable database container was removed afterward.
- Verification on 2026-09-02: the real URL-output smoke passed submission,
  polling, output ingestion, durable Asset persistence, signed direct read,
  asset-library display, stable detail display, and draft-reference refresh.
  The focused M5/ADR/private-object run passed all 19 tests. The repository-wide
  `npm run check:local` gate passed lint, full TypeScript checking, the production
  build, and 98 tests with 97 passing and the opt-in Compose integration test
  skipped by design.
- The first application attempt on 2026-09-03 passed offline and live Authing
  preflight, pulled an immutable GHCR digest, and applied migrations `0001`
  through `0010`. Web and Worker then restarted because Compose file-backed
  secrets retained host `root:root 0600` ownership while the image correctly
  ran as unprivileged UID/GID `1000:1000`. ADR 0013 accepts a dedicated numeric
  reader-group bridge, exact `0640`/GID preflight enforcement, and no membership
  for the SSH administrator. The correction passed the full 129-test local gate
  and CI run 6, which published source revision
  `2b18419d6576b63efb93047e83afc5ad901a6367`, image
  `ghcr.io/lizhongyi1209/goodgood@sha256:674500400095f52fce6adde33b7991ae1a760f968e192b710ed224b3754bdcfb`,
  migration `0010_m6_payment_sandbox.sql`, and runtime-contract checksum
  `e68e1aff192c2b08277e53e5c2bca62c64c084742b32318158aca62297153299`.
  The repeated preflight and release then passed: migrations remained at count
  10, Web and Worker became healthy, loopback and public `/live`/`ready` probes
  reported database, queue, R2, O1Key, and runtime `ok`, and the immutable
  release file was retained root-only for rollback. Public homepage rendering
  passed; the login boundary returned Authing's exact client/callback,
  Authorization Code, S256 PKCE, state, nonce, and binding-cookie contract, and
  the hosted page exposed email-code plus the configured third-party option.
  At the healthy checkpoint the host had about 2.5 GiB available memory, unused
  swap, and 38 GiB free disk; Web and Worker used about 73 MiB and 55 MiB.
- Interactive Google login then completed through the public Authing callback.
  The new GoodGood owner received exactly the one-time 100-credit welcome grant,
  and the authenticated workspace presented `10 积分/张 · 可生成 10 张`.
  One explicitly authorized real Nano Banana 2 1K/1:1 task reached provider
  processing, then GoodGood persisted `INTERNAL_ERROR`, released its 10-credit
  reservation, retained the prompt, and created no Asset. No retry was clicked.
  The same durable provider task subsequently returned `SUCCESS`; its 444,007
  byte JPEG downloaded and fully decoded at 1024 x 1024. This proves the paid
  POST and provider generation worked but does not pass GoodGood ingestion or
  private-R2 evidence. Because the retained error did not identify whether the
  transient boundary was a task poll or first result fetch, ADR 0008 now
  requires consecutive failure confirmation plus bounded result-download
  retries, with neither path issuing another generation POST.
- The stabilization amendment passed `npm run check:local`: lint, full
  TypeScript checking, production build, and 131 tests completed with 127
  passing and four opt-in integration tests skipped by design. Worker terminal
  logs now retain a safe failure stage and normalized code for the next incident.
- CI run 7 succeeded for source revision
  `adb2a492c7ecd43bf8a9b41688c20b949dce0801` and published
  `ghcr.io/lizhongyi1209/goodgood@sha256:f04623fa4d9f43dbd57e2ff0632ec30b98b5f6177c453e1c269eebaf90d4c44d`
  with migration `0010_m6_payment_sandbox.sql` and runtime-contract checksum
  `e68e1aff192c2b08277e53e5c2bca62c64c084742b32318158aca62297153299`.
  Offline plus network preflight passed, the deploy retained all ten migrations,
  and Web/Worker became healthy on that exact digest. Loopback Worker readiness
  and public `/live`/`ready` report database, queue, R2, O1Key, and runtime `ok`.
  A root-only `0400` release snapshot is stored as
  `/etc/goodgood/staging/releases/adb2a49.env`. The existing browser session
  survived replacement and still reads 100 available credits with no Asset.
- After explicit operator confirmation, one new Nano Banana 2 task at 1K, 1:1,
  and one output completed through the deployed stabilization build. The latest
  job is `succeeded` at 100 percent with one provider attempt and exactly one
  Asset; Worker records `generation-completion`. Its reservation settled from
  100 to 90 available credits with zero reserved credit. The browser fetched one
  unique 467,358-byte signed R2 JPEG and decoded it at 1024 x 1024. The restrained
  asset-navigation cue showed `+1`; `/assets` contained one decoded image, and
  the stable asset-detail route opened the same decoded image without an error.
  No automatic or additional user retry was issued.
- A public Chrome upload of the checked-in non-user test asset
  `public/feihong-send.png` passed the complete reference path against the
  private staging R2 bucket. The browser completed the signed cross-origin PUT
  after its required CORS preflight, and the GoodGood completion endpoint marked
  the record `ready`. PostgreSQL independently records `accepted`, `image/png`,
  40,218 bytes, and 373 x 337 pixels. After the root draft autosaved, a page
  reload restored one ready reference and decoded a fresh HTTPS signed R2 read
  at the same 373 x 337 dimensions. Credit state remained 90 available and zero
  reserved; no generation request was issued.
- Public HTTPS logout now passes both required boundaries. Before logout the
  workspace retained its owner draft/reference and PostgreSQL had one active
  GoodGood session. The GoodGood logout returned the browser to the query-free
  application root in the unauthenticated state; PostgreSQL then had zero active
  sessions and the only session was revoked. Starting login again stopped at
  the Authing application `/login` page with email-code and third-party entry
  points instead of silently authenticating, proving the hosted Authing session
  also exited. No credential, cookie, authorization query, or full test address
  was retained.
- A repository-owned PostgreSQL backup/restore tool now constrains staging
  archives to new root-only files under `/var/backups/goodgood` and confines a
  restore drill to a fixed-name, no-network, read-only container backed only by
  bounded `tmpfs`. Shell syntax plus the repository-wide `npm run check:local`
  gate passed: lint, TypeScript, production build, and 131 tests completed with
  127 passing and four opt-in integrations skipped by design. The checksum-
  matched tool was installed root-owned on the staging host and created
  an 83,092-byte custom-format archive at
  `/var/backups/goodgood/staging-restore-drill-20260903.dump`, owned
  `root:root` mode `0600` beneath a mode-`0700` directory. The archive catalog
  passed before publication.
- Restoring that archive with the same immutable PostgreSQL image completed in
  one transaction and matched all 20 public tables and all 54 rows against the
  quiescent source, including all ten migration records. The disposable target
  reported `network=none` and `storage=tmpfs`, then its exit trap removed it.
  The running source PostgreSQL remained healthy; loopback and public readiness
  still reported every dependency `ok`, and the latest user credit account
  remained 90 available with zero reserved. The retained same-host archive is
  restore evidence, not a substitute for an automated, encrypted, off-host
  production backup policy.
- A 2026-09-03 20:53-21:00 China Standard Time Globalping run reused one fixed
  set of ten online mainland eyeball probes across China Telecom AS4134, China
  Unicom AS4837, and China Mobile AS9808: Telecom in Dongguan, Shenzhen, and
  Xi'an; Unicom in Changsha, Wuhan, and Xi'an; and Mobile in Guangzhou,
  Shanghai, and Taishan. Five `/api/health/ready` rounds
  returned HTTP 200 for all 50 samples. End-to-end p50/p95 were
  1,458/3,156.5 ms for Telecom (15 samples), 983.5/1,310.6 ms for Unicom (20),
  and 1,693/3,014.9 ms for Mobile (15). Three homepage rounds also returned
  HTTP 200 for all 30 samples, with p50/p95 of 1,030/2,399.2 ms for Telecom
  (9), 879/946.9 ms for Unicom (12), and 1,124/3,114.6 ms for Mobile (9).
  This is a valid representative-evening API/error baseline, not a capacity or
  end-user-browser benchmark.
- A separate synthetic private-R2 check created one 8 MiB non-user object,
  issued only a five-minute signed GET, and deleted the object immediately after
  three rounds. All 27 tests whose probes remained online returned HTTP 200;
  one Telecom probe was offline in all three rounds and is recorded as probe
  availability rather than an application error. Globalping returned only the
  first 10,000 body characters and physically implausible download timings, so
  no derived Mbps value is accepted. Its HTTP contract also excludes PUT.
  Full-byte upload/download throughput therefore still requires real browser
  runs on the three carrier connections; no signed URL, object key, credential,
  or synthetic object remains from this attempt.
- After cleanup, public Web readiness and the host-loopback Web/Worker probes
  still reported runtime, database, queue, R2, and O1Key `ok`. The complete
  `npm run check:local` gate also passed: lint, TypeScript, production build,
  and 131 tests completed with 127 passing and four opt-in integrations skipped
  by design.
- At the operator's request, full-byte browser upload/download sampling on real
  mainland China Telecom, China Unicom, and China Mobile connections is deferred
  and is not counted as passing evidence. The compatible application rollback
  proceeded independently while staging was quiescent: zero active sessions,
  zero non-terminal jobs, and zero pending outbox rows.
- The rollback dry-run accepted archived release `2b18419d6576b63efb93047e83afc5ad901a6367`
  at digest `sha256:674500400095f52fce6adde33b7991ae1a760f968e192b710ed224b3754bdcfb`.
  It shared migration `0010_m6_payment_sandbox.sql` and runtime contract
  `e68e1aff192c2b08277e53e5c2bca62c64c084742b32318158aca62297153299`
  with the current release, then replaced only Web and Worker without a schema
  downgrade. Both roles became healthy, the public homepage returned 200, the
  unauthenticated billing boundary returned 401, and public plus loopback
  readiness reported runtime, PostgreSQL, Valkey, R2, and O1Key `ok`.
- The formal forward deploy restored revision
  `adb2a492c7ecd43bf8a9b41688c20b949dce0801` at digest
  `sha256:f04623fa4d9f43dbd57e2ff0632ec30b98b5f6177c453e1c269eebaf90d4c44d`,
  reran all ten migrations idempotently, and returned both roles to healthy.
  The before/rollback/after data fingerprint remained ten migrations, one
  generated asset, one reference asset, and 90 available / zero reserved
  credits; the final active-session count remained zero.
- Next action: rotate the previously disclosed Google OAuth client secret and
  update the Authing connection before any further shared or staging login, then
  audit the remaining M7 operational evidence. Progress ICP
  filing/domain work in parallel and keep early paid access on the documented
  operator bridge. After the filed domain and domestic Alipay merchant sandbox
  are available, implement the provider adapter against the existing immutable
  order/settlement boundary and add the smallest customer checkout UI as part
  of paid-production readiness.
- Blockers: domestic Alipay checkout requires the ICP-filed production domain,
  matching merchant approval, and sandbox credentials. These external items do
  not block M7 staging or trusted manual credit operation. The local fake
  sandbox is not production payment evidence. M5 has no remaining
  blocker. The deferred reverse-order association
  check needs a second
  Google-backed test address or an explicitly approved reset of the isolated
  Authing test user. The previously disclosed Google OAuth client secret must
  be rotated and updated in Authing before further shared or staging use. The
  application secret remains operator-supplied outside the repository by
  design. An ICP-filed custom authentication domain is not required now because
  the Authing-provided application domain is the accepted temporary path. The
  local token adapter remains forbidden in staging and production.

## M4 exit-evidence audit

| Area | Status | Evidence or remaining proof |
| --- | --- | --- |
| OIDC/PKCE, signed-token validation, browser binding, hashed sessions, revocation, and normalized failures | Complete locally | Automated mock-issuer tests, HTTPS fail-closed preflight, and isolated PostgreSQL session integration pass |
| Owner isolation across generation, references, projects, assets, and drafts | Complete locally | Two-owner route/repository tests and the isolated Compose integration pass |
| Reference validation, snapshot safety, bounded object cleanup, and retry evidence | Complete locally | Unit plus real PostgreSQL/RustFS cleanup integration pass, including project/generation/draft protection |
| Project restore, asset hydration/detail, root draft, unsaved-change protection, and `/create` | Complete locally and in browser | Direct load, refresh, Back/Forward, logout/reauth persistence, and conflict recovery smokes pass |
| Hosted methods, Google/email exchange, first/repeat login, Google-first association, and GoodGood logout revocation | Passed on real loopback | Operator-confirmed Authing/Google/email-code flow and redacted database evidence |
| Authing hosted-session exit after GoodGood logout | Passed on real loopback | Operator logged out; the latest GoodGood database session was revoked and the next login stopped at the Authing hosted surface instead of silently returning |
| Authorization cancellation with an existing GoodGood session | Passed on real loopback | Operator cancelled authorization, retained the usable GoodGood session, then explicitly logged out; no cancellation-created session appeared and the latest database session was revoked |
| Exact callback replay | Passed on real loopback | The same captured local callback was revisited once without exposing its query; it returned to a query-free root, preserved the existing GoodGood session, created no new session, and left the login attempt consumed |
| Email-code expiry/reuse | Passed on real loopback | Operator confirmed an expired code was rejected, a fresh code completed login, and the already-used code was rejected without retaining the mailbox or code |
| Email-first then Google association | Deferred by operator | Not counted as passed; do not reset the current Authing user without explicit approval |
| Secure public callback/logout, DNS/TLS, and real network path | Passed in Hong Kong staging | Interactive Google login returned through the exact HTTPS callback; GoodGood logout revoked the sole active session, returned to the query-free unauthenticated root, and a fresh login stopped at Authing `/login` instead of silently authenticating |
| US gateway, billing, production storage lifecycle, and Hong Kong release operations | Later milestones | M5–M7 work, not an M4 implementation gap |

Completed real-Authing loopback checklist:

1. **Passed 2026-09-01.** Start login while a valid GoodGood session exists,
   cancel at the hosted or Google authorization surface, and confirm GoodGood
   returns a stable recovery message without invalidating the pre-existing
   session. The operator then explicitly logged out that preserved session;
   redacted database evidence showed no cancellation-created session and the
   latest real session revoked.
2. **Passed 2026-09-01.** Complete one fresh login, then revisit its callback
   URL once using only the same local browser. The exact captured callback was
   replayed without printing or persisting its query; it returned to a
   query-free GoodGood root, kept the existing session usable, created no new
   session, and left the one-time login attempt consumed.
3. **Passed 2026-09-01.** Log out through GoodGood, confirm the prior database
   session is revoked, then start login again and verify Authing does not
   silently reuse the prior hosted application session.
4. **Passed 2026-09-01.** Request an email code, confirm an expired code is
   rejected, complete login with a fresh code, and confirm reusing that code is
   rejected. The operator reported all three outcomes passing; no mailbox or
   code was retained.

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
- Use Authing's hosted login through standard OIDC with only Google and email
  verification code. GoodGood owns opaque sessions and internal owner IDs; use
  the Authing-provided domain until a filed custom domain is available.

## Milestones

| ID | Outcome | Status | Exit evidence |
| --- | --- | --- | --- |
| M0 | Decisions, delivery plan, continuity guard, and current baseline recorded | Completed | Topic docs and ADRs synchronized; documentation continuity is covered by an automated test; local quality gate passed on 2026-08-29 |
| M1 | Domain contracts and mocked boundaries extracted from the prototype | Completed | Composer and domain seams extracted; stable model/ratio/job mappings and mock repository/provider success, failure, and retry have unit tests; image/dependency warnings cleared; clean install check, lint, typecheck, build, and 13 tests passed on 2026-08-30 |
| M2 | Production-shaped local container foundation | Completed | One pinned Compose stack starts healthy web, worker, PostgreSQL, Valkey, RustFS, and mock generation with documented commands; host probes and named-volume persistence passed on 2026-08-30 |
| M3 | Durable asynchronous generation vertical slice | Completed | One model and one image pass API, PostgreSQL/outbox, Valkey, worker restart, mock provider, RustFS, Asset, polling, inline failure/retry, duplicate, and timeout tests on 2026-08-30 |
| M4 | Production identity, ownership, references, and projects persist safely | Completed | Authing-compatible OIDC/PKCE, hashed sessions, provider-neutral ownership, signed references, cleanup, root-draft/project/asset persistence, optimistic conflict handling, cross-owner denial, and the requested real-Authing loopback matrix pass; public HTTPS callback/logout now also passes under M7 staging |
| M5 | US generation gateway integration and recovery | Completed | O1Key special-price adapter, explicit worker route, RustFS transfer, decoded output ingestion, durable-task restart, fake-server matrix, secret-file launcher, one real URL-output reference-image smoke, operator-confirmed New API charge/refund evidence, and ADR 0008's accepted at-most-once submission guard pass |
| M6 | Versioned pricing, credit ledger, and payment sandbox | Completed | ADR 0009 launch prices, welcome grants, append-only accounting, live reserve/settle/release, account presentation, immutable CNY 10 / 500-credit product, idempotent orders, signed fake-sandbox fulfillment, dry-run-first manual paid-credit recording, isolated PostgreSQL tests, and full Compose pass |
| M7 | Hong Kong staging | In progress | ADR 0011 accepts the provisioned Alibaba Cloud Hong Kong 2 vCPU / 4 GiB staging host; its key-only non-root SSH, patched Ubuntu, bounded swap, Docker/Compose, UFW, reboot, and cloud-agent baseline pass. Digest-pinned PostgreSQL/Valkey and a non-authoritative RustFS fallback are healthy on isolated networks. ADR 0012 fixes private R2 plus `goodgood.o1key.com`; private-bucket CORS, bucket-scoped credentials, Origin CA, host-specific Strict, and the Cloudflare-only Nginx origin pass. Authing callbacks and all four external secrets pass live preflight. ADR 0013 fixes retained file-secret permissions with a dedicated reader group. All ten migrations are present; homepage rendering, Authing authorization, interactive Google login, and the exact one-time 100-credit grant pass. The first real O1Key task succeeded upstream but exposed a transient poll/result-ingestion race; its reservation safely released and no second paid POST was sent. ADR 0008's bounded stabilization amendment passed the 131-test local gate plus CI run 7 and is deployed at exact revision/digest with Web/Worker and public readiness healthy. A newly authorized task now passes one paid POST, one attempt, 10-credit settlement, private R2 Asset ingestion, signed browser decode, asset cue/library, and stable detail route. The browser reference path now also passes signed cross-origin upload, server-side validation, root-draft restore, and fresh signed R2 read without changing credit state. Public GoodGood session revocation, Authing hosted-session exit, callback return, and query-free unauthenticated recovery pass. A root-only custom archive restores all 20 public tables, 54 rows, and ten migrations inside a no-network, read-only, bounded-`tmpfs` PostgreSQL container without affecting the healthy source. Peak-time mainland Telecom/Unicom/Mobile API and homepage sampling now passes with zero HTTP errors, while real-client upload/download throughput is explicitly deferred and remains unpassed. The compatible prior application image passed an app-only rollback and the current image passed a formal forward redeploy with unchanged data. Remaining operational audit items remain; payment checkout stays intentionally absent |
| M8 | Paid production readiness | Pending | ICP/domain prerequisites and domestic Alipay sandbox/checkout pass before production payment; security/compliance review, observability, rollback, retention, support IDs, and production release gate are complete |

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

That original slice supported one test user, one model, one image, and success,
failure, and timeout outcomes. M4 supersedes its fixed identity and no-reference
constraints: the same narrow generation path now resolves authenticated owners,
proves cross-owner isolation, and accepts up to 10 owner-scoped validated
references. It also persists and restores owner-scoped projects and
automatically associates continued batches; unprojected prompt/reference/
settings survive reload in one expiring optimistic draft per owner. Duplicate submission, duplicate
delivery, worker restart, and repeated completion notification remain required
before adding more models or payment complexity.

## Environment proof boundaries

| Prove locally | Prove in Hong Kong staging |
| --- | --- |
| Domain rules, migrations, queue consumers, storage contracts, provider mocks, retries, idempotency, ownership, ledger rules, UI states, production image startup | Public DNS/TLS, ESA behavior, Alibaba Cloud account/firewall behavior, signed object URLs, public callbacks, US gateway connectivity, payment sandbox callbacks, resource limits, backup restore, and mainland carrier measurements |

Local success is necessary but never sufficient for a production release.

## New-session recovery

Every new human or agent session should:

1. read `AGENTS.md` and this file;
2. inspect `git status` and preserve existing work;
3. read the topic documents and accepted ADRs relevant to the active milestone;
4. inspect the implementation and tests rather than relying on this summary;
5. continue from the `Next action` in the current checkpoint unless a newer
   user decision changes it.
