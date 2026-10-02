# GG-274 — 电脑重启后恢复本地项目

- 状态：已完成（本地运行恢复，未部署）
- 用户需求：安排子 agent 重启电脑重启后停止的 GoodGood 项目。
- 最后更新：2026-10-02
- 分支 / worktree：`fix/GG-267-compact-lobby-wordmark` / `F:/goodgood-worktrees/GG-116`；纯运行恢复与文档记录，不切换活动目录分支。
- 基线：当前共同检查点 `80b8c0f`；最近源码和原 verified Web 为 GG-273 `b9ce4bf`，原唯一 Worker 为 GG-226 `70e10c6`。

## 范围与验收

- 恢复原本地依赖、32131 Web、32142 唯一 Worker 和 5173 页面，保留原数据卷及仓库外开发配置。
- 验收：5173 页面/API 代理、Web 构建来源与 readiness、Worker readiness 可用；启动 Worker 前只读核对活动任务、outbox、冻结积分和两队列。
- 决策影响：无，不需要 ADR。
- 授权边界：本地重启；未授权生产、数据重置、迁移、上传或真实生成。

## 实现与证据

- 已恢复上下文：根目录 `F:/goodgood` 为旧 GG-106 分支；当前运行目录由 IMPLEMENTATION_PLAN 和近期 Git 提交确认是 GG-116，不能启动旧版本取代当前页面。
- 初始状态：5173、32131、32142 无监听；Docker 原依赖已自动恢复，Valkey 的宿主 56549 发布需恢复。
- 必要构建：原 receipt `b9ce4bf` 与文档后继 HEAD `80b8c0f` 不同，严格检查停止后按当前 HEAD 执行 `npm run build:checkpoint` / `npm run verify:checkpoint`，均成功；未改变应用源码。
- 构建身份：revision `80b8c0f0b41aff4371e4673597bc4b483233e405`，sourceHash `21d8ee6f4f5b888d74720ec8f3f329545bc3037d63b084cae69e64f43ca7f057`，artifactHash `2e7818fd8a2689937443998d0f8ad99cb477639b5ef2bc3e5b8292cec7d23e39` / 283 文件，builtAt `2026-10-02T01:12:00.799Z`。
- 启动前只读核对：活动生成任务、待分发 outbox、冻结积分和 ready/processing 两队列均为 0。
- 根因及恢复：应用进程未随电脑重启恢复；Valkey 容器内 PING 正常，但宿主 56549 被 Windows 动态保留范围 `56487–56586` 覆盖，原容器 restart 未恢复映射。经工具授权和 Windows 管理员恢复，临时停止 WinNAT 后启动同一 Valkey 容器并恢复 WinNAT；现在 56549 发布正常、WinNAT Running，没有永久系统端口改动。
- 原 PostgreSQL 54449、Valkey 56549、RustFS 58049/58050、Mailpit 58045/58046 均 healthy；迁移记录仍 60 条（0060）。恢复后任务/outbox/冻结/两队列仍为 0，没有迁移、fixture 或 provider 请求。
- 运行进程：Web 4552、唯一 Worker 31280、Vite 启动器 18720 / 监听 27464。Worker 继续复用 GG-226 `70e10c6ae6bd83542ba870f54059b54b999e9fdf`；PID 仅为本次证据，之后须重新查验。
- HTTP 核验：子 agent 与根 agent 分别确认 `http://127.0.0.1:5173/`、`/canvas` 和 API 版本代理均 200，版本 `80b8c0f` / `build.verified=true`；Web 和 Worker readiness 的五项均 ok，未登录 session 401。
- 素材只读核验：Web/Worker 均加载 `referenceStorage=cloud-development`；现有云参考图和 RustFS 参考图各一例读取 200 且 Sharp 解码成功，只在内存读取，不创建会话、上传、写素材或生成。
- 日志：复用 `%TEMP%/goodgood-local-services/current-{web,worker,vite}.{out,err}.log`；Web/Worker err 为空，Vite 仅已有代理环境提示。
- 文档验证：2026-10-02，`node --test tests/documentation-continuity.test.mjs` 9/9 通过，`git diff --check` 通过；未执行完整门禁或浏览器产品验收。
- 发布：未发布。

## 并行与 worktree 收口

- 子 agent/worktree 清单：`/root/restart_local` 负责只读检查及启动本地服务，使用原 GG-116/GG-226 活动目录；不编辑跟踪文件。根 agent 只维护本任务卡和当前交接文档。退役条件：HTTP/角色健康及来源核对完成后结束子任务，保留所需活动服务。
- 依赖/构建缓存：复用现有活动目录；仅在检查点来源核验要求时执行必要构建，不新增子缓存副本。
- 创建数 0，退役数 0；保留 dirty 路径：根目录原有 `.agents/`、`.claude/`、`.codex/` 用户未跟踪内容，不更改。其他历史 worktree 不属于本次清理范围。
- 交付与集成：没有应用代码修改；子 agent 已结束，三角色继续后台运行。根 agent 汇总本卡并同步 BACKLOG、IMPLEMENTATION_PLAN、DEVELOPMENT_HANDOFF 和 CURRENT_STATE 的本地身份。

## 恢复工作

- 尚未完成：无本地启动阻塞；GG-273 等浏览器产品验收仍由用户完成，HTTP 健康不代替功能验收。
- 阻塞/风险：再次重启可能改变 Windows 保留端口范围；先检查端口/构建来源/任务和队列，按本卡恢复原角色，不重置数据库。文档后继提交不改变已运行 Web 构建身份，下次重启仍需严格来源核验。
- 下一步：用户打开 `http://127.0.0.1:5173/` 继续使用；下一任务从共同目录当前文档 HEAD 核对祖先。
