# GG-217 后端退役同步说明

- 日期：2026-09-30；[任务卡](GG-217-remove-jcoin.md) / [ADR 0117](../decisions/0117-retire-jcoin.md)。
- 来源：`F:/goodgood-worktrees/GG-217` **当前工作文件**；其 HEAD 仍是 `29e566d`，直接复制 HEAD 或按分支构建会恢复旧功能。
- 接收检查点：画布 `GG-218-runtime` / `ba9a947`。本次只读核对时该工作树干净；以下后端文件相对 `29e566d` 无变更。新运行统一由画布根会话构建、切换，本说明没有执行同步、数据库操作或服务重启。

## 最小文件清单

| 操作 | 文件 | 重放方式 |
| --- | --- | --- |
| 替换 | `app/api/jcoin/route.ts`、`app/api/admin/jcoin/query/route.ts`、`app/api/admin/jcoin/action/route.ts` | 可完整复制 GG-217 当前文件；只保留无导入的 `410 FEATURE_REMOVED`、`cache-control: no-store` 响应。 |
| 修改 | `server/runtime/web.mjs` | 优先手工 patch：删除 `createJcoinNodeApiHandler` 导入、实例与请求链；在 URL 解析后、鉴权链前添加三条退休 API 的纯 410 分支。 |
| 修改 | `server/runtime/worker.mjs` | 优先手工 patch：删除奖励导入、`jcoinProcessing` / `reconcileJcoin` / 15 秒定时器、停机时清计时器及等待奖励；保留所有生成恢复、派发、处理、确认与 drain。 |
| 删除 | `server/jcoin/api.mjs`、`errors.mjs`、`node-api.mjs`、`repository.mjs`、`route.ts` | 仅删除这些明确文件；不可保留可手工发行的仓库/API 模块。 |
| 删除 | `shared/contracts/jcoin.mjs`、`shared/contracts/jcoin.ts` | 删除平台币专属 DTO / 计算契约。 |
| 删除 | `tests/gg084-jcoin.test.mjs`、`tests/gg084-jcoin-postgres.test.mjs`、`tests/gg086-jcoin-progress.test.mjs` | 退休旧功能测试，不再开启 GG-084 写入测试。 |
| 新增 | `tests/gg217-jcoin-retirement.test.mjs` | 可完整复制；严格依赖 allowlist + VM，验证纯 410、正常积分/生成接线、Worker 成败确认及在途 drain。 |

两个 runtime 文件在 `ba9a947` 也可完整复制，**前提是接收会话重新确认它们仍无其他提交或未提交改动**；否则只重放上述 patch。不要覆盖 `app/page.tsx`、画布模块、`server/canvas-projects/**`、多页契约或 `0055` 迁移。历史平台币表及 `0040` 迁移保留，本同步不改 schema、不删数据。前端退役已独立整合到 GG-116，后端清单不替代该前端交接。

## 防止后续构建恢复平台币

1. 合并最新画布检查点后，确认 `server/jcoin` 与两份契约均不存在；扫描 `server` / `shared` 的 `processJcoinRewards`、`createJcoinNodeApiHandler`、`jcoinProcessing`、`reconcileJcoin`，应无结果。`jcoin` 字符只允许在 Web 三条退休 URL、纯 410 路由及历史数据库记录出现。
2. 构建候选必须包含 GG-217 当前补丁，不能重新以原 `29e566d` 或未退役的 `ba9a947` 构建。不要复用旧 `dist` / `runtime-bundle`；`scripts/build-runtime.mjs` 从两个 runtime 入口重新打包，遗漏 Worker patch 会重新带入发行代码。
3. 新候选可运行 `node --test tests/gg217-jcoin-retirement.test.mjs`；该测试已在 GG-217 / GG-116 通过，本次未重复。不得用真实 API action、SQL fixture 或 provider 请求验证退役。
4. 由画布根会话串行核验最新构建身份、零活跃任务与部署交接后统一切换 Web / 唯一 Worker。仅更新 UI 不会关闭旧 Worker 的自动发行；切换完成前不能宣称运行中后端已退役。生产仍未部署。

下一步：接收会话将上述后端差异叠加到最新画布候选，记录实际构建 revision 与运行状态。
