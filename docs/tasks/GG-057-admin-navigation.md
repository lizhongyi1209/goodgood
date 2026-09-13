# GG-057 — 站长管理导航与本地登录恢复

## 状态与基线

2026-09-13：本地实现、完整门禁、运行同步与浏览器验收完成，未发布。分支 `fix/GG-057-admin-navigation`，worktree `F:/goodgood-worktrees/GG-057`，接续用户正在验收的 GG-056 `3509e6e`；main `bab17fd` 已核对为祖先。原候选与无关 worktree 保留。

## 范围与验收

- 用户要求用站长身份检查账户/模型两页，统一为站长管理并方便点击切换，修复返回后“登录请求无效”。
- 两页复用站长页头，账户管理/模型管理显示当前项，返回创作直接到 `/create`；保持 `/admin/users` 和 `/admin/models` 地址。
- 已复现原 Chrome 32141 标签位于 `/api/auth/login?returnTo=%2Fadmin%2Fusers`，返回 `AUTH_NOT_CONFIGURED`。现有 `beginLogin` 仅支持 email_otp/OIDC，漏处理显式 local 登录。
- 修复仅使用已配置的本地身份；已有有效本地身份必须保留。生产 OIDC/OTP、站长角色检查、pending/suspended 与 API 授权继续生效。
- 变更 ADR 0061 中账户管理独立页头的决定，先记录 ADR 0066。没有数据迁移，不改变用户 Banana 价格、启禁、版本、积分及历史数据。
- 32141 是现有 `goodgood-gg052` 独立 mock 栈；不写测试 fixtures、不发真实 provider 请求。32140 和生产不动，不推送/合 main/部署。

## 验证

- 定向登录/导航/OIDC/邮箱 OTP 回归 34/34 通过。覆盖新登录重定向、现有身份保留、未配置默认身份失败关闭、非法返回地址/会话读取失败不发 cookie，以及两页当前导航与直接创作地址。
- 旧导航测试已按 ADR 0066 缩为四类原工作区页面，保留其不新增返回入口的契约；共享站长页头使用生产 Vinext Image shim 做 SSR 检查。第一次新 SSR 测试因裸 Vite 未使用 Vinext shim 失败，对齐实际构建别名后通过。
- 一次 `npm run check:local` 通过：lint、完整 TypeScript 与生产构建通过，448 项中 432 通过、16 opt-in 集成跳过、0 失败。日志为 ignored `.gg052-gg057-check.log`；本任务没有 SQL fixture 写入，不借用前一任务结果。
- 只重启原 GG-056 Web/Worker/mock 三角色，确认 32141/32142/32143 无监听后从 GG-057 启动。当前 Web 会话 12422、mock Worker 36299、mock provider 62817，三个 readiness 全部通过。继续复用 `goodgood-gg052` 数据/队列/对象存储与显式 local/mock 配置，没有迁移或重置。
- Chrome 原标签 1648144149：重新载入原报错登录 URL 后直接进入 `/admin/users`；当前身份为本地既有站长 `m3-local@goodgood.invalid`，可用 179/冻结 0。点击到模型、浏览器 Back 到账户、Forward 到模型正常；点击返回创作保留站长入口，再从创作进入账户正常。Back 首次工具默认 30 秒观察超时，恢复标签后已看到正确账户页；单独 Forward 的新鲜观察确认正确模型页，没有应用登录错误。
- 390×844 下检查账户/模型两页截图并点击切换：品牌/返回/退出和两个标签没有遮挡或溢出，账户卡与模型规格价保留；之后已恢复正常窗口，模型管理页标记保留。
- 更新前后 ignored `.gg052-gg057-before.json` / `after.json` 全部目录记录精确一致；九类历史 count/hash 一致：管理事件 12、价格版本 120、积分流水 4、积分账户 2，批次/任务/尝试/资产/项目各 1。当前用户已将 Pro 总开关与 Banana 2 优质/专线启用，两组价格不变；三个 GPT 模型禁用也原样保留。实际状态优先于 GG-056 旧交接中的启禁描述。
- 最终文档连续性/发布边界 15/15 与 diff 检查通过；随后只补充这条验证收据和修正简体字，再定向复验。代码门禁后没有修改运行代码。

## 下一步

用户在 `http://127.0.0.1:32141/admin/models` 继续本地定价测试，可用页头切换账户/模型。当前代码与数据核对完成，本地任务无阻塞。真实 provider、视频正式结算、生产单位迁移/费率激活与发布仍是独立后续范围；正式 revision `65ceb168`/迁移 0019 与原 32140 不变。本轮不推送/合 main/部署。
