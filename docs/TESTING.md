# GG-063 verification

GG-088定位修复用实际浏览器验证默认其他首次打开、选择首项后再次打开及390px全新表单首次打开；菜单顶部在触发按钮底部之下且data-side=bottom，保留键盘选择与Escape返回焦点。不提交或写fixture；沿用GG087定向检查及一次check:local。

GG-087定向验证类型/文字/0—5图片/大小/解码、分页、401/403/404、方法/header/安全错误、multipart、SSR字段/空/登录/详情。命名空库goodgood_gg087_feedback_test*、显式INTEGRATION/NO_WORKER及loopback54449，完整迁移和内存对象mock测试原子性/幂等/回滚、越权、回复/冲突、筛选/分页/事件历史；没有队列/Worker/provider。浏览器使用隔离无Worker栈合成图片验证全流程，不对原验收数据写fixtures。

GG-086 tests/gg086-jcoin-progress.test.mjs覆盖整数精度、空/极小/接近封顶/封顶进度、15秒更新、失败保留/恢复、不重叠、隐藏/可见及取消迟到请求；GG084 SSR追加可访问进度条及部分/完成断言。全为内存只读测试，无数据库或provider调用。

GG-084 `node --test tests/gg084-jcoin.test.mjs`验证精确金额、当前/历史单位、线性小额与50万元预算封顶、只返回自身DTO、身份/输入/分页/安全错误、Node方法/CSRF/请求限制、深链和SSR成功/空/加载状态。`gg084-jcoin-postgres.test.mjs`默认跳过；仅GOODGOOD_GG084_INTEGRATION=1、GOODGOOD_GG084_NO_WORKER=1及GOODGOOD_GG084_DATABASE_URL指向loopback54449的goodgood_gg084_jcoin_test*命名空库，拒绝非空库/其他客户端。全40迁移验证草稿、起算边界、历史单位、混合赠送、真假支付/缺来源/历史划拨、并发重放、个人分页、暂停退款、失败回滚重跑、最后一笔封顶、回收不重开、不可变账本及活动角色。无outbox、Redis或真实provider请求。临时Chrome页面用全fetch模拟验证实际工作区个人/站长桌面1280px/窄屏390px、空记录、分页、读取重试、开启失败重试/暂停/恢复与手机菜单；不接真实数据库。

GG-081快速测试覆盖活动站长/CSRF、严格分类与金额、收款确认、类型/凭证指纹、稳定重试键、内部商品拒绝、现金精度/未知峰值/审计渲染。gg081-credits-postgres.test.mjs需GOODGOOD_GG081_INTEGRATION=1、GOODGOOD_GG081_NO_WORKER=1及GOODGOOD_GG081_DATABASE_URL指向loopback的goodgood_gg081_credits_test*空数据库；拒绝其他连接。全迁移后验证正常来源/订单/审计、并发重放与凭证竞争、CLI互斥、价目/目标失败回滚、旧测试来源、自身并发及暂停权限。gg071-operations-postgres.test.mjs沿用其命名隔离契约，补现金币种/假支付/账期、跨日峰值/同刻交接/缺历史、当前running/refining及queued。两者无provider或Worker调用，默认跳过；本轮单独隔离运行2/2通过。

GG-076 tests cover output-first frame, board selected-mode preview, ratio and non-nested interactive controls. Isolated mock/no-Worker UI verifies pointer entry/move/leave restoring output, detail opening, keyboard range and narrow layout.

GG-075 render tests cover reference-thumbnail selection, effect-only and no-reference states, visible enabled/disabled comparison modes and publication consent/content validation. Browser QA uses a separate named mock/no-Worker database, changes no user prices or publications, and confirms missing consent feedback and live comparison selection.

GG-074 tests cover hidden/public DTOs, optional supplement joining, custom prompt
validation, modes, routes and accessible pointer wipe. Opt-in SQL requires exact
goodgood_gg074_presets_test_20260914 loopback DB, integration/no-Worker flags,
empty schema and zero peer connections. It verifies atomic private input, one
reservation per idempotent submission, removal blocking, frozen retry, completion
and no secret in public records/derived publication. The fixture publishes its
current20-credit quote through the normal immutable price-version writer.
UI uses a separate named disposable mock stack; never real-provider32140.

GG-073 feature tests cover recipe privacy, consent/bounds, active/ownership and
shared DTOs, HTTP methods/action gates, rendered read/empty/like/comparison/settings.
Opt-in gg073-inspiration-postgres requires explicit loopback named empty
goodgood_gg073_inspiration_test*, INTEGRATION/NO_WORKER flags and no peer connections.
It covers concurrent publish/likes, personal-only source and selected references,
attribution snapshot/cleanup protection, recipe privacy, author/owner removal,
republish rules, retries and exact microsecond pagination. Separate disposable
UI fixture DB has no Worker; never fixture the user preview or real-provider32140.

GG-072 targeted tests: profile validation/owner gates/read-only defaults,
transaction/rollback/version/duplicate/foreign avatar cases, private HTTP action
header and bounded JSON, route and rendered loading/error/empty/image states.
Opt-in tests/gg072-profile-postgres.test.mjs requires named empty loopback DB
goodgood_gg072_profile_test*, GOODGOOD_GG072_INTEGRATION=1 and
GOODGOOD_GG072_NO_WORKER=1; verifies no peer connections before fixtures.
Never put profile fixtures in a real-provider stack. Browser review covers
menu/direct refresh, cancel/validation, detail return and responsive layout.

GG-071 targeted tests cover owner/CSRF/auth gates, date/search/cursor validation,
read states, exact large credit amounts, reservation versus settlement/refund,
safe DTOs and owner shell routes. Optional SQL tests require loopback
GOODGOOD_GG071_DATABASE_URL naming goodgood_gg071_operations_test*,
GOODGOOD_GG071_INTEGRATION=1 and GOODGOOD_GG071_NO_WORKER=1. They assert an empty
database with no other connections before fixtures; production projections run
inside BEGIN READ ONLY. Never enable against preview goodgood, 32140 or production.
Browser preview only reads existing records; compare model/history hashes before
and after. No provider calls are needed.

GG-070 covers default-line supported price ranges, quality summaries, separate
reference token rates, disabled/unpriced/legacy states and 60 in-memory cards
with busy actions disabled. Existing persistence tests remain. Browser checks
right/mobile panel bounds, scrolling/fixed save, focus restoration, search and
matrix/discount controls; cancelled edits leave all preview records unchanged.

GG-069 tests all-resolution/quality/token-rate discounts, precise rounding,
positive cent floor, empty/invalid atomic rejection, immutable source values
and accessible controls. Local browser checks non-compounding 98→80, independent
routes, manual edits, cancel/data preservation and narrow layout, without paid
requests or synthetic database writes.

GG-068 coverage proves independent route clones, edited rate quotes, complete
enabled matrices, one atomic save/audit and API roundtrip, 2.5 first and 1080p
UI resolution/request payloads for both routes. SSR checks distinct prices,
removed subtitle and simplified units. Local browser verifies switching,
save/reload, preserved history and creation parameters without paid requests.

GG-067 targeted coverage verifies token-rate validation and legacy separation,
nested/top-level completion_tokens parsing, missing/illegal use, mutually
exclusive reference rates, exact 826200/50638 examples and one-time rounding.
SSR verifies visible rate inputs and units. Browser checks save/reload, response
extraction failure/recovery, and narrow layout on the isolated 32141 mock stack.
Full video admission and actual ledger settlement remain outside this slice.

GG-065 reuses SSR coverage to verify quality ranges without tier sections or
disclosure controls. Browser verification checks compact desktop/narrow layouts
and confirms pricing-editor tier values without changing saved prices.

Quality validation/quotes and 2.5-only tier controls have targeted tests.
`GOODGOOD_GG063_INTEGRATION=1` requires an explicitly named disposable loopback
`goodgood_gg063_quality_test*` database plus `GOODGOOD_GG063_NO_WORKER=1`; the
operator verifies no Worker connection before creation. SQL checks quote scopes,
reservation/release, immutable price snapshots, stale edits, disabled admission,
successful pinned settlement and xhigh/max project/draft restore. Never run these
fixtures against 32141 preview data, 32140 or production; preview receives only
user-authorized model administration, with audit and history comparison.

# Testing strategy

GG-062 covers nine exact GPT mappings, legacy routes/hashes, 567 injected
non-billable ratio/resolution/count payloads with five references/long prompts,
independent quotes, availability and state restore. Server rendering verifies
three selector/list lines and unavailable states. The explicit GG-054 no-Worker
disposable SQL suite also checks GPT migration preservation, default/selected
line pinning, price/disable changes and drafts/projects. Never run these fixtures
against the pricing preview or real-provider stack.

GG-061 extends shared-route/history/owner-gate coverage to audit as the fourth
function. Audit content tests cover loading, empty, retryable failure, actor/target/
amount/time and escaped reasons; injected HTTP tests cover empty/success/401/403/
500/network failure with no external requests. The view reuses the latest-30
account-action query; no database fixtures or general audit-center scope.

GG-059 tests existing admin route round-trips, retained history state and business
route compatibility; server rendering verifies owner-only mounting, loading,
signed-out/inactive/member/preview denial and accessible embedded management links.
The current shell routes reuse the workspace session. Browser evidence separately
checks live switching, document continuity, direct refresh and narrow layout on
32141; read-only snapshots retain user prices and immutable history. No SQL
fixtures, paid generation or production changes are part of these checks.

GG-057 local-login tests dispatch the real Node authentication handler with
injected identity/session reads and no database/queue/provider writes. They
verify configured-default redirects, existing-member identity preservation,
missing-default failure, unsafe return destinations and lookup-error cookie
suppression. The existing navigation suite now retains GG-050's four workspace
header contracts and verifies ADR 0066's shared management links/current page
with the actual Vinext Image shim. Browser evidence separately covers the
existing 32141 site-owner session, both tabs, creation return and Back/Forward;
read-only snapshots check model configuration and immutable history preservation.

GG-058 refines that navigation check to require no direct header logout while
retaining access-gate sign-out. Browser checks repeat account/model switching,
inspect the single heading and computed Chinese font/synthesis settings, and
check screenshots separately. Current platform font evidence cannot prove
Windows-specific rasterization from the owner's screenshot; do not report an
unreproduced duplicate-DOM cause or a cross-platform guarantee.

GG-052 coverage verifies exact RMB/credit conversion, image/second quotes,
complete-price enabling, template validation, site-owner permissions, empty
and enabled-only directory reads, atomic price/audit saves, rollback/version
conflicts, disabled model rejection and CSRF dispatch. The disposable PostgreSQL
suite proves old ledger preservation, 2:1 personal/payment-funded/workspace/
budget conversion, reservation drain rejection, prior custom-price preservation,
legacy refunds, stale quote rejection, pinned settlement and accepted-job claim
after disable. Opt in only with `GOODGOOD_GG052_INTEGRATION=1`, explicit loopback
`GOODGOOD_GG052_DATABASE_URL` whose database starts `goodgood_gg052_pricing_test`,
and `GOODGOOD_GG052_NO_WORKER=1`; verify no Worker uses that database. Never use
32140 or a real-provider database/queue. Browser verification uses the isolated
32141 mock stack, not real paid generation. Exact results live in the task card.

GG-054 adds line validation/default compatibility, independent price scopes,
quote omission for disabled/missing specifications, idempotency line separation,
exact Pro model payloads across 10 ratios × 3 resolutions × 3 lines, and state
snapshot/restore coverage. Injected fetches make no network requests. The SQL
suite verifies migration history preservation, pinned personal/enterprise
settlement, stale-price/disabled-line rejection, duplicate settlement/release
and draft/project persistence. Opt in with `GOODGOOD_GG054_INTEGRATION=1`, explicit
loopback `GOODGOOD_GG054_DATABASE_URL` starting `goodgood_gg054_lines_test`, and
`GOODGOOD_GG054_NO_WORKER=1`; verify no Worker uses the effective database.
No queue/provider is attached to that fixture database.

GG-056 adds exact Banana 2 mappings and 126 injected requests across three
lines, 14 ratios and three resolutions, including high thinking, search, long
prompt and five reference payloads. Quotes retain 1/2/4 count multiplication.
The existing named SQL suite additionally checks four-image dedicated admission,
failure credit release, archive conflict/atomic audit, hidden catalogs, rejection
of archived submissions/saves and preservation of prices/projects/ledger.

Exact latest results belong in the task card and, for deployed behavior,
`docs/CURRENT_STATE.md` / `docs/releases/`. Historical M-stage descriptions here
are coverage contracts, not fresh production evidence. Follow `docs/WORKFLOW.md`
to distinguish UI preview, durable local integration, live API, and browser proof.

## Current baseline

GG-050 verifies absent persistent header return controls in all five audited
page families, removed callback/style wiring, retained enterprise/distributor
tabs, loading/empty/access denial, and unchanged error-body recovery, detail
close, project creation and logout. SSR fixtures do not write to databases or
queues; real-account browser evidence is recorded separately.

GG-049 covers existing single-role uniqueness and atomic role replacement,
distributor-only read/new-write/replay authorization, suspension, eligible-parent
filter/binding denial, legacy-route recovery and enterprise navigation removal.
Injected SQL/SSR fixtures perform no database or queue writes. Existing GG-027,
GG-045 and GG-046 expectations follow ADR 0060; hierarchy/transfer write opt-ins
stay disabled on the real-provider stack. Browser enterprise evidence is separate.

GG-048 uses in-memory fixtures and SSR only: actual-zero/unconfigured/pending metrics,
active-member budget attention, clocked 48-hour invitation deadlines, exact
integer cumulative ranking, successful actual-output ordering and six-preview
limit, populated/empty/loading/local-failure states, existing budget dialog
wiring, request-version cleanup, focus return and responsive containment. It
never seeds a database/queue or calls providers. Browser evidence on the existing
real local enterprise account is recorded separately; empty real assets do not
constitute proof of populated thumbnail/dialog interaction.

GG-044 tests enterprise entry visibility independently from active manager
membership, stable directory/detail tab URLs, shared-shell/auth wiring,
SSR directory loading/empty/error/invitation/multiple-company states, preserved
composer navigation, stale-read guards, compact responsive metrics and dialogs.
They use no database/queue writes or real-provider requests. Browser mutation
and company-budget evidence remains separately recorded in task cards.

The default suite validates the production build, rendered metadata, shared UI
primitive behavior, documentation continuity, stable model/ratio mappings,
job-state transitions, unbounded independent client-run tracking, both M1 and
HTTP mock contracts, M3 input validation and
migration structure, dependency-aware health endpoints, the single-image
process contract, pinned Compose topology, and host probe success/failure.
M4 adds fast coverage for the explicit local-auth opt-in, local credential
parsing, external-identity mapping, disabled accounts, authentication on every generation route, owner-scoped
idempotency, cross-owner read/retry denial, reference intent limits, real image
decoding, format/size/dimension rejection, upload UI success/failure, reference
route owner propagation, owner-scoped accepted-material listing, reusable
selection deduplication/limits, material loading/empty/failure UI wiring,
ready-reference click/Enter/Space large-preview behavior, uncropped contained
rendering, drag-click suppression, and remove-button event isolation,
reference-editor crop/history/bbox/sticker math, owner-scoped same-origin
material-byte reads, edit loading/error/save states, non-destructive upload,
same-ordinal replacement, and project snapshot synchronization,
project save validation and idempotency, project list
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
non-mutation, two-phase eligibility and leases for incomplete/rejected uploads,
object-first deletion evidence, failure retry evidence, idempotent reruns,
legacy orphan rescue, and exclusion of accepted ready materials from claims.
Creation-draft coverage proves one record per owner, 30-day sliding expiry,
stable-value/reference validation, authenticated empty/read/save/delete routes,
optimistic conflict responses, browser load/save/delete/error boundaries,
root-only hydration/autosave wiring, explicit conflict recovery, and draft
reference protection during cleanup.
GG-012/GG-016 coverage proves the Nano-only Google Search control, the absence
of a creator-facing thinking control/detail row, hidden high-thinking defaults,
snapshot/hash identity, draft/project/batch persistence and migration compatibility,
model-leakage rejection, `TEXT` + `IMAGE` response modalities, default top-level
forwarding of `thinking_level: "high"`, enabled `google_search`, and exact legacy
low-thinking retry behavior. Provider tests use
stub transport and must not issue a real, potentially billable request.
GG-015 coverage proves GPT-only quality/background/output-format controls,
explicit automatic defaults, transparent JPEG correction and fail-closed
rejection, immutable snapshot/hash identity, draft/project/batch persistence,
migration 0018 constraints, image-detail labels, and top-level O1Key forwarding.
All provider assertions use stub transport; browser verification must not click
Generate.
GG-021 coverage proves that Nano Banana Pro has immutable 15-credit single-image
prices for `1K / 2K / 4K`, that durable and preview billing summaries agree,
and that the pricing-only slice does not add a provider route or issue a real
provider request.
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

GG-029 adds deterministic email-mode coverage for configuration and secret
separation, mailbox/IDN normalization, spoofed forwarding headers, HMAC-only
storage, same-origin and request-size rejection, shared limits, SMTP accepted/
unknown outcomes, logout revocation, cleanup scope, and browser-bound request/
verify APIs. Its opt-in PostgreSQL test accepts only the loopback database named
`gg029_email_auth_test`; it proves failed-attempt persistence, cross-browser
rejection, concurrent one-time consumption, random identity creation, pending
admission, and one welcome grant. `stack:email-local` supplies Mailpit for a
real local SMTP/browser loop without real recipients or provider billing.
Production provider, DNS, mailbox, proxy-chain, and mobile-device evidence
remain P0/P3/P4 gates and must not be inferred from the local success.

GG-029 P2 operations coverage additionally proves redacted aggregate and exact
request-ID support reports, stable budget/delivery/cleanup alert codes, cleanup
heartbeat persistence, bounded read-only arguments, and account suspension
that transactionally revokes only the target owner's active sessions. The
isolated `goodgood-gg029` Compose project uses Mailpit and mock generation only.
Its synthetic SMTP and 390×844 browser flow are local evidence, not
real-provider or production evidence. A separate disposable PostgreSQL stack
also applies every migration and exercises cleanup/status without starting a
Web process, Worker, real mail adapter, or generation provider.

GG-029 P3 coverage proves both OIDC and email production-preflight paths,
file-only OTP/SMTP secrets, exact origin and Secure `__Host-` policy, implicit-
TLS authenticated SMTP verification without `sendMail`, provider-error
redaction, and production Compose secret/maintenance wiring. Binding tests cover
manifest shape/count/digest, normalized-email and owner conflicts, required prior
identity, site-owner-first verification, dry-run non-mutation, transactional
creation, audit hashes, and exact no-write replay. A fresh disposable PostgreSQL
17 database applied all 20 current migrations, created two synthetic old-owner
bindings, replayed the same manifest, and retained zero credit-ledger rows; it
contained no real user, mail, generation, or production data.

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
schema downgrade. CI must also start Node inside the finished verification image
and import React, React DOM, the RSC client runtime, and Vinext's production
server before that image can be scanned or published. Real GHCR pulls, Authing discovery, storage permissions,
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
Static backup coverage requires a new root-only custom-format archive, refuses
overwrite and symlinks, and confines restore to a fixed-name, no-network,
read-only, bounded-`tmpfs` PostgreSQL container with automatic cleanup. Staging
evidence must additionally prove a real `pg_restore`, identical public table
sets and row counts, all migration records, no source-database mutation, and no
leftover drill container. ADR 0014 coverage additionally fixes a separate
private R2 repository, root-only password/access-key files, path-style S3
access, Restic client-side encryption, one locked timer execution, an
explicit `14 daily / 8 weekly / 3 monthly` policy grouped independently of the
timestamped archive path, full repository-data checking after prune, transient
plaintext cleanup, latest-snapshot download into the isolated restore drill,
and a systemd failure state whose journal exposes no secret. The installer must
leave the timer disabled. Live evidence must prove repository initialization,
one timer-shaped upload, full check, off-host restore equality, an active next
timer, and no retained automatic plaintext archive or failed unit. M7 outbound
failure notification remains deferred; ADR 0016 delegates the monitoring
platform and notification route while keeping live handoff evidence mandatory
for the M8 seed-production and later paid-production gates.
M8 request-correlation coverage proves the production HTTP runtime ignores an
inbound request ID, returns one server-owned support ID in both the response
header and normalized error envelope, normalizes identifier-bearing routes,
omits query values and unapproved/unsafe correlation fields, and emits exactly
one completion event. Static tests also keep Worker provider/task, duration,
and immutable customer-credit correlation wired without treating customer
credits as upstream provider cost. Monitoring ingestion, dashboard data,
firing/resolved delivery, alert acknowledgement, and production RPO/RTO remain
external release evidence.

M8 production-gate coverage proves the candidate uses an immutable GoodGood
GHCR digest, a full Git revision, a versioned migration, and a runtime-contract
checksum. It rejects missing, duplicate, unknown, stale, future-dated, or
unsafe-reference evidence. Artifact security, production preflight, candidate
health, and rollback evidence must name the same candidate revision. The
checked-in example is intentionally blocked, including monitoring handoff,
ICP/domain, and domestic Alipay prerequisites.

The controlled-alpha gate is a separate read-only entry point over evidence
schema v2. Its synthetic suite proves an exact current alpha document passes
while the seed gate remains closed, and proves missing, expired, cross-candidate,
wrong-mode, unreadable, malformed-argument, and deliberately blocked example
paths exit closed. Artifact evidence is bounded to seven days, preflight to
72 hours, and all alpha-specific evidence to 24 hours. These tests do not create
users, call a provider, migrate a database, or authorize a release.

M8 production-preflight coverage proves only a Linux release host can emit the
preflight evidence item. It requires a clean matching checkout, exact candidate
OCI labels, fixed root-owned non-symlink input paths, distinct bounded secret
files, safe production-only runtime values, and successful live OIDC discovery.
Failure, mismatch, local/fake mode, inline credentials, unsafe evidence
references, and unsupported hosts produce no evidence item. Serialized reports
are checked against representative Authing, provider, object-storage, and
database secrets and must not expose their values or connection URLs.

M8 artifact-security coverage proves CI scans and runtime-smokes the published
digest, creates one fixed-schema evidence file only after the verify and publish
jobs succeed, and uploads it uncompressed with a commit-pinned action. The
importer must match the exact candidate, successful `main` workflow run and
attempt, required job steps, GitHub artifact identity, byte size, and SHA-256.
Candidate mismatch, failed scan, malformed local data, remote failure, expired
or modified artifact bytes produce no evidence. Production-release planning
coverage proves the fixed seed gate excludes only ICP/domain and Alipay evidence
while retaining every shared safety requirement, and that the unchanged full
gate still fails on either paid-only blocker. Missing, stale, malformed, or
blocked evidence required by the selected gate returns no plan. Passing evidence
yields only a distinctly labelled seed or full digest-bound adapter plan, and
neither CLI has an execution option or child-process path.

M8 clean-database coverage proves migration 0012 targets only the two reserved
local fixture owners, fails closed on unexpected fixture identity or credit
history, and does not truncate or drop production tables. The local fixture
seeder is an explicit `GOODGOOD_ALLOW_LOCAL_AUTH=true` path used by base Compose;
the production Compose contract has no such opt-in. Production migration
evidence must show zero user, identity, session, credit, content, and
administrative rows before first login.
The production restore contract separately proves that the C3 pre-migration
catalog-only database can be backed up and restored as exactly zero public
tables/rows/migrations; once the application schema exists, the same tool
retains its active-session/job quiescence check and full table/row/migration
comparison.

M8 production-runtime coverage fixes ADR 0017's Nginx/Compose blue and green
loopback slots, external durable-state boundary, single-active-Worker handoff,
atomic upstream-switch intent, and forward-fix-only schema rule. Passing
candidate-health evidence must name the selected adapter and prove isolated
startup, exactly one migration, live/ready, public synthetic, queue, database,
and credit checks. Passing rollback evidence must retain a distinct prior
revision and prove Web/Worker and queue recovery, unchanged database/credit
fingerprints, and no schema downgrade. The planner remains non-executable.
M8 production-infrastructure coverage fixes ADR 0021's selected
`alibaba-hong-kong-single-host-seed-v1` profile at the existing 2-vCPU / 4-GiB /
50-GiB Hong Kong host with colocated PostgreSQL and Valkey, private R2, and
local/test-only preproduction. It proves exact host bounds, no managed-service
purchase, fresh production database/queue state, no staging-data import, the
exact `goodgood` R2 conversion prerequisites, and false live/destructive
authorization. ADR 0018's `alibaba-managed-state-v1` contract remains a
separately named unauthorized scale-out option. Both contracts and the local
test matrix require no production data or secrets.

Authing conversion coverage must prove the reused application has the exact
production login/logout URLs, no loopback or obsolete staging GoodGood callback,
a rotated client secret mounted only from its server file, and fresh PostgreSQL
state containing no old hashed GoodGood session. Repository tests model a pre-existing Authing identity
against fresh GoodGood state and prove it receives a new pending owner, one
welcome grant, no inherited site-owner role or content, and no valid old
GoodGood session. Real local Authing testing after conversion must use a
separate test application.

Conversion-manifest tests prove maintenance is the first ordered action before
writes freeze, normal/login/generation traffic stays unavailable, and the
four-hour deadline stops rather than bypasses the gate. The exact-target example
starts with every approval and evidence reference pending. A syntactically
complete review can make the dry run ready for a separate live-action review,
but both module and CLI permanently report `executed: false` and
`executionAvailable: false` and contain no process or destructive filesystem
path. The last action keeps maintenance active on any failure and permits old
staging only as a private diagnostic source.

Production work-package coverage performs a deterministic, local-only rehearsal
of the exact checked-in conversion materials. It proves production PostgreSQL
and Valkey are resource-bounded, internally networked, production-named, and
free of staging/RustFS bindings; blue/green Web/Worker slots have exact loopback
ports and five-minute Worker drain; Nginx evaluates the maintenance marker
before proxying and stops ingress when activation cannot prove HTTP 503; and
the Cloudflare allowlist stays deny-by-default. It also fixes the half-hour
backup schedule, isolated Restic prefix, `24h + 14/8/12` retention, no-network
restore drill, Authing/secret checklist, four-hour rollback checkpoints, and
release-config checksum coverage. R2 tests cover empty and sorted inventories,
stable hash approval binding, tamper rejection, current-version scope, and a
planner that always reports `executed:false`/`executionAvailable:false`. Static
coverage rejects child-process/live execution and any R2 delete implementation.
Shell parsing and both production Compose slot interpolations are additionally
checked locally without starting containers.
ADR 0042 coverage keeps the ongoing-production restore drill fail-closed on a
missing reviewed maintenance marker or any active generation job while allowing
normal valid alpha sessions to remain in the encrypted archive. Static contract
checks preserve the fixed archive path, immutable PostgreSQL image, no-network,
read-only/tmpfs target, public-table/row comparison and aggregate-only output;
the real host drill remains required release evidence.
Release-metadata coverage also normalizes CRLF, lone CR, and LF checkout line
endings before hashing so a Windows review and Linux CI bind the same runtime
configuration identity.

Concurrent-Worker coverage proves one active Worker runner starts multiple
accepted job promises without a fixed count ceiling, acknowledges each claimed
queue item once, reports active-job count, stops taking work, and waits for all
in-flight promises during graceful shutdown. It also proves a duplicate
delivery cannot start the same job twice while its first execution is active.
The existing transactional claim, provider-submission guard, and credit
settlement remain inside each isolated `processGenerationJob` call.
Deterministic host-resource tests accept exactly
500 MiB / below 80%, reject below 500 MiB or at 80%, latch protection until
operator review plus process restart, block only new submit/retry requests, and
leave safe generation reads available. Monitoring-shape requirements still
cover active jobs, submission rate, queue age/depth, latency/failure, state
pressure, restarts, host memory/disk, and backup freshness without claiming a
capacity threshold; the monitoring platform remains delegated.
ADR 0020 account-admission coverage must prove open valid Authing login creates
one pending owner, one welcome grant, and one safe session without enabling any
creation capability. It covers `pending`, `active`, and `suspended`; approval
without a second welcome grant; immediate denial
of new mutations after access removal; and enforcement across generation/retry,
references, drafts, projects, assets, and credit reservation. Site-owner tests
must prove navigation and every administration API deny ordinary users before
querying targets; account lists do not leak into URLs/logs; review actions and
test-credit grants are idempotent and append-auditable; grant rollback is
atomic; legacy test-credit grants never create payment orders. GG-081 paid_recharge alone creates a receipt-backed normal order. Loading, empty, failure, retry,
and mutation-conflict states are required for the management page. The fast
suite also fixes the 1-5000 grant bound, CSRF-only header, server-derived actor,
dry-run-first bootstrap parser, three-state migration, and visible
loading/empty/failure/audit controls. The populated management surface also
locks timestamp formatting to compatible `dateStyle` plus `timeStyle` options;
mixing `dateStyle` with individual `hour`/`minute` components is a production
client-render regression. Exact PostgreSQL migration/replay/rollback
and browser behavior remain required in the no-customer rehearsal environment.
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
test stack. It proves all fifteen migration reruns, explicit idempotent local-
fixture seeding, authentication enforcement,
two-owner idempotency isolation, cross-owner reference/job denial, signed direct
reference PUT and CORS, server-side decoded validation and rejected-record
evidence, referenced generation, successful output persistence and signed
reads, idempotent project save, signed project restore, newest-first batch
ordering, automatic continuation association, cross-owner project denial,
normalized provider rejection and timeout, retry, duplicate delivery, forced
worker restart, owner-isolated root-draft save/read/delete, stale-version save
and delete conflicts, signed draft-reference restore, deletion of an
unreferenced rejected object, protection of project/generation/draft
references, ready-material retention after clearing the draft, and idempotent
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
boundary tests. The opt-in test requires both
`GOODGOOD_M6_INTEGRATION=1` and an explicit `GOODGOOD_M6_DATABASE_URL` naming
a disposable database with no running application Worker. It fails before connecting when
that URL is omitted, so test outbox rows cannot be consumed by a real O1Key
Worker. It uses dedicated test identities and preserves existing local fixture
balances.
It proves migration checksum rerun,
the three immutable 10-credit Banana 2 prices, migration grants for existing
owners, exactly-once first-login welcome grant, live job reservation, successful
Asset settlement, four-Asset/40-credit atomic settlement, short-result rollback,
`SUBMISSION_UNKNOWN` customer release, deterministic custom price selection,
manual grant, refund, insufficient-credit rollback, same-key
replay, conflicting replay, mutually exclusive reservation closure, one full
refund, exact account caches, generation quote snapshots, and database rejection
of price/ledger mutation. The same PostgreSQL run verifies that the public read
returns exact decimal-string balances and all active launch quotes without
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

The M8 site-owner grant is separate coverage. It must accept only the
authenticated persisted site-owner role, a stable target owner, a bounded
server-validated positive credit amount, a required non-secret reason, and an
idempotency key. Tests must reject self-asserted roles, missing CSRF protection,
ordinary users, invalid or conflicting replay, and direct balance/payment-order
mutation while proving the linked ledger and administrative audit commit or
roll back together.

GG-027 runs only against disposable local data until a separate release
decision. Its phased coverage must prove:

- migration/rebuild classifies uniquely paid-order-funded value as
  transferable, classifies welcome/test/promotion/ordinary adjustment and
  unknown history as non-transferable, preserves aggregate balances, and is
  checksum-rerunnable without recreating grants or resetting production-shaped
  rows;
- generation reserves non-transferable value first, records a mixed source
  split when needed, and preserves that split through settle, release, and
  refund;
- business role remains independent from system role/access/tier; only the site
  owner can assign/end it or create/end/replace a direct parent; one-active-
  parent, self-link, cycle, duplicate, idempotency, and audit constraints fail
  atomically;
- only an active distributor can transfer (ADR 0060), only to its active direct
  child, and only from payment-funded available value. Received value remains
  transferable without granting the recipient a business capability;
- paired transfer entries, source allocations, account caches, public transfer,
  and audit record are atomic and zero-sum. Same-input replay returns the same
  result; conflicting replay, cross-level access, insufficient transferable
  balance, and concurrent transfer/generation attempts cannot create an
  overdraft or one-sided write; and
- browser and API contracts never accept or return an exchange price, fiat
  amount, downstream payment/order, commission, revenue, or withdrawal. The
  active 3010 real-provider stack and production remain outside this suite.
- route/UI coverage proves contextual enterprise/distributor route parsing,
  role-gated desktop/mobile
  navigation, direct-URL denial state, loading/empty/read-error/load-more/
  mutation-error states, red selected presets, explicit irreversible
  confirmation, public transfer references, and narrow-screen single-column
  layout. Site-owner UI coverage proves role/direct-parent choices always carry
  a required audited reason and use only independently loaded eligible parents.

GG-045 adds `tests/gg045-contextual-credit-management.test.mjs`: stable static
account routes/legacy canonicalization, commercial-vs-company permissions,
shared shell access/loading, own-account facts/downstream privacy, row actions,
public transfer history, filtered empty/loading/failure/pagination recovery,
and accepted-write versus refresh-failure behavior. SSR/pure-function tests use
in-memory fixtures and injected boundaries only; they never create a database
job, transfer credits, or contact a provider. Existing GG-027 authorization and
atomic-transfer tests remain intact; their write opt-ins stay disabled on the
active real-provider stack. Responsive verification is contract coverage until
a separate actual narrow-viewport check is recorded.

Use:

```bash
npm ci
npm run check:local
```

### Fast and safe test order

Run the narrowest affected test first while editing. Run `npm run check:local`
once after executable code stabilizes; repeat it only when a later edit changes
runtime code, build inputs, or test behavior. A documentation-only process
change runs `node --test tests/documentation-continuity.test.mjs` and
`git diff --check`; it does not require a Compose rebuild.

Before any opt-in test writes database or queue fixtures, verify its effective
target without printing credentials. The database/Compose project must be
explicitly named and disposable, and no Worker with real O1Key credentials may
consume its queue. Environment names such as `test` do not prove isolation.
Never run a fixture-writing test against the active 3010 real-provider stack.
Use the fake provider or stop/detach the real-provider Worker. A real-provider
smoke can incur cost and runs only when the site owner explicitly requests that
specific generation call.

`check:local` is the cross-platform gate intended for local computers and
GitHub Actions. It runs lint, the full TypeScript check, the production build,
and automated tests. CI uses the same pinned Node.js 24.20.0 runtime. Pinned
Trivy 0.70.0 scans the lockfile's production dependencies, then CI builds and
scans the real production Docker image on pull requests, trusted `main` pushes,
and manual runs. Both scans reject fixable `HIGH` or `CRITICAL` findings while
reporting but not blocking findings that have no available fix. A trusted
`main` revision publishes to GHCR only after verification and records its
immutable image digest, source revision, migration version, and runtime
configuration-contract checksum. Workflow tests reject floating third-party
action references, a `latest` image tag, removal of either scan, and regression
to the removed `image-size` dependency. The existing Sites lifecycle scripts
remain available for the current hosted prototype.

The timestamped result of the latest verified gate belongs in
`IMPLEMENTATION_PLAN.md`, not in this stable strategy document.

## Required test layers

### Unit

- Model capability/label mapping.
- Ratio mode, official output dimensions, and resolution mapping.
- Eight-line textarea height calculation.
- Reference maximum, ordering, and validation.
- Job-state transition rules and normalized errors.
- Parallel client-run insertion, temporary-to-durable ID replacement, terminal
  isolation, persistent ID filtering, and absence of client truncation.
- Newest-first batch ordering.
- Workspace capability mapping; invitation and membership transitions; member
  budget allocation/reserve/settle/release arithmetic and operation hashes.

### Component

- GG-043 covers 96px/80px shared 1:1 thumbnails, horizontal overflow, video-mode
  click/keyboard inspection and isolated removal, contained image/video/audio
  preview, no autoplay, loading/error/retry, and Radix focus/close wiring. Image
  quick editor remains unchanged. Browser review uses existing Chrome computer
  use with local synthetic materials only; no generation or asset creation.

- GG-040 covers standalone/inline/longer delimiters, CRLF, multiline segments,
  empty and duplicate segments, image/video count products, frozen shared values,
  immediate concurrent starts, stable order and isolated failures, eight stub
  video POST/GET pairs, project context validation/hash and segment retry,
  multiplied image quote and GG-041 absence of duplicate composer summary.
  No database fixtures or real provider.

- GG-039 covers video-only count defaults and 1/2/4 limits, immediate concurrent
  fan-out with stub transport, frozen inputs, stable order under out-of-order
  completion, independent failure, additional batch preservation, uncertain-POST
  no-resubmit, known-ID polling recovery, compact cards and no provider count/n.

- GG-037 mock fixtures cover mixed media, ratios, queued/running/failed/completed
  card states, shared detail navigation, clearly labelled playback simulation,
  preview-only opt-in, and no generation/persistence writes. Browser review uses
  existing Chrome computer use; this is visual evidence, not provider evidence.

- Empty creation state.
- Root and `/create` direct access, refresh, and Back/Forward equivalence.
- Composer open/closed drawer without value loss.
- GG-042 covers shared out-of-flow overlay/stacking, closed-control inertness,
  remaining viewport height calculation, and scroll/resize listener cleanup.
  Existing Chrome computer use verifies image/video results do not move when
  settings toggles and long/narrow drawers remain internally scrollable; no send.
- Image/video mode switch preserves independent prompt, material, model, provider
  line, ratio, resolution, duration, and sound state while leaving active image
  jobs intact. Video line defaults to standard; standard maps only to Doubao and
  backup maps only to HC without changing Seedance 2.5 capabilities.
- Seedance model order and capability-driven resolution/duration controls;
  switching from 2.0 to 2.5 normalizes unsupported values without deleting
  compatible input.
- Video generation mode defaults to multimodal; multimodal and first/last-frame
  per-type and total limits drive local upload plus asset-picker availability.
  Compatible mode changes re-label retained media, while incompatible changes
  preserve the tray and explain what must be removed.
- Video local image/video/audio format, size, count, role, removal, and object-
  URL cleanup behavior; asset-library image/video/audio selection preserves
  stable IDs and media roles, does not re-upload bytes, disables duplicates, and
  respects each per-type plus total model capacity. Generated and uploaded images
  appear as real current data while unavailable durable media types retain honest
  empty states. Video Feihong must not reach `/api/generations` before the backend
  contract exists.
- Unified video upload accepts only supported image/video/audio MIME types and
  classifies mixed selections before applying mode/model capacity. Material
  creation remains explicit, starts with no selected references, never runs on
  ordinary upload, and is unavailable while its API is absent. Provider-backed
  tests must cover valid, expired, evicted, indeterminate, recreate, concurrent
  creation, and partial-failure paths before enabling video submission.
- Reference tray from 0, 1, 9, 10, and over-limit inputs; visible contiguous
  ordinals; drag and `Alt + ← / →` reorder semantics; removal renumbering.
- Generation skeleton count and ratio.
- Unified creation slots keep their keys, columns, and submission order when a
  multi-output run changes from active skeletons to successful images; the
  corresponding durable batch is not rendered twice.
- Feihong send availability during active generation and concurrent skeletons.
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
- Creation-card hover shows concrete pixel dimensions, omits the duplicate
  bookmark, and download resolves a fresh owner-scoped URL by Asset ID before
  creating a Blob download without navigation. URL resolution and transfer
  failures retain the page state and expose a diagnostic stage.
- Workspace switcher with personal, one-organization, multi-organization,
  suspended/removed membership, direct URL, refresh, and Back/Forward states.
- Enterprise members, invitation, budget, usage, and team-Asset loading, empty,
  failure, stale, mutation, responsive, keyboard, and retry states.

### API/integration

- Auth and ownership on every write/read.
- Idempotent personal-Workspace backfill preserves all owner IDs, counts,
  balances, project/job/Asset order, and object keys; migration rerun is a no-op.
- Site-owner organization creation and initial-owner assignment are atomic and
  cannot be invoked by organization roles or inferred from email/domain/order.
- Invitation create/accept/revoke/expire, verified-email match, replay,
  conflicting replay, concurrent acceptance, membership state/role matrix, and
  last-owner protection.
- Organization credit plus member-budget allocation/reclaim/reserve/settle/
  release is transactional, idempotent, concurrency-safe, and never falls back
  to personal credit or GG-027 transfers.
- Personal, organization-member, organization-manager, removed-member, and
  cross-organization project/generation/Asset/reference boundaries return no
  existence leak and mint only permitted signed reads.
- Enterprise usage derives pending/released/settled state from durable job and
  ledger evidence; manager Asset download appends safe audit without storing
  signed URLs.
- Signed upload lifecycle and invalid-file rejection.
- Owner-scoped reusable-reference listing returns only accepted ready rows with
  fresh signed reads; selecting one reuses its stable ID without a PUT.
- Reference-cleanup dry-run, bounded claim, object deletion, retry evidence,
  idempotency, legacy-orphan rescue, and ready-material exclusion.
- Idempotent generation creation.
- Idempotent owner-scoped project creation, restore, update, and continuation.
- Owner-scoped asset listing filters to accepted successful outputs, preserves
  newest-first grouping, and returns fresh signed private reads.
- Owner-scoped Asset download URL resolution returns a fresh short-lived read
  only for an accepted successful Asset and never proxies the image bytes.
- Provider timeout/rejection normalization.
- Seedance provider contract covers all four product models on both lines,
  exact material/video POST and typed/task GET paths, bearer authentication,
  Doubao material `model`, HC HTTPS enforcement, text-only/multimodal/frame
  `content`, `4K` to `4k`, malformed responses, and pre-transport validation.
  Real smoke accepts credentials only by an explicitly named file plus
  `--execute`, submits one minimal task, reuses its returned task ID for polling,
  and never prints the credential or provider result URL.
- GG-036 page-smoke coverage proves the route is disabled by default and in
  production, accepts only loopback/same-origin writes, reads only an explicit
  credential file, submits current video parameters once, polls only the
  returned task ID, renders pending/failure/playable states, blocks references,
  and never reaches `/api/generations`. Browser acceptance uses the existing
  Chrome tab and does not use Playwright.
- Callback verification and duplicate callback handling.
- The M5 fake O1Key gateway exhaustively proves all 42 combinations of the 14
  product-defined aspect ratios and `1K` / `2K` / `4K` pass unchanged to
  `gemini-3.1-flash-image-c-sp`, while the model remains `nano-banana-2`, the
  upstream task output count remains one, and the response modality remains `IMAGE`;
  unsupported ratio/resolution/model/count values fail before a POST. Ordered
  multipart temporary uploads become explicit `fileData`
  references; polling success/failure, bounded timeout, duplicate/conflicting
  confirmed terminal reads, provisional-failure recovery to success, HTTPS
  enforcement, malformed response rejection, and stateless restart work
  without a real credential.
- GG-010 provider-router coverage proves a four-image Nano batch creates four
  single-image O1Key tasks without `n`, uploads each reference once per worker
  invocation, persists task-set prefixes of lengths 1–4 plus pre-POST markers,
  preserves ordinal output order, resumes a safe partial task set by submitting
  only its missing suffix, and fails an interrupted marker without another POST.
  Repository coverage proves stale task evidence cannot overwrite a
  newer token; shared output/storage and billing tests retain atomic completion.
- GG-007/GG-009/GG-033 coverage proves the three GPT image models' seven ratios
  across all three product resolutions map to the 21 documented lowercase-`x`
  pixel sizes and each accepts `n: 1`, `2`, or `4` in one task with the exact
  selected provider ID. It rejects a
  short success result and omits Nano-only request fields. UI contract tests
  cover ratio/count filtering, exact readouts, model-change normalization, and
  per-image plus batch-total pricing. Billing tests cover immutable 10/20/40
  rows and atomic four-Asset settlement.
- GG-015 provider coverage proves `quality`, `background`, and `output_format`
  are always top-level GPT fields, defaults are explicit, transparent WebP is
  admitted, transparent JPEG is rejected before submission, and GPT options do
  not leak into Nano jobs. UI coverage proves default rendering, automatic PNG
  correction, disabled JPEG help text, cross-model reset, and snapshot restore.
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
- Database transaction creates a batch/job and the complete ordinal Asset set
  consistently; no short result can settle the batch.
- Credit grant, live generation reservation, successful-Asset settlement,
  no-Asset release (including `SUBMISSION_UNKNOWN`), refund, and insufficient-
  credit paths are transactional and idempotent.
- Owner-scoped credit activity projects open/settled/released reservations as
  one processing/consumed/not-charged record, keeps refunds separate, classifies
  grants and adjustments, paginates without raw ledger IDs, and rejects foreign
  or filter-mismatched cursors. Aggregation coverage confirms only settled
  debits count toward Shanghai-calendar today/week/month totals. UI coverage
  includes direct `/credits`, the row below `帮助`, username balance, activity
  categories, batch traceability, filters, loading, empty, retry, load-more
  failure, responsive rows, and preservation of in-memory creation state; it
  also rejects duplicated generation parameters and prompt/result controls.
- Enterprise credit tests separately prove site-owner grant authorization,
  revocable member allocation/reclaim, organization and member shortfalls,
  same-operation replay, and atomic reserve/settle/release. Competing member
  reservations must serialize so at most the affordable subset succeeds;
  failure leaves both projections and both immutable event streams unchanged.
  The fixture also proves the same user's personal credit account is untouched.
- Active payment-product selection, owner-scoped order idempotency, signed fake
  callback verification, exact amount matching, event replay/conflict handling,
  and paid-credit grant are transactional and idempotent.
- Dry-run manual payment preview, exact owner/product resolution, immutable
  receipt identity, paid-order settlement, and replay/conflict behavior are
  transactional and idempotent without accepting operator-supplied amounts.
- GG-027 source-aware billing coverage proves aggregate/cache equality,
  payment-funded-only transferability, non-transferable-first generation
  consumption, exact release/refund restoration, and public balance
  serialization without source-lot or ledger identifiers.
- GG-027 distribution coverage proves site-owner role/relationship mutations,
  direct-child list isolation, atomic paired transfers, public references,
  opaque pagination, responsive loading/empty/failure/conflict states, and the
  absence of price/payment/commission controls.
- Stage-3 database coverage must additionally race two valid transfers against
  one insufficient transferable balance, prove exactly one commit, verify that
  aggregate and payment-funded totals remain globally zero-sum, and confirm
  transfer activity does not inflate generation-consumption summaries.
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
  effect. The GG-004 regression covers concurrent atomic outbox claims, the
  redispatch stale window, same-Worker active-job deduplication, rejection of a
  repeated unexpired lease, one attempt/Asset/settlement under live duplicate
  Valkey delivery, and stored-object cleanup when a terminal transition wins.
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
claiming exactly-once execution. GPT multi-output uses one native task; Nano
multi-output uses one task per image with incrementally durable ordered task
evidence. Both use an all-or-nothing Asset/credit policy; partial-result
settlement remains outside the current scope.

### Documentation continuity

- Agent adapters and root/docs entry points expose CURRENT_STATE, WORKFLOW,
  IMPLEMENTATION_PLAN and BACKLOG. These files remain short; history is lazy-read.
- The plan retains one dated checkpoint, active phase, next action, blockers,
  milestones, and new-session recovery instructions; task cards retain resumable
  progress and distinguish local verification from deployment.
- Relative links in the current continuity/task/release documents resolve.
- CURRENT_STATE and release receipt agree on the recorded immutable identity;
  later deployed migrations must not be inferred from a parked worktree.
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
7. New login -> 100 credits waiting -> pending state cannot create -> site owner
   approves -> the same account can create without a duplicate grant.
8. Site owner opens account management -> grants test credit with a reason ->
   one ledger/audit result appears -> replay does not grant twice.
9. Click generate repeatedly while jobs are active -> every click keeps its own
   skeleton and terminal result/error; a selected retry affects only that run.
10. Upload one reference -> open a new creation -> select it from uploaded
    materials -> submit by the same reference ID without another object upload.
 11. Operator records one local fake/manual paid order -> site owner assigns a
     distributor and direct child -> distributor allocates paid credit -> both
     balances and paired records update once -> replay is a no-op.
12. The same distributor holds welcome/test credit -> allocation above the
    payment-funded subset is rejected -> generation consumes non-transferable
    credit first -> release/refund restores the original source classes.
 13. A distributor attempts an indirect, foreign, suspended, or re-parented
     child -> the transfer fails without hierarchy disclosure or any balance,
     ledger, transfer, or audit mutation.
 14. Site owner creates one enterprise for a verified principal -> principal
     invites one employee -> employee accepts with matching verified email.
 15. Owner allocates employee budget -> employee generates in the enterprise ->
     company and member reserve/settle once -> owner sees usage and generated
     Asset while the employee's personal library remains hidden.
 16. Failed enterprise generation releases both company credit and member budget;
     suspending/removing the employee blocks organization access but preserves
     company history for managers.

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
  Distributed public probes may establish API latency and HTTP error baselines,
  but throughput counts only when a real carrier client transfers and verifies
  the complete synthetic payload. A tool that truncates the response body or
  does not support PUT cannot satisfy the upload/download portion. Report
  offline probe availability separately from application HTTP failures.
- PostgreSQL backup restoration and application rollback using the prior image.

## Release gate

GG-046 style-fixture tests prove coherent allocation totals/timestamps,
nonempty distributor lists and histories, simulation labels, no balance
callback or persistence, disabled read/page/write paths, and preview-session
gating. All fixture data stays in memory; never seed it into the real-provider
database/queue. Live 32140 auth continues to use actual data, while UI-only
5173 uses its existing preview session without credentials.

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

GG-077：定向测试验证三档可见性、固定参数覆盖防伪、公开投影脱敏与计数UI；opt-in GOODGOOD_GG077_INTEGRATION=1必须配GOODGOOD_GG077_NO_WORKER=1及精确loopback临时数据库goodgood_gg077_visibility_test_20260914。SQL覆盖去重、并发统计、下架不计数、报价不计数、私有参数生成/重试/结算与资产DTO。不得指向32140真实Worker数据库。
