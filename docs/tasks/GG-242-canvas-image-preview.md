# GG-242 — 画布图片预览恢复

- 状态：待验收（开发与代码验证已完成，用户自行浏览器验收）
- 用户需求：交给子 agent 处理画布中大量图片无法预览的问题。
- 最后更新：2026-10-01
- 分支 / worktree：`fix/GG-242-canvas-image-preview` / `F:/goodgood-worktrees/GG-116`
- 基线：GG-241 `f1570de8f96690b72981ae974ed12fc941531429`

## 范围与验收

- 排查画布图片、资产面板和上传素材的预览链路；基于明确根因修复和验证，保留现有图片与项目数据。
- 决策影响：故障恢复，不改变产品决定；若排查发现必须改变确认行为，先补 ADR。
- 授权边界：本地代码、只读诊断和必要的本地服务恢复；不发布、不生成、不写测试素材到真实 Worker 栈。
- 验收：确认失败类型、恢复受影响图片预览、相关回归检查通过，子 worktree 交付后退役。
- 分工：按用户 2026-10-01 指示，agent 负责实现、代码层面验证与集成；浏览器交互与是否符合预期由用户验收，不作为开发交付阻塞。

## 实现与证据

- 初始检查：Docker 依赖和 Web/Worker 健康；Web 日志重复报告 `This reference needs the local cloud upload configuration.`，需要核对云上传素材的启动配置。
- 根因：GG-241 启动 Web 未传原有 `--cloud-env-file`，`.env.login-review` 也未包含云配置；23 条已就绪云参考图因此无法预览。Worker 的 `.env.local-review` 已含六项配置，banner 为 `cloud-development`，无需替换 Worker。
- 运行恢复：核对已有仓库外 `cloud-upload.env` 的六项白名单和外部密钥文件后，只替换已识别 Web；新 Web PID 20304 使用同一 verified `70e10c6`、`referenceStorage=cloud-development`。Worker 28124 和 Vite 31220 保留，未迁移、重传或删除素材。
- 独立代码缺陷：画布重开时 generated source 读取 15 分钟签名 URL，初次请求失败还会持久使用空 URL；“重试预览”重挂旧地址，无法重新签名。子 agent 将该恢复分支改为已有 `/api/assets/:id/content`，保留原 owner/workspace 校验及 `private,no-store`。
- 交付：子提交 `0909dd3b93f5ecbfcf53c719bfd4d451e32deac9`，根精确回放为 `c3700b7d206dee4dfc8163a7c50c48e002f94eb5`；只改 `features/canvas/canvas-page.tsx` 一行。
- 定向验证：23/23 通过（GG-111 云引用、GG-113 私有预览/受权入口、GG-173 项目、GG-218 多页面）；全部为隔离 mock/纯逻辑，不写真实数据库或队列。
- 只读资源验证：5 张云参考图、5 张 RustFS 参考图、3 张生成图片，13/13 预览 HTTP 200 且可解码，原图 Range GET 均 206。只在内存读取，不保留原图、签名地址、用户标识或提示词；这不代表已完成浏览器交互验收。
- 完整门禁：稳定后一次 `npm run check:local` 通过；lint 0 错误、129 条已有警告，类型检查与构建通过，683 项测试中 661 通过、22 隔离跳过、0 失败。没有执行浏览器验收。
- 文档收口：补充验收分工后，文档连续性测试 9/9 通过，`git diff --check` 通过；完整构建覆盖的单份忽略启动器已恢复并通过语法检查。
- 规范同步：AGENTS、WORKFLOW 和 TESTING 明确代码开发/验证与用户浏览器验收的职责分工。
- 发布：未发布。

## 并行与 worktree 收口

- 子 agent：`canvas_preview`，负责源码诊断和必要的最小修复；根 agent 负责活动服务、审查、集成及文档。
- 子分支 / 路径：`fix/GG-242-canvas-preview-agent` / `F:/goodgood-worktrees/GG-242-canvas-preview`，从 GG-241 基线创建。
- 文件边界：子 agent 可检查图片预览和本地启动相关源码；修改前报出精确文件范围，不修改入口/交接文档。根 agent 拥有任务卡、BACKLOG、IMPLEMENTATION_PLAN、CURRENT_STATE、DEVELOPMENT_HANDOFF 及活动配置。
- 依赖/构建缓存：子 worktree 不安装依赖、不构建、不启动服务；验证在现有集成目录完成。
- 退役条件：源码变更或诊断结论已审查集成，确认干净后用 `git worktree remove` 退役，再 prune。
- 收口：本任务创建数 1，退役数 1；子 worktree 干净、无依赖/构建缓存，已用 `git worktree remove` 退役并 prune。其他窗口 GG-243 worktree 属于其并行任务，不在本次清理范围。

## 恢复工作

- 尚未完成：用户浏览器验收；代码开发、验证、集成和子 worktree 退役均完成。
- 阻塞/风险：无。
- 下一步：用户刷新当前画布检查之前失败的图片与预览重试；新开发从当前检查点分支开始。
