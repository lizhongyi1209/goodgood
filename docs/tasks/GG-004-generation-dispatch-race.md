# GG-004 — 修复重复投递导致生成结果丢失

- 状态：已上线；生产真实 Nano 冒烟未发生重复派发
- 用户需求：查明一条 `SUBMISSION_UNKNOWN` 生成任务失败的原因并修复。
- 最后更新：2026-09-09
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
- 实现：outbox 在发布到 Valkey 前以单条 PostgreSQL 语句原子领取；恢复扫描仅在派发
  超过 lease 窗口后重开。runner 去重同一进程内的活跃 job，任意未过期 lease 都拒绝
  再次 claim，provider submission guard 的失败竞争改为 superseded 执行。
- 实现：Worker 仅在 `completeGenerationJob` 接受资产和终态后报告成功。失败、取消或
  缺失终态拒绝已上传结果时删除未引用对象；删除失败记录 `OBJECT_DELETE_FAILED`，
  lease 丢失或任务已成功时保留确定性对象供当前有效执行使用。
- 验证：`npm run check:local` 共 201 项，195 通过、6 个 opt-in 跳过、0 失败；
  `GOODGOOD_M6_INTEGRATION=1` 的积分/lease 集成 5/5 通过，队列专项 PostgreSQL 集成
  3/3 通过。本地 Compose 在 3010 端口的重复活跃投递场景通过，最终仅有 1 次 claim、
  1 个 attempt、1 个 Asset、1 次 settle，outbox 派发计数为 1；`stack:verify` 全部 ready。
- 附加证据：旧的广泛 Compose 用例在进入生成路径前命中与本次差异无关的过期登录
  session 结构断言；GG-004 聚焦 Compose 回归随后单独通过，本地完整门禁没有失败。
- 发布：随 `65ceb168` 上线；唯一真实 Nano 冒烟为 1 attempt、1 Asset、1 次结算，队列归零。

## 交接

- 尚未完成：受影响的历史孤儿 R2 对象处置仍不在本次授权范围；代码与生产发布已完成。
- 风险：受影响真实 JPEG 的恢复、删除及供应商费用核对属于
  单独的生产数据操作，需要基于修复方案和账务证据明确处理范围。
- 下一步：继续观察生产队列；如需处理历史孤儿对象，另行建卡并取得精确数据授权。
