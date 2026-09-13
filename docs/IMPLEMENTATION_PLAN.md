# Production implementation plan

- Last synchronized: 2026-09-13
- Current phase: GG-062 GPT 图片三线路本地实现、门禁、隔离 SQL 与原页面检查完成，未发布。
- Current objective: 用户在模型管理为 GPT 图片系列逐线路定价与启禁，保留原测试配置与历史。

## Current checkpoint

- 当前任务 [GG-062](tasks/GG-062-gpt-image-lines.md)，`feature/GG-062-gpt-image-lines`、`F:/goodgood-worktrees/GG-062`，接续 GG-061 `a25cfe0`；main 已验证为祖先。ADR 0068 扩展 GPT 图片三线路，保留 Banana 专属参数/编排。
- GPT 2/2.5 sunburst/flare 九个请求 ID 接入；默认特价，独立线路选择/固定报价/站长定价与启禁。原价沿用特价，总模型仍禁用，优质/专线为空且禁用；旧空线路任务保留原路由。
- 独立 goodgood-gg052 已备份后只添加 0033；所有原价/启禁/版本/更新时间、Banana 全配置与十类历史 count/hash 保留。Web 44103/Worker 29662/mock 71031 均来自 GG-062，ready/checks 全 ok。32140 真实 provider 栈不变，不放 fixtures/outbox。
- Verification: 最终完整门禁 445 通过/16 opt-in 跳过/0 失败，lint/类型/构建通过；567 注入参数请求、隔离 SQL 与 Chrome 三模型价格编辑/窄屏检查通过，详见任务卡。
- Production `https://goodgood.o1key.com` revision `65ceb168`/migration 0019 unchanged; `staging-goodgood.o1key.com` is historical naming. No push/main merge/deployment/paid calls.
- Next action: 用户在已保留的 32141 模型管理页面逐线路定价、开启需要的模型与线路，继续本地测试。
- Blockers: 当前无阻塞；mock 不证明真实上游，生产上线/迁移及真实付费请求尚未执行。

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

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-062` 与 GG-062 任务卡；按卡核对运行版本，不能仅看 URL。
2. 当前页面为 `http://127.0.0.1:32141/admin/models`，已更新 GPT 图片三线路，右侧四管理功能保留；仅独立 mock 栈。旧 `32140` 有真实 provider Worker，不运行 fixtures/outbox，不重置其数据。
3. 本地 ignored `.gg052-local.mjs` 分别启动 web/worker/mock-generation；按本任务已记录的运行状态恢复，保留用户试价数据。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
