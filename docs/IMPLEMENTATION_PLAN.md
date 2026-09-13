# Production implementation plan

- Last synchronized: 2026-09-13
- Current phase: GG-055 官方成本调研与文档验证完成；GG-054 本地试价保持可用，Banana 2 两条映射待补齐。
- Current objective: 核对 Pro/Banana 2 官方输出与整单成本，给出人民币/积分按张基准，支持现有试价决策。

## Current checkpoint

- 当前任务 GG-055，`chore/GG-055-gemini-image-costs`、`F:/goodgood-worktrees/GG-055`，从 GG-054 `5cc0963` 隔离建立；main `bab17fd` 为已验证祖先。纯调研文档，延续 ADR 0063/0064，不修改代码/价格/余额，不新增 ADR。
- [研究记录](research/GG-055-gemini-image-costs.md) 已按当日 Google 官方 Developer API Standard 定价核对两个模型、六个规格图片 tokens/输出成本。按测算汇率 1 USD=7 CNY：Pro 1K/2K≈0.94 元、4K=1.68 元；Banana 2 1K≈0.47 元、2K≈0.71 元、4K≈1.06 元。仅图片输出，整单另计输入/文字思考/付费工具。未读取真实账单。
- 研究区分完整成本/售价和 Standard/异步 Batch。公式按计费分项乘费率，实际线路按供应商固定成本或真实折扣核算；高思考 hidden 显示不免计费。本次测算汇率、思考量和毛利算例都是假设，不是默认售价或实测。
- GG-054 本地实现来源保留在 `F:/goodgood-worktrees/GG-054`。Pro 三线路/独立定价已完整本地验证，原 32141 模型管理页可试价；Banana 2 两条 ID 仍待补齐。该任务的门禁/SQL/浏览器和运行记录见 [任务卡](tasks/GG-054-banana-lines.md)，本轮不重启或重新宣称验证其运行。
- 正式 `https://goodgood.o1key.com`、production revision `65ceb168`/迁移 0019 不变；`staging-goodgood.o1key.com` 仅历史名称。旧 32140 是真实 provider 栈，不能放 fixtures/outbox。本次无真实 API 生成、数据写入、推送/main 合并或发布。
- Verification: 文档连续性/发布边界测试 15/15 通过，0 跳过、0 失败；diff 检查通过。文档专用任务不安装依赖或执行代码完整门禁。
- Next action: 交付官方按张成本分析；依据 O1Key 固定价/各项折扣与 high 模式 usage 分项核算实际三线路完整成本，再试定积分售价。
- Blockers: 官方成本基准无阻塞；三线路实际成本仍需供应商账单/折扣与失败退款规则。GG-054 Banana 2 优质/专线请求 ID 缺口保留。

## Verification sequence

1. 核对官方源页面，按图片 tokens × 对应费率程序精算美元，再按明确测算汇率换算人民币/积分。
2. 纯文档执行连续性/发布边界定向测试与 diff 检查；不跑付费 API 或数据库/队列 fixtures。
3. 售价按真实完整成本与最低实际积分收入确定，沿用按张固定报价/受理价锁定；正式发布独立授权。

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
| GG-055 | 官方调研与文档验证完成 | 六规格图片输出成本、整单公式与人民币/积分测算；文档测试 15/15、diff 检查通过；未改价/发布 |
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 读根 AGENTS.md、docs/CURRENT_STATE.md、docs/WORKFLOW.md、本页和 docs/BACKLOG.md，检查 Git 分支/worktree/未提交改动；打开 `F:/goodgood-worktrees/GG-055` 与 GG-055 任务卡；代码/试价运行来源在 GG-054。
2. 当前定价验收页为 `http://127.0.0.1:32141/admin/models`，仅独立 mock 栈；旧 `32140` 是有真实 provider Worker 的栈，不运行 fixtures 或测试 outbox，不重置其数据。
3. 本地 ignored `.gg052-local.mjs` 分别启动 web/worker/mock-generation；按本任务已记录的运行状态恢复，保留用户试价数据。正式生产与真实请求不在本次授权范围。
4. 不恢复或 bulk merge 旧 C6；旧阶段具体验证见相应任务卡，GG-051 [研究记录](research/GG-051-credit-pricing-reassessment.md) 保留定价依据。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
