# GoodGood 当前状态

- 最后核对：2026-10-01（本地服务；生产身份沿用原发布证据）。
- 产品阶段：公开的 `controlled-alpha-v1`；已有真实用户，尚未达到完整 seed、自动支付或完整运营告警就绪。
- 正式入口：https://goodgood.o1key.com
- 当前本地代码检查点：[GG-244](tasks/GG-244-canvas-asset-hover.md) 已接入实际 5173 的资产 hover 小按钮、去除视频外置标签和节点式视频预览，完整代码门禁 674/22/0；保留 GG-243 首位新建卡片与 GG-242 图片/云配置，当前分支见 IMPLEMENTATION_PLAN。
- 当前本地运行：Vite `127.0.0.1:5173` 从 `F:/goodgood-worktrees/GG-116` 提供前端；API 代理到已验证 Web `127.0.0.1:32131`，唯一真实开发 Worker 为 `127.0.0.1:32142`。GG-242 已补回 Web 云素材配置，原本地数据卷和迁移保留，生产没有变化。

## 生产身份

生产事实以 [GG-098 发布记录](releases/2026-09-21-gg098-manual-grant-ceiling.md) 为准。GG-100 后续只把同一应用迁移为单槽 `goodgood-production` Compose 并清理旧 blue/green 残留，没有更换应用镜像。

| 项目 | 当前值 |
| --- | --- |
| 源码 revision | `7888554a4650b1b06dbce4293c52e8c018e5c71b` |
| 镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:7deeab8c0257e9127326eb2fc14b5beecf370f5a22408361f613465a0b432270` |
| 数据库迁移 | `0044_gg098_raise_manual_grant_ceiling.sql` |
| Compose | 唯一 `goodgood-production` 项目；Web/Worker `3100/3101` |
| 注册 | 邮箱注册开放；新账户 `active`，欢迎积分 200 |
| 备份 | PostgreSQL Restic timer `enabled`/`active`，每 30 分钟；2026-09-17 恢复演练通过 |

生产应用支持真实身份、积分、图片生成、私有素材、资产库、项目保存恢复、站长运营能力。视频仍是临时文生视频预览，正式视频任务、积分结算和资产入库未接通。Nano Banana Pro 只展示价格，生成路由关闭。支付仍由人工登记，不是自动支付。

生产已知缺口只有对外告警通道；站长已于 2026-09-15 明确接受该 controlled-alpha 缺口。不得把本地 GG-101—239 的累计代码描述为已部署。

## 本地检查点

GG-239 收口了 5173 中 GG-116—238 的累计实现，包括统一资产工作区、独立画布、持久画布项目与页面、真实画布生成、模型路由与计费、项目管理、资产面板、导航和近期视觉修复。详细范围与各自验证边界保留在 [BACKLOG](BACKLOG.md) 所列任务卡；当前入口文档不再复制历史逐项日志。

当前本地后端来自已验证 revision `70e10c6ae6bd83542ba870f54059b54b999e9fdf`，Web 的 `/api/health/version` 报告 `build.verified=true`。本地 PostgreSQL 使用 `54449/goodgood`，迁移到 `0056`；Valkey 为 `56549`，RustFS 为 `58049/58050`，Mailpit 为 `58045/58046`。这些均为 loopback 开发资源。

当前本地库包含云端 `local-dev/references/` 素材；Web/Worker 启动必须保留原仓库外云配置。GG-242 的 13 张既有图像只读抽查均预览 200、原图 Range 206；基础 readiness 不能证明云素材预览正常。

本地 Web/Worker 使用仓库外开发凭据调用真实 O1Key，请求可能计费。mock 只允许在显式隔离的 `mock-tests` 栈中运行；fixture 或合成任务不得进入真实 Worker 共用数据库或队列。生产数据库、R2、队列、密钥和真实用户数据不得复制到本地。

## 当前边界

- GG-239—244 是本地可恢复检查点，不是生产 release、CI 镜像或部署授权。
- 5173 是 Vite 热更新页面；提交后仍应以版本标签和 Git 状态判断源码，不能以端口或旧 PID 判断版本。
- GG-235 已恢复本地对象存储/Valkey 端口并验证只读媒体链路；GG-236 的默认项目外框已获用户确认。GG-237 四列项目布局和 GG-238 图片查看器仍待用户手验。
- C6 删除/内容安全分支继续停放，禁止自动恢复或批量合入。
- 任务编号与当前文档检查点以 IMPLEMENTATION_PLAN 为准；新任务创建隔离分支，只有并行写任务才按 WORKFLOW 创建并退役 worktree。
