# GG-193 — 画布项目保存提示内容无效

- 日期：2026-09-29
- 状态：本地 Web 已恢复兼容并观察到原页面自动保存成功；站长仍需在画布确认提示消失及内容，生产未变。
- 工作区：`F:/goodgood-worktrees/GG-116` 前端热更新；32131 从独立 `GG-189-runtime` 的 GG-193 检查点运行，32142 Worker 保留先前 GG-189 检查点。
- 决策：沿用 ADR 0114 的本机先存、远端版本同步，以及 GG-182 的生成器任务 ID/序号持久化。此次为运行检查点回归修复，不改变产品决定。

## 现象与证据

- 页面显示「画布项目内容无效，请刷新后重试。」来自 `server/canvas-projects/validation.mjs` 的 `INVALID_CANVAS_PROJECT`/HTTP 400；`CanvasProjectSync` 将非重试性的 400 停止自动重试，仍以「未同步」显示，用户可显式重试。
- `%TEMP%/goodgood-local-services/gg189-web-portfix.out.log` 记录同一画布项目的 GET 200，随后从 2026-09-29 12:51:55 UTC 起多次 PUT 400。受控查询本地隔离数据库，仅检查元数据：项目仍有 1 条，当前版本 76、4 个节点，生成器 1 个，既有生成器节点同时包含 `sequence` 和 `jobId`；最后远端更新时间 10:22:27 UTC。
- 当前 GG-116 `snapshotCanvasProject` 始终为生成器序列化 `sequence`，有确认任务时序列化 `jobId`。GG-116 服务端校验已允许这两个字段；但运行在 32131 的 `GG-189-runtime/server/canvas-projects/validation.mjs` 既未允许 `sequence` 键，也仅允许 `imageResult.jobId`。两者的源码差异明确，拒绝发生在写库前。
- GG-182 曾将 `/api/canvas-projects` 独立代理到兼容新版字段的 32132 sidecar。GG-189 停止 sidecar 并让 5173 全部 `/api` 指向 32131 时，运行检查点遗漏了 GG-182 的校验扩展。GG-191 的「自适应 · 2K」与 GG-192 按钮圆角不涉及此失败。

## 修复、验证与恢复边界

- 在干净的 `GG-189-runtime` 从已验证 `76bfc50` 建 `fix/GG-193-canvas-project-runtime-validation`，只摘取 GG-116 的生成器 `sequence`/`jobId` 校验，保留旧 FPS 兼容处理；提交 `94ec17f39383ae077fa05a5a0d0aeec399bfc470`。`npm run build:checkpoint` 和 `npm run verify:checkpoint` 成功，来源与产物指纹绑定。没有新迁移、前端变更或生成任务提交。
- 核对 32131 旧 Web PID 16732 后只停止该进程；新 Web PID 10780 使用原有仓库外云上传/SMTP 配置及 ignored `dist/local-checkpoint-portfix.mjs` 的 Valkey 56549 修正。构建曾清理这个忽略启动器，首次按旧路径复制导致两次启动失败；按既有 GG-173 修正规则恢复后，32131 和 5173 的 `/api/health/version` 均指向 `94ec17f` 且 `build.verified=true`，Web readiness 五项 `ok`，未登录项目列表返回 401。5173 PID 25952、真实付费 Worker 32142 PID 1516 没有切换，Worker readiness 五项 `ok`。
- 新 Web 启动后，已打开的站长页面自行发出同一画布项目 PUT，`2026-09-29 13:26:47 UTC` 返回 200；隔离库版本 76→77，项目仍为 1 条。没有代站长携 Cookie 写项目，也没有浏览器复测。此证据证明至少该次待写快照到达服务端；最终画布内容和提示状态仍由站长手验。如果当前页面仍显示「未同步」，点击「未同步 · 重试」；刷新也会从 IndexedDB 读取 dirty 草稿并尝试同步。此前远端旧项目始终可读，不要清除浏览器数据。
- 按站长持续要求未运行自动功能测试、浏览器复测或付费生成；受控检查点构建/来源校验属于恢复运行服务必需步骤，另只做静态差异与只读健康/版本/日志/DB 元数据核对。生产未部署。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
