# GG-110 — 5173 创作参考图预览接入本地上传

- 状态：本地实现、门禁及 5173 运行接口边界已验证；真实文件上传待用户人工验收，未部署。
- 基线：GG-107 `4d5ad94`；分支 `fix/GG-110-functional-upload-preview`，工作树 `F:/goodgood-worktrees/GG-107`。
- 决策：不改变产品上传限制或素材归属。5173 原为无后端配置的 UI 预览，返回演示会话；参考图接口因此 503。本任务补充显式的可运行开发入口，无需 ADR。

## 范围与验收

1. `dev:workspace` 仅接受现有 loopback 数据库、Valkey、RustFS、Mailpit 和仓库外 O1Key 开发凭据；缺配置、缺验证过的 32131 Web 时停止。
2. 启动后 5173 使用真实邮箱会话。`/api/references` 未登录返回 401，而非 UI 预览的 503；邮箱登录 API 可用。
3. 参考图登记、直传和校验沿用本地私有素材库；RustFS CORS 同时允许 5173 与 32131。不给生成接口发自动请求。
4. 原 `dev:local` 保留纯 UI 预览；GG-105 的 200 MiB 上限和 GG-108 的上传反馈工作独立。

## 验证与下一步

- 临时 5175：`/create` 200；`/api/auth/method` 200 `email_code`；`/api/auth/email/challenge` 200；空邮箱请求 400 `EMAIL_ADDRESS_INVALID`，证明代理来源校验通过且未发送验证码；未登录的 `/api/auth/session`、`/api/references` 均 401。
- 核对原 5173 进程来自 GG-107 工作树后，将其替换为 `dev:workspace`。新进程仅监听 `127.0.0.1:5173`；`/create` 200、登录方式 200、未登录会话与参考图均 401。异源登录 POST 403，同源但空邮箱 400。没有真实登录、文件上传或付费生成。
- `npm run check:local`：581 项，555 通过、26 隔离跳过、0 失败；lint 16 条既有警告、0 错误。`git diff --check` 无错误。
- 下一步：用户刷新 5173，以现有本地账号上传普通 JPEG/PNG/WebP，记录 ready 或完整错误。真实文件端到端成功不得仅凭接口边界宣称。
