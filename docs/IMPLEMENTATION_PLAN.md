# Production implementation plan

- Last synchronized: 2026-09-13
- Current phase: GG-053 精简模型列表和规格价格，本地完成并验证，原定价页已更新保留。
- Current objective: 用户检查清楚的模型/规格售价布局并试定人民币价格；计价与正式接入边界不变。

## Current checkpoint

- 当前接续 GG-053，分支 `fix/GG-053-clear-model-pricing`、工作树 `F:/goodgood-worktrees/GG-053`，从已交付 GG-052 `7d75525` 隔离建立，main 为已验证祖先。纯信息展示优化，ADR 0063 的单位、价格版本、接入边界不变，无新迁移。
- GG-053 列表名称一次，图片/视频分组、分辨率对齐人民币/积分价，视频输出/参考价分别显示；编辑按规格分组，内部编号自动生成、接入详情默认折叠。定向 18 项通过，一次完整门禁 lint/TypeScript/构建通过，428 项中 413 通过/15 opt-in 跳过/0 失败；Chrome 桌面/390×844 及图片 100 积分/视频 750 积分试算检查完成，未保存试算数据。准确证据见 [GG-053 任务卡](tasks/GG-053-clear-model-pricing.md)。

- GG-052 已交付来源为 `feature/GG-052-model-management`、`F:/goodgood-worktrees/GG-052`，从 GG-051 `3b5c03d` 隔离建立，main `bab17fd` 为已验证祖先；原 `F:/goodgood` 是旧 GG-024，旧工作树与 `.codex/` 保留。
- 用户认可的 Runway 规格售价方向见 ADR 0062；本次明确兑换和实现边界见 [ADR 0063](decisions/0063-model-management-and-cent-credits.md)。单位转换与人民币售价分别处理，不按实际 provider tokens 追扣。
- 新单位 `credit-cny-cent`：1 元/100 积分。个人/企业余额、充值来源可划拨余额、成员额度/已用值乘 2；旧账户关闭并保留记录，新账户有可追溯的转换入账，不重写历史账本/订单/任务。
- 迁移 `0029` 要求任务、预留、待支付订单排空；`0030` 从转换后价格初始化尚未编辑的模型，保留历史自定义价格。生产尚未执行。
- 站长 `/admin/models` 提供列表/搜索/筛选、添加已有模板条目、名称/说明、启用/禁用、1K/2K/4K 图片按张定价、视频输出秒/参考视频秒价及积分试算。
- 新目录接入创作器、报价、图片任务、草稿及项目。售价发布为不可变版本；新提交检查启用状态和报价版本，已受理任务保持原报价/adapter，不被后续禁用打断。
- 视频只配置/试算和目录启禁；既有本地 preview 不扣积分，正式视频队列、持久化及结算仍待独立任务，不宣称已接入。
- 隔离 Compose `goodgood-gg052`：PostgreSQL `55449`、Valkey `56449`、对象存储 `59049/59050`；Web `32141`、mock Worker `32142`、mock provider `32143`。显式合成身份、专用 cookie，不连接真实 provider。
- 独立无 Worker 数据库 `goodgood_gg052_pricing_test_v2` 已通过余额/额度等值、迁移排空拒绝、旧账本不变、旧任务退款、历史自定义价格保留、新价格发布、报价过期拒绝、原价结算及禁用后已受理任务继续 claim，1/1 通过。
- Chrome 专用 `32141/admin/models` 已验证新增刷新后保留、启用/禁用、图片四张 100 积分和视频秒价 750 积分试算。示例视频价未保存；原 `32140` 真实接口栈、数据、会话和 Worker 保持原状。
- 最终 `npm run check:local` lint/TypeScript/构建通过，428 项中 413 通过/15 opt-in 跳过/0 失败；独立 SQL 1/1、浏览器 mock 生成按 21 积分结算，余额 179/预留 0，项目刷新保留新增目录模型；390×844 弹窗保存可达，视口恢复。确切过程见 [GG-052 任务卡](tasks/GG-052-model-management.md)。
- GG-053 从新工作树更新 Web 会话 `43172`（替换 GG-052 `79354`），原 Worker `99942`、mock `68846` 保留，Web/Worker readiness 五项 ok；本地 ignored Web 入口使用实际 Windows 内存/盘使用观测，原 500 MiB/80% 保护阈值与生产探针不变。
- 正式入口仍为 `https://goodgood.o1key.com`；`staging-goodgood.o1key.com` 仅是历史名称，不是本次验收入口。生产 revision `65ceb168`、迁移 `0019` 不变，本次不推送、不合 main、不部署、不请求真实 provider。
- Next action: 用户在独立 `32141/admin/models` 检查新版布局并继续试价；原试价数据保留，不更改真实 32140 栈。
- Blockers: 无本地阻塞；真实人民币费率由用户在面板试定，生产转换和正式视频扣费需后续明确范围。

## Verification sequence

1. 定向 GG-052 模型/报价/权限/API 测试；隔离无 Worker PostgreSQL 写验证必须显式命名 disposable 数据库，不使用旧真实接口栈。
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
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-053` 与 GG-053 任务卡。GG-052 是已交付实现来源。
2. 当前定价验收页为 `http://127.0.0.1:32141/admin/models`，仅独立 mock 栈；旧 `32140` 是有真实 provider Worker 的栈，不运行 fixtures 或测试 outbox，不重置其数据。
3. 本地 ignored `.gg052-local.mjs` 分别启动 web/worker/mock-generation；只重启本任务 Web，保留用户试价数据。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
