# GG-095 — 主端口邮箱登录测试流程

- 状态：本地实现、自动验证、checkpoint构建与服务切换完成；待用户在32131继续手动测试
- 用户需求：将已验收登录功能合并到32131正常测试入口，不预设账户登录状态。
- 最后更新：2026-09-15
- 分支 / worktree：chore/GG-095-primary-email-auth-test-flow / F:/goodgood
- 基线：GG094提交65dcee5；生产版本仍查CURRENT_STATE

## 范围与验收

- 要做：`start workspace`使用email_otp与Mailpit；32131使用新的邮箱会话Cookie，显式清空local auth token/default token；停止独立32191进程。
- 不做：不重置数据库、不创建或自动登录账户、不发送真实邮件、不改生产认证或部署。
- 验收点：32131构建来源绑定当前提交；未登录session为401且页面进入邮箱登录；32191无监听；Worker/provider与原数据保持。
- 决策影响：只改变本地测试运行配置，不改变ADR0087或生产认证；无需新ADR。
- 授权边界：本地实现、验证、构建和服务切换。

## 实现与证据

- 相关文件：`scripts/local-checkpoint.mjs`、`tests/gg095-primary-email-auth-preview.test.mjs`、`docs/DEVELOPMENT_HANDOFF.md`。
- 已完成：`start workspace`改用email_otp环境并覆盖32131公开源；工作区使用全新Cookie名并显式清空local token/default token；保留32191诊断命令但不作为正常流程。
- 验证：GG095及认证/构建/文档定向47/47；完整`npm run check:local`为556项（530通过/26跳过/0失败）；`git diff --check`通过。提交18c338f的checkpoint构建/验证通过；32131为email_code、无Cookie session 401、`build.verified=true`，32191无监听，Worker/provider/Mailpit ready。未发送验证码、注册用户或调用真实provider。
- 发布：未发布。

## 恢复工作

- 尚未完成：用户手动登录/注册流程测试。
- 阻塞/风险：无；Mailpit和原本地数据库必须保持，不自动生成账户。
- 下一步：用户访问 `http://127.0.0.1:32131/create` 继续测试。
