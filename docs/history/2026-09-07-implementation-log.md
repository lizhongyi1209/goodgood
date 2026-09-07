# Historical implementation log — archived 2026-09-07

> Historical evidence only; not the active plan or permission to execute.
> Snapshot from `d65838a` on `archive/c6-deletion-content-safety-20260907`.
> Original path: `docs/IMPLEMENTATION_PLAN.md`. Paths below use that original
> repository-root context. Dates and old next-actions describe their own time.
> Read `docs/CURRENT_STATE.md` and `docs/IMPLEMENTATION_PLAN.md` for current work.

# Production implementation plan

- Last synchronized: 2026-09-07
- Current phase: ADR 0025 is deployed to the publicly open ADR 0024 controlled
  alpha on Hong Kong production revision
  `94cecb0aa53f7adf1dd6c3b6be23325a535ed5c0` and immutable image digest
  `sha256:fe52e00933367a7f8575dc862f41550da514a4f1324526224bf347d1934127b3`.
  Nano Banana 2 now exposes all 14 product-defined aspect ratios and
  `1K` / `2K` / `4K`, still one output at 10 credits. The active slot is green;
  the prior blue Web and Worker, release file, repository, and image remain
  stopped and retained for rollback. New registrations still start pending
  with 100 welcome credits, checkout remains disabled, and the full seed gate
  is not claimed.
- Current objective: ADR 0025 release acceptance is complete. Continue the
  controlled alpha with normal approved accounts and observe real generation
  failures, latency, memory, disk, and provider behavior across the expanded
  parameter surface. The restored account-deletion/content-safety work remains
  local and undeployed.
- Verification: the isolated source passed `npm run check:local` with lint,
  typecheck, the Vinext production build, and 187 tests (183 pass, four opt-in
  integrations skipped). CI run 37 passed source, dependency, runtime, image,
  and published-image scans; the raw artifact-security record passed all five
  repository importer checks. Production preflight, a fresh encrypted backup,
  migration-0012 idempotency, old-route job/attempt/outbox and Valkey drain,
  green Web/Worker health, one-Worker handoff, Nginx switch/rollback rehearsal,
  and independent public checks passed. The public results are root `200`,
  readiness `200`, login `302`, unauthenticated generation `401`, and HTTP to
  HTTPS `301`; both green processes have zero restarts, available memory was
  about 2.39 GiB, and root disk use was 35%. After explicit operator approval,
  exactly one live `4:5` / `2K` request returned `202` and succeeded through
  route version `o1key-gemini-3.1-flash-image-c-sp-v2`. The asset is private and
  accepted at `1856 x 2304`; its 2,021,800-byte signed R2 read matched the stored
  byte count and SHA-256, and two independent asset-list reads found the same
  durable job. Available credit moved from 100 to 90, reserved credit returned
  to zero, and the ledger contains one `reserve:-10` plus one `settle:-10`.
  Jobs, attempts, pending outbox rows, and both Valkey queues returned to zero.
  The short-lived production smoke session was revoked. Root-only aggregate
  evidence is `live-ratio-smoke-94cecb0.json` with SHA-256
  `9fd82dcb18afa86efe6dae4e2819ab38061c98d11b4e2260e1100bfcd6b9c27e`.
- Next action: let approved alpha users exercise the expanded selector in the
  normal browser flow and use collected production observations to choose the
  next product or capacity change. Keep checkout disabled, retain the current
  rollback release, and do not deploy the preserved migration-0020 work as part
  of this completed slice.
- Historical M8 checkpoint at revision `30c7a73`: M7 was completed; the Alibaba
  Cloud Hong Kong host,
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
  application rollback pass. The disclosed Google OAuth client secret has now
  been replaced and revoked; Authing uses the sole remaining enabled Google
  secret and the fresh exchange/session path passes without changing ownership
  or credit state. The separately disclosed Authing application and user-pool
  management secrets have also been rotated; the staging Web role now uses the
  replacement application secret and a fresh logout/login exchange passes.
  ADR 0014's encrypted off-host PostgreSQL backup contract is implemented and
  locally verified, and its separate private R2 bucket plus bucket-only token
  are provisioned and installed root-only on the staging host; the Restic
  password is independently escrowed, and repository initialization plus the
  first direct backup/full check and latest-snapshot off-host restore drill
  pass. ADR 0014 now defers active failure notification to M8; the timer-shaped
  service run, newest-snapshot restore, and active next timer all pass. The first
  post-amendment image passed CI but exposed a missing React peer in Vinext's
  standalone output during deployment; the retained prior release restored
  service without reversing migrations. The finished-image import fix and
  linked React 19.2.8 security update pass locally and in CI run 23; that exact
  immutable image is now the promoted healthy staging release. M8 is now in
  progress. ADR 0016 now delegates the monitoring platform and notification
  route to a separate agent, superseding only that part of ADR 0015. The first
  application slice keeps server-owned request/support IDs, redacted structured
  HTTP completion events, and provider/task/timing/credit Worker correlation.
  The repository now includes a vendor-neutral, exact-candidate, fail-closed
  production readiness gate and a secret-redacting Linux production preflight
  that emits evidence only after exact source/image/configuration and live OIDC
  checks pass. Main CI now also verifies the published digest itself and emits
  one immutable artifact-security record; the importer verifies its GitHub run,
  jobs, steps, byte count, and SHA-256 before emitting gate evidence. A
  full-gate production release planner now returns only non-executable dry-run
  phases and has no execution path. ADR 0019's separate unpaid-seed gate and
  seed-labelled, plan-only release entry point are now implemented without
  weakening the unchanged paid gate. ADR 0017 selects the provider-neutral
  `nginx-compose-blue-green-v1` production adapter: two loopback-only
  application slots behind host Nginx, durable state outside the application
  slots, and exactly one active production Worker. Candidate and rollback evidence must now prove the
  adapter-specific health, state, Worker, and no-schema-downgrade invariants.
  ADR 0018 selects the non-provisioned `alibaba-managed-state-v1`
  infrastructure profile: an x86_64 Alibaba Cloud ECS application-host floor,
  RDS PostgreSQL 17 High-availability Edition, and private-only Tair standard
  master-replica coordination. ADR 0019 now selects Hong Kong for a distinct,
  invite-only seed-production control plane without customer checkout. It keeps
  the M7 test-data staging host separate, moves domestic Alipay and the
  applicable ICP/domain review to a later paid-commercialization gate, and
  grants no purchase, production deployment, or executable-release authority.
  ADR 0021 later supersedes that immediate topology for the unpaid seed phase:
  the current 2-vCPU / 4-GiB Hong Kong host will be cleanly converted to
  production, local/test-only work moves to the operator workstation, and ADR
  0018 becomes the future measured scale-out target.
  CI run 29 passed for revision `05d8dd2` and its
  immutable artifact-security record has passed the repository importer for
  digest `195db77d74e1`. External monitoring activation and delivery remain
  required handoff evidence rather than a repository implementation claim.
- Historical controlled-alpha objective at revision `30c7a73`: ADR 0024's
  `controlled-alpha-v1` rollout was publicly open
  on the exact Hong Kong production candidate after the operator's separate
  `publicTrafficOpen` approval. The first post-open product slice is ADR 0025:
  open Nano Banana 2's existing 14 aspect ratios and `1K` / `2K` / `4K` while
  keeping one output. It is implemented and verified locally but is not yet in
  the immutable production image. C6-3A through C6-3D and C7 pass. Public root and
  readiness return HTTP 200, the login entry returns 302, unauthenticated
  generation returns 401 without a provider request, and three initial
  observation samples show healthy zero-restart Web/Worker processes, exactly
  one Worker, no active or failed generation, no 5xx or Nginx error, active
  backup protection, and safe memory/disk headroom. The next release task is to
  isolate ADR 0025 from the preserved undeployed migration-0020 work, publish an
  immutable candidate, prove zero active old-route attempts, and promote it
  without weakening the controlled-alpha gate. The full
  seed-production gate remains blocked and is not renamed or counted as passed.
  Phase 1 is complete: registration/login has no
  numeric cap, every new owner starts pending with the existing 100 welcome
  credits, only site-owner approval enables product use, routine review and
  additional test-credit grants belong in a site-owner-only web page, and all
  account/creative data is production data. Phase 2 is implemented locally:
  access is exactly pending/active/suspended, role is site-owner/member, the
  initial tier is seed, the first site owner uses a one-time audited bootstrap,
  and `/admin/users` owns review, suspension/restoration, search, credit
  summaries, audit history, and reasoned 1-5000 test-credit grants. Phase 3 now
  uses the current Hong Kong server for seed production, reserves rather than
  activates `staging-goodgood.o1key.com`, and requires a clean production
  database and queue, an emptied and credential-rotated existing `goodgood` R2
  bucket, a production secret set, and site-owner bootstrap. Local
  development and test use no production data or secrets. The final staging
  archive is retained seven days; production keeps the one-hour RPO, four-hour
  RTO, and 14 daily / 8 weekly / 12 monthly encrypted recovery-point contract.
  There is no fixed generation-count, queue-depth, or concurrency ceiling;
  monitoring discovers the practical limit. Only low host memory or high disk
  use pauses new submissions. The current Authing application and identity
  directory are reused with a rotated application secret, fresh database-backed
  session state, and exact
  production callbacks; all GoodGood account state still starts fresh. The
  initial conversion uses a public maintenance page and a four-hour stop limit,
  and opens only after the complete clean-state gate passes. Phase 3 requirements
  are complete. Phase 4 local preparation, read-only host inventory, exact-
  candidate no-traffic prestage, local production-secret preparation, isolated
  backup-R2 credential installation, Restic password escrow verification, and
  independent production O1Key credential installation
  are complete: the selected profile now
  describes the existing host, the Worker overlaps accepted jobs without a
  fixed count ceiling and drains them on shutdown, new generation writes use a
  latched 500-MiB/80% resource gate, and the maintenance asset plus exact-target
  conversion manifest remain non-executable. At that preparation checkpoint,
  the first production O1Key key was installed while the staging key remained
  valid; Authing and application-R2 production credentials, production
  runtime/state, maintenance, data cleanup, and traffic changes were absent.
  The production backup prefix is accessible and empty but its
  Restic repository is deliberately not initialized yet. A final read-only
  pre-window review passed the host, candidate, staging, R2-inventory, backup,
  and prepared-secret checks, but found that the sole machine-readable
  `production:gate` still required ICP and Alipay evidence even though ADR 0019
  excludes those two items from the unpaid seed gate. That mismatch is now
  corrected locally with fixed `production:seed-gate` and
  `production:seed-release-plan` commands. They exclude only the two paid-only
  checks, reject malformed evidence and every shared blocker, and cannot
  execute. The original full paid commands remain unchanged. The replacement
  revision `3bd4ea9` has passed CI, published its immutable digest, and passed
  artifact-security import. Its no-traffic replacement prestage and final
  infrastructure review now pass on the Hong Kong host; the obsolete
  `9673e22` prestage remains stopped and retained separately. The operator
  subsequently rescheduled the conversion to an immediate four-hour window and
  authorized C0-C6 while reserving public traffic opening for a final separate
  confirmation. C0 is now fail-closed in public maintenance. Its first probe
  exposed that the production config root was not traversable by Nginx, the
  loopback origin probe was not allowlisted, and the server-scope maintenance
  check prevented the reviewed static error page from completing its internal
  redirect. The host is corrected under maintenance. Replacement revision
  `1368913` has passed CI, published immutable digest `605cb17f686f`, and is
  prestaged without traffic with active maintenance files byte-matching its
  source. The operator-authenticated raw file for artifact-security ID
  `9972179514` has passed the repository importer both locally and on the host.
  The exact stopped candidate, active maintenance, staging quiescence, unchanged
  R2 inventory, absent production state, and host resource gate then passed the
  final read-only C1 review. The operator then approved C1. Staging Web and
  Worker are stopped with zero active session, nonterminal job, pending outbox,
  ready/processing queue, or Valkey key; the staging backup timer is disabled.
  The final root-only archive and its encrypted off-host Restic snapshot both
  have SHA-256 `52b8ebdfa5ac1185a976a9ba43928f3331e048bc0616f1994d1306c6d009e2ad`.
  Local and off-host isolated restores each passed all 20 public tables, 77
  rows, and 10 migrations. C1 evidence is root-only at
  `c1-final-archive-1368913.json`; the staging archive, volumes, and release
  cannot be deleted before the seven-day condition and a separate exact
  approval. C2's metadata-only post-freeze inventory now reconfirms exactly
  three current object versions, 576,607 bytes, and unchanged SHA-256
  `addd927f5d6ecee9e0b84b6208d3267606a1edc1767a1501990eabf970bf9e0a`.
  Its dry-run preview has no execution path. The operator confirmed the
  Cloudflare console had the same three current objects and no history or delete
  markers, then approved the exact bucket, hash, key, etag, and size binding.
  Conditional deletion removed only those three objects and two independent
  metadata inventories now report zero current objects, zero bytes, and the
  empty SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
  A new bucket-only production application credential is installed root-only,
  differs from staging and backup credentials, lists the same empty bucket, and
  does not make unauthenticated bucket listing public. The operator revoked
  `goodgood-staging-r2`; its old files now fail authentication while the new
  production credential still lists the empty bucket. Live CORS allows the
  exact production origin with GET/PUT/HEAD and rejects an untrusted origin.
  The operator subsequently confirmed the post-delete Cloudflare console is
  empty with no history/delete markers, completing C2, and authorized a fresh
  C3-C6-only window from `2026-09-06T02:50:29Z` to
  `2026-09-06T06:50:29Z`; public opening remains excluded. Its read-only
  precheck passed maintenance 503, exact candidate, staging freeze, C1/C2
  evidence, absent production state, 2.67-GiB available memory, 28% root disk,
  and zero failed units. Before creating any production volume, C3 review found
  that migrations 0001/0002 unconditionally create two local fixture owners and
  migration 0009 grants them credit, violating ADR 0021's clean production
  database boundary. No production database or Restic repository was created.
  The forward-only repair is implemented locally as migration 0012 plus an
  explicit local-auth-only fixture seeder. The complete local gate passes 185
  tests (181 passing, four opt-in integrations skipped), and an isolated real
  PostgreSQL rehearsal proves 12 migrations leave zero production owner,
  identity, session, credit, job, asset, role, and administration rows; the
  local seeder is idempotent at two owners/200 credits, and unexpected fixture
  credit history makes cleanup fail and roll back. Replacement revision
  `613e16b2e13e5d4f9f1383f54ba9e8aa652af0bf` passed CI Run 35 and published
  digest `6f2d0ca099077741e823635c4ebdddedbecf9129b4b1b29d573df4ba7764ca4f`,
  migration 0012, and runtime contract `05fc1ed4`; artifact-security ID
  `9981719267` passed local and host import. The stopped exact candidate is now
  prestaged with no production state, and its pre-C3 review passes. The same
  review found and locally corrected a
  C3 ordering defect: the production restore tool now treats a genuinely
  pre-migration catalog-only database as zero tables/rows/migrations instead of
  querying absent application tables, while preserving full quiescence and
  equality checks after C5 migration. The operator then explicitly approved
  C3. Fresh resource-bounded production PostgreSQL and Valkey state is now
  healthy on production-only volumes and the internal production network,
  without host ports or staging attachment. PostgreSQL still has zero public
  tables, Valkey has zero keys, and migration remains reserved for C5. The
  isolated production Restic prefix was initialized only after that baseline
  passed. Its first 893-byte encrypted archive has SHA-256
  `e5e383ea6a875c172c7653adda03be9bfb4b7d09f3d12726952d3a303a0b551e`;
  a full read-data check passed, and off-host snapshot
  `51ea307b14c6eb6a09c8e882ce0e6f5d5e6c1d6d62b48d44bc0b9b5e6fc402bc`
  restored as zero tables/rows/migrations in a network-none/tmpfs target in six
  seconds. The half-hour backup and daily retention/check timers are enabled
  and active. Independent verification reconfirmed maintenance 503, empty
  fresh state, a recovery point younger than one hour, stopped staging apps,
  and absent later-phase runtime files. C3 is complete; root-only evidence is
  `c3-dependencies-613e16b.json`, `c3-backup-613e16b.json`, and
  `c3-completion-613e16b.json`. C4 now requires a separate stage confirmation;
  public opening remains separately unapproved. The operator approved C4. The
  exact-candidate `release.env`, production-only `runtime.env`, and metadata-only
  `r2-inventory.env` are now installed as `root:root 0600`, with server-local
  database credentials, the retained non-secret Authing application identity,
  the production R2 endpoint, exact production callback/origin, local auth off,
  O1Key `cf-api` routing, and fake payment off. No value left the host. A
  project-defined, non-billable missing-task check independently proves the new
  production O1Key credential reaches the authenticated 404 boundary while an
  unauthenticated request returns 401. The operator rotated Authing's App Secret
  (the OIDC client secret); its replacement was transferred from the clipboard,
  installed as a distinct `root:goodgood-production-secrets 0640` file, and
  cleared locally without recording the value or hash. After one missing locked-
  dependency attempt stopped before preflight, `npm ci --omit=dev
  --ignore-scripts` installed only the exact lockfile production packages for
  the repository-owned host tool without rebuilding the image or dirtying the
  checkout. Production preflight then passed every source/image/file/runtime and
  live Authing discovery check, and its 24-hour evidence is recorded in the
  readiness manifest. C4 then waited only for explicit callback/logout allowlist
  confirmation and revocation of the retained staging O1Key credential. The
  operator subsequently confirmed both exact Authing allowlists and revoked
  the old staging O1Key key while retaining the production key. An unnecessary
  second clipboard copy of the already installed production key was cleared
  without transfer. The C4 final verifier then stopped at its first time guard
  because the approved window had expired; it made no provider request or
  evidence/state change. The operator approved a new C4-C6 window from
  `2026-09-06T06:56:29Z` through `2026-09-06T10:56:29Z`, with separate stage
  confirmations and public opening excluded. Its precheck passed. C4 final
  verification then proved unauthenticated and known-invalid O1Key requests
  return 401, while both the retained staging file and installed production
  file still reach the authenticated missing-task 404 boundary after a repeat
  check. The reported staging revocation has therefore not affected the exact
  retained credential; C4 remains fail-closed until the correct old key is
  disabled or propagation is proven. The operator then reported another
  revocation attempt but accidentally pasted the installed production O1Key key
  into chat. That key is now treated as compromised regardless of message
  deletion and must be revoked and replaced before further credential proof.
  The local clipboard was immediately cleared; the exposed value was not copied
  into a command, evidence, log, or repository. Both old files now return 401,
  proving the retained staging key and exposed production key are revoked. A
  fresh production replacement was transferred only over standard input,
  atomically installed as `root:goodgood-production-secrets 0640`, and verified
  through the non-billable authenticated missing-task 404 boundary. Its value
  and hash were not recorded, and the clipboard and temporary receiver were
  cleared. C4 final and independent verification pass with exact Authing
  allowlists, rotated Authing and O1Key secrets, current production preflight,
  zero database tables/Valkey keys, no application container or migration, and
  public maintenance 503. Root-only evidence is
  `c4-o1key-replacement-613e16b.json`, `c4-authing-console-613e16b.json`,
  `c4-secret-access-review-613e16b.json`, `c4-completion-613e16b.json`, and
  `seed-gate-post-c4-613e16b.json`. The readiness manifest now marks
  `artifact-security`, `production-preflight`, and `secret-access-review` pass;
  all later-phase items remain pending. The synchronized handoff passes
  `npm run check:local`: lint, typecheck, the Vinext production build, and 185
  tests with 181 passing and four opt-in integrations skipped. C4 is complete.
  The operator separately approved C5. All 12 migrations applied once and
  replayed idempotently; before the first real login every dynamic table and
  Valkey remained empty. Blue Web passed its loopback dependency checks. The
  private Authing login then created exactly one pending seed member, one active
  session, and one 100-credit welcome grant. After an approved, exact-replay
  site-owner bootstrap, the account became active with one role assignment and
  one administrative audit, and the sole blue Worker became healthy. The first
  populated `/admin/users` browser check exposed a client render exception:
  its date formatter combined incompatible `Intl.DateTimeFormat` options. Per
  checkpoint R5, blue Web and Worker are stopped, green never started, public
  maintenance remains 503, and the production database is retained with the
  single site owner and unchanged 100 credits for diagnosis. Root-only failure
  evidence is `c5-isolated-candidate-failure-613e16b.json`. The forward code fix
  uses compatible date/time style options and adds a regression test; the full
  local gate passes 186 tests with 182 passing and four opt-in integrations
  skipped. This is a defect correction, not a changed product decision, so no
  ADR changes. Revision `30c7a73ddb63f94f67a67b38a059d04c091040ba`
  subsequently passed CI Run 36 and published immutable image digest
  `1b0308cca64ecd0698fd9557e81c82989a3cd1f035218e869db554a09e9d5662`.
  The 1,104-byte raw artifact-security file has byte SHA-256
  `4ff15b1959e6a472634f5ae11624b1a4621c0e4a953db70b9d4d8f0db64accc3`;
  all five importer checks pass for artifact ID `9985740276`. The stopped host
  replacement prestage is now complete. The production source and release
  pointer bind exact revision `30c7a73` and digest `1b0308cca64e`; locked
  production dependencies load, the corrected timestamp formatter is present,
  and fresh release-bound production preflight and secret-access review pass.
  The failed `613e16b` source is retained separately. Independent verification
  before restart preserved one active seed `site_owner`, 100/0 credits, 12
  migrations, zero generation jobs/outbox and zero Valkey keys; both backup
  timers remained active and public maintenance stayed 503. The operator then
  approved C5 restart stage 1. Without executing a migration command, the exact
  candidate's blue Web was recreated and is healthy on loopback, and its private
  `/admin/users` route returns HTTP 200. The operator then completed a private,
  standard-port Chrome login and confirmed that the corrected populated account
  page renders the initialized site-owner record normally. Root-only evidence
  `c5-private-browser-confirmation-30c7a73.json` records that result in the
  approved window. An append-only correction artifact,
  `c5-private-browser-confirmation-attempt-counts-correction-30c7a73.json`,
  corrects only the summary's consumed-login-attempt count from the total three
  attempts to two consumed and one unconsumed attempt; independent verification
  passes and the operational result is unchanged. Two active sessions remain;
  the sole active seed `site_owner`, 100/0 credits, empty generation/queue state,
  stopped Worker/green, and public maintenance 503 were unchanged. The operator
  then separately approved one exact blue Worker. The first precheck stopped
  before startup because it used obsolete backup-timer unit names; after binding
  the check to the two actual active production PostgreSQL timers, exact Worker
  startup passed. Root-only `c5-blue-worker-start-30c7a73.json` and
  `c5-blue-worker-independent-30c7a73.json` prove two delayed healthy samples,
  zero restarts, loopback-only health, one Worker, all database/queue/R2/provider
  dependency checks, unchanged production state, zero queue keys, active backup
  timers, 33% disk use, and about 2.41 GiB available memory. No migration or
  synthetic generation ran; green remains stopped and public maintenance remains
  503. C5 is complete for the corrected candidate. The separately approved C6-1
  audit now passes runtime security and the privacy data map, including hardened
  containers, private state/R2, OIDC/CSRF/site-owner boundaries, live log
  redaction against actual identifiers and secrets, and the complete production-
  data/external-processor inventory. Root-only
  `c6-security-privacy-abuse-audit-30c7a73.json` and
  `c6-security-privacy-abuse-independent-30c7a73.json` contain no personal
  identifier or credential and prove that business data was not mutated. The
  readiness manifest now marks `privacy-data-map` pass. The operator has since
  accepted ADR 0022's production retention/deletion policy: transient login
  attempts, terminal sessions, drafts, references, active-account content,
  verified account deletion, 12-month anonymized audit retention, Authing, R2,
  provider, and backup-replay boundaries are now explicit. The operator then
  selected the existing site-owner-only `/admin/users` surface as the first
  verified-request entry, with two distinct confirmations and server-side
  rejection of the acting site owner; no member self-service route is added.
  Holder verification is now accepted as a request from the current registered
  email plus a site-owner reply and explicit same-address confirmation within
  24 hours, retaining only timestamps and a mail reference rather than content.
  A provider-submitted generation is not cancelled, resubmitted, or replaced by
  fallback: the Worker only completes its existing poll/ingest and exactly-once
  credit closure, hides any late Asset, and adds it to the deletion set before
  content erasure. A queued job that has not crossed that guard is atomically
  cancelled and releases credit in PostgreSQL; its outbox becomes ineligible,
  while any stale Valkey delivery observes terminal state and calls no provider.
  The final browser submit is now the accepted irreversible boundary: before it,
  either confirmation can be cancelled with no GoodGood mutation; after request
  creation, no route, lifecycle transition, operator action, retry, or incident
  process withdraws the request or reconstructs access, sessions, work, credit,
  content, or deletion-register state.
  Local C6-2A is now implemented by additive migration
  `0013_m8_account_deletion_requests.sql`, a POST-only site-owner API, and one
  PostgreSQL transaction that records verification/audit evidence, suspends the
  target, revokes sessions, cancels guard-unsubmitted jobs, releases their
  reservations exactly once, and invalidates their outbox rows. Owner/job locks
  close races with login, generation/retry, and the provider-submission guard;
  restore and test-credit actions fail closed after request creation. A real
  local PostgreSQL run applies all thirteen migrations twice and proves one
  unsubmitted cancellation/release while preserving one guard-crossed job. No
  O1Key, Authing, R2, or production endpoint was called.
  Local C6-2B now implements the `/admin/users` registered-email evidence form,
  two independent confirmation screens, safe retry with one preserved
  idempotency key, and a durable read-only request state/deadline on account
  rows. The dashboard projection does not return the verified email or mail
  reference. The real PostgreSQL path also proves that projection after request
  creation. Local C6-2C adds migration 0014's non-content register and leased
  `wait_for_submitted_jobs` step. A bounded local pass defers while any
  guard-crossed job is non-terminal and completes only that wait step after the
  job becomes terminal; it leaves the request/register processing and deletes
  nothing. The real PostgreSQL path now applies all nineteen migrations twice and
  proves both outcomes. Local C6-2D now adds a deletion-inventory preview that
  runs only after that step completes, reads one repeatable-read/read-only
  snapshot, returns six owner-scoped creative/private-object counts plus a
  versioned SHA-256, and hides every request/account/row identifier and object
  key. The digest also binds generation-batch IDs. Real PostgreSQL proves two
  identical previews with exactly two jobs and no mutation; no R2/Authing client,
  route, runtime, timer, migration, or production change was added. The readiness
  item remains blocked until the remaining destructive downstream lifecycle,
  cleanup scheduling/alerting, provider review,
  deletion-register export/backup replay, and production evidence exist.
  `moderation-abuse-controls` also remains blocked. ADR 0023 and local C6-2P now
  define and implement the policy/report/quarantine/review/removal boundary,
  but the exact-candidate production rehearsal and evidence are absent. The seed
  gate remains closed. Local C6-2E now adds migrations 0015-0016, a generated-asset deletion
  marker, a leased `delete_private_objects` step, and bounded retry evidence.
  Each pass recomputes/binds the inventory, deletes at most 100 distinct bytes
  before marking their rows, excludes deletion owners from ordinary reference
  cleanup, and hides deleted assets from presentation. Local C6-2F now adds
  migration 0017 and a leased creative-record step after object completion. It
  binds a fresh zero-object inventory, rejects cross-owner graph edges, removes
  the full owner creative graph in one foreign-key-ordered transaction, and
  retains financial/audit evidence through a narrowly guarded ledger-job link
  removal. New creative writes serialize with the request, and unexpired signed
  upload intents keep their object evidence until expiry plus a clock-skew grace. Real local PostgreSQL
  and disposable RustFS pass failure/rollback/retry, exact 404, zero creative
  inventory, retained evidence, and repeat-no-op paths. Local C6-2G now adds
  migration 0018 and a leased `delete_external_identities` step after creative
  completion. Its provider-neutral service requires an injected adapter, records
  disable before delete, keeps each local mapping through external success, and
  exposes only aggregate retry evidence. The disposable fake identity directory
  proves disable-success/delete-failure recovery, delete-only retry, local mapping
  retention, completion, and repeat no-op. Local C6-2H adds migration 0019 and
  the leased `anonymize_goodgood_account` step after external completion. One
  PostgreSQL transaction requires zero creative rows/reserved credit, expires
  the remaining available balance through an immutable ledger entry, closes the
  account, removes revoked sessions and externally deleted local mappings,
  replaces the email with a request-scoped pseudonym, scrubs the mail reference,
  and completes the step/request/register with exact 12-month retention. Existing
  ledger and administrative evidence remains unchanged. Real disposable
  PostgreSQL/RustFS verification applies all 19 migrations twice and proves a
  redacted rollback/retry, 90-credit expiry, final absence, fresh same-email
  pending reprovisioning, and repeat no-op. Local C6-2I reviews the current
  official Authing Management API and adds an opt-in server-only adapter behind
  the unchanged injected interface. It binds the exact OIDC issuer and verified
  `sub`, uses only `user_id`, queries before mutation, requests `Suspended`
  before one-user batch deletion, accepts only explicit matching success, and
  normalizes only documented user-not-found `apiCode` 2004 as idempotent
  absence. The published `authing-node-sdk@4.0.2` passes against a disposable
  loopback HTTP endpoint with fake AK/SK; exact paths/bodies, signature-header
  creation, issuer/subject mismatch, provider failures, redaction, and secure
  configuration are covered. Required overrides pin its vulnerable transitive
  `crypto-js` and `ws` ranges to audited versions.
  Local C6-2J now composes the five existing leased steps into one import-only,
  bounded server-side cycle. It observes aggregate lifecycle state before and
  after the fixed-order pass, creates a stable worker namespace, preserves all
  existing batch/lease/retry bounds, requires an explicitly injected identity
  adapter, and allowlists returned evidence to non-negative aggregate counters.
  Initial observation failure or an unexpected phase exception aborts later
  mutation; handled failures remain retryable and produce fixed redacted alert
  codes for failure, lease loss, and deadline overdue. The synchronized change
  passes `npm run check:local`: lint, typecheck, Vinext production build, and 229
  tests with 224 passing and five opt-in integrations skipped. The C6-2I
  official-registry production-dependency audit remains zero known
  vulnerabilities. No real Authing tenant/credential, production R2/host,
  route, runtime, timer, deployment, commit, or push occurred. This implements
  ADR 0022 rather than changing a confirmed product decision. Local C6-2K now
  adds a strict version-1 non-content register export and serializable isolated-
  restore replay. The canonical artifact contains only register UUID/state/time
  fields, rejects unknown/duplicate/future/tampered data, and replay requires an
  independently supplied matching SHA-256. Completed records transactionally
  remove restored local identity, session, creative, and credit state while
  recreating terminal step/register evidence; processing records restore
  suspension, revoke sessions, retain content for the ordinary lifecycle, and
  force recovery `ready: false`. A real two-database local PostgreSQL drill
  proves completed and processing outcomes plus repeat idempotency, without R2,
  Authing, production backup, or Hong Kong access. The synchronized C6-2K
  change passes `npm run check:local`: lint, typecheck, Vinext production build,
  and 235 tests with 229 passing and six opt-in integrations skipped. The
  separately enabled C6-2K PostgreSQL integration also passes all six tests.
  Local C6-2L now packages each production database dump, deletion-register
  export, and strict manifest into one root-only encrypted Restic recovery
  point. The dump precedes the register export; the manifest binds their exact
  names, sizes, hashes, timestamps, aggregate register evidence, and immutable
  application image. Restore selection requires all five recovery tags,
  exactly three same-stem paths, a snapshot and manifest no older than one hour,
  root-owned non-symlink `0600` files, an already-local `--pull never` image,
  and trusted digest equality. PostgreSQL remains network-none/tmpfs; replay
  shares only its isolated network namespace and any processing tombstone keeps
  `recovery_ready` false. The backup cleanup now preserves pre-existing
  collision targets and removes only files created by its own invocation. The
  packaged runtime build and shell syntax checks pass. The synchronized
  `npm run check:local` passes lint, typecheck, the Vinext production build, and
  240 tests with 234 passing and six opt-in integrations skipped; no Hong Kong
  host, R2 repository, installed timer/script, credential, provider, or
  production data was accessed or
  changed. This implements ADR 0022 without changing a confirmed decision.
  Local C6-2M now adds that production-only one-shot cycle source. Its dedicated
  loader rejects inline or alternate-path credentials and accepts only the
  production PostgreSQL target, exact OIDC issuer, private `goodgood` R2
  endpoint, and four reviewed file mounts. A two-connection PostgreSQL pool and
  one R2 client are verified before the Authing adapter is constructed; Redis,
  O1Key, the OIDC App Secret, and browser routes are absent. One invocation uses
  fixed C6-2J batch/lease/retry bounds, allowlists the aggregate result, closes
  resources, and maps `ok/attention/aborted` to `0/2/3`, with fixed-code
  bootstrap failure at `1`. The separate no-port Compose role is read-only,
  `pull_policy: never`, and CPU/memory/PID bounded. A root wrapper validates the
  immutable local image plus exact `0600` configuration and future `0640`
  secret files, then takes a nonblocking host lock. Inactive systemd source
  requests a four-minute oneshot every five minutes; failed status and fixed
  journal JSON are the vendor-neutral monitoring handoff. Targeted C6-2M tests
  pass 7/7, the runtime bundle builds, and shell syntax passes. The synchronized
  `npm run check:local` passes lint, typecheck, the Vinext production build, and
  247 tests with 241 passing and six opt-in integrations skipped. No credential
  value was created or selected, no unit/script/image was installed, and no
  Authing, R2, PostgreSQL, Hong Kong host, or production data was accessed.
  This implements ADR 0022 without changing a confirmed decision. C6-2N has
  now completed the actual Authing privilege review against one separately
  approved, non-owner internal administrator. The custom role and its policy
  contain only `get-user`, `update-user`, and `delete-users-batch`, but Authing
  cannot issue that user a separately identifiable service credential. Live
  calls proved that `type: userpool` returns an activated credential whose
  Access Key ID is the global user-pool ID, while the console's
  `type: tenant-co-admin` returns `422` / API code `4004` for this internal
  administrator. The official OpenAPI simultaneously labels fine-grained
  collaborator AK/SK as under development. The disposable identity mutation
  proof therefore stopped before creating its target; no production credential
  was installed and the deletion timer remains disabled. This is a named
  external Authing capability blocker, not a passed least-privilege proof. Do
  not substitute the globally powerful user-pool secret. Resolution requires
  Authing to supply a separately revocable collaborator credential, an explicit
  operator decision accepting and mitigating the global-key risk, or a reviewed
  identity-provider boundary change. C6-2O has now completed the read-only
  O1Key provider-retention contract review. The current public API documentation
  proves only that temporary upload URLs become unreadable after 24 hours and
  that generated image URLs are retained for 24 hours; it documents no DELETE
  route for asynchronous tasks, and the current public status endpoint reports
  both privacy policy and user agreement disabled. It does not state when
  prompt, reference, task/result, log, backup, cache, or upstream-processor
  copies are erased. URL expiry therefore cannot serve as provider-erasure
  evidence. This is a named external O1Key contract blocker pending written
  retention/deletion terms for each data class or a reviewed provider-boundary
  change. No credential, task, generation, or configuration was used. The
  operator then accepted ADR 0023's lightweight seed content-safety boundary.
  Local C6-2P is now implemented by migration
  `0020_m8_seed_content_safety.sql`, a canonical hash-bound `seed-v1` policy,
  immutable owner acceptance, and owner-locked enforcement before reference
  upload, generation, or retry. Technical validation now produces
  `not_reviewed`, while ordinary generation/project/asset presentation exposes
  only `not_reviewed | accepted`. An owner-only fixed-category report stores no
  prompt, bytes, object key, or free-form text and atomically quarantines the
  generated Asset. `/admin/users` receives a bounded metadata queue, an exact
  POST-only audited private preview, reasoned restore, byte-first permanent
  removal, and the existing independent account-suspension action. Resolution
  reports and append-only moderation actions retain 12-month evidence. Upstream
  default safety and normalized `MODEL_REJECTED` remain; no local keyword or
  semantic classifier, third-party processor, account state, queue limit, or
  generation-concurrency limit was added. Readiness schema version 3 now
  requires objective booleans for every accepted control and rejects customer
  content in evidence. The synchronized checkpoint passes `git diff --check`
  and `npm run check:local`: lint, typecheck, the Vinext production build, and
  257 tests with 251 passing and six opt-in integrations skipped. No credential,
  production host, database, object, account, provider task, deployment,
  commit, or public traffic was accessed or changed.

  ADR 0024 supersedes C6-2Q only as the immediate next action. The local
  migration-0020 candidate, content-report rehearsal, automated deletion,
  Authing management credential, provider erasure terms, complete monitoring,
  dual-owner incident model, and full blue/green rollback rehearsal are
  deferred to the full seed-production track; they remain unfinished. The new
  local `production:alpha-gate` is intentionally distinct from
  `production:seed-gate`. It requires exact-release artifact/preflight evidence
  plus the four controlled-alpha boundaries and cannot make the full seed gate
  pass. The next smallest live slice is the read-only portion of C6-3A: bind a
  fresh baseline to the currently deployed revision/digest/migration, verify
  public maintenance and private Web/Worker health/state without mutation, and
  leave every remaining evidence item pending. Customer checkout, domestic
  Alipay, and the applicable ICP/domain gate remain planned in M9.

  C6-3A is complete. At `2026-09-07T09:59:53Z`, a fresh read-only host check
  matched full revision `30c7a73ddb63f94f67a67b38a059d04c091040ba`, immutable
  image digest
  `1b0308cca64ecd0698fd9557e81c82989a3cd1f035218e869db554a09e9d5662`,
  migration `0012_m8_remove_legacy_local_fixtures.sql`, and runtime-config hash
  `05fc1ed4bf1848f6a2611fd63a29e1c0de168aaf914743507f70e7434aac158a`.
  Public root remained 503. Blue Web/Worker and PostgreSQL/Valkey were healthy;
  Web/Worker were read-only, had zero restarts, and green was absent. Private
  health returned 200, the database contained exactly 12 migrations ending at
  0012, Valkey had zero keys, and there was one active site owner with no
  generation rows. Runtime configuration still selected OIDC with local auth
  disabled, private R2 verification, O1Key, and disabled fake payment. Host
  available memory was about 2473 MiB and root disk use 33%. Exact candidate
  artifact evidence from CI run 36 remains inside ADR 0024's seven-day lifetime
  and its preflight evidence remains inside the 72-hour lifetime; protected
  release/runtime identity was unchanged. No host file, database row, queue,
  object, identity, provider task, deployment, migration, or traffic state was
  changed. At that C6-3A checkpoint the controlled-alpha gate intentionally
  remained closed because later evidence was pending. The synchronized local gate
  passes lint, typecheck, the Vinext production build, and 260 tests with 254
  passing and six opt-in integrations skipped. The runtime bundle build and
  `git diff --check` also pass.

  C6-3B is complete. One non-owner member entered production through the
  private maintenance-bypass path, received the one-time 100-credit welcome
  grant, remained unable to generate while pending, and was then activated by
  the site owner with one audited 25-credit test grant and no payment order.
  The member uploaded one disposable reference and completed exactly one real
  `nano-banana-2` 1K generation. The database records one successful job, one
  private generated asset, a 10-credit reserve and settlement, and final
  balances of 115 available / 0 reserved. The site-owner asset API returned no
  member asset, the generated object was not anonymously readable, and the
  member confirmed the image rendered both before and after logout/login.
  Public root remained maintenance-closed with HTTP 503 and the exact release,
  runtime configuration, and healthy zero-restart Web/Worker identity remained
  unchanged. Immutable root-only evidence is
  `c6-3b-member-journey-30c7a73.json`, checked at
  `2026-09-07T11:26:05Z`, mode `0600`, SHA-256
  `f2f97ea3098fc5a18f6fa9be8ee1d5e813af955293378fcc67d3f4cd11f76a89`.
  The evidence contains only assertions and aggregate state: no email, prompt,
  media bytes, object key, signed URL, cookie, identifier, or credential. The
  selected member is retained as the first admitted tester rather than
  suspended. No duplicate provider submission was made.

  C6-3C is complete. The exercise first revoked the three active private test
  sessions (two site-owner sessions and one member session) after confirming
  zero active generation jobs; this only signs those browsers out and does not
  remove account, credit, generation, or asset state. The exact deployed
  migration-0012 backup tool created encrypted off-host snapshot
  `12a27cd4195333f9ba4005ce55014148a043ebabfeefa3c343b6d470b7d9647e`
  at `2026-09-07T11:30:06Z`, with archive SHA-256
  `a1abc88567769c9b8e04ccc2b1cf4d586c627ceb9a09fac17033c5e1fb9d63cb`.
  The accepted 14 daily / 8 weekly / 12 monthly retention action and full
  repository read verification passed. At evidence capture the recovery point
  was three minutes old. Restoring the exact off-host snapshot into a
  no-network, tmpfs-only PostgreSQL container took 11 seconds and matched all
  22 public tables, 52 aggregate rows, and 12 migrations; the isolated
  container was then removed. Idempotent maintenance re-entry passed at the
  origin and public root remained HTTP 503. The private generated R2 object
  remained anonymously unreadable (HTTP 400), with no object key or content
  retained. No production data was copied to the workstation. Immutable
  root-only evidence is `c6-3c-minimum-recovery-30c7a73.json`, checked at
  `2026-09-07T11:33:16Z`, mode `0600`, SHA-256
  `da776ea37353f44a63aa48ec3ebc364ddce86df37bcce7f7d1745dbc0d130fa8`.
  The deployed candidate intentionally retains its reviewed single-archive
  recovery format; the local migration-0020 three-file deletion-register
  format was not deployed and remains part of the full seed track.

  C6-3D and the complete C6 controlled-alpha gate are now complete. Public
  maintenance returned HTTP 503 while the exact blue Web and one Worker were
  healthy with zero restarts. `MemAvailable` was 2417 MiB, root-disk use was
  33%, the production backup timer and host CloudMonitor agent were active, and
  the newest encrypted snapshot was 798 seconds old. A structured, non-billable,
  no-content generation/provider failure test signal was written and observed
  in the host journal, then delivered to the site owner through the current
  direct operator conversation; no provider request was made. The audited
  `/admin/users` suspension and restoration actions both passed against the
  selected member, whose final status is active; the resulting operator session
  was revoked and no active session or generation job remains. The root-only
  owner handoff documents the direct tester contact alias, suspension path, and
  migration-0012 exact-target manual removal procedure, including that external
  identity, O1Key, immediate backup, and complete erasure are not claimed.
  Complex dashboards and dual operators remain intentionally unnecessary for
  controlled alpha and remain unfinished for the full seed gate.

  Root-only mode-`0600` evidence includes
  `c6-3a-boundary-30c7a73.json` (SHA-256
  `daf70189d567f5131aad6a54fb85b5acefdf6131507cc2905044add64ab4087a`),
  `c6-3d-owner-handoff-30c7a73.json` (SHA-256
  `6d8318d706fa6695ac0b6486768b6b52ee1551d5fe89fe4c9995934a70218d52`),
  and `c6-3d-operations-30c7a73.json` (SHA-256
  `48ea7220cd3df2eb5744498e34f0e18b9a16b128a01e3504f0e929b77e0af8ed`).
  The exact schema-v3 manifest
  `controlled-alpha-evidence-30c7a73.json` has SHA-256
  `156dfb9153f3808aca155fb4064c73661cd1e10c30b4f5bbec7841ed78ac2815`.
  Running `npm run production:alpha-gate -- --evidence-file` against those exact
  bytes returned `ok: true`: schema, release identity, artifact security,
  preflight, boundary, member journey, recovery, and operations all pass. The
  immutable gate report `controlled-alpha-gate-30c7a73.json`, checked at
  `2026-09-07T11:48:39Z`, has SHA-256
  `56f9ff5a2e9739500d04df02740f85b2c6c4ef866ed01fa06f386bbb7b8edb26`
  and explicitly records `publicTrafficOpened: false` and
  `fullSeedGateClaimed: false`. No customer content, email, prompt, object key,
  signed URL, cookie, or credential is retained in this evidence.

  C7 is complete. The operator separately approved `publicTrafficOpen`; at
  `2026-09-07T12:58:36Z` the exact root-owned maintenance marker was removed
  under an exclusive lock after a fresh read-only gate, release, database,
  health, resource, and timer precheck. Nginx configuration validation passed
  before and after removal, reload succeeded, and the rollback handler was not
  needed. The public Cloudflare path returns HTTP 200 for the root and readiness,
  HTTP 302 for the Authing login entry, and HTTP 301 for plain HTTP. TLS
  verification passes from the operator workstation. An unauthenticated empty
  generation request returned HTTP 401, left active jobs at zero, and made no
  billable provider request. The pending user default remains enforced in the
  production schema.

  Three aggregate-only observations from `2026-09-07T12:59:53Z` through
  `2026-09-07T13:00:55Z` all returned public root/readiness HTTP 200. Web and the
  sole Worker stayed healthy with zero restarts; no Web 5xx, Worker failure,
  Nginx error, active job, or failed job appeared. Available memory remained
  between 2398 and 2434 MiB, root disk remained 33%, and the backup timer stayed
  active. Root-only mode-`0600` evidence is
  `c7-public-open-30c7a73.json` (SHA-256
  `c0de84becac438abd76f822039fe334dddaf88afd8dcda6283203e0d7cbecb05`)
  and `c7-observation-30c7a73.json` (SHA-256
  `8d322723fbdc4d330623b61049440afbf756f26572719e8d25f901945451147d`).
  Neither file contains customer content or credentials, and neither claims the
  deferred full seed gate. The synchronized handoff passes
  `npm run check:local`: lint, typecheck, the Vinext production build, and 260
  tests with 254 passing and six opt-in integrations skipped.

  After C7, ADR 0025 opens the full product-defined Nano Banana 2 parameter
  matrix: 14 aspect ratios by `1K` / `2K` / `4K`, still one output and 10 credits.
  The browser no longer rejects non-default selections; the generation API and
  O1Key adapter validate the same allowlists, retain the durable selection, and
  submit it unchanged. The provider route advances to
  `o1key-gemini-3.1-flash-image-c-sp-v2`. Unknown ratio, resolution, model, or
  count values still fail before a provider POST. The fake provider boundary
  exhaustively covers all 42 combinations. On 2026-09-07,
  `npm run check:local` passed lint, typecheck, the Vinext production build, and
  261 tests with 255 passing and six opt-in integrations skipped. This local
  checkpoint changes no production process, traffic, database row, object,
  credential, provider task, or credit balance.

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

## M8 staged execution

Advance only one stage at a time. At the end of each stage, present its result
and unresolved choices to the operator; do not begin the next stage until those
requirements are confirmed.

1. **Launch policy and scope — completed.** Hong Kong is the production region;
   registration/login is open without a numeric cap; new owners are pending
   with 100 welcome credits; site-owner approval enables use; routine review
   and additional test credit use a protected web page; seed data is durable
   production data; M9 retains paid commercialization.
2. **Admission and seed-credit controls — completed locally.** Access is
   `pending | active | suspended`; role is `site_owner | member`; the initial
   tier is `seed`. Migration 0011, the pending/suspended surface, shared active
   capability guard, dry-run-first owner bootstrap, protected account page,
   review audit, and non-payment ledger grant are implemented and tested.
3. **Single-host conversion requirements — completed.** The current Hong
   Kong host becomes production; `goodgood.o1key.com` stays canonical; no
   permanent remote staging environment is kept. Start with fresh PostgreSQL,
   Valkey, an inventory-cleared existing `goodgood` R2 bucket with rotated
   credentials, production secrets, and an audited site-owner bootstrap. Import
   no staging business data. The final staging
   archive has a seven-day safety window; production retains at most one hour
   RPO, at most four hours RTO, and 14 daily / 8 weekly / 12 monthly encrypted
   recovery points. No fixed job/concurrency ceiling is imposed; new generation
   pauses only below 500 MiB available host memory or at 80% root-disk use.
   Reuse the current Authing application/directory, rotate its client secret,
   import no hashed GoodGood session, keep exact production callbacks only, and
   reprovision every returning identity as a fresh pending GoodGood owner.
   The initial conversion stays in public maintenance for at most four hours
   and opens only after every clean-state and release check passes.
4. **No-customer production conversion — maintenance active; C5 candidate
   failed and is contained pending a replacement.** The
   single-host infrastructure contract, concurrent Worker, memory/disk gate,
   maintenance surface, and non-executable dry-run conversion manifest are
   implemented and tested locally. Resource-bounded production PostgreSQL/
   Valkey Compose, exact blue/green slots, fail-closed maintenance activation,
   half-hour encrypted backup plus 14/8/12 retention, read-only R2 inventory and
   no-execution deletion preview, Authing/secret checklists, rollback checkpoints,
   and the four-hour conversion runbook now form one deterministic local
   rehearsal. The current host, database/queue counts,
   R2 inventory summary, backup snapshots, runtime limits, Nginx boundary, and
   public health were then inspected without mutation. The exact candidate
   image and reviewed package are now cached on the host without starting a
   production container or changing Nginx. An independent production-only
   secret-reader group plus new root-only PostgreSQL and Restic passwords are
   also prepared. A distinct bucket-scoped backup-R2 token can list the empty
   `goodgood-postgres-backups/production` prefix, and an in-memory exact-match
   check proves the password-manager recovery copy matches the server Restic
   password. At that preparation checkpoint the Restic repository remained
   uninitialized and write access was not counted as proven. A distinct
   production O1Key key was installed without replacing or revoking the staging
   key; Authing and application-R2 rotation were still pending at that point.
   The operator approved an immediate four-hour conversion window. C0 now serves
   the reviewed static 503 maintenance surface through Cloudflare; a fail-closed
   first attempt identified and corrected Nginx marker traversal, scope, and
   loopback-probe defects without touching staging data or R2. The matching
   repository repair has passed CI and replaced the prestaged exact candidate;
   its artifact-security bytes have passed authenticated download and
   independent local/host import. A final read-only review passed, and the
   separately approved C1 freeze, final encrypted off-host snapshot, local
   restore, and off-host restore all pass. Staging Web/Worker and its backup
   timer are stopped while private dependencies, volumes, release, and the
   root-only final archive remain retained. C2's fresh metadata-only inventory
   and no-execution deletion preview now pass with the unchanged three-object,
   576,607-byte fingerprint. The operator confirmed no Cloudflare history or
   delete markers and approved the exact binding; conditional deletion and two
   independent post-delete inventories now prove the current-version scope is
   empty. New production application-R2 credentials are root-only, distinct
   from staging/backup, and independently list the empty bucket while
   unauthenticated access remains denied. The old staging credential is revoked
   and fails authentication; the production credential remains valid and live
   CORS accepts only the reviewed production origin. The operator confirmed the
   post-delete console is empty with no history/delete markers, so C2 is
   complete. A fresh C3-C6-only window passed precheck, but C3 stopped before
   creating state because the exact candidate would seed two legacy local
   fixture owners and credits into a fresh database. Forward-only migration
   0012 now removes only those legacy rows, and fixture recreation is available
   only under the explicit local-auth opt-in. Static and real PostgreSQL checks
   plus the complete local gate pass. The recovery tool also supports the
   required C3 pre-migration zero-table restore baseline without weakening its
   post-migration checks. Revision `613e16b` and digest `6f2d0ca09907` pass CI,
   artifact import, stopped prestage, and pre-C3 review. The separately approved
   C3 created healthy private production PostgreSQL/Valkey state with zero
   public tables/keys, then initialized the isolated encrypted Restic prefix.
   The first backup, full read-data check, zero-table off-host restore, one-hour
   RPO/four-hour RTO gates, active half-hour backup timer, and daily 14/8/12
   retention/check timer all pass. C3 is complete; the next action is a separate
   C4 confirmation for Authing and remaining production credential rotation.
   The operator approved C4. The three production configuration files are now
   installed root-only and structurally verified without exporting their
   values; the new production O1Key credential also passes a non-billable
   authenticated missing-task check. The rotated Authing App Secret is installed
   with the reviewed ownership and production preflight passes all checks. The
   operator then confirmed the exact Authing callback/logout allowlists and
   reported revoking the retained staging O1Key credential. The first final
   verifier stopped before acting because the four-hour window had expired. A
   newly approved C4-C6 window passes its precheck, but exact dual-file provider
   checks still authenticate both O1Key keys; C4 remains paused at the staging-
   credential revocation boundary. A subsequent operator message exposed the
   installed production key in chat while reporting another staging revocation.
   Both old files later returned 401. A fresh production key was then installed
   through the no-echo clipboard path and returns authenticated 404 for the
   non-billable missing-task check; no value or hash was recorded. C4 final and
   independent checks pass, its completion and secret-access evidence are
   root-only, and the readiness item is now `pass`. PostgreSQL still has zero
   public tables, Valkey has zero keys, no production application container has
   started, no migration has run, and public maintenance remains 503. C4 is
   complete. The separately approved C5 applied and replayed all 12 migrations,
   verified an empty pre-login production state, created exactly one pending
   Authing seed account with one 100-credit welcome grant, performed the
   independently approved audited site-owner bootstrap, and started one healthy
   blue Worker. The populated account-management browser check then failed in
   client rendering because its date formatter mixed `dateStyle` with component
   `hour`/`minute` options. R5 containment stopped blue Web and Worker, retained
   the production database and healthy private dependencies, kept green absent,
   and left public maintenance at 503. The local forward fix now uses
   `dateStyle` plus `timeStyle`; its regression and complete 186-test local gate
   pass. Corrected revision `30c7a73` and digest `1b0308cca64e` pass CI Run 36
   and independent raw-artifact import. Its stopped host replacement prestage,
   fresh release-bound preflight, and fresh secret-access review now also pass.
   The retained production account/credit state and active backup timers were
   unchanged after prestage, no application had started, no migration reran,
   and maintenance remained 503. The operator then approved C5 restart stage 1.
   The 12 recorded versions and checksums match the candidate without executing
   a migration command. Exact blue Web is now healthy and loopback-only; its
   private `/admin/users` route returns HTTP 200, while Worker and green remain
   stopped and public maintenance remains 503. The operator's standard-port
   private Chrome login and populated account-page check now pass, including
   visibility of the initialized site-owner record. Root-only browser evidence,
   its append-only attempt-count correction, and an independent server-side
   verification all pass. The separately approved exact blue Worker then starts
   healthy with no restarts; two delayed samples prove all dependency checks and
   production state invariants while green remains absent and maintenance stays
   503. Public traffic remains separately unapproved.
5. **Exact-candidate rehearsal — corrected Web, populated browser surface, and
   one Worker passed; C6-1 audited with remaining implementation/policy gates.**
   Runtime security and the privacy data map pass. ADR 0022 now accepts the
   retention/deletion lifetimes and outcomes. The request begins on
   `/admin/users`, uses two confirmations, rejects site-owner self-targets, and
   adds no member route. Verification uses a registered-email request and
   same-address confirmation reply within 24 hours without retaining message
   content. Provider-submitted jobs only finish existing polling/ingest and
   credit closure; they are not cancelled, resubmitted, or sent through fallback,
   and any late private Asset joins the deletion set. Queued unsubmitted jobs are
   cancelled with exactly-once credit release and outbox invalidation in
   PostgreSQL; stale Valkey delivery is a no-provider terminal no-op. Readiness
   requires the final browser submit to be irreversible: pre-submit cancellation
   is mutation-free, while no post-creation withdrawal or restoration path exists.
   Mistakes create incident evidence without reversing deletion. This phase
   now has a local C6-2A migration, POST API, atomic access/session/eligible-job/
   credit/outbox transaction, and owner/job submission-race guards. Local C6-2B
   adds the verified-email evidence form, two-step irreversible UI, preserved
   retry idempotency, and read-only request state/deadline projection. Local
   C6-2C adds the non-content register plus the leased submitted-job wait step,
   without a destructive adapter or timer. Local C6-2D adds the redacted,
   read-only creative/private-object inventory and stable digest without a new
   route, migration, runtime, timer, or external dependency. Local C6-2E adds
   bounded leased private-object deletion with fresh digest binding and
   aggregate retry evidence, verified only against disposable local RustFS.
   Local C6-2F now adds transactional creative-row deletion after private-object
   completion while retaining financial/audit evidence. It remains blocked on
   owner/Authing deletion, provider review,
   register export/backup replay,
   cleanup scheduling/alerting, and production evidence.
   ADR 0023 and local C6-2P now implement the moderation/abuse policy,
   acceptance, report, quarantine, audited review, restore/removal, and evidence
   contract without a classifier or new capacity limit. That item remains
   blocked only until the exact candidate's maintenance-closed production
   rehearsal passes. Do
   not reuse the failed candidate's health evidence. Then pass candidate health/
   state invariants, public
   synthetic checks, restore drill, alert delivery, and rollback without schema
   downgrade.
6. **Reviewed seed rollout — pending.** Admit accounts only through site-owner
   review, enforce credit accounting and host resource protection, observe the agreed signals and stop
   conditions, and keep checkout disabled. Registration has no numeric cap.

The preceding phase-5/phase-6 text is retained as the full seed-production
track. ADR 0024 changes the immediate execution order to this shorter active
track:

1. **C6-3A - controlled-alpha decision, contract, and baseline (completed).**
   Bind artifact/preflight and maintenance-closed runtime evidence to the exact
   deployed candidate. Do not deploy the local migration-0020 source.
2. **C6-3B - one controlled member journey (completed).** Pending isolation,
   100 welcome credits, reviewed activation, audited test credit, reference
   upload, one real generation, private read, relogin, and cross-owner denial
   all pass with aggregate-only immutable evidence.
3. **C6-3C - minimum recovery (completed).** A fresh encrypted off-host
   recovery point, accepted retention, repository read verification, isolated
   restore inside RPO/RTO, private R2 check, and immediate maintenance re-entry
   all pass without moving production data to the workstation.
4. **C6-3D - minimum operations handoff (completed).** Availability,
   Web/Worker/restart, memory, disk, backup, and generation-failure signals were
   observed; one non-billable notification reached the site owner; and the
   manual contact, audited suspension, and exact-target removal procedures are
   recorded. The exact controlled-alpha gate passes.
5. **C7 - controlled-alpha rollout (completed).** Separate public-open approval
   was recorded, maintenance was removed through the reviewed atomic ingress
   procedure, public smoke checks passed without a billable provider request,
   and three initial observation samples passed. Restore maintenance immediately
   on any stop condition.

Passing this active track does not pass the full seed-production gate. M9 begins
only after a separate operator decision to resume payment work.

## Current checkpoint

- The operator rescheduled conversion to
  `2026-09-05T15:25:44Z`–`2026-09-05T19:25:44Z` and authorized conversion work
  except the final public-open action. The exact `3bd4ea9` precheck passed with
  about 2.46 GiB available memory, 28% root-disk use, no failed unit, no active
  staging session/job/outbox/Valkey work, and no production container, volume,
  network, or runtime. A fresh R2 inventory still binds exactly three current
  test objects and 576,607 bytes to
  `addd927f5d6ecee9e0b84b6208d3267606a1edc1767a1501990eabf970bf9e0a`;
  nothing has been deleted. C0 initially failed closed and stopped Nginx because
  `/etc/goodgood/production` was `0700`, loopback was absent from the origin
  allowlist, and the server-scope marker check intercepted its own maintenance
  error-page redirect. The directory is now non-listable `0711`, only loopback
  and the unchanged 22 Cloudflare ranges can reach the origin, and the marker
  check is scoped before the application proxy. Nginx is active; local and
  public root return 503, the local body is byte-identical to the reviewed asset,
  public static structure plus no-store/Retry-After pass, and login/generation
  paths return 503. Evidence is root-only at
  `c0-maintenance-3bd4ea9.json`. The repair was committed as full revision
  `1368913c8ca13ee8cfa1cf5c2fff89da2e9aa20a`; CI run 34 (`33975329267`)
  completed successfully and published
  `ghcr.io/lizhongyi1209/goodgood@sha256:605cb17f686f4f69648937eb7182725abf21d8d8e9a69bc298d16b6eef2852be`
  with runtime contract
  `c9dc4a54fc3a4eeadcfa844947455a74924562b249e43229c7015b5919ce9915`.
  Artifact-security ID `9972179514` has immutable raw-byte digest
  `6cf8354b37462917f2e8e62a99daf90da8008f8d309a02241d11acfb72c2fa36`.
  At that checkpoint the server had that exact clean source and stopped image
  prestaged; active maintenance config byte-matched it, production state was
  absent, memory was above 2.4 GiB, and root disk was 28%. The prior `3bd4ea9` candidate is
  retained stopped at `/opt/goodgood-production-obsolete-3bd4ea9`. The operator
  downloaded the 1,093-byte raw artifact without editing it; its SHA-256 matched
  GitHub and both local and host importers passed artifact schema, exact
  candidate, successful run, required jobs/steps, and immutable byte integrity.
  Host review `pre-c1-review-1368913.json` at `2026-09-05T15:48:29Z` then
  reconfirmed the stopped exact candidate, public 503 maintenance, five healthy
  zero-restart staging containers, no active session/job/outbox/Valkey state,
  the unchanged three-object R2 fingerprint, no production state, zero failed
  units, more than 2.4 GiB available memory, and 28% root disk. The operator
  approved C1, which completed at `2026-09-05T16:01:09Z`. Staging Web and Worker
  are stopped after confirming zero active sessions, nonterminal jobs, pending
  outbox rows, ready/processing queue entries, and Valkey keys. Its backup timer
  is disabled, while PostgreSQL, Valkey, and object storage remain private,
  healthy, zero-restart dependencies. The final root-only archive
  `staging-final-immediate-20260905T152544Z.dump` is 86,668 bytes with SHA-256
  `52b8ebdfa5ac1185a976a9ba43928f3331e048bc0616f1994d1306c6d009e2ad`.
  Encrypted off-host Restic snapshot
  `787bc98b00b1ebe16744faf2ae1d5b0b6564873bf0e336cc9a99229451e68c00`
  passed a full repository check; both the local archive and a freshly
  downloaded off-host copy restored 20 public tables, 77 rows, and 10
  migrations in isolated network-none/tmpfs targets. Evidence is root-only at
  `c1-final-archive-1368913.json`, and the archive/volumes/release are retained
  until at least `2026-09-12T19:25:44Z`, conversion success plus seven days, and
  separate exact cleanup approval. C2 metadata-only inventory captured at
  `2026-09-05T16:05:09.463Z` reconfirmed exactly three current object versions,
  576,607 bytes, and unchanged inventory SHA-256
  `addd927f5d6ecee9e0b84b6208d3267606a1edc1767a1501990eabf970bf9e0a`.
  Root-only evidence `r2-current-post-freeze-1368913.json`,
  `r2-deletion-preview-post-freeze-1368913.json`, and
  `c2-readonly-review-1368913.json` records zero downloads/deletions and an
  intentionally unavailable execution path. The operator then confirmed the
  Cloudflare console had exactly the same three current objects with no history
  or delete markers and approved binding
  `r2-goodgood-current:addd927f5d6ecee9e0b84b6208d3267606a1edc1767a1501990eabf970bf9e0a`.
  Three fail-closed execution preparations stopped before deletion because of
  an unbundled runtime dependency, ESM dynamic-require incompatibility, and
  LIST-versus-HEAD timestamp precision; each was followed by a fresh inventory
  that reconfirmed all three objects and the approved fingerprint. The corrected
  single-file operation rechecked the full inventory plus each HEAD key/etag/
  size and second-level modification time immediately before conditional
  deletion. At `2026-09-05T16:17:04.351Z` it removed exactly the approved three
  objects and 576,607 bytes. Independent immediate and follow-up metadata
  inventories now report zero current objects, zero bytes, and empty SHA-256
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
  Root-only evidence is retained in `r2-exact-deletion-1368913.json`,
  `r2-current-post-delete-1368913-attempt4.json`,
  `r2-current-post-delete-independent-1368913.json`, and
  `c2-post-delete-review-1368913.json`. The operator then created a new Account
  API token with Object Read & Write scoped only to `goodgood`; its Access Key
  ID and Secret Access Key were transferred from the local clipboard without
  entering chat or command arguments, installed as distinct-from-staging-and-
  backup `root:goodgood-production-secrets 0640` files, and the clipboard was
  cleared after each value. A dedicated inventory role using only those new
  files reports the same empty bucket and unauthenticated bucket listing is not
  allowed. Root-only evidence is
  `c2-production-r2-credential-pre-revocation-1368913.json`. The operator then
  revoked `goodgood-staging-r2`. A read-only dual check proves the staging
  credential now fails authentication while the production credential still
  lists zero objects. Live OPTIONS from `https://goodgood.o1key.com` returns 204
  with GET/PUT/HEAD, the requested `content-type`/`x-amz-content-sha256`, and
  max-age 300; an untrusted origin returns 403. Evidence is root-only at
  `c2-credential-revocation-review-1368913.json`. The operator confirmed the
  post-delete Cloudflare console is empty with no history/delete markers, so C2
  is complete. A new C3-C6-only window (`2026-09-06T02:50:29Z` through
  `2026-09-06T06:50:29Z`) passed its fail-closed precheck and is recorded as
  `resumed-window-c3-1368913.json`; public opening is not authorized. C3 then
  stopped before state creation because the reviewed migration chain would
  create two prototype local owners, identities, credit accounts, and welcome
  grants in the new production database. Production volumes and the production
  Restic repository remain absent. The forward fix adds migration
  `0012_m8_remove_legacy_local_fixtures.sql` and moves fixture recreation behind
  the explicit local-auth seeder. `npm run check:local` passes 185 tests (181
  passing and four opt-in integrations skipped); `npm run build:runtime` passes;
  an isolated PostgreSQL rehearsal proves the production-empty, local-idempotent,
  and unexpected-history rejection paths, then removes both temporary databases.
  The C3 recovery tool now handles a catalog-only source as exactly zero public
  tables/rows/migrations and retains full checks after schema creation. CI Run
  35 passed for revision `613e16b2e13e5d4f9f1383f54ba9e8aa652af0bf`; digest
  `6f2d0ca099077741e823635c4ebdddedbecf9129b4b1b29d573df4ba7764ca4f`,
  migration 0012, and runtime contract `05fc1ed4` match artifact-security ID
  `9981719267`, whose exact raw bytes pass both local and host import. The host
  prestage and pre-C3 review pass at `2026-09-06T03:48:37Z` with maintenance
  503, zero production state, 2.62-GiB available memory, 28% disk, and no failed
  units. Prior revision `1368913` remains retained and stopped. The operator
  explicitly approved C3. It completed at `2026-09-06T04:00:19Z` with healthy
  PostgreSQL and Valkey on only the production internal network and exact
  production volumes, no host ports, zero public database tables, zero Valkey
  keys, and no migration. The independently isolated production Restic
  repository contains its first encrypted snapshot
  `51ea307b14c6eb6a09c8e882ce0e6f5d5e6c1d6d62b48d44bc0b9b5e6fc402bc`;
  the 893-byte source archive SHA-256 is
  `e5e383ea6a875c172c7653adda03be9bfb4b7d09f3d12726952d3a303a0b551e`.
  A full repository read-data check passed, and the freshly downloaded archive
  restored in six seconds to zero public tables, zero rows, and zero migrations
  in a network-none/tmpfs container. The local archive and restore container
  were removed. Both reviewed systemd timers are enabled and active; the first
  independent verification measured the latest off-host recovery point at 82
  seconds old. Staging Web/Worker remain stopped, later-phase runtime files
  remain absent, and public maintenance remains 503. Root-only evidence is
  `c3-dependencies-613e16b.json`, `c3-backup-613e16b.json`, and
  `c3-completion-613e16b.json`. C3 is complete and C4 now awaits separate
  operator confirmation; public opening remains unapproved. The operator then
  approved C4. Exact-candidate `release.env`, production `runtime.env`, and the
  R2 inventory role file are installed as root-only `0600`; structural checks
  prove the production origin/callback, Authing issuer/application identity,
  private R2, O1Key route, disabled local auth, and disabled fake payment
  boundaries without exposing values. A read-only O1Key request returns 401
  without credentials and authenticated 404 for a deliberately absent task
  with the new production credential, without submitting billable generation.
  Root-only preparation evidence is `c4-runtime-preparation-613e16b.json`.
  The operator rotated the Authing App Secret. After two fail-closed local
  transfer attempts wrote no credential, the corrected Python execution path
  installed the 32-byte replacement as a regular
  `root:goodgood-production-secrets 0640` file distinct from the retained
  staging value; clipboard and temporary receiver are cleared, and neither
  value nor hash is recorded. Root-only evidence is
  `c4-auth-secret-install-613e16b.json`. A first preflight attempt stopped before
  evaluation because the stopped candidate checkout lacked `jose`; installing
  exact lockfile production dependencies with lifecycle scripts disabled left
  the revision clean and did not rebuild the image. The second production
  preflight passed every check, including source/image identity, host-file
  security, runtime boundaries, and live Authing OIDC discovery. Its normalized
  root-only report is `production-preflight-report-613e16b.json`, and the exact
  evidence object now replaces only the matching pending readiness item. The
  operator confirmed the exact console allowlists and revoked the old staging
  O1Key credential while retaining the production key. The already installed
  production key was copied again unnecessarily, then cleared from the local
  clipboard without transfer. The C4 final verifier stopped at the expired-
  window guard before issuing a provider request or writing completion/readiness
  evidence. The operator approved a new C4-C6 window from
  `2026-09-06T06:56:29Z` through `2026-09-06T10:56:29Z`; root-only window
  evidence is `resumed-window-c4-613e16b.json`, later stages still require their
  own confirmation, and public opening remains excluded. C4 final verification
  then failed closed before evidence updates because the exact retained staging
  key still returns authenticated 404, as does the production key, while no
  credential and a known-invalid Bearer value each return 401. A second check
  after propagation wait produced the same result. The exact old staging key is
  therefore still active at the provider and must be identified and revoked
  before C4 can complete. The operator then reported revoking it, but pasted the
  installed production key into chat. That production key is now compromised;
  its clipboard copy was immediately cleared without reuse, and C4 remained
  fail-closed until the operator revoked it and created a new production key.
  Exact dual-file checks then proved both the staging key and exposed production
  key return 401. The fresh replacement passed authenticated missing-task 404
  before and after atomic installation through standard input as
  `root:goodgood-production-secrets 0640`; its clipboard copy and root-only
  receiver were cleared, and neither a credential value nor hash was recorded.
  Root-only replacement evidence is `c4-o1key-replacement-613e16b.json`. C4
  finalization and an independent read-only verification then passed exact
  candidate/configuration, Authing secret separation and allowlists, live O1Key
  revocation/replacement boundaries, current preflight evidence, zero database
  tables/Valkey keys, and maintenance 503. Root-only completion artifacts are
  `c4-authing-console-613e16b.json`, `c4-secret-access-review-613e16b.json`,
  `c4-completion-613e16b.json`, and `seed-gate-post-c4-613e16b.json`. The three
  completed readiness items pass and every C5/C6 item remains pending. C4 is
  complete. The operator separately approved C5. Migration applied all 12
  versions and an exact replay applied zero; pre-login dynamic rows and Valkey
  keys were zero. Blue Web and the later single blue Worker passed loopback
  health and dependency checks. A private Authing login created one pending
  seed member, one session, one credit account, and exactly one 100-credit
  welcome ledger entry. The approved bootstrap changed only that stable owner
  to active, added one `site_owner` role and one administrative action, and an
  exact replay added nothing. The browser then reached `/admin/users`, received
  HTTP 200 for its session and dashboard query, but Vinext rendered its global
  error page when the populated UI called `Intl.DateTimeFormat` with
  `dateStyle` plus individual `hour`/`minute` options. R5 containment stopped
  blue Web and Worker; green never started, public maintenance remains 503, and
  PostgreSQL/Valkey remain healthy with the single site owner, unchanged 100/0
  credit balance, zero jobs/outbox, and zero Valkey keys. Root-only containment
  evidence is `c5-isolated-candidate-failure-613e16b.json`. The SSH tunnel was
  closed. A local forward fix replaces those component options with
  `timeStyle: "short"` and adds a populated-timestamp regression. The targeted
  account suite passes 11 tests and `npm run check:local` passes lint,
  typecheck, the Vinext production build, and 186 tests with 182 passing and
  four opt-in integrations skipped. No ADR changes because the product and
  architecture decisions are unchanged. C5 is not complete. Corrected revision
  `30c7a73ddb63f94f67a67b38a059d04c091040ba` passed CI Run 36 and published
  `ghcr.io/lizhongyi1209/goodgood@sha256:1b0308cca64ecd0698fd9557e81c82989a3cd1f035218e869db554a09e9d5662`.
  The downloaded raw artifact is 1,104 bytes with SHA-256
  `4ff15b1959e6a472634f5ae11624b1a4621c0e4a953db70b9d4d8f0db64accc3`;
  all five strict importer checks pass and emit
  `github:run:34021659198/artifact:9985740276`. The stopped replacement
  prestage has now installed the exact clean source and release pointer without
  starting Web/Worker or rerunning migrations. Fresh root-only evidence is
  `prestage-30c7a73.json`, `artifact-security-import-30c7a73.json`,
  `production-preflight-report-30c7a73.json`,
  `secret-access-review-30c7a73.json`,
  `production-readiness-30c7a73.json`, and
  `replacement-prestage-completion-30c7a73.json`. Independent verification
  confirms all three early readiness items pass, all nine later shared items
  remain pending, the old failed source is retained, the sole active site owner
  still has 100/0 credits, migrations remain at 12, jobs/outbox/Valkey remain
  zero, backup timers are active, and public maintenance remains 503. The
  operator then approved C5 restart stage 1. Root-only evidence
  `c5-restart-precheck-30c7a73.json`,
  `c5-restart-blue-web-30c7a73.json`,
  `c5-private-operator-path-30c7a73.json`, and
  `c5-restart-stage1-completion-30c7a73.json` proves exact migration versions
  and checksums without a migration execution, one healthy loopback-only blue
  Web, private `/admin/users` HTTP 200, unchanged account/credit/generation/
  queue state, stopped Worker/green, and public maintenance 503. The local SSH
  tunnel self-check passes. The operator then logged in through the standard-
  port private Chrome path and confirmed the corrected populated account page
  renders normally with the initialized site-owner record visible. Root-only
  `c5-private-browser-confirmation-30c7a73.json` records the in-window result.
  Its summary accidentally used total login attempts for the consumed count;
  the original was preserved and append-only
  `c5-private-browser-confirmation-attempt-counts-correction-30c7a73.json`
  records the exact three total, two consumed, and one unconsumed counts. An
  independent check validates both files and current state: two active sessions,
  one active seed `site_owner`, 100/0 credits, zero jobs/outbox/Valkey keys, the
  exact healthy Web, stopped Worker/green, and public maintenance 503. The
  operator then separately approved one exact blue Worker. Its first precheck
  stopped before startup because the script referred to obsolete backup-timer
  unit names; current state remained unchanged. The corrected check binds the
  active `goodgood-production-postgres-backup.timer` and
  `goodgood-production-postgres-maintenance.timer`. It recreated only the blue
  Worker from exact revision `30c7a73` and digest `1b0308cca64e`, without a
  migration or synthetic generation. Root-only
  `c5-blue-worker-start-30c7a73.json` and
  `c5-blue-worker-independent-30c7a73.json` pass exact labels, read-only rootfs,
  loopback `127.0.0.1:3101`, database/queue/R2/provider readiness, two samples
  ten seconds apart, zero restarts, exactly one Worker, no green or staging
  application, unchanged owner/credit/generation/payment/migration state, zero
  Valkey keys, active backup timers, about 2.41 GiB available memory, 33% root
  disk, and public maintenance 503. C5 is complete for the corrected candidate.
  The operator then approved C6-1 security/privacy/abuse evidence. Two audit
  attempts stopped before evidence or manifest writes because of verifier-only
  UID/name and wrapped-document-text comparisons; both were corrected without a
  service or data change. The completed audit proves non-root read-only Web/
  Worker containers, no-new-privileges, fixed memory/PID bounds, loopback-only
  application health, unpublished PostgreSQL/Valkey ports, separate mounted
  secrets absent from environment/logs, OIDC Secure `__Host-` cookies, disabled
  local auth/payment sandbox, POST/CSRF/site-owner admin enforcement, private
  unsigned R2 access, and log redaction against the actual production account,
  identity, database, and application-secret values without recording them. A
  dry-run reference cleanup found zero due/staged/protected objects; fresh R2
  inventory found zero objects/bytes. The production data map covers identity/
  session, creative content, credit/administration, operational logs, Authing,
  O1Key, private R2, and encrypted Restic backup boundaries. Root-only
  `c6-security-privacy-abuse-audit-30c7a73.json` records security and
  `privacy-data-map` as pass. At audit time it kept
  `retention-deletion-policy` blocked on unapproved data lifetimes, deletion
  handling, backup propagation, and absent cleanup scheduling, and kept
  `moderation-abuse-controls` blocked on the
  missing moderation policy and operator response/removal runbook. The existing
  technical admission, credit, upload, provider-rejection, suspension, and
  500-MiB/80%-disk controls pass but are not mislabeled as the missing policy.
  `production-readiness-pre-c6-1-30c7a73.json` preserves the prior manifest;
  only the three reviewed entries changed. Independent root-only
  `c6-security-privacy-abuse-independent-30c7a73.json` passes and
  `seed-gate-post-c6-1-30c7a73.json` proves the seed gate remains closed. No
  business data, migration, generation, or public traffic changed. The
  synchronized handoff passes `npm run check:local`: lint, typecheck, the Vinext
  production build, and 186 tests with 182 passing and four opt-in integrations
  skipped. The operator then accepted ADR 0022: login attempts, terminal
  sessions, drafts, orphan references, normal creative content, verified
  account deletion, 12-month anonymized audit retention, Authing, provider,
  private R2, and backup-replay outcomes now have an explicit policy. This was a
  documentation decision only: no schema, timer, service, production data,
  Authing identity, readiness evidence, or traffic changed. The readiness item
  remains blocked until the request surface and lifecycle are implemented and
  production scheduling, alerting, provider review, backup replay, and first
  execution evidence pass. The synchronized ADR/topic/plan change passes
  `npm run check:local`: lint, typecheck, the Vinext production build, and 186
  tests with 182 passing and four opt-in integrations skipped. The operator
  then selected `/admin/users` as the first verified deletion-request entry.
  The future control requires two distinct confirmations, performs no mutation
  when cancelled, and is unavailable to the acting site owner; the backend must
  independently reject that self-target. No member self-service route is added,
  and site-owner deletion remains an out-of-band exact-target operation. This
  amendment changes documentation only: the control, API, schema, and lifecycle
  remain unimplemented and no production state or readiness evidence changed.
  The synchronized amendment passes `npm run check:local`: lint, typecheck, the
  Vinext production build, and 186 tests with 182 passing and four opt-in
  integrations skipped. The operator then accepted manual account-holder
  verification: the user requests from the current registered email, the site
  owner replies to that address, and an explicit same-address reply must arrive
  within 24 hours. Only request/confirmation timestamps and the mail provider
  message/reference ID are retained; message subject/body are excluded. A
  mismatch or expiry creates no deletion request and restarts verification.
  This amendment changes documentation only and does not install an email
  connector, implement a request, or change production/readiness state. The
  synchronized decision passes `npm run check:local`: lint, typecheck, the
  Vinext production build, and 186 tests with 182 passing and four opt-in
  integrations skipped. The operator then accepted submitted-generation
  finalization: request creation immediately denies login/new generation/retry;
  an O1Key-submitted attempt is neither cancelled, resubmitted, nor sent through
  fallback. The Worker only finishes existing bounded polling/result ingest and
  exactly-once credit closure, keeps any late result hidden/private, and adds it
  to the deletion set. Destructive content deletion waits for those attempts to
  become terminal without moving the 30-day deadline. This is documentation
  only; no job, credit, asset, code, or production state changed. The
  synchronized decision passes `npm run check:local`: lint, typecheck, the
  Vinext production build, and 186 tests with 182 passing and four opt-in
  integrations skipped. The operator then accepted immediate cancellation for
  an accepted queued job that has not crossed the persisted provider-submission
  guard. Deletion-request creation, terminal `cancelled`, exactly-once credit
  release, and outbox ineligibility share one PostgreSQL transaction. No
  cross-store atomicity with Valkey is claimed: a stale at-least-once delivery
  must re-read terminal state, make no provider request, and acknowledge the
  item. Owner/job locking and the persisted submission guard decide the race;
  whichever transition commits first determines whether cancellation or the
  already-submitted finalization rule applies. This is documentation only; no
  job, credit, queue, code, or production state changed. The synchronized
  queued-job decision passes `npm run check:local`: lint, typecheck, the Vinext
  production build, and 186 tests with 182 passing and four opt-in integrations
  skipped. The operator then accepted request irreversibility: email verification
  and both browser confirmations precede the only mutation and can be abandoned
  without changing GoodGood state. Once the durable request commits, no browser,
  API, lifecycle, retry, operator, or incident path withdraws it or restores the
  account, sessions, queued work, credit, content, or deletion register. A
  mistaken request is recorded and investigated through the separate incident
  process while deletion continues. This is documentation only; no request,
  account, session, job, credit, content, code, or production state changed. The
  synchronized irreversibility decision passes `npm run check:local`: lint,
  typecheck, the Vinext production build, and 186 tests with 182 passing and four
  opt-in integrations skipped. The operator then approved and completed local
  C6-2A. Additive migration `0013_m8_account_deletion_requests.sql` creates the
  irreversible request record and explicit outbox cancellation marker without
  changing the three-state account enum. The site-owner-only POST API validates
  registered-email evidence within 24 hours, rejects self/site-owner targets,
  and idempotently commits audit/request evidence, suspension, session
  revocation, guard-unsubmitted job cancellation, exactly-once credit release,
  and outbox invalidation in one PostgreSQL transaction. Authentication session
  creation and generation submission now lock/recheck the owner, while the
  provider-submission guard locks the job/attempt pair; whichever side commits
  first deterministically selects cancellation or submitted-job preservation.
  Existing submitted jobs are not cancelled. Restore and test-credit actions
  fail closed after request creation. At that C6-2A checkpoint, the backend route
  existed in both Node runtimes and no management-page delete control had been
  added. A real local PostgreSQL
  test applied all thirteen migrations twice and passed one queued cancellation/
  10-credit release, one submitted-job preservation, one session revocation,
  idempotent replay, and post-request denial of session/generation/restore/grant.
  The synchronized implementation passes `npm run check:local`: lint, typecheck,
  the Vinext production build, and 195 tests with 190 passing and five opt-in
  integrations skipped.
  It contacted no O1Key, Authing, R2, or production service. No Hong Kong
  container, database, queue, object, secret, readiness evidence, or traffic
  changed. The operator then approved and completed local C6-2B. `/admin/users`
  now collects the exact registered email, opaque mail reference, request and
  confirmation times, and reason before two independent confirmations. Closing
  either screen performs no request. Only the final destructive button calls
  the existing POST boundary; a failed response keeps the evidence and original
  idempotency key for safe retry. Successful creation switches to the suspended
  view and shows an irreversible, read-only processing state and 30-day deadline
  without claiming that downstream data is already erased. Site-owner rows have
  no deletion control. The account-list projection returns only request ID,
  state, creation time, and deadline, not verification email or mail reference.
  The updated real PostgreSQL verification passes 11/11, including a refreshed
  request projection, without external service access. The synchronized C6-2B
  change passes `npm run check:local`: lint, typecheck, the Vinext production
  build, and 198 tests with 193 passing and five opt-in integrations skipped.
  The operator then approved and completed local C6-2C. Additive migration
  `0014_m8_account_deletion_lifecycle_foundation.sql` creates a non-content
  deletion register with no foreign key to owner/content rows and one leased
  `wait_for_submitted_jobs` step. New requests seed both rows inside the existing
  irreversible transaction; migration backfill is idempotent. The bounded local
  service claims with `FOR UPDATE SKIP LOCKED`, records only aggregate block
  evidence, safely handles expired/lost leases, and locks every guard-crossed
  non-terminal job before deferring or completing the step. A completed wait
  step does not complete the deletion request/register and performs no content,
  object, Authing, queue, credit, or account deletion. The updated real
  PostgreSQL verification passes 15/15: a live submitted job defers, its terminal
  transition allows the next pass to complete the wait step, and the owner plus
  both jobs remain present. The synchronized C6-2C change passes
  `npm run check:local`: lint, typecheck, the Vinext production build, and 202
  tests with 197 passing and five opt-in integrations skipped. No runtime command
  or timer was added. The operator then approved and completed local C6-2D. Its
  internal repository accepts only a processing request/register whose submitted-
  job wait step is completed, then reads a repeatable-read, read-only snapshot of
  projects, generation batches/jobs, assets, the root draft, references, and
  distinct live private-object keys. The service returns only six counts,
  inventory version 1, and a SHA-256; it strips all extra fields and never emits
  an owner/request/row ID or object key. Populated, empty, reordered, digest-
  drift, not-ready, rollback, and redaction paths pass. The opt-in real
  PostgreSQL test passes 18/18 and proves two stable previews with exactly two
  jobs and no mutation. The synchronized C6-2D change passes
  `npm run check:local`: lint, typecheck, the Vinext production build, and 205
  tests with 200 passing and five opt-in integrations skipped. No migration,
  browser route, external adapter, runtime command, timer, deployment, or
  production change was added. The next smallest useful slice is C6-2E: add a
  leased, retry-safe local private-object deletion step against disposable
  RustFS data, recomputing/binding the inventory and deleting bytes before
  recording database success, with no Authing or production access. The operator
  approved and completed C6-2E. Migration 0015 adds `delete_private_objects`,
  generated-asset `object_deleted_at`, and persisted inventory/count/retry
  evidence; because it had already entered the local checksum history before a
  constraint hardening, migration 0016 applies that hardening strictly forward
  instead of rewriting 0015. New requests create all lifecycle steps atomically.
  The old wait claim was corrected to update only `wait_for_submitted_jobs` after
  the second step exposed its formerly harmless request-wide update. Object
  claims require the wait step completed, use `SKIP LOCKED`, lock owner asset and
  reference rows, bind a fresh C6-2D digest, and return at most 100 distinct
  internal targets. The service deletes bytes first, records all matching rows
  and one aggregate success afterward, leaves ambiguous evidence reclaimable,
  and returns/logs no keys or identifiers. Normal reference cleanup skips any
  deletion owner, while generated-asset presentation excludes deleted bytes.
  The real local integration applies all nineteen migrations twice. C6-2F adds
  migration 0017 and a leased `delete_creative_records` step after private-object
  completion. A fresh inventory and zero-live-object precondition bind one
  foreign-key-ordered PostgreSQL transaction that deletes assets, job events,
  attempts, outbox rows, jobs, batches, projects, the root draft, and references.
  Cross-owner graph edges, count drift, or any database error roll the entire
  transaction back. Retained job-linked ledger entries may lose only their job
  foreign key through a trigger-guarded, request-bound transition; amounts,
  reasons, entry relationships, credit accounts, payments, administrative audit,
  GoodGood/Authing identity, sessions, request, and register remain. New project,
  draft, reference-intent, and generation writes serialize with deletion through
  the owner row. The object step now also keeps an unexpired pending-upload key
  live until its signed PUT window and clock-skew grace close, preventing late byte resurrection.
  Real local PostgreSQL and disposable RustFS prove redacted object and creative
  failures, atomic retry, three one-object deletions including the expired upload
  intent, exact 404s, complete creative-graph removal, retained evidence, repeat
  no-ops, and zero temporary objects. C6-2G adds migration 0018's leased
  `delete_external_identities` step after creative completion. Its provider-
  neutral service has no default Authing implementation and requires an injected
  adapter. It persists per-mapping disable-before-delete evidence while retaining
  issuer/subject locally until downstream anonymization. A disposable in-memory
  directory proves redacted partial failure, delete-only retry, completion, and
  repeat no-op; the request/register remain processing. C6-2H adds migration
  0019's final leased local completion step. The single transaction expires
  remaining available credit with a new immutable ledger event, closes the
  zero-reservation account, deletes revoked sessions and externally completed
  local identity mappings, pseudonymizes the owner, scrubs the mail reference,
  and completes the step/request/register with exact 12-month retention. Prior
  financial and administrative evidence stays unchanged. A forced failure proves
  rollback/redacted retry; the successful real local pass proves final absence,
  same-email fresh pending reprovisioning, and repeat no-op across all 19
  migrations. C6-2I adds the opt-in official-SDK Authing adapter with exact
  issuer/subject binding, lookup-first suspend/delete semantics, explicit
  response validation, and user-not-found `apiCode` 2004 idempotency. A
  disposable loopback HTTP endpoint proves the real SDK request paths, bodies,
  signing header, redaction, and failure closure with fake AK/SK. The dependency
  overrides remove the SDK's audited vulnerable transitive versions. No real
  Authing tenant/credential, production R2/host, route, runtime, timer,
  deployment, commit, or push occurred. C6-2J then adds an import-only cycle
  orchestrator around the five implemented leased passes. It observes only
  aggregate lifecycle state, runs the phases in their fixed prerequisite order,
  preserves bounded batches and leases, strips non-allowlisted result fields,
  and emits only fixed redacted alert codes plus one aggregate summary. Initial
  observation failure and unexpected phase exceptions abort later mutation;
  handled retry failures, lease loss, and overdue work remain observable without
  bypassing repository prerequisites. The synchronized C6-2J change passes
  `npm run check:local`: lint, typecheck, the Vinext production build, and 229
  tests with 224 passing and five opt-in integrations skipped. The C6-2I
  official-registry production-dependency audit remains zero known
  vulnerabilities. This implements ADR 0022 without changing a confirmed
  decision. C6-2K now adds a strict, deterministic version-1 register artifact
  and serializable isolated-restore replay. The artifact allowlists only the
  non-content register UUID/state/time fields and is bound by its canonical
  SHA-256 plus a separately required expected digest. Completed tombstones
  remove restored local identity/session/creative/credit state and recreate the
  terminal lifecycle; processing tombstones restore suspension/revocation and
  return `ready: false` without discarding content needed by the ordinary
  lifecycle. A disposable two-database PostgreSQL drill proves both paths and
  repeat idempotency without external I/O. The synchronized C6-2K change passes
  `npm run check:local`: lint, typecheck, the Vinext production build, and 235
  tests with 229 passing and six opt-in integrations skipped; its separately
  enabled PostgreSQL suite passes all six tests. C6-2L now binds dump-before-
  export ordering, exact filenames/bytes/digests/timestamps, the immutable
  application image, root-only permissions, and one-hour freshness in a strict
  three-file manifest stored by one encrypted production Restic snapshot. The
  restore source accepts only the new exact tags/paths, uses no image pull,
  keeps PostgreSQL in network-none/tmpfs, and runs trusted-digest replay through
  that container's isolated namespace; processing records fail readiness. It
  also preserves any pre-existing collision target during cleanup. Shell syntax
  and the runtime bundle pass; the synchronized `npm run check:local` passes
  lint, typecheck, the Vinext production build, and 240 tests with 234 passing
  and six opt-in integrations skipped, without invoking the Hong Kong host or
  off-host repository. C6-2M then adds a production-only one-shot executable,
  exact file-backed configuration, dedicated PostgreSQL/R2 resources, an
  isolated no-port Compose role, nonblocking host lock, fixed aggregate
  result/exit contract, and inactive five-minute systemd schedule. Its targeted
  suite passes 7/7; the synchronized local gate passes 247 tests with 241
  passing and six opt-in integrations skipped, and the runtime/shell checks
  pass without selecting a management credential, installing a unit, or
  contacting any production/external resource. C6-2N then completed the live
  management-credential boundary review under separate approval. The exact
  three-method custom policy and non-owner internal-administrator assignment
  are present, but `type: userpool` aliases the global user-pool Access Key ID
  and cannot be independently revoked, while `type: tenant-co-admin` is rejected
  with `422` / API code `4004` because the subject is not a multi-tenant
  collaborator. The target user was never created, no identity mutation ran,
  no secret was persisted, and the production timer remains disabled. The
  required least-privilege proof is blocked on Authing collaborator-AK support
  or a separate operator risk/architecture decision. C6-2O then completed the
  independent public O1Key contract review. The current documentation exposes
  24-hour public-upload and generated-result URL lifetimes, a GET-only
  asynchronous task-query path, and no documented task deletion route. Both
  public API status endpoints report privacy policy and user agreement disabled.
  No published term establishes erasure timing for prompts, references, task
  records, generated bytes, logs, caches, backups, or upstream processors.
  Consequently provider erasure remains blocked on written O1Key evidence or a
  reviewed provider-boundary change; no credential, task, generation, or remote
  mutation was used. C6-2P then completed a read-only source inventory. Active-
  account enforcement, reviewed admission, finite credit, reasoned suspension,
  private assets, bounded image validation, and provider-rejection normalization
  already exist. They do not constitute semantic moderation: reference and Asset
  moderation states are accepted by technical validation/default, the selected
  Gemini provider request has no moderation parameter, and GoodGood has no
  content-policy acceptance, semantic classifier, report path, per-asset
  quarantine/removal operation, or objective readiness-evidence fields for this
  gate. ADR 0021's unbounded observation-period concurrency remains unchanged.
  The operator then accepted ADR 0023. Migration 0020, exact policy acceptance,
  owner-only fixed-category reporting with atomic quarantine, site-owner audited
  exact preview, restore/byte-first removal, presentation hiding, and objective
  schema-version-3 evidence validation are now implemented locally without a
  classifier or new capacity limit. The synchronized local gate passes lint,
  typecheck, the Vinext production build, and 257 tests with 251 passing and six
  skipped; no secret was persisted. No old candidate-
  health evidence may be reused and public traffic
  remains unapproved. Then collect the remaining
  recovery/rollback, candidate-health, incident-ownership, and delegated
  monitoring evidence before admitting any seed user. Customer checkout,
  domestic Alipay, and the applicable ICP/domain gate remain planned in M9.
  Full-byte real-carrier throughput remains an accepted operator deferral.
- On 2026-09-05 the host created independent production-only local secret
  material under a new `goodgood-production-secrets` group (numeric GID 986),
  without adding the `goodgood` SSH administrator. PostgreSQL and Restic each
  have a new 64-character random value in distinct `root:root 0600` regular
  files. A second read-only verifier proved the files are structurally valid,
  mutually different, and different from staging while printing neither values
  nor hashes. It also proved all five staging containers and loopback/public
  health remain good; no production container, volume, network, runtime,
  maintenance state, external credential file, or Sites deployment exists.
  Host evidence reference is `production-local-secrets:9673e22`.
- The operator created a distinct Cloudflare R2 Account API token with Object
  Read & Write selected for only `goodgood-postgres-backups`. Its two values are
  installed as distinct-from-staging `root:root 0600` files, and the root-only
  production backup config fixes the repository to the `/production` prefix.
  Two independent read-only checks passed bucket listing and proved that prefix
  is empty without initializing Restic or writing an object; write access remains
  unproven until repository initialization. The operator then retrieved the
  saved `GoodGood Production Restic Recovery` password-manager item and supplied
  it to a no-echo verifier. Its in-memory exact comparison matched the server
  Restic password; neither value nor hash was recorded, the Windows clipboard
  was cleared, and all temporary server scripts were removed. Evidence references
  are `production-backup-credential-install:9673e22` and
  `production-restic-escrow-verification:9673e22`.
- The operator created a dedicated `GoodGood Production` O1Key credential in
  the same provider control plane used for staging. It was transferred from the
  Windows clipboard over standard input without entering argv, environment,
  repository files, or logs, and installed at the fixed production source path
  as `root:goodgood-production-secrets 0640`. Server-side comparison proves it
  differs from the unchanged staging key. No project-defined non-billable
  provider authentication endpoint exists, so credential acceptance is deferred
  to the isolated candidate rehearsal rather than guessed or tested through a
  billable generation. The clipboard secret and temporary server installer were
  removed; five staging containers plus loopback/public health still pass.
  Evidence reference is `production-o1key-credential-install:9673e22`. The next
  smallest action is the final 2026-09-06 pre-window recheck and explicit live-
  action review. Authing/application-R2 rotation, maintenance, staging freeze,
  Restic initialization, and production state creation remain separately
  approved conversion-window steps.
- At 2026-09-05 22:46 China Standard Time, the final pre-window read-only review
  again proved the exact candidate repository/image/labels, 500-MiB/80% host
  resource gates, five healthy zero-restart staging containers, empty task/
  outbox/Valkey queues, staging backup readability, public/loopback health, all
  prepared production secret metadata, and an empty production-backup prefix.
  The current-version `goodgood` R2 inventory remains exactly three test objects
  and 576,607 bytes with unchanged fingerprint
  `addd927f5d6ecee9e0b84b6208d3267606a1edc1767a1501990eabf970bf9e0a`;
  no object was downloaded or deleted. The local work-package rehearsal passes
  all nine checks with `executed:false` and `executionAvailable:false`, and the
  artifact-security result remains younger than 24 hours through the selected
  window deadline. The review also found a fail-closed release blocker: ADR
  0019 defines a seed gate without ICP/Alipay, while
  `scripts/production-readiness-contract.mjs` exposes only the full paid gate
  and therefore reports those deferred items as blockers. Do not fabricate pass
  evidence or start maintenance. The next smallest slice is to implement and
  test a separate seed-production gate while preserving the full paid gate,
  then publish and prestage a replacement exact candidate. Review reference is
  `final-prewindow-review:20260905T144622Z`; all live and destructive approvals
  remain false.
- The repository mismatch found by that review is now resolved locally. The
  fixed `production:seed-gate` excludes only `icp-production-domain` and
  `alipay-merchant-sandbox`; the shared evidence schema still rejects unknown,
  duplicate, and unsafe-reference items, and every shared requirement remains
  fail-closed. `production:seed-release-plan` consumes only that fixed gate,
  labels its non-executable result `seed-production-release-dry-run`, and still
  reports `executed:false` and `executionAvailable:false`. The existing
  `production:gate` and `production:release-plan` retain the complete paid gate.
  The real prepared manifest now reports the eleven outstanding shared
  production-evidence items under the seed gate without reporting ICP/Alipay,
  while the full gate continues to report both paid-only blockers. The complete
  local quality gate passes lint, typecheck, production build, and 184 tests
  with 180 passing and four opt-in integrations skipped. The release-contract
  checksum is now
  `6e3d49a638b066cef2bd39f664bb138ccf2def62cf49a0c1f0f073c15c84d06d`, so
  `9673e22` is intentionally not reusable. The next smallest action is to commit
  and publish a replacement immutable candidate through CI, import its fresh
  artifact-security evidence, and repeat the no-traffic prestage before any
  maintenance or live conversion. No server, R2 object, runtime, or traffic
  state changed during this repository fix.
- The seed-gate fix was committed and pushed as full revision
  `3bd4ea9a92d136f781be66a7fa1a075f078b51a1`. GitHub Actions CI run 33 passed
  both jobs and every source-quality, dependency, verification-image,
  published-image runtime-import, High/Critical vulnerability-scan, evidence,
  and immutable-identity step. It published
  `ghcr.io/lizhongyi1209/goodgood@sha256:4b8766529ee5ac3da2ea90cb7edade3ab08bfa890e13aab525b91c51f7fe26e6`
  with migration `0011_m8_account_admission.sql` and runtime contract
  `6e3d49a638b066cef2bd39f664bb138ccf2def62cf49a0c1f0f073c15c84d06d`.
  GitHub lists artifact-security artifact ID `9971639738`, 1,093 bytes, with
  archive digest
  `sha256:76565646b9bea652d69683b11da7839f002bf50a8a4154fea29221caaf0e6d33`.
  The public Actions API exposes that metadata but correctly returned HTTP 401
  for the artifact bytes. The operator downloaded the unmodified 1,093-byte
  evidence file through the authenticated GitHub UI; its local SHA-256 exactly
  matches the workflow artifact digest. The repository importer then passed all
  five artifact-contract, candidate-identity, GitHub-run, required-job, and
  byte-integrity checks and emitted
  `github:run:33973404209/artifact:9971639738`. The candidate readiness manifest
  now binds that passing item and the seed gate reports only its eleven shared
  outstanding evidence items, while the full gate additionally retains the two
  paid-only blockers. Phase 1 is complete. The next action is no-traffic
  prestage and final read-only revalidation of this exact candidate. No
  production host, R2, runtime, or traffic state changed during phase 1.
- Phase 2 replacement prestage is complete. The first attempt stopped before an
  image pull or directory swap because npm's command banner made the captured
  rehearsal output non-JSON; the cleanup hook removed the partial clone, and a
  read-only recheck proved the old prestage, five staging containers, prepared
  secrets, and absent production runtime/state were unchanged. The corrected
  flow invoked the repository planner directly and then pulled the exact
  `4b8766529ee5` digest, verified all OCI labels, platform and non-root user,
  passed all nine non-executable work-package checks, atomically installed the
  clean `3bd4ea9` repository and reviewed files, and retained the stopped prior
  prestage at `/opt/goodgood-production-obsolete-9673e22`. Independent
  verification passes source and installed-file checksums, confirms the new
  image is not running, and proves no production container, volume, network,
  runtime file, maintenance marker, systemd unit, Nginx switch, secret change,
  or traffic change occurred. Root-disk use increased from 24% to 28%, still
  below the 80% gate; available memory remained above 2.4 GiB. The exact
  readiness manifest is installed root-only and the host-side seed CLI reports
  the expected eleven shared pending items without ICP/Alipay, while the full
  CLI reports thirteen including both paid-only blockers. A fresh ListObjectsV2
  inventory at `2026-09-05T15:18:31.680Z` still finds exactly three test
  objects, 576,607 bytes, and fingerprint
  `addd927f5d6ecee9e0b84b6208d3267606a1edc1767a1501990eabf970bf9e0a`;
  nothing was read or deleted. Final review
  `final-prewindow-review-3bd4ea9.json` at `2026-09-05T15:21:09Z` also confirms
  five healthy zero-restart staging containers, no active session/job/outbox/
  Valkey work, readable staging backups with three automated snapshots, an
  empty uninitialized production backup prefix, unchanged prepared credentials,
  zero failed units, and artifact-security age of 50,243 seconds at the window
  deadline. Phase 2 is complete with both live conversion and public traffic
  authorization still false. The next phase is the separately approved
  four-hour conversion window beginning no earlier than 2026-09-06 09:00 China
  Standard Time.
- Exact-candidate preparation had previously caught a Windows/LF
  configuration-fingerprint mismatch before any production approval. Release
  metadata now normalizes text line endings before hashing, with regression
  coverage proving CRLF, lone CR, and LF checkouts produce one identity. The
  superseding candidate passed the complete local gate: lint, TypeScript,
  production build, and 180 tests completed with 176 passing and four opt-in
  integrations skipped. The no-traffic prestage and host-secret preparation do
  not rebuild or change that immutable candidate. After synchronizing this
  operational checkpoint, `npm run check:local` passed the same 180-test gate
  again with 176 passing, zero failures, and four opt-in integrations skipped;
  `git diff --check` also passed with only the existing Windows line-ending
  notice.
- M3 now completes the narrow production-shaped path from browser submission to
  idempotent Node API, PostgreSQL batch/job/outbox transaction, Valkey delivery,
  worker, authenticated HTTP mock provider, RustFS object write, Asset record,
  signed object read, browser polling, creation stream, and asset-library cue.
- The physical PostgreSQL schema covers users, external auth identities,
  one-time OIDC login attempts, hashed/revocable GoodGood sessions, reference
  assets, generation batches, jobs, attempts, generated assets, append-only job
  events, queue outbox, owner-scoped projects with batch association, and one
  expiring root creation draft per owner, immutable price versions, exact
  credit-account caches, append-only credit entries, account admission, roles,
  and administrative audit. All eleven versioned migrations
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
- On 2026-09-04, the disclosed Google OAuth client secret was rotated without
  committing or writing credential material locally. All intermediate Google
  credentials, including one exposed by browser diagnostic output, were
  disabled and deleted; the Google client now contains exactly one enabled
  secret, created at 00:02:39 China Standard Time. The Authing Google source
  accepted the replacement and a fresh Google-to-Authing exchange established
  an Authing session after full hosted logout; retaining the parent login tab
  then completed the GoodGood callback. PostgreSQL reported three users, three
  identities, one active session, three credit accounts, 290 aggregate
  available / zero reserved credits, and 90 available / zero reserved credits
  for the authenticated owner. No duplicate owner, welcome grant, reservation,
  or debit was created. A separate Authing console inspection during this work
  exposed the application client secret and user-pool management secret; both
  were rotated on the same date without recording their values. The replacement
  application secret was supplied through invisible operator input, installed
  at `/etc/goodgood/staging/secrets/auth-client-secret` as
  `root:goodgood-runtime-secrets` mode `0640` with the expected 32-byte length,
  and loaded by a healthy Web-role recreation. Public readiness returned 200,
  the network staging preflight passed, and an explicit GoodGood/Authing logout
  followed by a fresh Google login completed the authorization-code exchange.
  PostgreSQL then reported six sessions with exactly one active, while three
  credit accounts remained 290 available / zero reserved in aggregate and the
  authenticated owner remained 90 available / zero reserved. The user-pool
  management secret was separately rotated and revoked; repository/runtime
  inspection found no GoodGood consumer, so it required no host change.
- The M7 dependency/runtime-image security gate replaces `vinext@0.0.50` with
  `vinext@1.0.0-beta.9` and its compatible `@vitejs/plugin-rsc@0.5.34`, removing
  `image-size@2.0.2` and both associated high-severity infinite-loop advisories
  from the dependency graph and shipped image. The same remediation updates
  Next.js and its ESLint configuration to 16.2.11, Sharp to 0.35.0, and pins
  compatible fixed transitive releases for `fast-uri`, `nanoid`, and `postcss`.
  The Linux build now uses Node.js 24.20.0 at an exact base-image digest and
  removes runtime npm/npx. Pinned Trivy 0.70.0 scans both locked production
  dependencies and the actually built OS/library image on every CI event,
  failing on fixable High/Critical findings while retaining non-blocking
  visibility for findings with no fix. Local compatibility and security
  verification passed: Vinext reported 100% supported imports/config/libraries;
  `npm run check:local` passed lint, full TypeScript checking, production build,
  and 132 tests with 128 passing and four opt-in integration tests skipped; the
  final lockfile and Linux image each reported zero matching findings; and the
  non-root image had no npm, npx, or `image-size` while Sharp 0.35.0 decoded a
  real 1x1 PNG. Remote CI run 33837820040 then passed the repository gate, both
  security scans, real image build, and immutable publication for revision
  `b21a7f427e1a3cb593892c65f3df3f7cc8007a33` as
  `ghcr.io/lizhongyi1209/goodgood@sha256:147c903e8845ee9892dce59c483b26e4d3ed09b067e82962621f0dafeb7563d1`,
  migration `0010_m6_payment_sandbox.sql`, and runtime-contract checksum
  `f527747311f1d773df23c3ec6369a5198e52a15963113b0ba1ac12a8c1bd8369`.
  The operator explicitly deferred deploying this security revision to the Hong
  Kong host until the remaining M7 gates are complete; staging therefore stays
  on its previously verified digest, and the final M7 release must promote a
  newly verified exact digest rather than rebuilding on the host.
  The PostgreSQL backup timer is now installed, enabled, and active;
  no reference-cleanup timer is installed. The retained root-only local restore-
  drill archive and the verified encrypted off-host restore are completed backup
  evidence. Full-byte mainland
  throughput remains an accepted operator deferral, while domestic payment
  is deferred to M9 and its applicable ICP/domain review.
- ADR 0014 selects a separate private Cloudflare R2
  `goodgood-postgres-backups` bucket, Restic client-side encryption, and a
  staging-only `14 daily / 8 weekly / 3 monthly` policy. Its 2026-09-04
  amendment removes the staging-only SMTP path and defers active alert routing
  to the unified M8 production-observability decision; failures remain visible
  in systemd status and the root journal. The runner validates root-only
  configuration and secret modes, serializes operations, removes transient
  plaintext on every exit, applies and prunes retention, fully checks repository
  data, and feeds the latest encrypted snapshot through the isolated restore
  drill. The dedicated private Standard R2 bucket and bucket-only Object Read &
  Write token have no public or administrative access. Its one-time credentials
  are installed in distinct `root:root 0600` files, and the independently
  escrowed 64-character Restic password never entered Git or chat. Restic
  repository prefix `5ef27b35` initialized successfully. The first direct run
  saved snapshot `51145a6d`, applied all retention windows, passed two full
  read-data checks, and removed its plaintext archive. After logout and source
  quiescence, that snapshot restored 20 public tables, 69 rows, and ten
  migrations through the no-network, read-only, bounded-`tmpfs` drill.
  The amended five-file automation set then checksum-matched the Ubuntu 24.04
  host; the obsolete alert script, SMTP example, and alert unit were removed.
  A real systemd service run passed with exit status zero, produced the second
  snapshot `7a7207d6`, applied retention, completed the full repository check,
  and left zero automatic plaintext archives and failed backup units. The new
  latest snapshot independently restored the same 20 tables, 69 rows, and ten
  migrations with a matching archive checksum. The persistent timer is enabled
  and active with its next randomized execution at 2026-09-05 02:30:47 CST;
  PostgreSQL, Web, and Worker remained healthy and loopback readiness returned
  HTTP 200. CI run 21 then passed the 133-test repository gate, locked dependency
  scan, real image scan, and immutable publication for source `90d650f`. Its
  release dry-run, image-label verification, and all ten migrations passed, but
  the new Web container restarted because Vinext 1.0 beta's standalone output
  omitted its React peer package. The candidate release record was not promoted;
  the retained prior digest rolled Web and Worker back to healthy without a
  schema rollback. The Dockerfile now copies the exact locked React peer/runtime
  tree, and CI imports React, React DOM, the RSC client runtime, and Vinext's
  production server from the finished image before scanning or publication.
  The focused 18-test gate, a local Linux image build, and the identical
  finished-image import smoke pass. CI run 22 proved that smoke inside the
  rebuilt Linux image, then correctly blocked publication because copying the
  RSC peer exposed fixed High-severity `CVE-2026-44907` in version 19.2.6.
  React, React DOM, and React Server DOM Webpack are now locked together at the
  fixed 19.2.8 release. The rebuilt Linux image imports
  all four runtime entry points successfully and the pinned Trivy 0.70.0 image
  scan reports zero fixable High/Critical findings locally. CI run 23 passed the
  133-test repository gate, locked-dependency scan, finished-image runtime
  smoke, image scan, and immutable publication for source `8ec46f5` as digest
  `ecbbd4a9d9c8`, migration `0010_m6_payment_sandbox.sql`, and runtime-contract
  checksum `565646d41af0`. The candidate dry-run and network preflight passed;
  the formal release verified matching image labels, reran all ten migrations,
  and started Web and Worker healthy. Loopback live/ready checks pass for both
  roles, the public root/live/ready paths return HTTP 200, and database,
  storage, provider, and queue dependencies report ready. PostgreSQL remains at
  three credit accounts, 290 available credits, and zero reserved; the backup
  timer remains enabled and active with no failed systemd units. After a stable
  recheck, the candidate was promoted to the root-only current release file and
  an immutable read-only release snapshot with matching checksums. M7 is
  complete.
- M8 has started with ADRs 0015 and 0016. Monitoring-platform implementation
  and its notification route are delegated to a separate agent while their
  live handoff remains mandatory production evidence. The retained decision
  fixes the production PostgreSQL objective at no more than one hour RPO and four hours RTO,
  `14 daily / 8 weekly / 12 monthly` encrypted recovery points, 30-day logs,
  90-day metrics, alert ownership/acknowledgement, and the exact-digest
  paid-production release gate. The production Node Web runtime now generates
  one untrusted-input-independent request/support ID per request, returns it in
  `X-Request-Id`, reuses it in normalized errors, and logs only a normalized
  route, status, duration, and allowlisted correlation. Authentication adds the
  internal owner ID; generation adds the job ID. Worker completion adds the
  provider route/task, provider and total duration, and immutable customer
  credit amount without presenting that value as upstream cost. The repository
  now also owns schema-versioned production evidence validation and separate
  machine-readable seed and paid CLIs. `production:seed-gate` excludes only the
  ICP/domain and Alipay checks deferred by ADR 0019; `production:gate` continues
  to require one current result for every approved security, privacy, abuse,
  backup/restore, monitoring handoff, incident ownership, ICP/domain, Alipay,
  health, and rollback check. Both reject unknown, duplicate, stale,
  future-dated, or unsafe-reference evidence. The
  artifact, preflight, health, and rollback records must bind to the exact Git
  revision associated with the immutable candidate digest. The checked-in
  example intentionally remains blocked and cannot be mistaken for approval.
  The production-specific preflight is now implemented as a read-only Linux-host
  command. It requires a clean matching checkout, an already-present immutable
  image with exact revision/migration/runtime labels, fixed root-owned
  non-symlink release/runtime files, four distinct bounded group-readable
  credential files, production-only auth/provider/storage/payment boundaries,
  and live Authing discovery. Only an all-pass report emits the revision-bound
  `production-preflight` evidence item; failed reports expose neither that item
  nor secret values, connection URLs, client IDs, or provider responses. The
  checked-in production environment files remain placeholder-only templates and
  are not production evidence. Main CI now reruns the packaged-runtime import
  smoke and High/Critical vulnerability scan against the published digest, then
  uploads one uncompressed immutable JSON artifact. The read-only importer
  requires the exact candidate plus GitHub's successful `main` run/attempt,
  verify and publish jobs, named steps, artifact identity, byte count, and
  SHA-256 before it emits `artifact-security` evidence. The production release
  planner evaluates the complete existing gate and returns no plan on any
  blocker; even after a pass it reports `executed: false` and exposes no command
  execution path. Main CI run 25 passed the 158-test repository gate, locked
  dependency scan, verification-image build/import/scan, immutable publication,
  and the repeated published-digest import smoke and image scan for revision
  `25766a6a7388c11a90106d9f7ed20884a9e90e51`. The resulting candidate is
  `ghcr.io/lizhongyi1209/goodgood@sha256:624d2061dd6939fdda08cd83cfb2fe3622bb790ce29509cfa1166f0ec237a995`,
  migration `0010_m6_payment_sandbox.sql`, and runtime-contract checksum
  `ef24dac87b71`. Artifact `9962141939` has byte-for-byte SHA-256
  `35b83d2b6c8a` and the importer emitted the current revision-bound
  `artifact-security` evidence reference for workflow run `33941875028`.
  The outer gate accepts that item and continues to reject every remaining
  pending or blocked requirement. No production deployment is claimed. On
  2026-09-05, `npm run check:local` passed lint, full TypeScript checking, the
  production build, and 158 tests with 154 passing and four opt-in integration
  tests skipped; CI run 25 passed the same repository gate.
- ADR 0017 now resolves the previously abstract production runtime adapter as
  `nginx-compose-blue-green-v1` without selecting or purchasing production
  capacity. Blue and green are independent application-only Compose slots on
  fixed loopback Web/Worker-health ports behind one host Nginx origin; durable
  PostgreSQL, Valkey, and private R2 stay outside both slots. Only the inactive
  Web starts before promotion, exactly one production Worker may consume the
  queue, and traffic changes use an atomic root-owned Nginx upstream replacement
  after configuration validation. Rollback restores the retained Web upstream
  and Worker and never downgrades schema. The planner reports eight concrete
  adapter phases but still has no child-process import, execution flag, or
  mutation path, and its output schema is now version 2. The readiness gate now
  refuses candidate-health and rollback
  evidence that omits the selected adapter, exact health/state checks, a
  distinct retained prior revision, successful Web/Worker/queue recovery, or
  the no-schema-downgrade assertion. This stricter passing contract advances
  the non-secret readiness manifest to schema version 2; the checked-in example
  remains intentionally blocked.
  On 2026-09-05, the resulting exact source passed `npm run check:local`: lint,
  full TypeScript checking, the production build, and 159 tests with 155
  passing and four opt-in integration tests skipped.
  Main CI run 27 then passed the same repository gate, locked dependency scan,
  verification-image build/import/scan, immutable publication, and repeated
  published-digest import smoke and scan for revision
  `7d576ff953a9f08ea0e518799f5c42fb50fee8f2`. Its exact candidate is
  `ghcr.io/lizhongyi1209/goodgood@sha256:ac9031da3bdef4eacf2fecc28ebf371669386370b0a7393ad7ee2d5193abdf53`,
  migration `0010_m6_payment_sandbox.sql`, and runtime-contract checksum
  `1ad16ed842c2`. Artifact `9962548814` is 1,091 bytes with byte-for-byte
  SHA-256 `8f01443f0eec`; all five importer checks passed and emitted
  `github:run:33943246606/artifact:9962548814`. The schema-2 outer gate accepts
  that current exact-revision artifact evidence and continues to reject every
  other pending or blocked requirement. No GoodGood production deployment is
  claimed.
- ADR 0018 now selects declarative infrastructure profile
  `alibaba-managed-state-v1` without provisioning cloud resources. ADR 0017's
  application slots require one Ubuntu 24.04 `linux/amd64` ECS host with at
  least 4 vCPUs, 16 GiB memory, and a 100 GiB ESSD system disk. Authoritative
  state moves to RDS PostgreSQL 17 High-availability Edition with at least
  2 vCPUs, 4 GiB memory, and 50 GiB ESSD; Tair Redis OSS-compatible standard
  master-replica starts at 1 GiB as recoverable coordination. Both state
  services are private-VPC-only, and RDS-native backup cannot replace ADR
  0015's separately encrypted off-host recovery repository. The current
  single-platform CI publication provides no ARM evidence, so the profile
  fails closed on an ARM substitution. Official Alibaba Cloud documentation
  also confirms that its regular-website ICP filing path requires a mainland
  China resource. ADR 0019 later resolves the invitation-only production region
  as Hong Kong while leaving the zone pair, exact SKU, price, quota, and
  identifiers unset. The contract still sets purchase, production-deployment,
  and executable-release authorization to false.
  On 2026-09-05, the resulting exact source passed `npm run check:local`: lint,
  full TypeScript checking, the production build, and 160 tests with 156
  passing and four opt-in integration tests skipped.
  Main CI run 29 then passed the same repository gate, locked dependency scan,
  verification-image build/import/scan, immutable publication, and repeated
  published-digest import smoke and scan for revision
  `05d8dd2ac79675b680812f5992489458ca9fc66e`. Its exact candidate is
  `ghcr.io/lizhongyi1209/goodgood@sha256:195db77d74e12ef779b9b6be5b5b835f6d52358b98178ef06fdd32b6370ee1f3`,
  migration `0010_m6_payment_sandbox.sql`, and runtime-contract checksum
  `9774716e29db`. Artifact `9962980216` is 1,091 bytes with byte-for-byte
  SHA-256 `85def9236595`; all five repository importer checks passed and emitted
  `github:run:33944652381/artifact:9962980216`. The outer gate accepts that
  current exact-revision artifact evidence and continues to reject every other
  pending or blocked requirement. No GoodGood production deployment is
  claimed.
- ADR 0019 now records the operator's Hong Kong invitation-only seed-production
  decision and moves paid commercialization to M9 without weakening security,
  privacy, recovery, monitoring, candidate-health, or rollback requirements.
  The declarative production profile now reports `china-hong-kong` as selected
  but not provisioned while retaining all three purchase/deployment/executable
  authorization flags as false. The staged M8 handoff requires operator
  confirmation between launch policy, admission controls, purchasing,
  no-customer foundation, exact-candidate rehearsal, and seed rollout. The
  existing run-29 digest remains historical evidence only: changing the runtime
  infrastructure profile changes the runtime-contract checksum, so a later
  exact candidate must produce fresh CI and artifact-security evidence. On
  2026-09-05, the updated source passed `npm run check:local`: lint, full
  TypeScript checking, the production build, and 160 tests with 156 passing and
  four opt-in integration tests skipped. The gate also now ignores the
  Git-ignored generated `work/` directory instead of linting a nested build
  copy.
- ADR 0020 completes M8 phases 1 and 2: open Authing login provisions pending
  owners,
  the existing 100-credit welcome grant remains, creation use requires explicit
  site-owner approval, routine review and additional free test-credit grants
  move to a site-owner-only account page, and every seed account and creative
  record is production data. It also fixes the security boundary that system
  role, access state, and account tier remain independent; no site-owner role is
  inferred from registration order, email, tier, or balance. Migration 0011,
  pending/suspended account surfaces, the shared active-capability guard,
  dry-run-first site-owner bootstrap, server-authorized `/admin/users` APIs and
  page, immutable review audit, and atomic 1-5000 test-credit grants are now
  implemented locally. The grant path appends operator ledger evidence without
  creating payment orders; the management page includes private POST-body
  search, status filters, visible balances/timestamps, loading/empty/failure
  recovery, and recent action history.
  On 2026-09-05, `npm run check:local` passed lint, full TypeScript checking,
  the Vinext production build, and 169 tests with 165 passing and four opt-in
  integration tests skipped. `npm run build:runtime` bundled the Web, Worker,
  and new bootstrap process, `npm run stack:config` accepted the Compose model,
  and `git diff --check` found no whitespace errors. Docker Desktop's Linux
  engine was not running, so live PostgreSQL migration/replay and browser
  behavior remain named no-customer rehearsal evidence rather than claimed
  local results.
- On 2026-09-05, the operator assigned `goodgood.o1key.com` to production and
  selected `staging-goodgood.o1key.com` as the existing test environment's
  migration target. ADRs 0019 and 0012 plus the architecture and deployment
  runbook now preserve the ordered DNS/TLS/Nginx/R2/Authing cutover boundary.
  This documentation update changed no live DNS, certificate, Authing, Nginx,
  R2 CORS, staging contract, or production environment. `npm run check:local`
  passed lint, full TypeScript checking, the Vinext production build, and 170
  tests with 166 passing and four opt-in integration tests skipped;
  `git diff --check` found no whitespace errors.
- ADR 0021 records the later capacity decision: reuse the current 2-vCPU /
  4-GiB / 50-GiB Hong Kong server for initial unpaid seed production, keep
  development and test on the operator workstation with local/test-only data,
  reserve `staging-goodgood.o1key.com` without activating it, and retain ADR
  0018's ECS/RDS/Tair profile as the measured scale-out target. The operator
  also selected a clean production start: no staging user, credit, project,
  generation, session, audit, queue, or object record is imported. Fresh
  database/queue state, production R2 namespace and credentials, rotated
  secrets, and the audited site-owner bootstrap define the boundary. This
  documentation change connected to no server and deleted or changed no data.
  `npm run check:local` passed lint, full TypeScript checking, the Vinext
  production build, and 170 tests with 166 passing and four opt-in integration
  tests skipped; `git diff --check` found no whitespace errors.
- The operator retained ADR 0015's production recovery objectives for the
  single-host launch: backups no more than one hour apart, restore targeted
  within four hours, and at least 14 daily / 8 weekly / 12 monthly encrypted
  off-host recovery points. The final verified staging archive remains isolated
  for seven days after clean conversion, then is deleted only through a
  separate exact-target approval. No backup schedule or live retention setting
  was changed by this documentation decision. `npm run check:local` passed
  lint, full TypeScript checking, the Vinext production build, and 170 tests
  with 166 passing and four opt-in integration tests skipped.
- The operator chose observation rather than a fixed generation limit. There
  is no per-user pending-job cap, global queue-depth cap, fixed concurrent-job
  ceiling, CPU rejection threshold, or automatic scale-up. The durable queue
  remains only for correctness, crash recovery, and momentary backpressure.
  New generation pauses when host `MemAvailable` is below 500 MiB or root-disk
  use reaches 80%; in-flight provider work is preserved and recovery is manual.
  Code inspection confirmed that the current Worker is serial, so concurrent
  draining without a fixed count ceiling is a named launch implementation gap,
  not a capability claim. Monitoring must capture active jobs, submission and
  queue behavior, latency/failures, state pressure, restarts, memory, disk, and
  backup freshness before a later capacity decision. `npm run check:local`
  passed lint, full TypeScript checking, the Vinext production build, and 170
  tests with 166 passing and four opt-in integration tests skipped.
- The operator selected reuse of the current private Cloudflare R2 `goodgood`
  bucket for production rather than a new bucket or prefix. The conversion must
  inventory every object, preview and separately approve the exact deletion,
  remove all test objects, verify the bucket is empty, and rotate its scoped
  credentials before the first production upload. The decision itself did not
  inspect, delete, or change any live R2 object or credential.
  `npm run check:local` passed lint, full TypeScript checking, the Vinext
  production build, and 170 tests with 166 passing and four opt-in integration
  tests skipped.
- The operator selected reuse of the current Authing application and identity
  directory. Conversion retains the issuer, client ID, hosted Google connection,
  passwordless email, and external identity records; it rotates the OIDC client
  secret, imports no old hashed GoodGood sessions into fresh state, and keeps only the exact
  `https://goodgood.o1key.com/api/auth/callback` login callback and
  `https://goodgood.o1key.com/` logout URL. Fresh GoodGood state means every
  returning identity provisions a new pending account with the standard welcome
  grant and no inherited role, credit, session, or content. No Authing console,
  identity, allowlist, or secret was read or changed by this documentation
  decision. `npm run check:local` passed lint, full TypeScript checking, the
  Vinext production build, and 170 tests with 166 passing and four opt-in
  integration tests skipped.
- The operator selected a visible public maintenance window for the initial
  conversion with a four-hour execution limit. Production opens only after
  fresh migrations, cleared/rotated R2, Authing rotation, site-owner bootstrap,
  pending isolation, backup/restore, real generation/private read, candidate
  health, and rollback all pass. At the limit or any failure, the attempt stops
  with maintenance still active; old staging may run only privately for
  diagnosis and is never republished or imported. This decision changed no live
  route or maintenance state. `npm run check:local` passed lint, full
  TypeScript checking, the Vinext production build, and 170 tests with 166
  passing and four opt-in integration tests skipped.
- M8 phase-4 local preparation now implements the selected
  `alibaba-hong-kong-single-host-seed-v1` contract while retaining ADR 0018's
  managed profile only as a separately named, unauthorized scale-out option.
  One Worker process now starts every accepted queue item without a fixed count
  ceiling, reports active-job count, and drains all in-flight promises before
  closing. New Node-runtime generation submit/retry requests fail with
  `GENERATION_CAPACITY_PROTECTED` below 500 MiB `MemAvailable`, at 80% root-disk
  use, or when host observations fail; protection latches until operator review
  and process restart while reads and other handlers remain outside the gate.
  The exact-target conversion example, planner, and quiet GoodGood maintenance
  page are checked in. The planner has no execute flag, process-spawn path, live
  connection, or destructive filesystem operation. `npm run check:local`
  passed lint, full TypeScript checking, the Vinext production build, and 175
  tests with 171 passing and four opt-in integration tests skipped.
- The first phase-4 live-action review was strictly read-only. The Ubuntu 24.04
  x86_64 host exposes the expected 2 CPUs; Linux reports 3,583,316 KiB total and
  2,499,112 KiB available memory, the 50-GiB root filesystem is 21% used, and
  the 2-GiB swap is effectively unused. All five staging containers are healthy
  with zero restarts and about 265 MiB aggregate observed memory at the sample;
  public root/live/ready return HTTP 200. Only SSH/Nginx are public at the host,
  application/storage health ports remain loopback, and the Nginx Cloudflare
  allowlist ends in `deny all`. The deployed application is still migration
  `0010_m6_payment_sandbox.sql`, both process stop timeouts are 10 seconds, and
  the production maintenance marker/asset and production volume names are
  absent, so no production capability is claimed.
- The staging database is about 9.2 MiB and contains 4 test users, 7 sessions,
  8 ledger entries, and 2 terminal generation jobs; Valkey has zero ready,
  processing, or other keys. The private `goodgood` R2 bucket contains exactly
  3 test objects (1 generated and 2 references), 576,607 bytes total, matching
  the recorded application-object counts; its sorted metadata inventory hash is
  `23f2bab02562ae57f723d954c8bff145cc2df3dad354fd0db5756f9a4c504f2f`.
  Nothing was downloaded or deleted. The encrypted off-host repository exposes
  3 automated PostgreSQL snapshots through a no-cache/no-lock listing, newest
  at 2026-09-05 02:30:52 CST, while the installed retention is still 14 daily /
  8 weekly / 3 monthly rather than production's required 12 monthly. Runtime
  OIDC discovery, exact production login callback, secure cookie, private R2
  verification mode, O1Key route, and disabled fake payment all pass. Authing's
  complete console callback/logout allowlist and future production-secret
  rotation cannot be proven from the host and remain explicit conversion gates.
  No service, configuration, credential, traffic, database row, queue key,
  object, archive, or repository lock changed during this inspection.
- Post-C7 ADR 0025 action: the isolated generation-capability candidate was
  published and promoted without the preserved local migration-0020 work. Old
  route attempts were drained before Worker handoff, controlled-alpha release
  and readiness checks passed, and the explicitly approved single live `4:5` /
  `2K` request proved exact output dimensions, 10-credit settlement, private R2
  integrity, repeated asset-list persistence, and empty database/Valkey work
  queues afterward. New registrations remain pending with 100 welcome credits
  and require site-owner review in `/admin/users`. Continue watching public
  availability, Web/Worker health and restarts, memory, disk, backup freshness,
  and generation failures; restore maintenance on a documented stop condition.
  Do not enable checkout, claim the full seed gate, or deploy the local
  migration-0020 work.
- Blockers: domestic Alipay checkout requires the ICP-filed production domain,
  matching merchant approval, and sandbox credentials. These external items do
  not block M7 staging or trusted manual credit operation. The local fake
  sandbox is not production payment evidence. M5 has no remaining
  blocker. The deferred reverse-order association
  check needs a second
  Google-backed test address or an explicitly approved reset of the isolated
  Authing test user. No disclosed-credential rotation blocker remains.
  Application secrets remain operator-supplied outside the repository by
  design. ADR 0016 delegates monitoring implementation; live signal coverage,
  retention, delivery, acknowledgement, and ownership remain external
  `monitoring-handoff` evidence and cannot be bypassed. Production recovery
  objectives remain fixed by ADR 0015. ADR 0019 resolves the production region
  as Hong Kong and the production hostname as `goodgood.o1key.com` for the seed
  launch. ADR 0021 removes the immediate infrastructure-purchase blocker by
  accepting the current host's single-failure-domain risk; exact conversion
  implementation, recovery evidence, and destructive approval remain pending.
  Archive retention, recovery objectives, and resource-pressure behavior are
  confirmed but not yet configured or proved. The remote staging hostname is
  reserved and not activated.
  The production release planner is intentionally non-executable until the
  profile is provisioned for no-customer rehearsal and the executable adapter
  receives separate review;
  a local plan is not deployment authority.
  An ICP-filed custom authentication domain is not required now because
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
| M7 | Hong Kong staging | Completed | The hardened Hong Kong host, isolated dependencies, private R2, Cloudflare-only TLS origin, Authing callbacks and rotated secrets, real O1Key generation/reference ingestion, public logout recovery, rollback, mainland HTTP sampling, and all ten migrations pass. ADR 0014's separate encrypted off-host PostgreSQL repository, retention, two latest-snapshot restore drills, real systemd backup, and active persistent timer pass; outbound notification is deferred to M8 and QQ Mail is not under consideration. CI run 23 passes 133 tests, dependency and finished-image scans, and runtime import smoke after the React 19.2.8 fix. Its exact immutable digest is the promoted healthy release: Web/Worker and every dependency readiness check pass, public root/live/ready return HTTP 200, and credit state is unchanged. Full-byte real-carrier throughput remains an accepted non-blocking deferral; payment checkout stays intentionally absent until M9 |
| M8 | Hong Kong controlled alpha, then full seed readiness | In progress | C0-C5 and the exact production candidate remain as recorded. ADR 0024 adds a narrower `controlled-alpha-v1` gate without passing or weakening the full seed gate. C6-3A exact-candidate baseline, C6-3B one reviewed non-owner journey, C6-3C fresh encrypted off-host recovery/isolated restore/maintenance fallback, and C6-3D minimum signal delivery/manual owner handoff are complete with immutable aggregate-only evidence. The exact `production:alpha-gate` returns `ok: true`; after separate `publicTrafficOpen` approval, C7 removed maintenance and passed public root/readiness/login/access-guard smoke checks plus three initial healthy observations. Controlled alpha is publicly operational. ADR 0025's 42-combination Nano Banana 2 ratio/resolution slice is deployed as immutable revision `94cecb0`; one explicitly approved billable `4:5` / `2K` production request succeeded at `1856 x 2304`, settled exactly 10 credits, passed private-R2 integrity and repeated asset-list reads, and left no active database or Valkey work. The local migration-0020 content-safety and account-deletion work remains preserved but undeployed; automated deletion, Authing management access, O1Key erasure terms, full monitoring/incident ownership, content-report rehearsal, and complete rollback rehearsal remain unfinished for the full seed track. |
| M9 | Paid commercialization and domestic Alipay | Planned, deferred | Preserve ADR 0010's domestic Alipay direction and ADR 0015's fail-closed paid gate. Complete the applicable production-domain/ICP review, merchant qualification, real sandbox and callback evidence, provider adapter, refund semantics, and the smallest customer checkout UI before accepting payment. Seed launch evidence does not complete M9. |

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
