# Production implementation plan

- Last synchronized: 2026-09-14
- Current phase: GG-067 actual-token video pricing implemented, verified and filled on local mock preview; not deployed.
- Current objective: Let the owner inspect Seedance token rates and actual-use calculator.
- Previous objective: 用户在模型管理为 GPT 图片系列逐线路定价与启禁，保留原测试配置与历史。

## Current checkpoint

- Current task [GG-067](tasks/GG-067-seedance-token-pricing.md), branch feature/GG-067-seedance-token-pricing, worktree F:/goodgood-worktrees/GG-067; verified main bab17fd ancestor plus GG-066 28dc0ed candidate.
- ADR 0070 supersedes video-second retail pricing. Existing JSON prices add billing=tokens; two mutually exclusive credits/million-token rates per resolution. Editor supports RMB rates, actual completion_tokens and optional nested response JSON extraction. Legacy seconds retain their meaning; image pricing and adaptive width unchanged.
- Targeted tests 17/17 passed. One full npm run check:local passed lint/types/build and functional tests: 451 passed, 17 opt-in skipped, one documentation index failure. BACKLOG fixed and documentation tests 8/8 passed; no unresolved code failure.
- Restored previously stopped local Docker dependencies and mock-only host services. GG-067 Web session 56576, mock 42311, Worker 72412. Original data volumes retained; no migrations/reset/rebuild. Docker auto-restarted existing containers; no manual changes or requests to real-provider 32140.
- Owner browser saved four Seedance official normal-rate matrices, each version 1 to 2. No discounts. 2.5 1080p rate is documented but its current generation capability is not expanded.
- Browser verified refresh persistence, malformed JSON recovery, nested completion_tokens, Mini 50638 at 117 or 71 credits, and 390px layout without horizontal overflow. Restored desktop, original tab 1648144383 kept in Seedance 2.0 pricing editor.
- Read-only before/after: 39 non-model table hashes/counts identical, all image records and every model enable flag unchanged. Trial archival state retained. Only four video records and four append-only model events changed.
- Production https://goodgood.o1key.com revision 65ceb168/migration 0019 unchanged. staging-goodgood.o1key.com is historical naming. No paid requests, push, main merge or deployment.
- Next action: owner checks http://127.0.0.1:32141/admin/models; formal video reservation/price snapshots/actual ledger settlement require the next implementation slice.
- Blockers: none for pricing-only local scope.

## Verification sequence

1. Token-rate validation, exact pricing examples, response usage parsing and editor/list SSR.
2. One complete local gate; correct documentation index and recheck documentation-only changes.
3. Verify isolated mock target, compare data snapshots, owner-save prices, refresh and desktop/narrow UI verification.

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M8 | 已完成基线 / controlled alpha 已开放 | 生产事实以 CURRENT_STATE 和发布收据为准 |
| GG-023 | 本地安全候选已 CI 通过 | 尚未切生产，见任务卡 |
| GG-024—GG-032 | 本地完整基础组合已验证 | 账户、积分、直属关系、来源划拨、OTP、企业及成员额度 |
| GG-033 | 本地完成并真实验证 | 三个 GPT 图片模型，生产未发布 |
| GG-034—GG-039 | 本地图片/视频工作区已验证 | Seedance 参数、线路、预览、混排/详情、数量并发；正式视频结算待接 |
| GG-040—GG-043 | 本地完成并获页面检查 | 批量提示词、简化说明、抽屉与素材预览，未发布 |
| GG-044—GG-049 | 本地完成，验收记录见任务卡 | 企业/分销独立管理、划拨归位、概览；GG-046 模拟未获认可，原真实本地企业页保留 |
| GG-050 | 本地完成并获用户验收 | 删除五类常驻返回入口，不新增替代导航，未发布 |
| GG-051 | 研究方向获认可 | Runway 人民币按规格计价，等值分析与 ADR 0062 |
| GG-052 | 本地完成并验证 | 1 元/100 积分与站长模型面板；完整门禁、SQL/browser mock 验证通过，定价页已保留，未发布 |
| GG-053 | 本地完成并验证 | 模型名称一次、规格价格对齐、自动内部编号与折叠接入详情；完整门禁与桌面/窄屏验收通过，原页面已更新保留，未发布 |
| GG-054 | Pro 与通用功能本地完成并验证 | 原线路/定价候选完整验证；后续用户补齐 Banana 2 ID 接续 GG-056，未发布 |
| GG-055 | 官方调研与文档验证完成 | 六规格输出成本、整单公式与五参考图/长文本敏感性；文档测试 15/15、diff 检查通过；未改价/发布 |
| GG-056 | 本地完成并验证 | Banana 2 三线路、用户价格/历史保留、试价目录归档；门禁 427/16、SQL/运行/Chrome 通过，未发布 |
| GG-057 | 本地完成并验证 | 站长导航与 local 登录恢复；门禁 432/16、运行/Chrome 检查与配置/历史保留通过，未发布 |
| GG-058 | 本地调整与验证完成 | 站长字体/无页头退出；门禁 432/16、运行/Chrome 与历史保留通过，原 Windows 文字待用户复看，未发布 |
| GG-059 | 本地完成并验证 | 大厅统一站长管理/右侧切换/窄屏返回；最终门禁 437/16、浏览器与历史保留通过，未发布 |
| GG-060 | 本地完成并验证 | 顶部功能切换/唯一页面主标题；门禁 437/16、桌面窄屏与历史保留检查通过，未发布 |
| GG-061 | 本地完成并验证 | 独立审计/四功能；门禁 439/16、原浏览器/窄屏与历史保留通过，未发布 |
| GG-062 | 本地完成并验证 | GPT 图片三线路；门禁 445/16、隔离 SQL、原页面/窄屏与历史保留通过，未发布 |
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-067` 与 GG-067 任务卡；按卡核对运行版本，不能仅看 URL。
2. 当前页面为 `http://127.0.0.1:32141/admin/models`，已更新 GPT 图片三线路，右侧四管理功能保留；仅独立 mock 栈。旧 `32140` 有真实 provider Worker，不运行 fixtures/outbox，不重置其数据。
3. 本地 ignored `.gg052-local.mjs` 分别启动 web/worker/mock-generation；按本任务已记录的运行状态恢复，保留用户试价数据。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
