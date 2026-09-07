# Product definition

## One sentence

GoodGood is an image-first AI visual creation workspace for people who need to
generate quickly, compare many visual directions, keep useful assets, and
resume a coherent body of work later.

## Positioning

- Category: global premium visual AI platform.
- Initial experience: Chinese-first creation workflow, globally legible brand.
- Primary users: photographers, visual creators, fashion/e-commerce teams, and
  small creative teams producing repeated image batches.
- Core promise: reduce the distance between an idea and a usable visual asset
  while preserving the creative trail.

GoodGood is not positioned as a technical model console. Model parameters are
necessary controls, but generated images remain the visual center of gravity.

## Core mental model

The product has four distinct concepts:

1. **创作 / Creation** — the active, fast, continuously accumulating session.
2. **批次 / Batch** — one submission plus its prompt, references, parameters,
   results, status, and time.
3. **资产 / Asset** — an individual generated image that can be inspected,
   selected, downloaded, and reused.
4. **项目 / Project** — a saved creative context containing multiple related
   batches and enough state to resume work.

Do not collapse these terms. In particular, an asset library is not a job log,
and a project is not simply a folder of images.

## Primary journey

1. A new user sees a restrained empty creation state.
2. They enter a prompt, optionally add up to 10 references, and optionally open
   the attached settings drawer.
3. They select model, aspect ratio, resolution, and generation count.
4. The latest batch begins at the top of the creation stream.
5. Completed images enter the asset library automatically.
6. The user continues generating around the same goal without leaving creation.
7. When the body of work becomes meaningful, they save the session as a project.
8. Later they open the project, restore its state, and continue; they can always
   start a clean creation from the project surface.

## Current prototype scope

Implemented in the interactive frontend:

- Prompt and reference composer.
- Expandable parameter settings.
- Three visible model choices; the durable path accepts Nano Banana 2 with one
  output across all 14 product-defined aspect ratios and `1K` / `2K` / `4K`.
- Polled loading, completion, inline failure, and retry for that durable path.
- The M4 backend boundary now authenticates a provider-neutral external
  identity and scopes generation and generated-asset reads to its internal
  GoodGood owner. The production-shaped adapter uses standard OIDC for an
  Authing-hosted Google / email verification-code login and then issues a
  revocable GoodGood session; local Compose retains explicit test identities.
- Reference thumbnails now use an owner-scoped signed direct-upload lifecycle;
  the local backend validates the decoded JPEG/PNG/WebP before allowing up to
  10 ready references into the durable generation snapshot. A manual, bounded
  cleanup role protects every project/generation snapshot and records
  object-deletion or retry evidence without deleting database history.
- Projects now persist in the local PostgreSQL slice with owner-scoped,
  idempotent save; restore returns the latest prompt, ordered ready references,
  parameters, and batches, and project continuation automatically associates
  new batches.
- The authenticated root creation surface now restores and debounces one
  owner-scoped prompt/reference/settings draft. It expires after 30 days,
  detects stale-tab writes, and never overwrites a saved project.
- Creation, project, and asset navigation now use stable, refreshable URLs;
  `/create` and the compatible `/` entry share one creation state, while image
  detail preserves its creation or asset-library source scope through browser
  back/forward navigation.
- Continuous creation stream, assets, gallery, projects, and image detail.
- Responsive layout and keyboard/wheel detail navigation.
- M6 prices Nano Banana 2 at 10 credits per image for 1K, 2K, and 4K and grants
  each owner 100 non-expiring welcome credits once. New generation jobs reserve
  credit transactionally, accepted Assets settle it, and no-Asset failures
  release it. The authenticated workspace now presents exact available credit,
  reserved work, the launch quote, and approximate remaining images without
  exposing provider channels. The accepted CNY 10 / 500-credit product,
  idempotent owner orders, and exactly-once fake-sandbox fulfillment now work
  locally. Before the ICP-filed domestic Alipay checkout exists, a trusted
  server operator can record an already received payment against that same
  immutable product/order/ledger path; there is no customer checkout or public
  balance-mutation endpoint yet.

Implemented locally for M8 seed-production preparation:

- Authing registration/login remains open. Every new GoodGood owner receives
  the normal 100 welcome credits but starts pending; only a site-owner review
  enables creation and credit consumption.
- A small site-owner-only account-management page reviews access and appends
  auditable free test-credit grants without creating payment records.
- The same `/admin/users` page is the accepted first entry point for a verified
  account-deletion request, with two distinct confirmations. The local page and
  backend now collect only the registered-email evidence metadata, reject a
  site-owner target, and show a created request as irreversible and read-only.
- A verified request immediately removes product access. Provider-submitted
  generations only finish their existing status/credit reconciliation; they
  are not cancelled or resubmitted, their results are hidden, and those private
  results join the account deletion set.
- Accepted jobs that have not begun provider submission are cancelled without
  an O1Key request and release their reserved credit exactly once.
- After submitted work is terminal, the local deletion workflow can preview the
  owner's deletion set as six aggregate counts and a stable versioned digest.
  The preview never exposes object keys or identifiers and does not delete data.
- The private-object step removes owned private bytes in bounded, leased,
  retry-safe passes. It records object deletion only after storage succeeds and
  exposes only aggregate evidence. The following local step now removes the
  owner-scoped creative database graph atomically while retaining financial and
  administrative evidence. The provider-neutral identity step then proves
  external disable/delete through a fake directory, and the final local
  transaction removes GoodGood sessions/mappings, anonymizes the owner, expires
  remaining credit, and completes the deletion register.
- Email verification and both site-owner confirmations precede request
  creation. Closing either confirmation makes no GoodGood change; after the
  final submit creates the request, it cannot be withdrawn or used to restore
  access, jobs, credits, or content. A mistake enters the separate incident
  process while deletion continues.
- System role, creation-access state, and product account tier remain separate
  concepts. Seed-user accounts and creative content are production data.
- Access state is exactly pending, active, or suspended; the initial tier is
  seed/内测用户. The site owner is established once with the audited bootstrap
  command after normal login, never by registration order.

Controlled-alpha launch policy:

- ADR 0024 permits a smaller, personally reviewed tester cohort to use the
  existing maintenance-closed production candidate after the separate
  `controlled-alpha-v1` gate passes.
- Registration remains open but pending. Only a known tester who has been
  briefed to use non-sensitive, non-confidential material and informed of the
  O1Key processing/erasure limitation may be activated by the site owner.
- The 100 welcome-credit grant and audited manual test-credit grant remain the
  only launch funding paths. Checkout stays disabled.
- Reporting and removal use a documented out-of-band contact plus manual
  suspension/exact-target handling during controlled alpha. This is not a claim
  that the local automated deletion or content-report implementation is live.
- A controlled-alpha pass does not pass the broader seed-production or paid-
  production gate.

Not production-ready yet:

- Secure public-HTTPS callback/logout verification, explicitly deferred by the
  operator to the M7 staging gate, and the separately deferred reverse
  association order. All requested real-Authing loopback edge cases now pass.
  Password and phone recovery are intentionally absent because those sign-in
  methods are not offered.
- Real model API calls and provider failover.
- A fuller creation-session policy covering project edits, active jobs, and
  cross-device session history beyond the minimal root draft.
- Customer checkout UI, the selected domestic Alipay sandbox and fulfillment
  adapter after the applicable domain/ICP review, quotas, moderation, abuse
  controls, and server-enforced reviewed-account admission. ADRs 0019 and 0020
  permit a Hong Kong seed-production launch only after those non-payment safety
  controls and the separate seed release gate pass.
- Production retention periods and account-deletion outcomes are accepted in
  ADR 0022. Migrations 0013-0019 and the local administration API now persist the
  verified request and atomically stop access, revoke sessions, cancel eligible
  unsubmitted jobs, and release their credit. The local two-step management UI
  completes the request-entry slice; a non-content register and leased wait step
  now prevent destructive work from passing a live submitted job, and a local
  read-only inventory binds the creative rows/private objects without exposing
  their identifiers. Local private-object and creative-row steps now pass
  against disposable PostgreSQL/RustFS data. The provider-neutral external-
  identity step also passes disable/delete partial retry against a disposable
  fake directory while retaining local mappings until the final local
  transaction. Local GoodGood anonymization/completion now passes with an
  anonymous retained audit anchor. The reviewed Authing management adapter now
  passes against a local signed-request fake endpoint, but is not runtime-wired
  and has no production credential or real-tenant deletion evidence. The five
  local passes now also compose into one bounded, aggregate-only cycle with
  fixed redacted alert codes, but it remains import-only. A digest-bound
  non-content register export and isolated local restore replay now prevent
  completed deletions from reappearing and keep processing deletions blocked.
  The production recovery source now packages the database, deletion register,
  and a trusted manifest into one encrypted off-host recovery point and refuses
  stale, permission-unsafe, digest-mismatched, or non-ready restores; it has not
  been installed or run on the Hong Kong host. A production-only one-shot
  deletion cycle, isolated Compose role, host lock, fixed exit/alert handoff,
  and five-minute systemd schedule now exist as inactive local source. No real
  Authing management credential is selected and neither the runtime nor timer
  is installed or enabled. The read-only provider-retention review now records
  a named O1Key contract blocker: 24-hour public/result URL lifetimes do not
  prove erasure of provider or upstream copies, and no public privacy/deletion
  terms are enabled. Live alert delivery and production evidence remain
  incomplete. ADR 0023 now defines the deliberately lightweight seed content-
  safety boundary. An active user must explicitly accept the exact version and
  hash of `seed-v1` before reference upload, generation, or retry. Technical
  image validation records `not_reviewed`, not a false semantic approval;
  upstream default safety remains enabled, while GoodGood adds neither a local
  keyword filter nor a third-party semantic processor. A user may report only
  one of their own generated Assets with a fixed category; that transaction
  immediately quarantines the Asset without copying its prompt, bytes, or
  object key into the report. The site owner receives the bounded report queue
  in `/admin/users`, opens only an exact audited private preview, and either
  restores the Asset or deletes its private bytes before recording removal.
  Existing reasoned account suspension remains the repeat/severe-violation
  response. Production rehearsal and evidence are still required before the
  moderation gate can pass.
- Search, Explore, Moodboards, collaboration, and sharing.

## Product principles

- Images first; records and parameters second.
- Fast iteration before configuration depth.
- Continuity without trapping the user in a project.
- Explicit recovery over vague toast errors.
- Preserve creative context; never make a retry re-enter known information.
- Simulated data must behave like real data: ordering, ratios, timestamps,
  states, and restored parameters must remain coherent.
