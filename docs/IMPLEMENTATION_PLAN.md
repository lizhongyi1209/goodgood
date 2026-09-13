# Production implementation plan

- Last synchronized: 2026-09-14
- Current phase: GG-063 implemented, verified and filled on local preview; not deployed.
- Current objective: GG-063 GPT quality pricing and dedicated-line fal estimates.
- Previous objective: 用户在模型管理为 GPT 图片系列逐线路定价与启禁，保留原测试配置与历史。

## Current checkpoint

- Task [GG-063](tasks/GG-063-gpt-quality-pricing.md), branch feature/GG-063-gpt-quality-pricing, worktree F:/goodgood-worktrees/GG-063, based on verified main ancestor plus GG-062 dd27aff. ADR 0069 adds quality pricing while preserving fixed lines.
- GPT IMAGE 2 supports low/medium/high; GPT IMAGE 2.5 Sunburst/Flare also support xhigh/max. Line/resolution/quality editing, range and detail tables, calculator, provider validation, drafts/projects, immutable personal and enterprise quotes are implemented. Auto uses the highest configured tier on quality-priced lines.
- Final npm run check:local: lint/type/build passed, 448 tests passed, 17 opt-in skipped, zero failures. Disposable no-Worker goodgood_gg063_quality_test_v4 verified all tiers, failure release, stale quotes, disabled admission, pinned settlement and duplicate completion. Earlier gate issues were one temporary helper and two documentation omissions, all corrected.
- Local 32141 mock preview backed up in ignored .gg063-before.dump; only migration 0034 applied. Web session 93625, Worker 79489, mock 67415 run from GG-063; all readiness checks pass.
- Owner UI saved 39 dedicated-line prices using agreed fal USD x7, rounded upward to integer credits. Three model events and 144 immutable price versions added. Names, switches, all other prices including Banana and eight unchanged history checksums verified. Archived trial model remains archived.
- Chrome saved/reloaded prices and quality matrix layout verified; Sunburst calculator low 1K = CNY 0.05 / 5 credits, auto = CNY 1.48 / 148 credits. The editor is preserved for user testing.
- Production revision 65ceb168/migration 0019 and real-provider 32140 unchanged. No push, main merge, deployment or paid provider requests.
- Next action: owner reviews local dedicated estimates and adjusts retail margins, then enables desired models/lines for local testing. Prices estimate output only; inputs, aspect ratios and actual bills can differ.
- Blockers: none for local scope. Real upstream and production migration/release remain unverified.

## Verification sequence

1. Nine GPT mappings, independent quotes/disable, draft/project and legacy route compatibility.
2. Explicit no-Worker disposable SQL database; one full local gate after stabilization.
3. Preview snapshots, local migration/runtime update and browser model-pricing verification.

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

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-063` 与 GG-063 任务卡；按卡核对运行版本，不能仅看 URL。
2. 当前页面为 `http://127.0.0.1:32141/admin/models`，已更新 GPT 图片三线路，右侧四管理功能保留；仅独立 mock 栈。旧 `32140` 有真实 provider Worker，不运行 fixtures/outbox，不重置其数据。
3. 本地 ignored `.gg052-local.mjs` 分别启动 web/worker/mock-generation；按本任务已记录的运行状态恢复，保留用户试价数据。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
