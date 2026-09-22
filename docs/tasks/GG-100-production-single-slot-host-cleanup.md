# GG-100 — 生产主机单槽位迁移与旧 blue/green 清理

- 状态：**生产执行完成并复验通过**。
- 用户授权：2026-09-22 明确授权清理生产主机上的 red/green（blue/green）部署机制与残留。
- 基线：`fe58305`（GG-099 单槽位仓库契约）；当前生产应用仍为 GG-098
  `7888554` / 迁移 `0044` / 已发布镜像摘要。

## 范围

- 核对生产主机实际容器、唯一 Worker、队列、活动任务、冻结积分、备份与公网健康。
- 建立新鲜加密恢复点并进入受控维护。
- 使用现有已发布应用镜像，把应用迁移到唯一 `goodgood-production` Compose 项目，
  Web/Worker 固定为 `3100/3101`，不执行数据库迁移。
- 安装固定上游的 Nginx 配置，验证后移除旧 blue/green 应用容器、项目网络、槽位 env、
  动态 upstream 文件与本次确认无用的备份配置。
- 保留 PostgreSQL、Valkey、R2、备份、生产秘密、用户数据和依赖 Compose 项目。

## 止损与验收

- 任何身份不匹配、活动生成任务、冻结积分、非唯一 Worker、备份失败或健康检查失败均停止变更。
- 迁移期间使用维护页；失败时在同一固定端口恢复已发布镜像，不降级 schema。
- 完成后仅存在一个 GoodGood 应用 Compose 项目和一个 Worker；旧 blue/green 应用容器、
  网络和切流文件不存在。
- Web/Worker、PostgreSQL/Valkey、公网首页与 readiness 健康；未登录 session 仍为 401；
  队列、活动任务和冻结积分保持为 0。
- 记录精确操作、恢复点、删除目标和验证结果；不执行真实生图。

## 明确不做

- 不删除数据库或对象存储数据，不删除任何卷，不重放迁移，不运行测试用户清理。
- 不发布新应用镜像，不调用真实生成 provider，不修改注册、积分或账户数据。

## 执行记录（2026-09-22）

- 执行前：GG-098 blue Web/Worker 健康，green Web 健康但未接流、green Worker 已停止；
  活动任务/冻结积分/Valkey 均为 `0`，迁移 `44` 条且最新为 `0044`。
- 新鲜加密恢复点：Restic snapshot `71e758c4`，systemd backup `Result=success`。
- 维护窗口：约 `23:23:09`—`23:27:48`（Asia/Shanghai，约 4 分 39 秒）。
- 应用镜像、revision、迁移保持不变：`sha256:7deeab8c…3270` / `7888554` / `0044`；
  配置契约更新为 `b3d7310a…ddf3`。未运行迁移。
- 固定项目 `goodgood-production` 的 Web/Worker 在 `3100/3101` 启动，两个健康样本均为
  healthy、`restarts=0`，唯一 Worker 约束通过。
- 删除 4 个旧 blue/green 应用容器、2 个旧 egress 网络、2 个槽位 env、6 个动态 upstream
  文件、旧 GG-098 Compose 备份、本次回退临时副本和 14 个无容器引用的旧 GoodGood 镜像。
  保留当前生产镜像与仍被历史 staging 容器引用的镜像；所有生产数据卷完整保留。
- 安装 Nginx 配置时，首次把备份放入 `sites-enabled` 导致 `nginx -t` 检出重复 default server；
  配置未 reload，维护页持续有效。备份移出加载目录后 `nginx -t` 和 reload 通过，无服务或数据回退。
- 开放后：公网 `/` 200、未登录 `/api/auth/session` 401、Web/Worker readiness 200；
  活动任务/冻结积分/队列均为 `0`，迁移仍为 `0044`，备份 timer active。
- 最终生产侧扫描：无 blue/green 容器、网络、槽位文件、动态 upstream 文件或活动配置内容。
  完整记录见 [运行记录](../operations/2026-09-22-gg100-single-slot-host-cleanup.md)。
- 仓库交接验证：文档连续性、生产发布计划和工作包测试 `20/20` 通过，`git diff --check` 通过。

## 下一步

无待办生产操作。后续发布只按 ADR 0091 使用固定项目；下一普通产品需求从 GG-101 分配。
