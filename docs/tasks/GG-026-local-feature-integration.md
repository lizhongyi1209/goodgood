# GG-026 — 本地功能与预览环境整合

- 状态：本地整合与单环境验收完成，待用户验收
- 用户需求：排查 GG-024 与 GG-025 两套本地环境，把账户管理样式修复和积分记录功能合并，只保留一个可验收环境。
- 最后更新：2026-09-09
- 分支 / worktree：`feature/GG-026-local-feature-integration` / `F:/goodgood-worktrees/GG-026`
- 基线：`origin/main@42fc8d81d7f50ea6139671a2c239a0ee2d4455ea`

## 范围与验收

- 合入 GG-024 的账户管理弹框、语义色和列表操作层级修复，以及 GG-025 的积分记录、周期消耗、批次追溯和侧栏余额反馈。
- 冲突按当前两张任务卡的已确认验收结果解决，不让任一功能用旧基线覆盖另一功能；不引入新产品行为，因此无需 ADR。
- 以 3030 的 `goodgood-gg025` 独立 Compose 数据作为合并预览数据源，保留其余额、积分记录和站长角色。
- 合并环境改用唯一的本地镜像标签，避免多个 Compose 项目共享 `goodgood:local` 导致后续重启串用镜像。
- 3020 的 `goodgood-gg024` 容器在合并环境验证通过后停止并移除，但不删除其数据卷；3010 既有联调栈和生产均不在本任务范围。
- 运行账户管理与积分记录定向测试，再运行一次 `npm run check:local`；浏览器确认 `/create`、`/credits` 和 `/admin/users` 共存。
- 不发起真实 provider 请求，不合并到 main、不推送、不发布生产。

## 实现与证据

- 从共同基线 `origin/main@42fc8d81` 建立集成分支；以 merge commit `48c400b` 合入 GG-024、以
  `34e7642` 合入 GG-025。代码文件无冲突，仅合并任务索引与当前检查点；两个源分支的 tip 均已验证为
  当前 `HEAD` 的祖先。
- 联合定向测试覆盖账户审核弹框、积分活动、账单摘要和 UI 组件，共 40/40 通过。
- `npm run check:local` 通过：lint、类型检查与构建成功；260 项测试中 254 通过、6 个 opt-in 跳过、
  0 失败。
- 切换前分别检查 3020/3030：两套数据库均无 `queued/running/refining` 任务、无未分发 outbox，
  Valkey 生成队列均为空。3030 保留 `m3-local@goodgood.invalid` 的 `site_owner` 角色、90 可用积分、
  0 预留积分及现有积分流水。
- 3030 的 Web、Worker 和 mock generation 统一改用唯一镜像 `goodgood:gg026-local`，镜像 ID 为
  `sha256:ffa03465cc245b09e5713a47b5fc98c029a8380c4fbf24aa3cde69b131f7363d`；PostgreSQL、Valkey 与
  对象存储未重建，全部容器健康。
- 接口验证：`/api/health/ready` 返回 200；站长 session 返回 90 可用积分；`/api/billing/activities`
  返回今日/本周/本月消费均为 10、`-10` 图片生成记录、`+100` 欢迎积分和批次
  `2b89ec79-84e6-4caa-aba8-db339ae999e0`。
- 浏览器验证 `/create`、`/credits` 与 `/admin/users`：`帮助` 下方积分入口、用户名下方单枚
  `CircleDot + 90`、周期消费/简洁记录/批次追溯和不透明白色账户操作弹框同时存在；弹框只打开后
  取消，未执行账户写操作。
- `goodgood-gg024` 的 3020 容器和网络已停止并移除；其 PostgreSQL、Valkey、对象存储卷仍保留，
  3020 已无监听。3010 既有联调栈继续返回 200，未改动；未请求真实 provider，未推送或发布生产。

## 恢复工作

- 下一步：用户在 `http://127.0.0.1:3030/credits` 或 `/admin/users` 验收整合结果；如需推送、合入
  main 或生产发布，另行取得授权并生成新鲜候选证据。
- 发布：未授权；生产保持不变。
