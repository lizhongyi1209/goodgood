# GG-029 — 自建邮箱验证码登录方案与计划

- 状态：P0 服务、发信域、DNS 与发信地址已完成，等待受保护 SMTP 凭据；P1 本地候选完成、P2 界面/清理部分完成并验证；未部署
- 用户需求：采用 GoodGood 自建邮箱验证码登录，Google 暂不做；首版满足上线和基本日常使用，避免完整身份平台工程。
- 最后更新：2026-09-10
- 分支 / worktree：`feature/GG-029-email-otp-plan` / `F:/goodgood-worktrees/GG-029`
- 基线：远端 `main` 经 `git ls-remote` 核对为 `42fc8d81d7f50ea6139671a2c239a0ee2d4455ea`；线上版本另查 CURRENT_STATE。

## 范围与验收

- 要做：在既定方案上实现隔离本地 P1 闭环和首个 P2 浏览器恢复层；同步 schema、错误、测试和运维文档。
- 不做：在具体外部动作获得确认前，不开通真实邮件服务、不改 DNS/生产配置、不创建或读取生产秘密、不发送真实邮件、不删除生产测试数据、不部署；不恢复 Google、完整 C6、支付或复杂监控。
- 验收点：验证码不落明文、一次性/限流/浏览器绑定/原子建号和 Session 成立；SMTP 接受不写成已投递；手机视口可完成合成邮件登录；OIDC 回退仍可编译。
- 决策影响：[ADR 0045](../decisions/0045-goodgood-owned-email-otp.md) 取代 ADR 0007 的供应商/登录方式选择及 GG-028 的自定义域名方向；GoodGood 原账户/Session/审核边界保留。
- 授权边界：用户已要求当前窗口开始邮件计划，授权本地实现与验证；外部邮件资源、真实投递、生产数据迁移和部署仍需后续明确范围。旧 GG-028 配置授权不扩展为本次迁移上线授权。

## 实现与证据

- 主方案：[EMAIL_AUTH_PLAN.md](../EMAIL_AUTH_PLAN.md)，包含 P0–P4 和上线验收清单。
- 已实现：`email_otp` 配置、邮箱规范化、HMAC 验证码、数据库共享限流、浏览器绑定、SMTP adapter、原子建号/欢迎积分/Session、退出撤销与稳定错误。
- 已实现页面：同页邮箱/六位码/重发/改邮箱/挑战恢复、手机数字键盘提示、认证方式读取失败重试；OIDC 模式保留原托管入口用于回退。
- 已实现运维基础：发信/注册开关、默认 dry-run 的 24h/48h/30d 临时数据清理、固定 Mailpit 本地栈；没有常驻邮件 Worker。
- schema：暂定迁移 `0023_gg029_email_otp.sql`；并行 GG-027 预留 0020–0022，合入前必须按最终 main 复核编号。
- 默认迁移：为受审旧 owner 添加邮箱身份，保留业务数据和 Authing 映射；站长优先验证。GG-028 issuer 文本迁移工具不适用于本任务。
- GG-028 的历史证据及未发布源码保存在分支 `feature/GG-028-authing-custom-domain`，原实现提交 `81ed8ae`；本分支不引入其运行时代码。
- 外部资料：2026-09-10 核对阿里云 Direct Mail SMTP、地域、DNS、配额责任文档及 OWASP 指南，来源见主方案。
- P0 服务与域名：用户明确授权后，已开通阿里云 Direct Mail 按量服务，没有购买资源包。控制台显示账号正常、信誉等级 2、日额度 2,000、月额度 62,000、总免费额度剩余 2,000、当日免费额度剩余 200。
- P0 地域与发信域：已在新加坡 `ap-southeast-1` 创建 `mail.goodgood.o1key.com`；没有在默认华东地域创建域名。用户确认 2048 位 DKIM 切换警告后，阿里云最终状态为“验证通过”。匹配 SMTP 端点为 `smtpdm-ap-southeast-1.aliyuncs.com:465`。
- P0 DNS：已在 Cloudflare 为发信子域配置 2048 位 DKIM、`v=spf1 include:spfdm-ap-southeast-1.aliyun.com -all`、监测策略 DMARC，以及优先级 10、目标 `mxdm-ap-southeast-1.aliyun.com` 的 MX。Cloudflare 权威服务器查询可见四项记录，阿里云控制台复验通过；根域已有 Cloudflare Email Routing 的 MX/SPF/DKIM/DMARC 均保留未改。
- P0 发信地址：已创建触发邮件地址 `no-reply@mail.goodgood.o1key.com`，控制台状态为“正常”。回信地址非必填，当前留空；未虚构无人维护的 support 邮箱。
- 定向验证：邮箱/OIDC/UI 共 26 通过、隔离数据库测试默认 1 跳过；typecheck 与 runtime build 通过。一次显式回环数据库测试证明错误次数持久化、跨浏览器拒绝、并发单次成功及欢迎积分幂等。
- 容器/浏览器：隔离项目 `goodgood-gg029` 构建、迁移、健康检查通过；Mailpit 合成收信端到端返回 pending/100 积分；390×844 Chrome 视口从邮箱输入走到审核页，无真实外发或生图请求。
- 完整门禁：`npm run check:local` 通过，264 项中 257 通过、7 个显式外部/数据库测试跳过、0 失败；同时修正迁移版本断言、Windows CRLF 测试容差和一个既有 O1Key 失败轮询测试的并发超时容差。
- 历史收尾：GG-028 worktree 的任务/ADR/BACKLOG/检查点同步为已被取代，其文档测试也为 8/8；未改动其运行时代码。
- 发布：未发布；未读取/写入线上秘密或业务数据，未改变线上 Authing 登录。

## 恢复工作

- 尚未完成：P0 受保护 SMTP 凭据、香港主机 TLS 连通及真实收件；P2 告警/支持汇总和定向账号撤销验收；P3 受审绑定工具、模式化 production preflight/秘密挂载/CI；P4 上线与观察。
- 外部输入：站长可接收求助的真实支持邮箱、明确授权的测试收件箱，以及动作时确认创建受保护 SMTP 凭据。建议值不等于已经配置。
- 限流/预算为 alpha 初始建议；按真实共享出口和发送表现调整，不宣称抵抗全部自动化滥用。
- 回退限制：切换后新邮箱用户没有 Authing 身份；不能承诺只改回 Authing 就全员恢复。详细维护/回退路径见主方案第 7 节。
- 下一步：用户动作时确认后，为 `no-reply@mail.goodgood.o1key.com` 创建持久 SMTP 密码并按生产秘密处理，随后验证香港主机 TLS；真实投递仍需明确授权的测试收件箱，回复能力仍需站长提供真实支持邮箱。不要切生产、清理 Authing 或继续 GG-028 域名修复。
