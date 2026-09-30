# GG-168 — 电脑重启后恢复本地项目服务

- 状态：本地 32131 与 5173 已恢复；生产未变。
- 请求：电脑意外重启后恢复当前 GoodGood 项目。
- 决策：仅恢复 GG-167 已确认的本地运行组合，不改变产品行为或架构，无需 ADR。

## 恢复记录（2026-09-29）

- 原 PostgreSQL、Valkey、对象存储和 Mailpit 容器自动恢复且健康；Valkey 沿用 GG-164 的 56549 映射和原数据卷。32131、5173 在恢复前没有监听。
- 在 `F:/goodgood-worktrees/GG-167-runtime` 验证来源绑定的 `0b74b3e` 后端构建，使用该工作树忽略的 `dist/local-checkpoint-portfix.mjs` 恢复 32131。Web 进程 PID 30260。
- 在 `F:/goodgood-worktrees/GG-116` 使用忽略的 `dist/local-live-dev-portfix.mjs` 恢复 5173 热更新界面。启动器 PID 26500，Vite 监听 PID 25952。两个启动器只将本地 Redis 指向 56549；未改跟踪源码、密钥、数据库或容器数据。
- 32131 和经 5173 代理的 `/api/health/version` 均返回完整 revision `0b74b3ed8e7d8a43c00cf42177a123caf2d1ce63` 与 `build.verified=true`；`/canvas` 冷编译后 HTTP 200。首次请求曾等待超过一分钟，随后请求在约 11 秒返回 200。
- 32142 真实生成 Worker 未启动。未运行页面功能复测、自动测试、真实上传或生成。日志位于 `%TEMP%/goodgood-local-services/gg167-restart-*.log`。PID 仅为本次运行事实，下次须重新核验。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
