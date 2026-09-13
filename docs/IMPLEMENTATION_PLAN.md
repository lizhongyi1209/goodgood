# Production implementation plan

- Last synchronized: 2026-09-13
- Current phase: GG-054 Pro 三线路与通用分线路定价本地完成并验证；Banana 2 两条映射待补齐。
- Current objective: 默认特价，创作者选线，线路独立人民币售价贯穿报价、任务与状态恢复。

## Current checkpoint

- 当前任务 GG-054，`feature/GG-054-banana-lines`、`F:/goodgood-worktrees/GG-054`，从 GG-053 `adcfc67` 隔离建立；main `bab17fd` 为已验证祖先。GG-052 `7d75525` 为人民币积分与模型面板来源；旧工作树和未关联改动保留。
- [ADR 0064](decisions/0064-banana-lines-and-specification-prices.md) 接受默认特价、用户选线、线路独立 1K/2K/4K 固定人民币售价与启禁。Pro 三个请求 ID 已按用户要求映射，保持单张输出；Banana 2 仅特价映射已确认，另两条 ID 待用户补齐，配置保留但不能启用。
- 线路贯穿目录、创作报价、个人/企业预留结算、批次、草稿、项目与历史恢复。已受理任务保持原线路/价格，无自动回退和 token 追扣。迁移 0031 添加配置/状态，不改旧 hash、报价或账本，原价格只沿用至特价。
- 定向 47/47、独立无 Worker `goodgood_gg054_lines_test_v2` SQL 1/1 通过；最终 `npm run check:local` lint/TypeScript/构建通过，439 项中 423 通过/16 opt-in 跳过/0 失败。Chrome 桌面/390×844 价格矩阵、Pro 独立输入往返保留/42 积分试算、窄屏保存可达及创作默认特价检查完成；未保存试算费率或发生成请求。确切证据见 [GG-054 任务卡](tasks/GG-054-banana-lines.md)。
- 隔离 Compose `goodgood-gg052`：数据库 55449、Valkey 56449、对象存储 59049/59050，Web 32141、mock Worker 32142、mock provider 32143。已更新 GG-054 Web `3926`/mock Worker `43261`/mock provider `29023`，mock 库迁移至 0031，Web/Worker readiness 五项 ok。用户试价模型 v3、余额 179/预留 0、项目 v1 保留。
- 正式 `https://goodgood.o1key.com`、production revision `65ceb168`/迁移 0019 不变；`staging-goodgood.o1key.com` 仅历史名称，不是当前验收入口。旧 32140 是真实 provider 栈，不能放 fixtures/outbox。本次不推送、不合 main、不部署，不发真实付费请求。
- Next action: 用户在已保留的 32141 模型管理页为 Pro 各线路试定价/启用；补齐 Banana 2 两条请求 ID 后再接通映射并验证。生产发布与真实冒烟另行取得范围。
- Blockers: Banana 2 优质/专线请求 ID 待补齐；不阻塞 Pro 和通用配置。生产单位转换、正式视频扣费仍为后续范围。

## Verification sequence

1. 定向 GG-054 线路/价格/权限/API 与状态恢复测试；隔离无 Worker PostgreSQL 写验证必须显式命名 disposable 数据库，不使用旧真实接口栈。
2. 实现稳定后一次 `npm run check:local`，再做浏览器 mock 流程及文档/diff 检查。确切结果记录任务卡。
3. 用户检查本地页面后另行决定发布。生产兑换前须停新任务/新订单、排空活动任务/预留/待支付订单；不直接复用旧转换脚本。

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
| GG-054 | Pro 与通用功能本地完成并验证 | 三线路、独立启禁/规格价与状态恢复；完整门禁、SQL、桌面/窄屏检查通过，页面保留；Banana 2 两条 ID 待补齐，未发布 |
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-054` 与 GG-054 任务卡；GG-053/052 是已交付实现来源。
2. 当前定价验收页为 `http://127.0.0.1:32141/admin/models`，仅独立 mock 栈；旧 `32140` 是有真实 provider Worker 的栈，不运行 fixtures 或测试 outbox，不重置其数据。
3. 本地 ignored `.gg052-local.mjs` 分别启动 web/worker/mock-generation；按本任务已记录的运行状态恢复，保留用户试价数据。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
