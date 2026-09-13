# Production implementation plan

- Last synchronized: 2026-09-13
- Current phase: GG-056 本地实现/完整门禁/SQL/运行与浏览器检查完成；用户 Banana 价格保留，线上候选仍在本地准备。
- Current objective: 补齐确认映射、移除试价目录并保历史，保留用户价格/启禁与独立 mock 试验入口。

## Current checkpoint

- 当前任务 [GG-056](tasks/GG-056-banana2-lines.md)，`feature/GG-056-banana2-lines`、`F:/goodgood-worktrees/GG-056`，接续 GG-055 `52a808e`；main `bab17fd` 已验证为祖先。延续 ADR 0064，新增 ADR 0065 的目录归档语义。
- Banana 2 三条 owner-confirmed ID 已补齐，保持原特价 route/version、默认特价和每张一任务编排。不改固定规格积分价或用户启禁。
- 迁移 0032 仅加目录归档列/约束，不重跑已转换单位、不重设费率。指定试价条目归档而非删除审计/报价/项目/结果。用户两组 Banana 配置/价格版本在更新前后精确核对，详见任务卡。
- 32141 显式独立 `goodgood-gg052` mock 栈已同步 GG-056 Web/Worker/mock，ready 全通过；迁移 0032 已执行，试价条目归档 v4。两组 Banana 完整配置与八类历史 count/hash 前后一致。运行会话和检查收据见任务卡；用户以此为线上版本本地准备，不发真实付费请求。
- 正式 `https://goodgood.o1key.com`、production revision `65ceb168`/迁移 0019 不变；`staging-goodgood.o1key.com` 仅历史名称。旧 32140 是真实 provider 栈，不能放 fixtures/outbox；本轮不推送/合 main/发布。
- Verification: 定向 27/27、显式无 Worker SQL 1/1；完整门禁 427 通过/16 opt-in 跳过/0 失败，lint/TypeScript/构建通过；数据保留/三角色 ready/Chrome 检查通过，最终文档 15/15、diff 检查通过。不借用旧结果。
- Next action: 用户继续本地启用/定价/报价验收；Pro 总开关和 Banana 2 优质/专线启禁原样保留。真实线路、视频正式结算与生产发布按明确范围和精确候选新鲜证据安排。
- Blockers: 当前本地任务无阻塞；mock 不证明真实上游，生产单位兑换/迁移/费率与上线尚未执行。

## Verification sequence

1. 定向验证精确 ID/线路/报价/历史保护；SQL 写入只用命名无 Worker 临时库。
2. 稳定后一次完整门禁，保留当前用户价格/版本，检查 drain 后同步本地 Web/Worker/mock 与新增迁移。
3. 核对目录移除、线路可配置/报价和历史保留，交用户本地验收；真实 provider 与发布使用新鲜证据及独立范围。

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
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-056` 与 GG-056 任务卡；按卡核对运行版本，不能仅看 URL。
2. 当前定价验收页为 `http://127.0.0.1:32141/admin/models`，仅独立 mock 栈；旧 `32140` 是有真实 provider Worker 的栈，不运行 fixtures 或测试 outbox，不重置其数据。
3. 本地 ignored `.gg052-local.mjs` 分别启动 web/worker/mock-generation；按本任务已记录的运行状态恢复，保留用户试价数据。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
