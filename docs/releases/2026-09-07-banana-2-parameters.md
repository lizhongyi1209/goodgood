# GG-002 — Nano Banana 2 参数开放发布记录

- 状态：已上线（历史核验日期 2026-09-07，不是实时健康证明）
- 决策：ADR 0025；保持 ADR 0024 controlled alpha。
- 源码：`94cecb0aa53f7adf1dd6c3b6be23325a535ed5c0`
- 镜像：`ghcr.io/lizhongyi1209/goodgood@sha256:fe52e00933367a7f8575dc862f41550da514a4f1324526224bf347d1934127b3`
- 迁移：`0012_m8_remove_legacy_local_fixtures.sql`
- runtime-config：`05fc1ed4bf1848f6a2611fd63a29e1c0de168aaf914743507f70e7434aac158a`
- 变化：14 宽高比 × 1K/2K/4K；仍为 1 张 / 10 积分，不含迁移 0013–0020。

## 已记录验证

- 本地 lint/typecheck/build 和 187 项测试：183 通过、4 个 opt-in 跳过。
- CI run 37 / GitHub `34127634812`：源码、依赖、运行时、镜像及发布镜像扫描通过；
  artifact `10020870018` 的导入检查通过。
- 生产 preflight、加密备份、0012 幂等迁移、旧路由 drain、单 Worker 交接、
  green 健康、Nginx 切换/兼容回切演练通过。
- 公网首页/readiness 200、登录 302、未登录生成 401、HTTP→HTTPS 301。
- 获批且仅 1 次真实 `4:5 / 2K`：202 后成功，结果 1856×2304，
  2,021,800 字节，私有 signed GET 与存储哈希一致；100→90，预留归零。
  账本 1 次 `reserve:-10`、1 次 `settle:-10`；任务/attempt/outbox/Valkey 待办归零。
- 两次独立 API 资产列表读取确认同一结果持久化；临时 smoke 会话已撤销。
- 新的浏览器自动化超时，未完成此次 UI 登录/重登录端到端复验。
  更早 C6 用户手动登录/生图/重登录记录不冒充本次扩展后的 UI 证据。

## 回退与追溯

- green Web + 1 Worker 活跃；blue 已停止，保留源 `30c7a73ddb63f94f67a67b38a059d04c091040ba`。
- 旧镜像 `ghcr.io/lizhongyi1209/goodgood@sha256:1b0308cca64ecd0698fd9557e81c82989a3cd1f035218e869db554a09e9d5662`。
- 回退前必须重新核验数据/任务/配置兼容；保留候选不代表随时无风险切回。
- 受保护证据目录：`/var/lib/goodgood-production/conversion/evidence`。
  聚合记录 `live-ratio-smoke-94cecb0.json`，SHA-256
  `9fd82dcb18afa86efe6dae4e2819ab38061c98d11b4e2260e1100bfcd6b9c27e`。
- 来源：GG-001 整理前原计划的最终检查点；完整原文在 history。
  本次整理没有重新连接生产或刷新其证据时效。
