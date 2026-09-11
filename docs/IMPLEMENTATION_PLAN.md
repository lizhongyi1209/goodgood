# Production implementation plan

- Last synchronized: 2026-09-11
- Current phase: 已开放 controlled alpha；GG-031 正在隔离完成邮箱验证码与企业工作区的共同本地联调。
- Current objective: 在不触碰线上环境、真实邮件和真实 provider 的前提下，将 GG-029 与 GG-030
  合成一个可验证候选，统一邮箱邀请身份语义并通过完整本地门禁。

## Current checkpoint

- 生产入口 `https://goodgood.o1key.com` 当前部署源码
  `65ceb16823138dd220813fbc3ae5672234fd1f43`、不可变镜像
  `sha256:40ebfc40ced1963f02250bd8518823567e25692f82c31793817760cdb58db2cb`、迁移 0019；
  完整身份、能力边界与发布后证据见 [CURRENT_STATE.md](CURRENT_STATE.md)。
- `staging-goodgood.o1key.com` 仍只是历史名称，不是常驻测试入口；生产与本地数据继续隔离。
- main CI、artifact evidence、23 项生产 preflight、8 项精确候选 controlled-alpha 门禁均通过。
  维护解除后公网首页/readiness 为 200，登录跳转与未登录 401 边界正常。
- blue Web 与唯一 blue Worker 健康，队列、活动 job/attempt 和冻结积分均为 0；旧 green Web
  保留为应用层回退候选，旧 Worker 已停止。回退不包含 schema 降级。
- 授权的数据修复严格匹配 1 条历史孤立 attempt，只改为失败终态；授权的唯一真实 Nano
  Banana 2 请求成功生成 1 个 Asset，积分 115→105，冻结归零，没有重复 provider 提交。
- 最新备份、异机 restic 快照和隔离恢复演练均通过。恢复工具允许正常有效 session 存在，
  但继续要求受审维护标记、零活动 generation job、无网络、tmpfs 和逐表计数。
- GG-003 发布门禁和 GG-022 恢复修复已在这次真实发布中闭环；GG-011 是无需部署的流程契约。
- GG-004—GG-021 的功能已经部署。Nano Banana Pro 当前只上线每张 15 积分报价，provider
  路由仍关闭；GPT 透明输出的额外人工验收并未由本次 Nano 冒烟代替。
- 文档收尾 main run `34302821815` 的源码门禁通过，但 Trivy 在发布镜像中发现
  `sharp 0.35.0` 的 HIGH 漏洞并要求 0.35.4；这是 GG-023 的最小依赖修复，不改变产品行为。
- GG-023 已完成 Sharp 0.35.4 锁定和本地验证：定向 16/16、完整门禁 252 项（246 通过、
  6 个 opt-in 跳过、0 失败）；跨平台锁记录经 npm 11.8 修复。PR/main CI 均通过，安全镜像
  `sha256:b441e16685c77842e18cefcdbcae00c2e50d25350fe598ea2e462dd61758f152` 已发布但未部署。
- GG-031 已从远端 main `42fc8d81` 建立独立工作树。GG-029/GG-030 均保持原分支不变；合并预检确认
  迁移 `0023`—`0027` 可在一次性 PostgreSQL 中顺序执行并重放，同时识别出企业邀请与登录模块的
  IDN 邮箱规范化差异。详细范围与证据见[任务卡](tasks/GG-031-email-enterprise-integration.md)。
- 支付、自动账户删除、举报、完整外部删除条款与完整 seed readiness 仍在 GG-900—GG-902
  搁置范围，本次发布没有恢复它们。
- Next action: 在 GG-031 中依次合入 GG-029、GG-030，解决冲突后完成邮箱身份语义修复、隔离
  Compose/Mailpit 浏览器验收和一次完整 `npm run check:local`。
- Blockers: 当前无本地阻塞。线上环境测试、真实邮件、真实生成 provider、推送、合并和部署均不在
  本任务授权范围；共同本地测试通过后再由站长决定是否进入线上测试。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M2 | 已完成基线 | 产品/设计契约、前端与容器/CI 基础 |
| M3—M6 | 已完成核心链路 | 持久任务、身份边界、真实模型、积分、资产与项目 |
| M7 | 已完成 | 香港链路、备份/恢复及兼容切换验证 |
| M8 / controlled alpha | 已开放并完成本次累计发布 | 审核账户、核心生图、恢复与发布门禁 |
| GG-004—GG-022 | 已部署或完成 | 累计功能、可靠性、恢复工具和生产发布 |
| GG-023 | 实施中 | Sharp 0.35.4 安全修复与 main CI 恢复 |
| GG-031 | 阶段 0 | 合并 GG-029 邮箱验证码与 GG-030 企业工作区并完成共同本地验收 |
| 完整 C6 / full seed | 搁置 | 删除、举报、外部条款与进一步配套，见 GG-900/901 |
| M9 | 搁置 | 支付/支付宝，见 GG-902 |

## New-session recovery

1. 读根 AGENTS、[CURRENT_STATE](CURRENT_STATE.md)、[WORKFLOW](WORKFLOW.md)、本页和
   [BACKLOG](BACKLOG.md)，检查 Git 分支/worktree/未提交改动。
2. 不把最新 main 自动当作线上版本；以 CURRENT_STATE 的完整 revision、镜像摘要和迁移为准。
3. 当前产品工作先恢复 GG-031；GG-029/GG-030 是其只读输入候选。新的普通产品需求从 GG-032
   或后续未占用编号建卡，不要恢复旧 C6。
4. 本次 alpha 证据只绑定 `65ceb168`，后续候选必须重新生成新鲜证据并通过门禁。
5. 真实 provider 请求可能计费，必须与测试 fixture 隔离并取得对具体调用的明确授权。

## History and update policy

- [提炼后的历史经验](history/2026-09-07-development-lessons.md)。
- [完整原始开发日志](history/2026-09-07-implementation-log.md)仅供追溯。
- [本次发布记录](releases/2026-09-09-cumulative-alpha-release.md)。
- 本文只保留一个检查点和下一步；细节写任务卡，发布事实写 CURRENT_STATE。
