# GG-184 · 取消旧本地待处理任务并恢复真实生成 Worker

- 状态：旧任务已安全取消并释放预留积分；隔离本地 Worker 已启动且 ready。画布真实生图仍待站长手动验收；未提交、未部署。
- 请求：站长选择取消 2026-09-28 11:24 提交、从未执行的 Nano Banana 2 旧任务，然后启动生成服务，供 GG-182 手验。
- 决策：沿用既有生成任务状态、账本原子释放和隔离本地 Worker 规则；不改产品决策，无新 ADR。仅授权这一个旧任务，不提交新生图。

## 执行与恢复边界

- `scripts/cancel-stale-local-generation.mjs` 只接受隔离 `127.0.0.1:54449/goodgood`、本地 RustFS 和当前 Valkey `56549`，并限定旧任务 ID 前缀、创建秒、模型、owner、个人预留、报价及无上游尝试/租约。`inspect` 只读；`cancel` 需要完整 job ID 与 owner ID。执行前要求 Worker 32142 无监听，processing 为空，ready 仅含该任务。
- 任务 `33735b64-1c5c-4d3e-b21b-f925360c7e6d` 在取消前为 `queued`、attempt_count 0、attempt 行 0、无 lease/started_at；个人预留 `20 credit-cny-cent`，无组织预留。事务内通过既有账本 API 追加 `release`，将任务状态改为 `cancelled`，追加事件并关闭 outbox 派发；Redis 在提交后只移除该完整 ID。若提交后 Redis 清理中断，可在 Worker 停止时重跑同一命令；已取消且释放的任务不会再次改账。
- 取消后同一账户余额从 available 160 / reserved 20 变为 available 180 / reserved 0；release 恰好一条，旧任务仍无上游尝试。Redis ready/processing 与数据库未派发 outbox 均为空；没有其他 `queued/running/refining` 任务。
- 与 32131 Web 一致的已验证 `7c224658` 运行树 `F:/goodgood-worktrees/GG-173-runtime` 使用被忽略的本地启动器 `dist/local-checkpoint-portfix.mjs` 和 Valkey `56549`。首次启动因缺少该运行树的 `.env.local-review` 而退出，未监听/未处理任务；随后从 GG-116 复制已有的隔离本地配置到该运行树的忽略文件（未打印或提交内容），重新启动唯一 Worker PID **30980**。`127.0.0.1:32142/health/ready` 返回 runtime/database/objectStorage/provider/queue 全部 `ok`；日志 `%TEMP%/goodgood-local-services/gg184-worker-retry.{out,err}.log`。首次失败进程 PID 34408 已退出。
- 启动后再次只读核对：旧任务仍 `cancelled`、无尝试、预留已释放，Redis 两队列和 outbox 仍空；Worker 日志无 `worker.job_finished`。此次未发起新图生成，也未接触生产数据库、队列或凭据。

## 验证与下一步

- 已做定向数据库/队列审计、来源绑定 `checkpoint verify`、Worker 进程与健康只读检查、静态差异检查。按站长持续要求，未运行自动测试、构建、浏览器复测或真实生图请求。
- 站长可在 5173 `/canvas` 手动点击 GG-182 Nano Banana 2 生成；这是可能计费的真实请求。运行树/凭据、PID 和队列应在下一次重启后重新核验，不能把此刻状态当作长期保证。
