# GG-110 — 5173 创作参考图预览接入本地上传

- 状态：本地实现、门禁、检查点运行及真实 JPEG 上传已验证；未部署。
- 基线：GG-107 `4d5ad94`；分支 `fix/GG-110-functional-upload-preview`，工作树 `F:/goodgood-worktrees/GG-107`。
- 决策：不改变产品上传限制或素材归属。5173 原为无后端配置的 UI 预览，返回演示会话；参考图接口因此 503。本任务补充显式的可运行开发入口，无需 ADR。

## 范围与验收

1. `dev:workspace` 仅接受现有 loopback 数据库、Valkey、RustFS、Mailpit 和仓库外 O1Key 开发凭据；缺配置、缺验证过的 32131 Web 时停止。
2. 启动后 5173 使用真实邮箱会话。`/api/references` 未登录返回 401，而非 UI 预览的 503；邮箱登录 API 可用。
3. 参考图登记、直传和校验沿用本地私有素材库；RustFS CORS 同时允许 5173 与 32131。不给生成接口发自动请求。
4. 原 `dev:local` 保留纯 UI 预览；GG-105 的 200 MiB 上限和 GG-108 的上传反馈工作独立。
5. 持久化 API 由同一本地数据库的已验证 Node Web 检查点承载；Vite 只提供热更新页面。已打开的页面引用旧 Vite 依赖路径时，兼容到隔离缓存。模型 SVG 用稳定的公共路径，服务端和浏览器渲染一致。

## 验证与下一步

- 临时 5175：`/create` 200；`/api/auth/method` 200 `email_code`；`/api/auth/email/challenge` 200；空邮箱请求 400 `EMAIL_ADDRESS_INVALID`，证明代理来源校验通过且未发送验证码；未登录的 `/api/auth/session`、`/api/references` 均 401。
- 核对原 5173 进程来自 GG-107 工作树后，将其替换为 `dev:workspace`。新进程仅监听 `127.0.0.1:5173`；`/create` 200、登录方式 200、未登录会话与参考图均 401。异源登录 POST 403，同源但空邮箱 400。没有真实登录、文件上传或付费生成。
- `npm run check:local`：581 项，555 通过、26 隔离跳过、0 失败；lint 16 条既有警告、0 错误。`git diff --check` 无错误。
- 用户刷新时遇到 Vite `504 (Outdated Optimize Dep)`。将运行中的 `dev:workspace` 依赖缓存移到 `node_modules/.vite-workspace`，避免 `check:local` 构建重新优化默认缓存后使浏览器请求的 URL 过期。修复后在门禁前后核对 `/create` 与新 `react-dom.js` 均返回 200；复跑 `check:local` 仍为 555 通过、26 隔离跳过、0 失败。
- 浏览器自动验收暂被 Codex 本机浏览器控制连接阻断：5173 和 10808 可达，Chrome 扩展已安装在当前 Profile 1，但控制工具返回 `nodeRepl.fetch request failed`，原生桌面控制管道也不可用。已按官方步骤请用户在桌面端核对“计算机使用”并重新打开扩展侧栏；收到重连反馈后继续真实上传验收。
- 用户截图证实刷新后仍有旧 `.vite/deps/` 请求；本地 Vite 兼容旧路径并移除已过期的优化版本参数，截图中的四个旧 React 依赖请求均返回 200。随后创作页已加载，但登录后的 profile/references/draft/assets 等路由在 Vite Worker 中返回 500，日志出现 PostgreSQL 跨请求上下文连接警告；页面还显示模型图标 SVG hydration 属性差异。持久化 API 改由本地 Node Web 处理，图标改为公共静态路径。重启 Codex 后原 32131 Web 和 32142 Worker 均已停止；仅需恢复 Web 后继续上传验收，不能以未运行的代理 502 作为应用结果。
- 最新 `npm run check:local`：581 项，555 通过、26 隔离跳过、0 失败；lint 16 条既有警告、0 错误。三个公共模型 SVG 在 5173 均为 200；旧依赖路径在门禁后仍为 200。
- 提交 `35b1f12` 的检查点构建通过；32131 `/api/health/version` 报告同一 revision 和 `build.verified=true`。5173 `/api/auth/method` 200，未登录参考图 401，异源登录 POST 403，同源空登录请求 400。RustFS 对来自 5173 的 PUT 预检返回 `access-control-allow-origin: http://127.0.0.1:5173`。
- 用户在 5173 上传真实 JPEG 后，32131 日志记录参考图登记 POST 201、上传完成校验 POST 200、列表 GET 200；本地数据库只读核对最新记录 `ready / accepted`、`image/jpeg`、4,837,885 字节、2250×4001 像素。截图显示已附加参考图。缩略图的 `blob:` 是浏览器本地预览 URL，不代表文件只停留在浏览器。未发起 O1Key 生成请求，未部署生产。
- 下一步：按需求开展后续功能开发；若需要验证刷新后的参考图恢复，由用户在 5173 刷新确认。浏览器自动控制连接问题单独处理。
