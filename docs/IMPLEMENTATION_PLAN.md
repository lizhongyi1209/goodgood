# Production implementation plan

- Last synchronized: 2026-09-10
- Current phase: 已开放 controlled alpha；累计候选已发布，Sharp 安全候选等待新发布授权。
- Current objective: GG-029 自建邮箱验证码登录本地候选；Google 暂缓，取代 GG-028 域名方向。
  P1 与首个 P2 已本地验证，生产仍为 Authing；源码/镜像/部署的历史身份以 CURRENT_STATE 为准。

## Current checkpoint

- 用户已选择邮箱验证码为唯一首版登录方法；[ADR 0045](decisions/0045-goodgood-owned-email-otp.md)
  和 [EMAIL_AUTH_PLAN](EMAIL_AUTH_PLAN.md) 明确最低上线控制、发信服务、P0–P4、迁移及回退限制。
- 新任务 [GG-029](tasks/GG-029-email-otp-plan.md) 在核验远端 main `42fc8d8` 的独立 worktree；
  GG-024—027 属于其他并行工作，GG-028 未发布源码保留但不继续自定义域名/Google 配置。
- 已实现 email_otp 配置、schema、共享限流、SMTP、原子身份/Session、页面、清理与独立 Mailpit 栈；
  暂定迁移 0023，合入前需在 GG-027 的 0020–0022 之后复核编号。
- 定向邮箱/OIDC/UI 测试、隔离 PostgreSQL 竞态、容器真实 SMTP 闭环与 390×844 浏览器流程已通过；
  未调用真实邮件/生图供应商，生产配置、数据与 Authing 未改变。
- 完整 `npm run check:local` 通过：264 项中 257 通过、7 个显式 opt-in 跳过、0 失败。
- P0 已获用户授权并开通 Direct Mail 按量服务，没有购买资源包；账号正常，日/月额度为
  2,000/62,000，免费额度剩余总计 2,000、当日 200。已在新加坡 `ap-southeast-1` 创建
  `mail.goodgood.o1key.com`。用户确认 2048 位 DKIM 后，Cloudflare 的 DKIM/SPF/DMARC/MX 已由
  权威服务器查询确认，阿里云域名状态为“验证通过”；根域 Email Routing 记录未改。随后已创建
  状态“正常”的触发邮件地址 `no-reply@mail.goodgood.o1key.com`，可选回信地址留空；生产 SMTP
  密码尚未保留或挂载。首封经明确授权的 QQ 验证码邮件已获 SMTP 接受，用户确认进入正常收件箱
  且端到端不到 1 分钟；完整地址、验证码、密码与消息 ID 均未写入项目。单个样本不能替代扩展验证。
- 香港生产主机到 `smtpdm-ap-southeast-1.aliyuncs.com:465` 的连接已成功协商 TLS 1.3，证书校验
  为 OK。用户在动作时确认后设置随机 20 位 SMTP 密码，`AUTH LOGIN` 成功后立即 `QUIT`；没有
  提交发件人、收件人或正文，也没有发送邮件。验证密码未落盘或输出，临时副本与桥接进程已清除；
  冒烟密码随后已由用户在阿里云控制台亲自轮换；新值未被代理读取、留存或挂载。P3 正式部署时
  只能由用户把当前值直接安装到受保护秘密挂载；若未安全留存则再次轮换。
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
- Next action: 取得明确授权的 QQ、163、Gmail、Outlook 测试收件箱后继续小规模跨邮箱/跨时段
  P0 验证，优先增加一个 Gmail 或 Outlook 样本。P3 再单独批准生产 SMTP 秘密挂载，回复能力仍需真实支持邮箱。
- Blockers: P1 本地实现无阻塞；P0 的 DNS、发信地址、TLS 与无邮件认证冒烟已闭环，当前尚缺支持
  邮箱和授权测试收件箱。这些外部输入缺失阻止真实投递和生产发布。GG-023 的新候选
  生产/计费冒烟授权仍独立，不能复用此前单次授权。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M2 | 已完成基线 | 产品/设计契约、前端与容器/CI 基础 |
| M3—M6 | 已完成核心链路 | 持久任务、身份边界、真实模型、积分、资产与项目 |
| M7 | 已完成 | 香港链路、备份/恢复及兼容切换验证 |
| M8 / controlled alpha | 已开放并完成本次累计发布 | 审核账户、核心生图、恢复与发布门禁 |
| GG-004—GG-022 | 已部署或完成 | 累计功能、可靠性、恢复工具和生产发布 |
| GG-023 | 实施中 | Sharp 0.35.4 安全修复与 main CI 恢复 |
| GG-029 | P1 + 首个 P2 本地候选已验证；首封 QQ 真信成功 | 自建邮箱 OTP；P0 扩展验证、P3/P4 与 P2 运维补齐仍待完成 |
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
