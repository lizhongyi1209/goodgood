# GG-241 — 恢复当前本地项目

- 状态：已完成（不需上线）
- 用户需求：启动当前 GoodGood 项目。
- 最后更新：2026-10-01
- 分支 / worktree：`chore/GG-241-local-startup` / `F:/goodgood-worktrees/GG-116`
- 基线：GG-240 `5b14466995a35bf375671187f1e9eb518cf96d22`；运行时代码为 GG-239 标签，已验证后端为 GG-226 `70e10c6`。

## 范围与验收

- 恢复现有本地 Docker 依赖、32131 Web、32142 Worker 与 5173 Vite；沿用原数据卷和开发凭据。
- 决策影响：无；不需要 ADR。没有生产、数据重置、迁移、上传或生成授权。
- 验收：5173 页面和 API 代理可用，Web 来源 verified，Worker readiness 五项通过；启动 Worker 前只读核对任务、队列及冻结积分。

## 实现与证据

- 初始状态：当前检查点干净；相关端口无监听，Docker Desktop 未运行。Docker 安装于 `E:/Docker`。
- 恢复：Docker 自动恢复现有依赖；PostgreSQL 的 54449 被 Windows 动态保留范围 54384—54483 占用。单容器重启没有恢复映射，重新连接其原网络后启动明确报端口权限错误；经管理员批准短暂停止 WinNAT，启动同一容器后立即恢复 WinNAT。容器名、原 named volume、数据库和迁移均保留。
- 来源：GG-226 后端 `verify:checkpoint` 通过，revision 为 `70e10c6ae6bd83542ba870f54059b54b999e9fdf`；源码和产物指纹匹配，复用其忽略的 `dist/local-checkpoint-portfix.mjs`。
- 前端：重新生成单个忽略的 `dist/local-live-dev-portfix.mjs`，只调整相对导入位置和既有 Valkey 56549 端口；跟踪的运行时代码未改。Vite 来自 GG-116 当前累计源码。
- 只读检查：Worker 启动前 active jobs、undispatched outbox、reserved credits、ready/processing 两队列均为 0；本地迁移记录仍为 56。
- 运行：Web PID 7132；唯一 Worker PID 28124；Vite 启动器 PID 25316、监听 PID 31220。PID 仅描述本次运行，后续必须重新核验。
- 健康验证：2026-10-01，5173 首页与 `/canvas` HTTP 200；5173 API 代理和 32131 均返回 `build.verified=true`、revision `70e10c6`；32142 的 runtime/database/objectStorage/provider/queue 全部 `ok`。四项本地依赖 healthy，已打开 5173 浏览器。
- 文档验证：2026-10-01，文档契约测试 9/9 通过，`git diff --check` 通过；没有运行构建、完整门禁、fixture、迁移、上传或生成。
- 日志：固定复用 `%TEMP%/goodgood-local-services/current-{web,worker,vite}.{out,err}.log`，没有按任务新建日志副本。
- 发布：未发布。

## 并行与 worktree 收口

- 子 agent/worktree 清单：无；创建数 0，退役数 0。
- 依赖/构建缓存：复用两个现有活动目录的依赖与已验证后端构建，不安装依赖、不构建；只生成必要的单个本地启动器和活动 Vite 缓存。
- 交付与集成：只记录恢复证据；保留其他目录未提交内容。

## 恢复工作

- 尚未完成：无启动阻塞；GG-237/GG-238 仍由用户手验，本次 HTTP 健康检查不代替功能验收。
- 阻塞/风险：Windows 重启可能重新分配高位保留端口；再次遇到 54449 权限错误时，检查 excludedportrange 后按本记录恢复，不能换成生产连接或重置数据库。
- 下一步：用户在 5173 使用当前项目；下次恢复先核对端口、构建身份、活动任务与队列，再恢复单个 Worker。
