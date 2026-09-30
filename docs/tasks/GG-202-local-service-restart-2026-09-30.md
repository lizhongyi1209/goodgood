# GG-202 · 电脑重启后恢复本地项目服务

- 日期：2026-09-30。
- 工作区：`F:/goodgood-worktrees/GG-116`。
- 请求：电脑重启后恢复当前 GoodGood 项目。
- 决策：仅恢复既有本地开发组合，不改变产品、数据、接口或部署决策，无需 ADR。
- 状态：本地服务已恢复并完成健康核对；生产未变。

## 恢复结果

- Docker 自动恢复 `goodgood-gg052` PostgreSQL、Valkey、对象存储与 Mailpit，健康且沿用原数据卷；实际端口为 PostgreSQL `54449`、Valkey `56549`、对象存储 `58049/58050`。
- `F:/goodgood-worktrees/GG-189-runtime` 继续使用已验证 revision `94ec17f39383ae077fa05a5a0d0aeec399bfc470` 和忽略的 `dist/local-checkpoint-portfix.mjs`。Web 在 `32131`，PID `33820`；`/api/health/version` 返回 `build.verified=true`。
- 真实开发 Worker 在 `32142`，PID `28064`；runtime、database、objectStorage、provider、queue 五项 readiness 均为 `ok`。启动前确认数据库无 `queued/running/refining` 任务、Valkey 为空、冻结积分为 0，因此没有补跑旧请求。
- GG-116 热更新界面通过忽略的 `dist/local-live-dev-portfix.mjs` 恢复在 `5173`，启动器 PID `25656`、Vite 监听 PID `34440`；代理版本与 32131 一致，`/canvas` HTTP 200。
- 日志位于 `%TEMP%/goodgood-local-services/gg20260930-{web,vite,worker}.{out,err}.log`。PID 仅描述本次运行，下次重启必须重新核对。

## 边界

- 未执行迁移、构建、自动测试、浏览器功能复测、上传或生成。
- Worker 连接真实 O1Key 开发接口，只有用户明确点击生成才会产生真实请求和费用。
- 未修改生产服务、生产数据库或生产对象。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
