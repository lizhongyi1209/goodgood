# GG-100 生产单槽位迁移与旧 blue/green 清理

- 日期：2026-09-22（Asia/Shanghai）
- 授权：用户明确授权清理生产主机 red/green（blue/green）部署机制与残留
- 仓库基线：`fe58305`
- 生产应用身份：revision `7888554a4650b1b06dbce4293c52e8c018e5c71b`；
  image `sha256:7deeab8c0257e9127326eb2fc14b5beecf370f5a22408361f613465a0b432270`；
  migration `0044_gg098_raise_manual_grant_ceiling.sql`
- 新配置契约：`b3d7310a7f345b96bcb614509f29f9706de3784bdb1b80f82d4be9534b18ddf3`

## 执行前门禁

- blue Web/Worker healthy、重启 0；green Web healthy 但未接流，green Worker exited。
- 公网根路径 200、未登录 session 401、Web/Worker readiness 200。
- generation active 0、`sum(reserved_balance)` 0、Valkey DBSIZE 0。
- PostgreSQL/Valkey healthy；44 条迁移，最新 `0044`。
- `MemAvailable` 约 1.72 GiB，根盘 44%。
- 自动备份 timer enabled/active；新建恢复点 `71e758c4`，backup service success。
- 待安装 Compose/Nginx SHA-256 与本地一致，Compose parse、固定 `3100` upstream 和镜像存在性通过。

## 维护与迁移

- `23:23:09` 启用静态维护页，公网返回 503。
- 先安装固定 upstream Nginx 和单项目 Compose；未运行数据库迁移，应用镜像/revision 不变。
- 第一次把 Nginx 备份放入 `sites-enabled`，`nginx -t` 因重复 default server 失败；旧配置未 reload，
  维护页持续有效。立即把备份移入不加载的受保护目录，再次测试/reload 通过。
- 活动任务、冻结积分、队列再次为 0 后，停止旧 blue Web/Worker；启动固定项目 Web 并核对健康、
  标签和 revision，再启动唯一 Worker。
- 固定 Web/Worker healthy、restarts 0，活动任务/冻结积分/队列继续为 0。
- 精确删除旧 blue/green 的 4 容器和 2 个 egress 网络；未删除卷或依赖项目。
- 精确删除 2 个槽位 env、6 个动态 upstream 文件、旧 GG-098 Compose 备份及本次临时回退副本。
- 删除 14 个无容器引用的旧 GoodGood 镜像；保留当前生产镜像与仍被停止的历史 staging
  Web/Worker 引用的 `ecbbd4a9…` 镜像。staging 不是本次生产 blue/green 清理目标。
- `23:27:48` 移除维护 marker，Nginx test/reload 后公网恢复。

## 完成验证

- 两次间隔健康采样：固定 `goodgood-production` Web/Worker healthy、restarts 0；公网根路径 200、
  未登录 session 401、本机 Web/Worker readiness 200。
- 生产应用项目仅 `goodgood-production`；依赖项目仅 `goodgood-production-dependencies`。
- 生产网络仅外部 state 网络与固定项目 egress 网络；生产卷仍为 PostgreSQL/Valkey 两个原卷。
- 无 blue/green 应用容器、网络、槽位目录、动态 upstream 文件、旧端口或活动配置内容。
- 最终数据库：users 30、assets 240、reference ready 181、generation jobs 279
  （223 succeeded / 56 failed）；active 0、reserved 0、迁移 44 / `0044`。
- Valkey DBSIZE 0；备份 timer active；`MemAvailable` 约 2.45 GiB，根盘 40%。
- 未执行真实生图、数据库写入测试、用户清理、迁移重放或 schema 降级。

## 恢复边界

- 本次没有更换应用镜像，因此当前已发布镜像仍是应用恢复目标；后续发布只允许在同一
  `goodgood-production` 项目恢复兼容镜像，不再恢复任何槽位或动态 upstream。
- 数据恢复点 `71e758c4` 保留在加密异机 Restic 仓库；本次未触发数据恢复。
