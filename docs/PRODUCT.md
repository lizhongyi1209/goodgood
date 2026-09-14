# Product definition

JCOIN当前决定见[ADR0081](decisions/0081-jcoin-batch-accumulation.md)：每批限定总额、无截止日期、发完后另行开启下一批；第一期仅充值消费挖矿并累计，不支持积分或其他兑换，不锚定人民币价值。第一期100万枚已由[ADR0082](decisions/0082-jcoin-first-batch-budget.md)接受，按预计50万元有效消费规模确定每100有效充值消费积分奖励2枚，见[ADR0083](decisions/0083-jcoin-first-batch-consumption-coefficient.md)；此前系数10、兑换/服务面值及自动跨阶段建议失效。总上限1亿、5000万用户回馈、消费驱动与2026-09-18北京时间00:00起算不变，20%创作安排保留未启动。GG-084本地实现一期账本和页面，未部署或在真实数据发行。下文GG080为历史规划背景。

[ADR0084](decisions/0084-jcoin-runtime-and-private-user-view.md)：个人平台币页只显示自己的余额、累计获得、退款撤回与分页流水，接口不返回发行总量/批次额度。站长管理查看固定库存及一期计划，开启、暂停、恢复和手动处理；迁移初始为未开启，9.18前不奖励。成功消费中的可靠正式充值部分按比例奖励，小额同样累计，已退款不奖励、事后退款撤回原实际奖励且不释放本期发行额度。混合测试资金或缺支付证据保守排除；创作池、企业来源、正式视频及下一批配置另行实施。

GG-081本地候选允许站长按充值/赠送/活动奖励/测试/服务补偿/其他增加个人积分，默认测试；类型独立于备注。充值登记已确认收款，凭证唯一，100积分/CNY，单次1—5000，赠品独立记赠送。站长入口默认运营看板，统计真实充值与生成任务并发；GG-084在此基础上接入一期消费奖励。参见[ADR0080](decisions/0080-classified-admin-credit-grants-and-operations.md)。

GG-080 proposes a separate JCOIN reward system, continuing candidate a73835f.
The owner confirmed a fixed 100,000,000 supply cap and a 50,000,000 user-benefit
pool, consumption-driven release and a 2026-09-18 Shanghai settlement cutoff.
Early rewards require proven payment-funded consumption; a proposed 20% creative
arrangement needs denominator/utility clarification before the subpools are fixed.
Admin credit types must be structured rather than inferred from notes. Rates,
utility, beneficiary rules, classified grant implementation and issuance remain proposed in
[ADR 0079](decisions/0079-jcoin-reward-planning.md) and the
[distribution plan](research/GG-080-jcoin-distribution-plan.md).
No wallet, token issuance, pricing conversion or management change is implemented
by this planning task; existing consumption-credit rules remain authoritative.

GG-074 supersedes the publication Sheet/always-public prompt via ADR0077.
Authors edit a case on a dedicated page and choose public/hidden reusable prompt.
Public reuse is editable; hidden reuse has a preset badge and optional supplement,
combined only server-side. Comparison supports side-by-side or pointer wipe.

GG-073 introduces inspiration cases: explicit selected personal image sharing
with before/after, immutable prompt/parameters and author attribution, active-user
likes and recipe reuse. Authors withdraw their own; site owners remove any case.
Shared reads stay authenticated; private profiles/unselected/enterprise media
remain private. Publication extends the private-only GG-072 scope via ADR0076.

GG-072 adds a private personal profile: avatar, name, unique @handle and the
user's accepted personal generated images. All works are visible to their owner
automatically. No public profile, publication controls or friends in this slice;
enterprise images are excluded. ADR 0075 defines this new scope.

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
3. **资产 / Asset** — an owner-scoped stored image. Generated outputs can be
   inspected and downloaded; uploaded materials can be selected repeatedly as
   creation references without uploading their bytes again.
4. **项目 / Project** — a saved creative context containing multiple related
   batches and enough state to resume work.

Do not collapse these terms. In particular, an asset library is not a job log,
and a project is not simply a folder of images.

## Primary journey

1. A new user sees a restrained empty creation state.
2. They enter a prompt, optionally add up to 10 references from local files or
   previously uploaded materials, and optionally open the attached settings drawer.
3. They select model, aspect ratio, resolution, and generation count.
4. The latest batch begins at the top of the creation stream.
5. Completed images and accepted uploads enter their respective asset-library
   sections automatically.
6. The user continues generating around the same goal without leaving creation.
7. When the body of work becomes meaningful, they save the session as a project.
8. Later they open the project, restore its state, and continue; they can always
   start a clean creation from the project surface.

## Implemented scope and active launch boundary

The owner selected GoodGood-owned email-code-only authentication in
[ADR 0045](decisions/0045-goodgood-owned-email-otp.md), with Google deferred.
[EMAIL_AUTH_PLAN.md](EMAIL_AUTH_PLAN.md) defines the planned rollout; the
Authing entry below still describes the implemented/deployed baseline.

The product has real authenticated, durable production behavior, not just a
frontend simulation. Exact deployed identity and verification live in
`docs/CURRENT_STATE.md`; this section defines capability scope rather than
duplicating a release log.

- Prompt/reference composer, attached settings, responsive creation stream,
  polled pending/success/inline failure, retry, gallery and focused image detail.
- The composer also has an accepted frontend-only `图片 / 视频` mode boundary.
  Video mode presents Seedance 2.5, 2.0, 2.0 Fast, and 2.0 Mini with
  capability-derived ratio, provider line, generation mode, resolution, duration,
  audio, and multimedia reference controls. Line defaults to `标准` (Doubao) and
  offers `备用` (HC) with the same product capabilities. `多模态` is the default and accepts model-bounded
  image, video, and audio references; `首尾帧` accepts at most two ordered images.
  Video references may come from local files or reusable
  image, video, and audio assets in the owner's library. The current frontend
  receives real generated/uploaded images; durable video and audio rows remain
  empty until the mixed-media asset API is connected. It does not yet upload new
  video-mode files, submit, quote, persist, or present video results; those remain
  pending the authenticated durable job and pricing contract. The server-side
  O1Key transport adapter already owns the Seedance material/video endpoint and
  payload mapping without exposing a browser submission route.
  Local reference upload is one explicit `上传素材` action capable of images,
  videos, and audio. It never creates an upstream reusable material automatically.
  `创建素材` is a separate opt-in flow for user-selected references. Historical
  created materials must be revalidated immediately before video submission;
  invalid or uncertain materials block submission and require explicit recreation.
- Nano Banana 2 through the real server-side O1Key route across 14 product
  ratios, plus the ordered GPT image family `GPT IMAGE 2.5 sunburst`,
  `GPT IMAGE 2`, and `GPT IMAGE 2.5 flare` across the same seven exact-size
  ratios. Their provider IDs are `gpt-image-2.5-sunburst`, `gpt-image-2`, and
  `gpt-image-2.5-flare`. All use `1K / 2K / 4K`, accept `1 / 2 / 4` outputs,
  and use model-owned capability maps. Each GPT image request uses one native task; Nano Banana 2
  composes a multi-image batch from one upstream task per requested image.
  Other visible model names are not a promise of availability.
- Nano Banana 2 exposes default-off Google Search grounding and internally uses
  high thinking without a creator-facing thinking control. These values are
  frozen with the generation snapshot and remain absent from other model contracts.
- Authing Google/email-code login and revocable GoodGood sessions, with
  owner-scoped jobs, private assets, uploads, projects and drafts. Local Compose
  uses explicitly isolated test identities/mock/RustFS, not production data.
- Up to 10 decoded JPEG/PNG/WebP references; accepted uploads are reusable from
  the owner-scoped material library. Project save/restore and continuing batches
  are durable; the root draft has 30-day expiry and stale-tab conflict handling.
- Stable `/create`, project and asset URLs, with root compatibility and
  source-preserving detail navigation. Route contracts live in `ROUTES.md`.
- One 100-credit welcome grant. Enabled Nano Banana 2 and GPT IMAGE 2 outputs
  cost 10 credits each; GPT batches of `1 / 2 / 4` therefore cost `10 / 20 / 40`.
  Nano Banana Pro has a published single-image quote of 15 credits, while its
  provider route remains unavailable. Billing uses transactional
  reserve/settle/release semantics, private credit summaries, and an owner-only
  activity view that summarizes today's, this week's, and this month's settled
  spend. Each row identifies image generation, video generation, or another
  change and uses the asset-library batch reference for traceability instead of
  repeating generation configuration or exposing raw ledger operations.
- Registration is open but creative use requires site-owner approval.
  `pending / active / suspended`, system role and product tier are distinct.
  `/admin/users` provides audited review and free test-credit grants. The site
  owner is bootstrapped deliberately, never selected by registration order.

ADR 0024 permits the owner-reviewed controlled alpha with non-sensitive test
content, direct operator contact and manual response. It does not claim the
full seed or paid gate. Its accepted deferrals remain in `docs/BACKLOG.md`:

- Customer checkout/domestic Alipay, Nano Banana Pro provider activation and further models, and
  partial-result settlement.
- Full automatic account/external-identity deletion, content reporting and
  broader moderation, provider-erasure terms, and complex monitoring.
- Search, Explore, Moodboards, collaboration, sharing, and richer cross-device
  session policy beyond existing drafts/projects are not shipped features.

The accepted CNY 10 / 500-credit payment product and fake sandbox/operator
recording infrastructure are not permission to collect payments during alpha.
Password/phone recovery is not offered because those sign-in methods are absent.
Historical implementation/verification stages are retained in `docs/history/`.

## Local candidate: managed model pricing

ADR 0063 additionally implements managed model pricing locally (GG-052):
1 CNY = 100 credits. Existing balances convert at 2 new credits per historical
credit; immutable history retains its original unit. `/admin/models` lets the
site owner add an entry using an existing adapter template, rename it,
enable/disable it, edit resolution prices in RMB and test the credit quote.
Arbitrary providers/protocols require adapter development. Images sell per
image and resolution; videos have output/reference-video-second prices.
Upstream token variation never changes an accepted customer quote. Image
pricing connects to durable submissions; video prices can be configured/tested
but the local preview has no settlement. This is not a production price change.

ADR 0064 (GG-054) extends Banana to three user-selected lines: 特价 (default),
优质 and 专线. One catalog model owns independent enabled states and 1K/2K/4K
fixed per-image prices for each line. Pro uses the three owner-specified provider
IDs; GG-056 also connects Banana 2 to the owner's confirmed special/quality/dedicated IDs.
Pro retains single-image output. Drafts/projects/results retain the choice;
accepted tasks retain their line and quote without automatic fallback or token
surcharges. Existing prices belong to special only; other lines start disabled
and unpriced. This is local implementation, not production Pro activation.

GG-056 removes catalog entries by archiving and disabling them, keeping accepted
jobs, results, projects, immutable prices and management audit intact. Archived
entries are absent from ordinary catalogs and reject new submissions. This
does not change saved Banana prices or enable flags, or add historical cleanup.

## Local candidate: direct-child credit allocation

ADR 0043 accepts a locally developed account-hierarchy capability without
claiming it is deployed. The site owner may classify an account as an
`enterprise` or `distributor`, exclusively, and bind one active direct parent.
ADR 0060 limits allocation to an active distributor, using only payment-funded
available credit to an active direct
child; a downstream business account may allocate received credit again because
the original payment provenance is retained. Welcome, test, promotion, and
operational grants cannot be allocated.

Allocation is a permanent atomic transfer, not a revocable limit. GoodGood does
not store the distributor's exchange price, CNY amount, downstream payment,
order, commission, revenue, or withdrawal. Those commercial arrangements stay
outside the product, and online payment remains deferred. The ordered
implementation phases are complete on the GG-027 local branch and the candidate
now awaits full local/Compose verification. It is not deployed; the site owner
separately decides whether a verified candidate should be released.

## Product principles

- Images first; records and parameters second.
- Fast iteration before configuration depth.
- Continuity without trapping the user in a project.
- Explicit recovery over vague toast errors.
- Preserve creative context; never make a retry re-enter known information.
- Simulated data must behave like real data: ordering, ratios, timestamps,
  states, and restored parameters must remain coherent.

## Accepted enterprise direction (implemented locally; not deployed)

GG-030 adds organization Workspaces without turning a company principal into a
GoodGood site owner. A verified user may retain a personal Workspace and join
one or more organization Workspaces as `org_owner`, `org_admin`, or
`org_member`. Company managers invite verified email identities, allocate
revocable member spending limits from one organization credit pool, inspect
organization generation consumption, and review generated company Assets.

ADR 0057 makes every identity a personal account in the main interface: no
global Workspace switcher, including site owners. ADR 0060 separates enterprise
and distributor identities: each account has one current business identity;
users needing both use two independent accounts in the short term. Allocation
lives only in distributor customers/downstream and transfer-history tabs.
Enterprise management contains overview, members/budgets, usage and team Assets,
without direct-account or transfer tabs. There is no standalone allocation navigation. Company
tabs live inside the same shell; platform role and commercial identity do not
replace organization authorization. Legacy company creative URLs and ownership
remain compatible; this navigation change does not migrate data or credit.

Enterprise identity cannot allocate personal credit. Only an active distributor
may do so. Transfers use the current personal account, never a company pool or
revocable employee budgets. Company membership roles are scoped collaboration
permissions, not a second business identity. No combined enterprise/distributor
identity or account-switching/automatic linking flow is offered.

Personal history and credit never become company data automatically. Work made
in an organization Workspace belongs to that organization and retains its
human creator; leaving the organization removes access without erasing company
history. Managers can review generated outputs, prompts, and parameter
snapshots, while reusable raw reference materials remain creator-restricted in
the first release.

This direction is distinct from GG-027's commercial `enterprise | distributor`
classification and permanent direct-child credit transfers, and independent of
whether Authing or GG-029 email OTP proves the user's email. Exact ownership,
authorization, and budget rules are fixed in ADR 0046. None of these enterprise
capabilities are part of the current production scope until implementation,
verification, and a separate release approval complete.

GG-077：灵感参数可见性为公开全部、仅隐藏提示词、隐藏参数和提示词。完全隐藏使用后端固定预设；大厅显示查看和使用统计，分别按打开详情和载入复刻配置计数，并非独立访客/生成成功数。

GG-078：取消灵感大厅与详情的点赞入口，历史点赞数据保留。大厅查看/使用并排，仅显示图标与数字，保留无障碍名称。

GG-079按用户澄清恢复灵感大厅和详情点赞，替代GG-078取消点赞规则。大厅三项统计仅图标数字同行。
