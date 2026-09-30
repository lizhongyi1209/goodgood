# GG-164 — 重启后恢复本地项目服务

- 状态：本地服务已恢复；`/canvas` 与前端 API 代理可响应，未部署生产。
- 请求：电脑重启后恢复原 5173 画布预览及其 32131 后端。
- 决策：本机临时端口冲突的运行恢复，不改变产品或架构决策，无需 ADR。

## 恢复记录（2026-09-28）

- Docker 中原 PostgreSQL、RustFS、Mailpit 均已自动恢复；32131 和 5173 未监听。Valkey 容器显示运行，但 56449 没有主机映射。Windows 重启后把 56399–56498 划为动态 TCP 保留区，导致按原配置重建 Valkey 时绑定 56449 失败。
- 普通权限无法删除该保留区，系统管理员授权未完成；不再重试权限操作。保留原 `goodgood-gg052_valkey-data` 卷，将同一 Valkey 服务通过 Compose 映射到未保留的 `127.0.0.1:56549` 并确认健康。
- 在各自工作树被忽略的 `dist/` 中放置本机启动器副本，只把运行时 Redis URL 指向 56549，不修改被跟踪的源代码、`.env`、数据库或构建产物。32131 仍从 `F:/goodgood-worktrees/GG-154-runtime` 的已验证 `b12f699` 检查点运行；5173 从 `F:/goodgood-worktrees/GG-116` 热更新源运行并代理 32131。未启动会调用真实 O1Key 的 32142 Worker。
- 当前运行进程启动器 PID：32131 为 29944；5173 启动器为 4376，Vite 子进程监听 PID 25252。端口映射和 PID 只是本次运行事实，下次先重新核验。

## 核验与下次恢复

- `node scripts/local-checkpoint.mjs verify` 验证原后端产物为 `b12f699`；32131 `/api/health/version` 返回 200、`build.verified=true`；5173 `/api/health/version` 代理返回同一版本，`/canvas` HTTP 200。首次冷编译曾超过 40 秒，之后请求约 1 秒。未运行功能测试、真实上传、生成或浏览器验收，按站长要求由其手验。
- 运行日志在 `%TEMP%/goodgood-local-services/gg164-web.*.log` 与 `gg164-vite.*.log`。若 Windows 保留区消失，可把 Valkey 原映射 56449 恢复后使用标准启动器；在当前保留区仍存在时，使用 `GG-154-runtime/dist/local-checkpoint-portfix.mjs` 和 `GG-116/dist/local-live-dev-portfix.mjs`，并先确认它们仍在。清理 `dist/` 会删除这两个本机副本，须重新建立，不能直接使用指向 56449 的标准启动器。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
