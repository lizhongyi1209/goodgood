# GG-186 画布生成任务因云端参考图配置缺失而循环等待

- 状态：本地现有任务已恢复并成功；启动器源码已修正，待下一次受控检查点构建与验证。未部署。
- 请求：站长在 `/canvas` 手动提交 Nano Banana 2 后一直看到生成中，要求检查最近一次请求原因。
- 决策：沿用既有真实生成、参考图存储和账本约定；没有产品方向变更，不新增 ADR。不得另发生成请求或静默取消已提交任务。

## 定位

- 最近的隔离本地任务 `2da90ad0-2935-4d1b-a459-ca8a6c77b5c7` 于 2026-09-29 17:01:45（北京时间）创建；只有这一条活跃任务，模型为 Nano Banana 2、输出 1 张、云端参考图 1 张、预留 20 积分。
- 旧 Worker PID 30980（已验证 `7c224658`）在 `provider-submission` 前反复 `deferred`，每次错误是 `This reference needs the local cloud upload configuration.`。停机前累计 406 个 `worker_deferred` 事件；attempt 仍为 `created`，上游任务 ID 为空，没有上游提交事件或产物。健康检查虽全部 `ok`，没有覆盖云端参考图读权限。
- 直接原因是 Worker 的 `.env.local-review` 没有仓库外已有的六项云端参考图配置，而本地检查点启动器还把 `--cloud-env-file` 限定在 `workspace` 模式。旧启动日志标作 `referenceStorage=local-rustfs`，与这张 `local-dev/references/` 参考图不兼容。

## 恢复与代码

- 核对 PID/命令、唯一活跃 job、唯一 `created` attempt、无上游 ID 后停止旧 Worker。停机后的 Redis ready/processing 均为空；数据库仅该 job 的 outbox 待派发，因此无需删除或去重任何队列 ID。
- 将已有仓库外配置的六项设置追加到 `GG-173-runtime` 中被 Git 忽略的 `.env.local-review`；其中凭据只写仓库外文件路径，未打印密钥正文或把配置加入 Git。随后在同一已验证 `7c224658` 运行树启动唯一 Worker PID 18820。没有调用新的 `/api/generations` 或 retry 接口。
- 原 job 在 17:10:39（北京时间）进入 `succeeded`/100%；仅 1 个 `succeeded` attempt、1 个生成资产。账本仅 1 条预留 `-20` 和 1 条结算 `-20`；账户 available 160、reserved 0。Redis ready/processing、活跃任务和未派发 outbox 均为 0。Worker 健康检查仍为五项 `ok`。
- `scripts/local-checkpoint.mjs` 现在允许 Worker 使用已有的 `--cloud-env-file` 仓库外配置，并按实际环境记录 `referenceStorage`。此源码修正尚未进入当前运行的已验证检查点；当前运行树通过被忽略的本地配置恢复，不把运行时状态误写成已部署代码。
- 静态核对前端：`http-generation-boundary.ts` 在 `refining` 后继续 GET，收到 `succeeded` 会通知 observer 并退出轮询；`canvas-page.tsx` 的 observer 按生成器 ID 更新同一节点的 job/首图，`CanvasGeneratorNode` 在终态移除生成动效并渲染私有图片。正常状态接口可达时，此次循环等待不是前端终态处理造成的。

## 验证与后续

- 已做定向数据库、Valkey、Worker 日志/健康与进程来源只读核对；按站长要求，未跑自动测试、构建或浏览器复测。站长负责检查画布上的返图及交互。
- 下次替换检查点时，在隔离本地栈中按受控流程构建并验证源码，使用 `start worker --cloud-env-file <仓库外配置>` 启动；核对来源、队列和唯一 Worker。不要把云端配置或密钥写入仓库。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
