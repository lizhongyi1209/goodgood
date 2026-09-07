# GG-004 — 修复重复投递导致生成结果丢失

- 状态：待办（生产缺陷已诊断，尚未实施）
- 用户需求：查明一条 `SUBMISSION_UNKNOWN` 生成任务失败的原因。
- 最后更新：2026-09-07
- 分支 / worktree：`fix/GG-004-generation-dispatch-race` / `F:/goodgood`
- 基线：`bab17fd`；诊断时线上源版本为 `94cecb0`

## 范围与验收

- 要做：修复同一任务被 Web/Worker 重复派发后在单 Worker 内并发执行的竞态，保证
  重复队列投递不会让已取得 provider task ID 和结果的任务被另一个执行分支标记失败。
- 要做：让 Worker 只在数据库资产与终态提交成功后记录成功；覆盖失败/完成竞态产生的
  私有 R2 孤儿对象处理。
- 不做：本次诊断不恢复或删除真实结果，不修改真实积分或供应商任务，不部署生产。
- 验收点：并发 Web/Worker outbox 派发、重复 ready/processing 队列项、同 Worker
  重入、provider submission guard 及完成/失败交错均有回归测试；每个 job 同时最多
  一个有效执行，终态、尝试、资产、积分和日志结果一致。
- 决策影响：无新产品决策；这是对既有可靠投递、at-most-once 供应商提交和资产持久化
  契约的缺陷修复，不需要新 ADR。
- 授权边界：已获授权进行只读生产诊断和本地任务记录；没有真实数据修复或发布授权。

## 实现与证据

- 相关文件/专题文档：`server/generation/queue.mjs`、
  `server/generation/concurrent-job-runner.mjs`、`server/generation/repository.mjs`、
  `server/generation/worker-service.mjs`、`server/runtime/worker.mjs`、
  `docs/ERROR_HANDLING.md`、ADR 0008。
- 已完成：对 2026-09-07 14:29 UTC 的受影响任务进行了最小只读核查，未记录提示词、
  参考图、用户身份或完整 provider/task 标识。
- 生产证据：Web 在请求返回 HTTP 202 前完成第一次派发；约 59 ms 后 Worker 对仍为
  `queued` 的任务执行恢复扫描并再次派发。outbox 的 `attempts=2`，同一 Worker 在约
  3 ms 内两次启动同一 job。一个执行在 `provider-submission` 报
  `SUBMISSION_UNKNOWN`，另一个执行取得 provider task ID，并约 28 秒后取得结果。
- 持久状态：job 最终为 `failed/SUBMISSION_UNKNOWN`；attempt 同时保留 provider task
  ID 和错误；数据库无 Asset；10 积分预留已完整 release。私有 R2 存在该 job 的
  2,265,479 字节 JPEG，说明供应商结果已经生成并上传，但没有进入数据库资产记录。
- 根因：`reconcileRecoverableJobs` 会把尚未 claim 的 `queued` outbox 行重置为待派发，
  而 `dispatchPendingJobs` 没有原子领取/互斥；`claimGenerationJob` 又允许相同
  `workerId` 复用未过期 lease，runner 也不去重活跃 job。竞态失败分支先提交终态，
  成功分支稍后调用 `completeGenerationJob` 得到 `false`，但 Worker 忽略返回值并记录
  `outcome=succeeded`，于是形成失败数据库记录和孤儿 R2 对象。
- 验证：只读检查生产 Web/Worker 结构化日志、目标 job/attempt/event/asset/ledger/outbox
  行及目标前缀 R2 元数据；并与当前线上源代码逐路径核对。尚未运行修复测试。
- 发布：未发布；未修改生产数据、配置或运行进程。

## 恢复工作

- 尚未完成：先写可稳定复现上述时序的并发回归测试，再实现队列领取、单 job 执行互斥、
  终态提交结果检查及孤儿对象补偿，最后运行 `npm run check:local` 和本地 Compose 验证。
- 阻塞/风险：本地修复无外部阻塞；受影响真实 JPEG 的恢复、删除及供应商费用核对属于
  单独的生产数据操作，需要基于修复方案和账务证据明确处理范围。
- 下一步：在当前分支添加重复派发与完成/失败交错测试，先让测试稳定复现生产竞态。
