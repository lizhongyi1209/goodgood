# Navigation and route contract

GG-089站长功能栏按运营看板 → 账户管理 → 总日志 → 企业管理 → 模型管理 → 用户反馈 → 平台币 → 审计日志排列；共享桌面/手机顺序。用户反馈仍指向/admin/feedback，个人侧栏仍为问题反馈，默认入口运营看板。

GG-087 /feedback个人页、/admin/feedback站长页保持同工作区。GET /api/feedback只返回自己的每20条游标列表；POST multipart及x-goodgood-feedback-action=1/Idempotency-Key创建；GET /:id详情、/:id/images/:position受所有者或活动站长保护。站长POST /api/admin/feedback列表、GET /:id详情、POST /:id/reply版本化状态/回复都需x-goodgood-admin-action=1，回复另需幂等键。

GG-084新增个人`/jcoin`，桌面左下平台币入口、手机账户菜单“我的平台币”；离开企业历史工作区时回到个人域。GET `/api/jcoin?limit=20&cursor=…`只读，绑定已启用登录用户，limit为1—50，按原发生时间/ID分页；不接受目标用户切换，不返回发行库存、批次预算或来源支付详情。站长`/admin/jcoin`保留同工作区导航，活动site_owner独占no-store POST `/api/admin/jcoin/query`与`/action`；管理header必需，action仅start/pause/resume/process，8—200字符Idempotency-Key必需。预算、系数和日期来自固定一期计划，客户端不能传金额来铸币。站长默认入口仍为运营看板。

GG-081本地新增POST /api/admin/users/:ownerId/credit-grants，活动site_owner及x-goodgood-admin-action=1/Idempotency-Key必需。amount为1—5000整数，creditGrantType为共享英文枚举，reason为2—200字符；paid_recharge另需paymentConfirmed=true及8—200字符receiptReference。其他类型不收凭证，旧test-credit-grants兼容接口仍只测试赠送。站长默认/admin/operations；运营dashboard返回concurrent/queued/measuredAt及daily peak与recharge*，移除jobs/pending旧指标。

GG-074 adds same-shell /inspiration/edit/:assetId and /inspiration/use/:caseId.
Neither URL includes prompts. POST /api/inspiration/:id/generate is personal-only,
authenticated active, action-header/idempotency guarded and normal quote/billing
protected. Publish/generate bodies allow32KiB for edited Chinese prompts; other
case POSTs retain8KiB. Hidden detail/use DTOs contain no original prompt.

GG-073 implements `/inspiration`, entered from sidebar or mobile bar. Private
GET `/api/inspiration` lists first20; POST `/list` accepts search/keyset cursor,
POST `/prepare` reviews own asset and POST base publishes selected content.
GET `/:id` detail; POST `/:id/{like,use,withdraw}` enforce authenticated active
users, desired like state, action header and bounded inputs. No public route.

GG-072 adds private `/profile` inside the creator shell and owner-bound
GET/PATCH `/api/profile`. No `/@handle` or public lookup. Image detail retains
`profile` as history origin so close/back returns to personal works. Legacy
enterprise context leaves for the personal route before showing this page.

GG-071 adds `/admin/operations` (daily operating dashboard) and `/admin/logs`
(task/credit tabs and right detail Sheet) to the owner management shell. Existing
audit remains separate. Three owner-only no-store POST boundaries under
`/api/admin/operations/{dashboard,logs,detail}` reuse active sessions and the
admin CSRF header. Email/task filters stay in bodies; neither page changes
creation state. Logs use date ranges, event/state filters and keyset pagination.

## Current implementation

The shared workspace mounts at `/`, `/create`, `/projects`,
`/projects/:projectId`, `/assets`, `/assets/:assetId`, `/credits`, `/distribution`,
`/distribution/transfers`, and `/organizations` with organization detail and
legacy `/organizations/accounts` and `/organizations/transfers` compatibility subroutes. `/create` is the
canonical product URL for creation; `/` remains a compatible entry to the same
workspace state. Project and asset navigation use stable browser URLs and
native history.

Local site-owner `/admin/models`, `/admin/users` and `/admin/audit` also mount
this shell; audit moves the prior account-page recent-action list into its own view.

| Visible navigation | Current status | Current behavior |
| --- | --- | --- |
| 创作 | Implemented | `/create`, with `/` as a compatible entry |
| 探索 | Placeholder | No view or route yet |
| 项目 | Implemented | `/projects` index and `/projects/:projectId` restore |
| 资产库 | Implemented | `/assets` generated batch/gallery and uploaded-material sections |
| 灵感板 | Implemented locally | `/inspiration` selected effect cases, before/after, recipe reuse, likes and audited owner withdrawal |
| 帮助 | Placeholder | No view or route yet |
| 图片详情 | Implemented | `/assets/:assetId` over its preserved source scope |
| 账户管理 | Implemented | `/admin/users`, visible and callable only by the site owner |
| 模型管理 | Implemented locally | Site-owner `/admin/models`: add existing templates, enable/disable, edit RMB specification prices and test credit quotes |
| 审计日志 | Implemented locally | Site-owner `/admin/audit`, latest 30 account actions in the shared workspace |
| 积分记录 | Implemented | `/credits`, entered from the quiet row below `帮助` or the mobile balance |
| 平台币 | Implemented locally | `/jcoin`，仅自己的统计和流水；`/admin/jcoin`仅站长计划与一期生命周期 |
| 企业历史创作 | Compatible local route | `/workspaces/:workspaceId/create`, after active-membership validation; no global selector |
| 企业管理 | Implemented locally | Main sidebar `/organizations`; one managed company opens overview, multiple companies use a management-only directory; detail subroutes share the main shell |
| 分销管理 | Implemented locally | Distributor-only main-sidebar `/distribution` customers/downstream and `/distribution/transfers` history |
| 旧企业划拨链接 | Compatibility only | `/organizations/accounts` and `/organizations/transfers` canonicalize by identity under ADR 0060; not visible enterprise tabs |

Do not describe placeholders as shipped features.

GG-046 uses `/organizations/accounts?business-preview=1` only with an existing
UI-only preview session (non-production, no configured AUTH_MODE). It fills
distributor-only allocation content with labelled synthetic data after ADR 0060,
keeps context/tab/filter changes in memory, and disables writes. The query does
not override an authenticated real account or expose a new production route.

The current authenticated Node API also owns `GET /api/references` for the
owner's accepted reusable materials, `POST /api/references` for upload intents,
and `POST /api/references/:referenceId/complete` for post-upload validation.
These are data boundaries, not visible navigation routes. They use stable
reference IDs and the same owner context as `/api/generations`.

The authenticated Node API also owns `GET/POST /api/projects` and
`GET/PATCH /api/projects/:projectId`. They use stable project IDs, owner-scoped
creation idempotency, and fresh signed private-object reads. The visible project
index is addressable at `/projects`; opening a card pushes its stable ID URL and
restores through the same owner-scoped read. Direct access, refresh, and browser
back/forward use that route contract. A failed detail read stays on the URL and
offers retry, return to projects, and `新建创作`.

`GET /api/assets` returns only the authenticated owner's successful, accepted
generated assets, grouped by their immutable generation jobs newest-first. Each
read returns fresh short-lived private-object signatures. It has no cross-owner
lookup mode and returns an empty list when that owner has no assets.

`GET /api/billing` returns the authenticated owner's exact available, reserved,
and payment-funded transferable available credit plus the active Banana 2
launch quotes for 1K, 2K, and 4K. It is a read-only, no-store data boundary
rather than a visible route. The response uses decimal strings for exact credit
values and exposes no internal account, owner, provider-channel, source, or
ledger identifiers.

`GET /api/billing/activities` returns the authenticated owner's business-level
credit activity with `all / spend / receive / return` filtering and opaque
cursor pagination. A reserve and its settle/release closure project to one
generation activity; refunds remain separate positive activities. The response
includes settled-spend totals for the Shanghai calendar day, Monday-based week,
and month. Each item exposes a stable `image_generation / video_generation /
other` category and optional asset-library batch reference, but never repeats
model, resolution, count, prompt, or result Asset details and never
returns account IDs, ledger IDs, payment references, internal reasons, actors,
or provider details. It is read-only and `no-store`.

GG-052 extends `/api/billing` with enabled managed models and versioned image
quotes by catalog ID; adapter IDs remain separate canonical families.
Authenticated `GET /api/models` exposes enabled entries only. Site-owner
`POST /api/admin/models/query` reads the complete directory and
`POST /api/admin/models/save` publishes a version-checked update under the
existing CSRF header. These return no upstream URLs or credentials. The page
edits RMB prices at 1 CNY = 100 `credit-cny-cent` credits; video second prices
are configuration/calculation only until formal settlement is connected.

M6 also owns `GET /api/billing/products`, `POST /api/billing/orders`, and
`GET /api/billing/orders/:orderId`. Product reads expose the active immutable
`credits-500-cny` version; order creation accepts only that stable product ID
plus an owner-scoped idempotency header, never money or credit amounts. Order
reads are owner-scoped and return the public order ID and immutable snapshots.
These remain data boundaries; no wallet or checkout route is visible yet.

`POST /api/billing/webhooks/fake` is a local provider-callback boundary. It does
not use a browser session. It requires the enabled fake sandbox, a current HMAC
timestamp/signature over the exact raw body, and an exact order amount/currency.
It must remain disabled outside explicitly local test environments.

GG-081 adds the classified site-owner-only recharge route described above. Before domestic
Alipay checkout is enabled, a trusted server operator may still record an
independently confirmed payment with the dry-run-first
`billing:manual-payment` command. It uses the same immutable payment order and
credit ledger. ADR 0020 separately accepts a site-owner-only test-credit action
under `/admin/users`; that action appends a promotional ledger grant and never
creates or mutates a payment order.

## Implemented GG-027 local API routes (not deployed)

GG-027 stages 2—4 implement the authenticated API boundaries and local page
below. ADR 0060 limits this boundary to distributor management. For an active
enterprise account, legacy `/distribution` and `/distribution/transfers` replace
history with `/organizations`. Old enterprise allocation URLs also return there;
for a distributor, they resolve to the corresponding distribution tab, without
reloading creative state. Ordinary
users and business accounts without the allocation capability receive the same
server-enforced denial on direct URL and API access; hiding navigation is not
authorization. Entering or leaving the view preserves active creation state.

The authenticated boundaries are:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/distribution` | Return the caller's business role, total and transferable balance, and capability summary |
| `GET /api/distribution/children` | List active direct children only, with the minimum account and allocation summary needed to operate |
| `GET /api/distribution/transfers` | Return caller-scoped incoming/outgoing transfer history with opaque pagination |
| `POST /api/distribution/transfers` | Atomically move a positive integer amount of payment-funded credit to one active direct child |
| `POST /api/admin/users/:accountId/business-role` | Site-owner-only assign/end of `enterprise` or `distributor` business role; requires the existing admin CSRF and idempotency headers |
| `POST /api/admin/users/:accountId/direct-parent` | Site-owner-only create/end/replace of one direct-parent relationship; requires the existing admin CSRF and idempotency headers |

Mutation routes require the normal GoodGood session, same-origin CSRF header,
owner-scoped idempotency key, and server-derived actor. `accountId` is the
existing stable public account identifier, not a database owner ID. No route
accepts or returns an exchange price, fiat amount, downstream payment/order,
commission, revenue, or withdrawal. The operator-only manual-payment command
remains outside the browser API.

The four distribution API routes, two site-owner hierarchy mutations,
`/distribution` page, desktop business-role navigation row, and narrow-screen
icon entry are implemented only on the GG-027 local branch. None is deployed.

The visible asset library is addressable at `/assets`. Opening a generated
image from creation or either asset mode pushes `/assets/:assetId` while
retaining its source scope, selected asset mode, and scroll position in browser
history state. Wheel, arrow, and rail selection replace the detail URL rather
than creating one history entry per image. Closing or browser Back restores the
source; Forward and direct refresh resolve the stable asset ID from the
owner-scoped asset list. A missing or inaccessible ID remains on its URL with
retry and return-to-library recovery.

Authentication endpoints are backend boundaries rather than visible product
navigation:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/auth/method` | Return `hosted` or `email_code` so one browser surface supports the deployed mode and rollback candidate |
| `GET /api/auth/login` | Persist OIDC state/PKCE and redirect to hosted login; email mode only validates and returns to the same GoodGood path |
| `GET /api/auth/callback` | Consume state, expire the one-time browser binding on every outcome, exchange a valid code, and create a GoodGood session |
| `GET /api/auth/email/challenge` | Return only the current browser-bound challenge ID, masked mailbox, delivery state, expiry, and resend delay |
| `POST /api/auth/email/request` | Validate Origin/bounded JSON/mailbox, reserve shared limits, persist a challenge, and submit one SMTP message |
| `POST /api/auth/email/verify` | Validate Origin and browser binding, atomically consume the code, then create the owner/identity/session as required |
| `GET /api/auth/session` | Return the safe current-account summary; never provider tokens |
| `POST /api/auth/logout` | Revoke the GoodGood session and expire its cookie; only OIDC mode returns the fixed Authing hosted-logout target |

The browser follows an OIDC logout target as a top-level navigation. It never
uses `fetch` across origins, and the provider return is fixed to the GoodGood
origin root derived from the configured login callback rather than accepting a
caller-supplied URL. Local test mode has no provider session and keeps the `204`
response after expiring its local cookie.
Email request/verify responses are no-store and same-origin only; mailbox,
challenge, or code values never appear in a product URL.

## Accepted production routes

`/create`, `/projects`, `/projects/:projectId`, `/assets`,
`/assets/:assetId`, and `/credits` are deployed today. `/distribution` is
implemented on the GG-027 local candidate but is not deployed. Adopt other future routes only
when their persistence and navigation behavior exist:

| Route | Purpose |
| --- | --- |
| `/create` | Clean or active creation session |
| `/projects` | Project index |
| `/projects/:projectId` | Restore and continue a project |
| `/assets` | Batch/gallery asset library |
| `/assets/:assetId` | Addressable image detail |
| `/credits` | Owner-scoped period spend summary and concise credit changes |
| `/distribution` | Local distributor-only direct-child allocation workspace; not deployed |
| `/explore` | Future discovery experience |
| `/moodboards` | Future moodboards |
| `/help` | Product help and status guidance |
| `/admin/users` | Site-owner-only account review, business-role/direct-parent management, audit history, and test-credit management |
| `/admin/models` | Site-owner model availability, template-backed additions and specification pricing; local candidate |

GG-030 implements these stable routes locally, but they are not deployed:

| Path | Purpose |
| --- | --- |
| `/workspaces/:workspaceId/create` | Creation in one validated personal or organization Workspace |
| `/organizations` | Personal-account shell's organization directory/invitation entry; not a creative scope switch |
| `/organizations/:organizationId` | Enterprise overview and recovery entry |
| `/organizations/:organizationId/members` | Organization owner/admin invitation, role, status, and budget management |
| `/organizations/:organizationId/usage` | Role-authorized member consumption and reservation history |
| `/organizations/:organizationId/assets` | Role-authorized generated company Asset review |

The corresponding API boundary uses stable Workspace/organization IDs for
selection and derives the human actor from the GoodGood session. It includes
site-owner organization creation, member invitation/acceptance, membership
changes, budget changes, organization billing summary, usage, and Assets.
Invitation acceptance never accepts an owner ID or unverified email from the
browser as authority. Search terms containing employee email remain in request
bodies or ephemeral state, not URLs/history.

The root route remains compatible for old links. Product navigation and clean
creation transitions use `/create`; both entries mount the same component and
do not create separate draft or history state.

## Navigation rules

- ADR 0067 brings `/admin/users` and `/admin/models` into the creator shell.
  Site owners have one `站长管理` entry, opening `/organizations`, with enterprise,
  model, account and (GG-061) audit links in the right-hand workspace. Account
  management no longer embeds recent actions; `/admin/audit` reuses the existing
  authorized latest-30 account-action query. Existing organization
  details remain in that area. Ordinary enterprise managers keep their entry.
  Management uses workspace history navigation and preserves mounted creation
  state; direct links and refresh mount the same shell. The creator account
  menu and access gates retain logout; no management header logout is added.
  This supersedes ADR 0066's standalone chrome. Routes and history remain compatible;
  content tabs, error-body recovery, detail/dialog close, logout and
  `新建创作` are unaffected. Management navigation uses workspace URLs, never login
  URLs or a history-based return action.

- Navigating between Creation, Projects, and Assets must not silently lose an
  in-progress generation.
- Returning to the same loaded project preserves its current in-memory edits.
  Restoring a different project or starting a clean session confirms before
  discarding meaningful unsaved composer state.
- A project detail must expose `新建创作` near project actions.
- Opening image detail should preserve the source scope so its rail matches the
  images the user was browsing.
- Filters, selected mode, and scroll position should survive detail close and
  browser back navigation.
- Entering or leaving `/credits` preserves in-memory creation and active jobs;
  its filter stays ephemeral and does not put financial state in the URL.
- Entering or leaving `/distribution` follows the same preservation rule;
  child search and transfer filters remain ephemeral and never enter the URL.
- Future URLs use stable IDs, never model names, prompts, or localized labels.
- Administrative navigation is emitted only for the site-owner role, but route
  and API authorization remain server-side. Search terms containing email or
  other personal data stay in request bodies or ephemeral client state rather
  than browser URLs or history.
- Ordinary organization navigation requires an active eligible account, enterprise
  identity, manageable membership or invitation; site owners use `站长管理`.
  `org_owner`/`org_admin` controls never reuse `/admin/users`, and hidden
  navigation is never treated as authorization.

GG-077：现有灵感资源新增POST /api/inspiration/:id/view与quote；view使用交互UUID，quote只返回积分金额和报价版本，均要求有效会话和动作头。use可带交互UUID；预设页复用大厅已载入结果，直接访问则分配自己的UUID。GET详情与列表不计数。
