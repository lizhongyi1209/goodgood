# GG-029 — 自建邮箱验证码登录方案与计划

- 状态：方案与计划已完成并通过文档验证；运行时代码未实施，未部署
- 用户需求：采用 GoodGood 自建邮箱验证码登录，Google 暂不做；首版满足上线和基本日常使用，避免完整身份平台工程。
- 最后更新：2026-09-10
- 分支 / worktree：`feature/GG-029-email-otp-plan` / `F:/goodgood-worktrees/GG-029`
- 基线：远端 `main` 经 `git ls-remote` 核对为 `42fc8d81d7f50ea6139671a2c239a0ee2d4455ea`；线上版本另查 CURRENT_STATE。

## 范围与验收

- 要做：基于现有实现给出可执行方案、最小上线范围、安全默认值、发信与域名建议、日常运营、身份迁移/回退、实施阶段与验收门禁。
- 不做：本轮不实现运行时代码、开通邮件服务、修改云配置、删除测试数据或部署；不恢复 Google、完整 C6、支付与复杂监控。
- 验收点：计划明确可复用/需改造边界，说明邮件投递和身份验证责任，不能把供应商接受请求当作邮件到达，不能把所有测试用户可删当作重置授权。
- 决策影响：[ADR 0045](../decisions/0045-goodgood-owned-email-otp.md) 取代 ADR 0007 的供应商/登录方式选择及 GG-028 的自定义域名方向；GoodGood 原账户/Session/审核边界保留。
- 授权边界：用户本轮明确要求方案与计划；后续实现、外部资源和生产发布以相应请求为准。旧 GG-028 配置授权不扩展为本次迁移上线授权。

## 实现与证据

- 主方案：[EMAIL_AUTH_PLAN.md](../EMAIL_AUTH_PLAN.md)，包含 P0–P4 和上线验收清单。
- 已检查：`server/auth` 的配置、API、operations、repository、request authenticator；前端登录/退出与账户状态；身份/Session schema；OIDC 测试及生产 preflight 的 Authing 限制。
- 可复用：内部 owner、账户审核/暂停、角色、欢迎积分、私有数据归属、随机/哈希/可撤销 Session。
- 具体缺口：配置目前只支持 local/oidc；退出只在 oidc 撤销服务端会话；生产 preflight 强制 oidc/authing.cn；旧 provisioning 拒绝按邮箱隐式关联，不能直接用于邮箱切换。
- 工程建议：一个 managed SMTP 供应商 + PostgreSQL 挑战/限流/审计 + 同源登录恢复层；不另设登录域名或常驻邮件 Worker。
- 默认迁移：为受审旧 owner 添加邮箱身份，保留业务数据和 Authing 映射；站长优先验证。GG-028 issuer 文本迁移工具不适用于本任务。
- GG-028 的历史证据及未发布源码保存在分支 `feature/GG-028-authing-custom-domain`，原实现提交 `81ed8ae`；本分支不引入其运行时代码。
- 外部资料：2026-09-10 核对阿里云 Direct Mail SMTP、地域、DNS、配额责任文档及 OWASP 指南，来源见主方案。
- 验证：2026-09-10 `node --test tests/documentation-continuity.test.mjs` 8/8 通过；`git diff --check` 通过；新增方案/ADR/任务及已改专题文档的 11 个相对链接均可解析。纯文档变更未运行完整构建或真实发信。
- 历史收尾：GG-028 worktree 的任务/ADR/BACKLOG/检查点同步为已被取代，其文档测试也为 8/8；未改动其运行时代码。
- 发布：未发布；未读取/写入线上秘密或业务数据，未改变线上 Authing 登录。

## 恢复工作

- 尚未完成：P0 邮件供应商账号/地域/额度确认、发信域名验证、真实收件；P1–P4 实现、测试、CI、上线与观察。
- 外部输入：站长可接收求助的真实支持邮箱；拟选 Direct Mail 账号可用地域/额度、发信地址与受保护 SMTP 凭据。建议值不等于已经配置。
- 限流/预算为 alpha 初始建议；按真实共享出口和发送表现调整，不宣称抵抗全部自动化滥用。
- 回退限制：切换后新邮箱用户没有 Authing 身份；不能承诺只改回 Authing 就全员恢复。详细维护/回退路径见主方案第 7 节。
- 下一步：站长提出开始实施后，在本任务范围先完成 P0 发信可用性核验，同时在隔离本地邮件接收器上完成 P1 的 schema 与验证码原子事务；不要继续 GG-028 的域名修复。
