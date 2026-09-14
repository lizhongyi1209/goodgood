# Production implementation plan

- Last synchronized: 2026-09-14
- Current phase: GG-071 site operations and global log implemented and locally verified; not deployed.
- Current objective: Owner daily operations and cross-user task/credit lookup in the existing shell.
- Previous objective: 用户在模型管理为 GPT 图片系列逐线路定价与启禁，保留原测试配置与历史。

## Current checkpoint

- Current task [GG-071](tasks/GG-071-site-operations.md), branch feature/GG-071-site-operations, worktree F:/goodgood-worktrees/GG-071; verified main bab17fd ancestor plus fast-forward GG-070 04fb519.
- ADR 0074 extends owner management with daily operations and task/ledger log plus details; existing audit and pricing remain. No migration, billing write or formal video settlement.
- Targeted feature/navigation17/17 and isolated SQL1/1 passed. Shanghai timestamp boundaries and historical MD5 UUIDs verified; preview SQL ran read-only. npm run check:local lint/types/build passed,491 tests470 pass/18 skip/3 doc-only failures. Documentation contract fixes passed8/8 afterward; no runtime/test edits after gate.
- Docker Desktop restarted after reboot. Existing goodgood-gg052 volumes retained; Windows excluded ports forced PG54449 and storage58049/58050 (Valkey56449), replacing unavailable55449/59049/59050. Only three named dependency containers recreated, no volume reset or migration. Other auto-started stacks untouched; no fixtures/outbox sent to real-provider32140.
- Final Web39107 at32141 (old45055 stopped), Worker46152 at32142 and mock91616 at32143 running from GG-071 ignored local helper. Original owner tab1648145248 retained on operations dashboard; account/session unchanged.
- Browser:7/30-day trends, daily selection, real1 successful task/21 credits, task and ledger details, mailbox/task/settle filters and empty results; historical grant details and Esc focus restoration pass. 390px tables/trend scroll internally and Sheet full width; desktop viewport restored.
- Before/after39 non-model table hashes/counts and complete model/event records identical. No model save or preview ledger/queue writes. Named disposable SQL fixture DB had no peer/Worker connections and was removed after test.
- Production https://goodgood.o1key.com revision 65ceb168/migration 0019 unchanged. staging-goodgood.o1key.com is historical naming. No paid requests, push, main merge or deployment.
- Next action: owner reviews http://127.0.0.1:32141/admin/operations and /admin/logs; video persistence/settlement remains a separate future slice. Local task-related commit saved; no deployment requested.
- Blockers: none; local dependencies restored.

## Verification sequence

1. Card summaries and non-mixed units, existing price/discount/persistence coverage and editor accessibility.
2. One complete local gate, then documentation-only handoff checks.
3. Verify isolated mock target, browser application/cancel and desktop/narrow UI, compare unchanged data snapshots.

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

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-071` 与 GG-071 任务卡；按卡核对运行版本，不能仅看 URL。
2. 当前页面为 `http://127.0.0.1:32141/admin/models`，已更新 GPT 图片三线路，右侧四管理功能保留；仅独立 mock 栈。旧 `32140` 有真实 provider Worker，不运行 fixtures/outbox，不重置其数据。
3. 本地 ignored `.gg052-local.mjs` 分别启动 web/worker/mock-generation；按本任务已记录的运行状态恢复，保留用户试价数据。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
