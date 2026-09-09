# Production implementation plan

- Last synchronized: 2026-09-10
- Current phase: 已开放 controlled alpha；累计候选已发布，Sharp 安全候选等待新发布授权。
- Current objective: GG-029 自建邮箱验证码登录方案与计划；Google 暂缓，取代 GG-028 域名方向。
  当前仅完成规划，生产仍为 Authing；源码/镜像/部署的历史身份以 CURRENT_STATE 为准。

## Current checkpoint

- 用户已选择邮箱验证码为唯一首版登录方法；[ADR 0045](decisions/0045-goodgood-owned-email-otp.md)
  和 [EMAIL_AUTH_PLAN](EMAIL_AUTH_PLAN.md) 明确最低上线控制、发信服务、P0–P4、迁移及回退限制。
- 新任务 [GG-029](tasks/GG-029-email-otp-plan.md) 在核验远端 main `42fc8d8` 的独立 worktree；
  GG-024—027 属于其他并行工作，GG-028 未发布源码保留但不继续自定义域名/Google 配置。
- 已核对复用边界与 Authing 专属 preflight；本轮纯文档，尚未实现邮箱模式、发信或修改生产。
- 文档连续性测试 8/8、diff 检查通过；任务卡区分规划、后续实现与实际生产切换。
- 下列生产健康/测试数是 2026-09-09 留存事实，本轮未再次检查生产，不作为实时状态声明。

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
- 支付、自动账户删除、举报、完整外部删除条款与完整 seed readiness 仍在 GG-900—GG-902
  搁置范围，本次发布没有恢复它们。
- Next action: 用户启动 GG-029 实施后先核验 P0 发信服务，再执行 P1
  验证码/限流/身份事务；可先在本地邮件接收器开发，不继续 GG-028 的 Authing 域名修复。
- Blockers: 方案无阻塞；实际发信仍需供应商账号/地域/额度、发信 DNS、SMTP 凭据及支持邮箱。
  本轮不含实施或上线。GG-023 的新候选生产/计费冒烟授权仍独立，不能复用此前单次授权。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M2 | 已完成基线 | 产品/设计契约、前端与容器/CI 基础 |
| M3—M6 | 已完成核心链路 | 持久任务、身份边界、真实模型、积分、资产与项目 |
| M7 | 已完成 | 香港链路、备份/恢复及兼容切换验证 |
| M8 / controlled alpha | 已开放并完成本次累计发布 | 审核账户、核心生图、恢复与发布门禁 |
| GG-004—GG-022 | 已部署或完成 | 累计功能、可靠性、恢复工具和生产发布 |
| GG-023 | 实施中 | Sharp 0.35.4 安全修复与 main CI 恢复 |
| GG-029 | 方案与文档验证完成 | 自建邮箱 OTP；P0–P4、最小上线控制、原账户迁移与有限回退 |
| 完整 C6 / full seed | 搁置 | 删除、举报、外部条款与进一步配套，见 GG-900/901 |
| M9 | 搁置 | 支付/支付宝，见 GG-902 |

## New-session recovery

1. 读根 AGENTS、[CURRENT_STATE](CURRENT_STATE.md)、[WORKFLOW](WORKFLOW.md)、本页和
   [BACKLOG](BACKLOG.md)，检查 Git 分支/worktree/未提交改动。
2. 不把最新 main 自动当作线上版本；以 CURRENT_STATE 的完整 revision、镜像摘要和迁移为准。
3. 本会话先恢复 GG-029；新需求从 GG-030 或后续未占用编号建卡，不恢复 GG-028 域名或旧 C6。
4. 本次 alpha 证据只绑定 `65ceb168`，后续候选必须重新生成新鲜证据并通过门禁。
5. 真实 provider 请求可能计费，必须与测试 fixture 隔离并取得对具体调用的明确授权。

## History and update policy

- [提炼后的历史经验](history/2026-09-07-development-lessons.md)。
- [完整原始开发日志](history/2026-09-07-implementation-log.md)仅供追溯。
- [本次发布记录](releases/2026-09-09-cumulative-alpha-release.md)。
- 本文只保留一个检查点和下一步；细节写任务卡，发布事实写 CURRENT_STATE。
