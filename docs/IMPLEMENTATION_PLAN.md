# Production implementation plan

- Last synchronized: 2026-09-12
- Current phase: GG-032 完整本地组合验收完成，待用户确认；尚未合入 main、未部署。
- Current objective: 以完整基础框架 `07e9ea5`（GG-024—GG-027 的账户、积分、业务身份、直属关系与划拨能力）为基线，叠加 GG-029 邮箱验证码、GG-030 企业工作区和 GG-031 集成，完成一次可重复的本地门禁与浏览器流程验收。

## Current checkpoint

- 当前工作树：`feature/GG-032-complete-base-email-enterprise`（`F:/goodgood-worktrees/GG-032`）。主工作区保持不变。
- 正式入口仍为 `https://goodgood.o1key.com`；`staging-goodgood.o1key.com` 只是历史名称，不是本任务的测试入口。
- 组合来源：完整基础框架 `07e9ea5`，再合入 GG-029、GG-030、GG-031；不使用旧页面另起测试版本，也不恢复旧 C6。
- 代码范围同时包含账户管理、积分记录/账本、企业/分销身份、直属上下级、充值来源积分划拨、邮箱 OTP、企业 Workspace、成员额度、消费记录、资产审阅和管理审计。
- 迁移顺序连续覆盖 `0020`—`0027`，当前发布元数据断言使用最终迁移 `0027_gg030_management_surface.sql`。
- 线上入口与生产数据保持原状（生产 revision `65ceb168`，迁移 `0019`）；本任务不连接生产、不发送真实邮件、不调用真实生图 provider，不推送或合入 main。
- 合并冲突已清理；`git diff --check` 与 `npm run check:local` 通过，完整门禁 327 项中 313 通过、14 个 opt-in 跳过、0 失败。独立 PostgreSQL 中 GG-027、GG-029—GG-031 共 29/29 通过。
- 隔离 Compose `goodgood-gg032` 已完成全栈验收：Web、Mailpit、PostgreSQL、Valkey、对象存储与 mock generation 全部只绑定 loopback，迁移执行到 `0027`；验收后容器和网络已删除，专用数据卷保留。
- Computer Use 失败根因是 CUA 子进程丢失 Windows 代理环境；本机 CUA 启动器注入 `NODE_USE_ENV_PROXY` 与 `127.0.0.1:10808` 后，新会话初始化成功。当前只可用 Chrome extension provider，因此按用户要求只控制一个专用测试标签；未使用 Playwright。
- 完整浏览器流程通过：老板 OTP/pending/欢迎积分、站长 bootstrap、建企业、`500` 测试积分、邀请员工、员工 OTP/pending、站长审核、接受邀请、分配 `200` 额度、一次 `10` 积分 mock 生成、消费与资产审阅、成员暂停/恢复均符合预期；`390×844` 窄屏检查无横向溢出。
- 结算后员工剩余额度 `190`、企业可用 `490`；数据库任务与尝试各 1 条且均为 `succeeded`，Valkey 活跃生成队列为 `0`。Web/Worker 均为 mock provider，没有真实邮件、真实 provider 或生产访问。
- Next action: 用户确认本地结果；若接受，再明确选择 main 合入/发布候选或另行授权线上测试。
- Blockers: 本地范围无阻塞；真实邮件、真实 provider、推送、main 合入和生产部署仍未授权，也不属于本轮验证范围。

## Verification sequence

1. 静态检查：确认无冲突标记、文档/迁移索引一致，运行 `git diff --check`。
2. 自动门禁：运行 `npm run check:local`；记录通过数、opt-in 跳过数和失败数。
3. 定向回归：
   `node --test tests/gg029-email-auth.test.mjs tests/gg029-email-auth-postgres.test.mjs tests/gg029-email-binding-maintenance.test.mjs`
   以及 `node --test tests/gg030-*.test.mjs tests/gg031-email-enterprise-integration.test.mjs`。
4. 浏览器流程：在隔离数据卷中按 [GG-031 任务卡](tasks/GG-031-email-enterprise-integration.md) 依次验收老板 OTP/pending、站长审核、建企业、邀请员工、员工 OTP/pending、接受邀请、额度显示、企业消费与资产审阅；员工邀请不绕过站长审核。
5. 验收结束删除隔离容器/网络，保留必要日志与结果；确认任务与生成队列为 0。用户确认本地完整流程无误后，另行讨论线上测试授权。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M2 | 已完成基线 | 产品、设计、前端与容器/CI 基础 |
| M3—M6 | 已完成核心链路 | 持久任务、身份、模型、积分、资产与项目 |
| M7—M8 | 已完成并已开放 controlled alpha | 香港链路、恢复与发布门禁 |
| GG-023 | 实施中 | Sharp 0.35.4 安全修复；未获新生产授权 |
| GG-024—GG-027 | 已合入本地完整基础框架 | 账户/积分/业务身份/直属关系/来源划拨，GG-032 组合验收通过 |
| GG-029 | 本地候选已验证 | 自建邮箱 OTP；生产外部证据与演练未完成 |
| GG-030 | 阶段 0—4 本地完成 | 企业成员、额度、创作归属、管理 API/页面 |
| GG-031 | 自动化完成 | 邮箱与企业集成已在 GG-032 完整基线上复验通过 |
| GG-032 | 待用户确认 | 完整基础 + OTP + 企业的本地组合验收完成 |
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 阅读根 `AGENTS.md`、[CURRENT_STATE](CURRENT_STATE.md)、[WORKFLOW](WORKFLOW.md)、本页和 [BACKLOG](BACKLOG.md)，检查分支/worktree/未提交改动。
2. 从 `feature/GG-032-complete-base-email-enterprise` 恢复；确认本地组合门禁与浏览器证据已经完成，不重复启动隔离栈或重跑真实外部路径。
3. 等待用户确认；线上测试、真实邮件、真实 provider、main 合入和生产部署都需要新的明确授权。

## History and update policy

- 完整历史日志仅供追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写入对应任务卡，发布事实写入 `docs/CURRENT_STATE.md`。
- 本页只维护一个当前检查点、验证顺序和下一步；不得把未执行的线上动作写成已完成。
