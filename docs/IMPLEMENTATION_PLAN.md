# Production implementation plan

- Last synchronized: 2026-09-14
- Current phase: GG-079 implemented and locally verified; not deployed.
- Current objective: GG-079 saved for a new-window handoff; await the user's next development request.
- Previous objective: 用户在模型管理为 GPT 图片系列逐线路定价与启禁，保留原测试配置与历史。

## Current checkpoint

- Task [GG-079](tasks/GG-079-inspiration-likes-centered-detail.md), fix/GG-079-inspiration-likes-centered-detail, F:/goodgood-worktrees/GG-079; main bab17fd + FF accepted GG07824a1711.
- ADR0078 clarified before code: restore board/detail likes, all three icon-number counters inline, center detail image frames. No backend/schema changes.
- Final local gate: 502 passed/22 opt-in skipped, lint/typecheck/build passed; targeted12/12. Desktop inline counters/28px like hit area and centered frame, 390px narrow detail verified.
- Saved implementation commit: `6c1ab22` on the task branch; working tree clean before this documentation handoff. This cumulative candidate includes GG-078/GG-077; main remains `bab17fd`, not the latest local product candidate.
- Handoff runtime check: 32141/32142/32143 have no listeners; previous tool session IDs are historical, not portable recovery handles. The goodgood-gg052 PostgreSQL/Valkey/RustFS containers remain running and healthy; no data reset. Original draft/prices/history preserved in the preceding UI verification; no new data writes in this handoff. Production goodgood.o1key.com unchanged; staging-goodgood.o1key.com historical only.
- Documentation handoff tests15/15 and diff checks passed; local task commit saved at handoff.
- Next action: New window reads this checkpoint and GG-079 task card, then allocates the next scoped request as GG-080 after checking occupancy; verify main and explicitly carry forward the saved cumulative candidate into the new isolated branch.
- Blockers: None for local work; no production deployment authorized.

## Verification sequence

1. Consent/ownership and shared DTO privacy; immutable recipe, empty references, likes idempotency, moderation and microsecond pagination.
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

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-079` 与 GG-079 任务卡；按卡核对运行版本，不能仅看 URL。
2. 新窗口应进入 `F:/goodgood-worktrees/GG-079`；根 `F:/goodgood` 仍是旧 GG-024 工作树，`.codex/` 未跟踪内容保持原样，不将其旧检查点当作最新实现。原预览 URL 为 `http://127.0.0.1:32141`，上次用户在站长看板；本次交接不再启动或导航。
3. 恢复预览先确认端口与独立 mock 目标；分别运行 `node .gg052-local.mjs web`（GG-079目录）、`node .gg052-local.mjs worker` 与 `node .gg052-local.mjs mock-generation`（GG-077目录）。ignored helpers/build仍留在本机，数据库54449、Redis56449、RustFS58049；不要运行重置/fixture。旧32140曾有真实provider Worker，不重启或操作它。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
