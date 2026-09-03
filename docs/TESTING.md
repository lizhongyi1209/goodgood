# Testing strategy

## Current baseline

The default suite validates the production build, rendered metadata, shared UI
primitive behavior, documentation continuity, stable model/ratio mappings,
job-state transitions, both M1 and HTTP mock contracts, M3 input validation and
migration structure, dependency-aware health endpoints, the single-image
process contract, pinned Compose topology, and host probe success/failure.
M4 adds fast coverage for the explicit local-auth opt-in, local credential
parsing, external-identity mapping, disabled accounts, authentication on every generation route, owner-scoped
idempotency, cross-owner read/retry denial, reference intent limits, real image
decoding, format/size/dimension rejection, upload UI success/failure, reference
route owner propagation, project save validation and idempotency, project list
loading/empty/failure UI states, project route owner propagation, cross-owner
read/update denial, stable project route parsing/history notification, direct
detail loading and recovery wiring, meaningful unsaved-change detection,
explicit discard/cancel wiring, authenticated asset-list owner propagation and
filtering, asset loading/empty/failure recovery, restore mapping, and migration
evidence. Asset navigation coverage additionally proves stable library/detail
route parsing, history-state preservation, URL replacement while changing the
active detail image, direct-page mounting, and missing-ID recovery wiring.
Creation-route coverage proves `/` and `/create` parse to the same workspace
state, product navigation canonicalizes to `/create` only once, direct load and
refresh mount the shared page, and native Back/Forward retain a working
composer without console errors.
Reference-retention coverage proves bounded server-owned defaults, dry-run
non-mutation, two-phase eligibility and leases, object-first deletion evidence,
failure retry evidence, idempotent reruns, and generation/project snapshot
protection. Snapshot writers share the cleanup lifecycle lock and revalidate
ready references inside their persistence transaction.
Creation-draft coverage proves one record per owner, 30-day sliding expiry,
stable-value/reference validation, authenticated empty/read/save/delete routes,
optimistic conflict responses, browser load/save/delete/error boundaries,
root-only hydration/autosave wiring, explicit conflict recovery, and draft
reference protection during cleanup.
The production-shaped authentication tests additionally cover OIDC
configuration safety, discovery, Authorization Code + PKCE parameters, signed
ID-token issuer/audience/nonce verification, verified email, one-time login
state, HTTPS `Secure`/`__Host-` runtime enforcement, return-path validation,
five-minute discovery refresh, capability-drift rejection without an orphaned
login attempt, hashed sessions, revocation, provider-token
rejection, same-browser callback binding, failure-path binding-cookie cleanup,
and the fifth/sixth migrations. A
local mock issuer signs test tokens; no
real Authing, Google, or email credentials enter the suite.
The staging preflight tests additionally prove fail-closed checks for exact
callback path, HTTPS transport, Secure `__Host-` cookies, Authorization Code,
S256, requested scopes, supported token-endpoint authentication, RS256 signing,
the derived GoodGood logout callback, the Authing hosted-logout URL contract,
rejection of the local-auth opt-in in OIDC environments, and redaction of
client credentials. They also cover mounted secret-file loading, ambiguous or
unreadable secret rejection, the safe local launcher contract, and the explicit
loopback-only cookie exception. Unsafe HTTPS cookie configuration is rejected before
discovery. Authentication boundary tests prove the
OIDC top-level logout handoff, local-mode no-redirect response, and malformed
handoff rejection. Hosted-page login methods, mail delivery,
and cross-method subject association remain explicit manual staging evidence
because OIDC discovery does not expose those controls.

M7 release-contract tests prove that staging accepts only the GoodGood GHCR
image pinned by digest and full CI metadata, separates release identity from
runtime configuration, reads Authing, O1Key, and R2 credentials only from
mounted files, and never reports connection or secret values. Empty
configuration, mutable tags, local auth, inline provider/storage secrets, fake
payment, loopback/custom-domain storage, R2 bucket-management mode, malformed
env files, and image-label mismatch all fail closed. Static Compose coverage
proves the staging topology has no build,
local-auth, mock-generation, or fake-payment fallback. Deploy plans include one
explicit forward migration before app startup; rollback plans never attempt a
schema downgrade. Real GHCR pulls, Authing discovery, storage permissions,
migration execution, and container readiness remain host/staging evidence rather
than fast-suite mocks.
Static host-bootstrap coverage additionally rejects a convenience Docker
installer or embedded host credential and retains the Ubuntu 24.04 gate, 2 GiB
swap, official signed Docker repository, bounded Docker logs, disabled default
Nginx site, and 22/80/443 UFW contract. Real package installation, reboot,
cloud-agent health, and post-reboot SSH continuity remain staging-host evidence.
Static dependency coverage pins PostgreSQL, Valkey, and RustFS by digest;
requires memory/PID limits, named volumes, an internal dependency network,
file-backed database/storage credentials, a disabled storage console, and no
database or queue host binding; and permits only the S3 API on host loopback.
The installer contract generates credentials on-host, refuses implicit
rotation, checks Docker metadata for leaks, and makes a real loopback readiness
request. On-host evidence additionally requires all three health checks,
PostgreSQL `SELECT 1`, Valkey `PING`, enforced runtime limits, exact network
membership, and an empty systemd failed-unit set.
The R2 provisioning unit proves local storage still creates/configures its
bucket, staging performs only `HeadBucket`, and a failed verification can be
retried. Static Nginx coverage fixes the canonical hostname, Cloudflare-only
origin allowlist, loopback application upstream, TLS floor, on-host CSR/key,
certificate hostname/key/expiry checks, and inactive-until-valid activation.
Real R2 IAM/CORS, presigned transfer, and Cloudflare Full (strict) TLS remain
staging evidence rather than fast-suite mocks.

The operator-only `npm run stack:authing-local -- --issuer <issuer>
--client-id <application-id>` path runs the same public capability preflight,
then mounts an invisibly entered application secret from an operating-system
temporary file into the web container. Register the exact loopback login and
logout callbacks documented in `docs/DEPLOYMENT.md`, exercise the browser, and
press Enter in the launcher terminal to stop the stack and remove the secret.
This local flow does not replace the public HTTPS staging matrix.

`GOODGOOD_M3_INTEGRATION=1 node --test tests/m3-compose-integration.test.mjs`
is the opt-in destructive-process integration test against the disposable local
test stack. It proves all ten migration reruns, authentication enforcement,
two-owner idempotency isolation, cross-owner reference/job denial, signed direct
reference PUT and CORS, server-side decoded validation and rejected-record
evidence, referenced generation, successful output persistence and signed
reads, idempotent project save, signed project restore, newest-first batch
ordering, automatic continuation association, cross-owner project denial,
normalized provider rejection and timeout, retry, duplicate delivery, forced
worker restart, owner-isolated root-draft save/read/delete, stale-version save
and delete conflicts, signed draft-reference restore, deletion of an
unreferenced rejected object, protection of project/generation/draft
references, draft-reference eligibility after clearing, and idempotent
repeated cleanup. It preserves
named volumes and does not run as part
of the fast default gate. Production-provider identity, external object-storage
behavior, gateway callbacks, and real payment providers remain outside current
coverage. The full Compose path now covers live generation metering and reads
the authenticated billing summary around one fake-sandbox purchase and seven
jobs. It proves an idempotent CNY 10 / 500-credit order, signed webhook replay,
one payment grant, five generation settlements, two releases, zero reserved
credit, and the exact final balance.

M6 adds fast signed-delta, transaction commit/rollback, migration-structure,
browser-separation, billing-summary serialization, authenticated route, and UI
boundary tests. The opt-in
`GOODGOOD_M6_INTEGRATION=1 node --test tests/m6-credit-ledger.test.mjs` test
targets an isolated PostgreSQL database. It proves migration checksum rerun,
the three immutable 10-credit Banana 2 prices, migration grants for existing
owners, exactly-once first-login welcome grant, live job reservation, successful
Asset settlement, `SUBMISSION_UNKNOWN` customer release, deterministic custom
price selection, manual grant, refund, insufficient-credit rollback, same-key
replay, conflicting replay, mutually exclusive reservation closure, one full
refund, exact account caches, generation quote snapshots, and database rejection
of price/ledger mutation. The same PostgreSQL run verifies that the public read
returns exact decimal-string balances and all three active launch quotes without
internal IDs. The ledger test itself does not call a payment sandbox.

The M6 payment tests cover migration/schema structure, the immutable product,
owner/idempotency isolation, exact public snapshots, enabled-only fake provider
configuration, timestamped HMAC verification, invalid and conflicting replay,
amount mismatch rollback, append-only event evidence, exactly one payment
ledger grant, and protected product/order snapshots. The opt-in PostgreSQL run
uses no real payment credential or external provider.

Manual-payment coverage proves argument allowlisting, dry-run-by-default
behavior, server-owned product amounts, case-insensitive single-owner lookup,
no preview mutation, atomic paid-order plus operator-ledger grant, exact replay,
cross-owner receipt conflict, missing-owner failure, masked command output, and
the absence of any browser administrator route. Its opt-in PostgreSQL case uses
the same `GOODGOOD_M6_INTEGRATION` and isolated database contract as the payment
sandbox test.

Use:

```bash
npm ci
npm run check:local
```

`check:local` is the cross-platform gate intended for local computers and
GitHub Actions. It runs lint, the full TypeScript check, the production build,
and automated tests. CI uses the same pinned Node.js 24.12.0 runtime. Pull
requests also build the production Dockerfile without registry access. A
trusted `main` revision publishes to GHCR only after verification and records
its immutable image digest, source revision, migration version, and runtime
configuration-contract checksum. Workflow tests reject floating third-party
action references and a `latest` image tag. The existing Sites lifecycle
scripts remain available for the current hosted prototype.

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
- Root and `/create` direct access, refresh, and Back/Forward equivalence.
- Composer open/closed drawer without value loss.
- Reference tray from 0, 1, 9, 10, and over-limit inputs.
- Generation skeleton count and ratio.
- Inline failed batch preserves prompt/settings and retries.
- Project restore and `新建创作` behavior.
- Project index/detail direct access, refresh, back/forward, and unsaved composer
  preservation across index navigation.
- New-session and different-project discard confirmation: prompt/reference/
  setting changes, cancel preservation, explicit discard, clean-state bypass,
  and active-generation blocking.
- Authenticated root-draft restore, debounced save, empty-state clearing,
  project isolation, transient failure recovery, and explicit two-tab conflict
  resolution.
- Asset batch/gallery ratio rendering.
- Asset index/detail direct access, refresh, back/forward, selected-mode and
  scroll preservation, plus missing-ID recovery.
- Detail wheel, arrow keys, stable-URL replacement, focus, source scope, and
  close restoration.

### API/integration

- Auth and ownership on every write/read.
- Signed upload lifecycle and invalid-file rejection.
- Reference-cleanup dry-run, bounded claim, object deletion, retry evidence,
  idempotency, and concurrent snapshot protection.
- Idempotent generation creation.
- Idempotent owner-scoped project creation, restore, update, and continuation.
- Owner-scoped asset listing filters to accepted successful outputs, preserves
  newest-first grouping, and returns fresh signed private reads.
- Provider timeout/rejection normalization.
- Callback verification and duplicate callback handling.
- The M5 fake O1Key gateway proves `nano-banana-2` maps only to
  `gemini-3.1-flash-image-c-sp` with 1:1, 1K, one output, and `IMAGE` response
  modality; ordered multipart temporary uploads become explicit `fileData`
  references; polling success/failure, bounded timeout, duplicate/conflicting
  confirmed terminal reads, provisional-failure recovery to success, HTTPS
  enforcement, malformed response rejection, and stateless restart work
  without a real credential.
- The M5 provider-router tests prove the worker reads ordered private RustFS
  bytes into O1Key temporary uploads, persists the selected provider route,
  rejects an active-attempt route mismatch, resumes polling, fully decodes a
  downloaded image before storage, retries bounded transient result delivery,
  and loads a mutually exclusive direct or file-based credential. The local
  launcher/Compose contract mounts its temporary key into only the worker.
- The accepted O1Key at-most-once tests prove reference uploads finish before
  the billable submission guard, the guard is a one-way persisted transition,
  ambiguous transport failure becomes `SUBMISSION_UNKNOWN`, and neither the
  adapter nor a reclaimed worker silently sends a second generation POST.
  Visible retry copy identifies the next submission as a new billable task.
- Private signed-object component tests prove generated previews and restored
  reference thumbnails remain direct browser image requests without
  `/_vinext/image`, `srcset`, or `data-nimg` rewriting. The workspace uses that
  primitive for the reference tray plus creation, project, asset-library, and
  detail surfaces.
- Database transaction creates batch/job/assets consistently.
- Credit grant, live generation reservation, successful-Asset settlement,
  no-Asset release (including `SUBMISSION_UNKNOWN`), refund, and insufficient-
  credit paths are transactional and idempotent.
- Active payment-product selection, owner-scoped order idempotency, signed fake
  callback verification, exact amount matching, event replay/conflict handling,
  and paid-credit grant are transactional and idempotent.
- Dry-run manual payment preview, exact owner/product resolution, immutable
  receipt identity, paid-order settlement, and replay/conflict behavior are
  transactional and idempotent without accepting operator-supplied amounts.
- Equivalent provider fallback preserves the selected GoodGood model and
  records every attempt.

### Local container integration

- A clean checkout starts the documented web, worker, PostgreSQL,
  Redis-compatible, object-storage, and mock-provider services.
- The production Linux image runs without source bind mounts or undeclared host
  dependencies.
- Host probes verify all six loopback endpoints, and named volume data survives
  container replacement.
- Migrations initialize an empty database and tolerate the documented rerun or
  recovery procedure.
- Killing a mock-provider worker does not lose the batch or charge twice. An
  O1Key worker resumes only with a durable `task_id`; otherwise its persisted
  submission guard fails closed without an automatic second billable POST.
- Duplicate queue delivery and duplicate completion callbacks have no adverse
  effect.
- Provider 500, rejection, malformed result, timeout, and unreachable states
  normalize to the documented recovery behavior.
- Object storage or database failure preserves enough durable evidence for
  reconciliation.
- The opt-in maintenance role defaults to dry-run; explicit execution deletes
  only unreferenced candidates and is idempotent against real PostgreSQL/RustFS.

M3/M4 accept the first six items above for the current narrow local contract,
including signed reference transfer and referenced generation. The final
storage/database outage cases are covered structurally by outbox, lease, event,
and non-terminal defer behavior; deliberate dependency outage automation remains
a useful hardening slice before staging.

The current M5 slice proves the adapter and durable worker/storage routing
locally against a fake O1Key HTTP service. A 2026-09-02 dedicated-token smoke
also proved real reference upload, URL-output submission/polling, 1024×1024 JPEG
decode, private RustFS persistence, authenticated signed read, asset-library
display, and stable detail display. A separate fresh `/create` load restored the
persisted prompt and reference thumbnail, decoded the signed 2100×2800 source
browser-direct, and reported no console errors. Neither verification retained
the credential, provider attachment URL, or generated user bytes in the
repository. Charge/refund outcomes are audited in the operator's New API usage
history rather than inferred from generation state. O1Key confirmed that the
image API has no idempotency, client-task lookup, or signed-callback field; ADR
0008 accepts that limitation with the persisted at-most-once guard rather than
claiming exactly-once execution. Multi-output and partial-result behavior remain
outside the one-output MVP.

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
5. Save project -> copy detail URL -> reload -> restore -> continue -> back.
6. Open detail from creation and assets -> navigate -> download.

### Staging-only verification

- Authentication preflight passes against the real Authing application without
  printing credentials.
- The hosted page exposes only Google and email verification code for login and
  registration; password, username, phone/SMS, and other connections are absent.
- Google-first and email-first test journeys for the same verified address
  return the same Authing OIDC subject and GoodGood owner.
- First/repeat login, cancellation, callback expiry/replay, unverified email,
  local plus Authing hosted logout, and GoodGood session expiry match the
  normalized contract.
- Public DNS, TLS, ESA routing, and health/readiness behavior.
- Signed reference upload and private asset delivery against the selected
  object-storage provider.
- Signed US gateway callback plus polling reconciliation when the selected image
  provider supports it; O1Key's current image contract is polling-only, so any
  exit-criteria adjustment requires an explicit decision rather than an
  undocumented callback implementation.
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
