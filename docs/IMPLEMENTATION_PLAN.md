# Production implementation plan

- Last synchronized: 2026-09-11
- Current phase: 已开放 controlled alpha；GG-031 已完成邮箱验证码与企业工作区的共同本地联调，线上测试未开始。
- Current objective: 保持 GG-031 本地候选及证据可恢复，等待站长决定是否另行批准线上环境测试。

## Current checkpoint

- 生产入口 `https://goodgood.o1key.com` 仍部署源码
  `65ceb16823138dd220813fbc3ae5672234fd1f43`、不可变镜像
  `sha256:40ebfc40ced1963f02250bd8518823567e25692f82c31793817760cdb58db2cb`、迁移 0019；
  完整身份、能力边界与发布后证据见 [CURRENT_STATE.md](CURRENT_STATE.md)。最新 main 或本地分支均不自动代表线上。
- `staging-goodgood.o1key.com` 仍只是历史名称，不是常驻测试入口；生产与本地数据继续隔离。
- GG-023 的 Sharp 0.35.4 源码、CI 和安全镜像已准备，但没有取得新生产/计费冒烟及部署授权；
  当前生产镜像不变。
- GG-029 已完成自建邮箱 OTP 的 P0 真信/真实应用登录闭环及 P1/P2/P3 本地代码，包含配置、迁移
  `0023`、共享限流、SMTP、原子身份/Session、单页登录、清理、运维状态、旧 owner 绑定工具和
  email/OIDC 回退。完整本地门禁 280 项：273 通过、7 项 opt-in 跳过、0 失败；生产仍为 Authing。
  发布前外部投递证据、生产秘密安装/演练及 P4 均未完成，也不属于 GG-031 授权。
- GG-030 已完成企业工作区、成员邀请、企业积分池与成员额度、创作归属、用量/资产审阅、管理 API
  和响应式页面。完整本地门禁 266 项：257 通过、9 项 opt-in 跳过、0 失败；只用隔离数据库、
  模拟 provider 与本地浏览器验证，未发送真实邮件、未调用真实 provider、未部署。
- GG-031 从 `origin/main@42fc8d81` 建立独立工作树并分别合入 GG-029、GG-030；两个来源工作树和
  分支保持不变。合并冲突只涉及入口 import、文档索引和测试期望，均按组合语义解决；ESLint、
  TypeScript、`build:local` 与冲突相关定向测试 39/39 通过。
- 合并前已在一次性 PostgreSQL 中顺序执行并重放迁移 `0023`—`0027`；核心邮箱和企业表均存在，
  容器已删除。企业邀请现复用登录邮箱规范化并优先使用已验证绑定，非邮箱旧身份仅在没有绑定时兼容；
  企业页和站长页也直接复用邮箱验证码面板并保存当前目标 URL。
- 全新 GG-031 PostgreSQL 链路 1/1、GG-029 原生回归 1/1、GG-030 阶段 1—4 联合回归 14/14
  通过；覆盖待审核/停用/无验证身份拒绝、审核恢复后接受、IDN、绑定权威、可变展示邮箱不可冒充，
  以及重复登录不重复个人工作区/欢迎积分。一次性容器和三个测试库均已删除。
- 隔离 Compose + Mailpit 浏览器联合验收 1/1 通过：桌面老板完成审核、建企业、邀请、额度和审阅流程，
  移动员工完成 OTP、审核等待、邀请接受和企业额度显示；同时修复了移动邀请入口隐藏/遮挡问题。
- Web/Worker 均锁定 mock provider，验收后生成任务与尝试为 0；专用容器、网络和数据卷已删除。
  完整 `npm run check:local` 通过：295 项中 284 通过、11 项 opt-in 跳过、0 失败。
- 员工由老板邀请后，通过邮箱 OTP 首次注册仍为 `pending`；必须经站长审核变为 `active` 才能
  查看和接受企业邀请。老板邀请不绕过 controlled-alpha 平台审核。
- 支付、自动账户删除、举报、完整外部删除条款与 full-seed readiness 仍在 GG-900—GG-902
  搁置范围，本任务不恢复它们。
- Next action: 等待站长决定是否另建并授权线上环境测试；若批准，先确认候选、外部邮件、数据边界、
  provider 范围和回退方案。
- Blockers: 当前无本地阻塞。线上测试、真实邮件、真实生成 provider、生产数据/密钥、推送、合并
  和部署均未获本任务授权，不自动开始。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M2 | 已完成基线 | 产品/设计契约、前端与容器/CI 基础 |
| M3—M6 | 已完成核心链路 | 持久任务、身份边界、真实模型、积分、资产与项目 |
| M7 | 已完成 | 香港链路、备份/恢复及兼容切换验证 |
| M8 / controlled alpha | 已开放并完成本次累计发布 | 审核账户、核心生图、恢复与发布门禁 |
| GG-004—GG-022 | 已部署或完成 | 累计功能、可靠性、恢复工具和生产发布 |
| GG-023 | 实施中 | Sharp 0.35.4 安全修复与 main CI 恢复；未获新生产授权 |
| GG-029 | 本地候选已验证 | 自建邮箱 OTP；生产外部证据、演练与 P4 未授权 |
| GG-030 | 阶段 0—4 本地完成 | 企业成员、额度、创作归属、管理 API/页面与本地闭环；未部署 |
| GG-031 | 阶段 0—3 本地完成 | 身份、PostgreSQL、Compose/Mailpit、桌面/移动浏览器与完整门禁均通过；线上未开始 |
| 完整 C6 / full seed | 搁置 | 删除、举报、外部条款与进一步配套，见 GG-900/901 |
| M9 | 搁置 | 支付/支付宝，见 GG-902 |

## New-session recovery

1. 读根 AGENTS、[CURRENT_STATE](CURRENT_STATE.md)、[WORKFLOW](WORKFLOW.md)、本页和
   [BACKLOG](BACKLOG.md)，检查 Git 分支/worktree/未提交改动。
2. 当前产品工作恢复 [GG-031](tasks/GG-031-email-enterprise-integration.md)；GG-029/GG-030 是已合入
   的来源候选，继续保持其原工作树不变。新普通需求从 GG-032 或后续未占用编号建卡，不恢复旧 C6。
3. 不把最新 main 自动当作线上版本；以 CURRENT_STATE 的完整 revision、镜像摘要和迁移为准。
4. 本次 alpha 证据只绑定 `65ceb168`，后续候选必须重新生成新鲜证据并通过门禁。
5. 真实 provider 请求可能计费，必须与测试 fixture 隔离并取得对具体调用的明确授权。

## History and update policy

- [提炼后的历史经验](history/2026-09-07-development-lessons.md)。
- [完整原始开发日志](history/2026-09-07-implementation-log.md)仅供追溯。
- [本次发布记录](releases/2026-09-09-cumulative-alpha-release.md)。
- 本文只保留一个检查点和下一步；细节写任务卡，发布事实写 CURRENT_STATE。
