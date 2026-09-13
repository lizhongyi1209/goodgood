# Production implementation plan

- Last synchronized: 2026-09-13
- Current phase: GG-057 本地实现/完整门禁/运行同步/浏览器验收完成，线上候选仍在本地准备。
- Current objective: 统一站长账户/模型管理导航，修复返回旧 local 登录请求，同时保留用户价格与历史数据。

## Current checkpoint

- 当前任务 [GG-057](tasks/GG-057-admin-navigation.md)，`fix/GG-057-admin-navigation`、`F:/goodgood-worktrees/GG-057`，接续已验收本地候选 GG-056 `3509e6e`；main `bab17fd` 已验证为祖先。ADR 0066 只替代 ADR 0061 的站长页头限制。
- 两页共用站长导航/当前项/直接返回创作/退出；显式 local 登录保留有效身份或恢复已配置默认身份，生产模式和管理授权不变。无数据迁移、不重设价格/启禁/积分。
- 32141 已运行 GG-057 的独立 `goodgood-gg052` Web/Worker/mock，readiness 全通过；迁移 0032 与试价归档保留。本任务没有新迁移、fixtures 或真实请求。全部模型配置及九类历史 count/hash 前后一致；用户当前 Pro 总开关与 Banana 2 全部线路已启用，三个 GPT 条目禁用，保留最新实际状态。
- 正式 `https://goodgood.o1key.com`、production revision `65ceb168`/迁移 0019 不变；`staging-goodgood.o1key.com` 仅历史名称。旧 32140 是真实 provider 栈，不能放 fixtures/outbox；本轮不推送/合 main/发布。
- Verification: 本任务定向登录/导航/OIDC/OTP 34/34；一次完整门禁 432 通过/16 opt-in 跳过/0 失败，lint/TypeScript/构建通过；原 Chrome 站长登录恢复、两页切换、返回创作、Back/Forward 与 390×844 检查通过；价格与历史核对一致，详见任务卡。
- Next action: 用户用原 32141 模型页继续本地定价测试，页头可切换账户/模型；真实线路、视频正式结算与生产发布依明确范围安排。
- Blockers: 当前无阻塞；mock 不证明真实上游，生产单位兑换/迁移/费率与上线尚未执行。

## Verification sequence

1. 定向验证登录恢复/身份保留/失败关闭/直接导航；没有 SQL fixture 写入。
2. 稳定后一次完整门禁，保留当前用户价格/版本，检查无活动任务后同步本地 Web/Worker/mock，不执行迁移。
3. 浏览器以站长身份核对切换、返回、导航与价格，交用户本地验收；真实 provider 与发布使用新鲜证据及独立范围。

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
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-057` 与 GG-057 任务卡；按卡核对运行版本，不能仅看 URL。
2. 当前定价验收页为 `http://127.0.0.1:32141/admin/models`，仅独立 mock 栈；旧 `32140` 是有真实 provider Worker 的栈，不运行 fixtures 或测试 outbox，不重置其数据。
3. 本地 ignored `.gg052-local.mjs` 分别启动 web/worker/mock-generation；按本任务已记录的运行状态恢复，保留用户试价数据。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
