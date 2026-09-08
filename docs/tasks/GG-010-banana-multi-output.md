# GG-010 — Nano Banana 2 开放 2 / 4 张输出

- 状态：已实现并完成本地验证；待站长真实生成验收
- 用户需求：Banana 也支持生成数量 `2` 和 `4`
- 最后更新：2026-09-08
- 分支：`feat/GG-010-banana-multi-output`
- 依赖基线：本地组合候选 `33042d7`，包含 GG-004—GG-009
- 决策：[ADR 0032](../decisions/0032-open-gpt-image-2-multi-output.md)

## 范围与验收

- 本任务中的 Banana 指当前已接入的 Nano Banana 2；未接入的 Nano Banana Pro 不在范围内。
- UI/API 接受 `1 / 2 / 4`，每张 10 积分，单批分别预留和结算 10 / 20 / 40。
- O1Key Banana 没有 `n` 参数：数量 N 编排为 N 个单图上游任务，不改变其请求字段。
- 每个已返回的上游 task ID 必须增量持久化，并在下一次 POST 前写入
  submission-started 标记；重启只补交尚未开始且可证明安全的 ordinal，遇到已开始但
  未知结果的提交则保持 `SUBMISSION_UNKNOWN`，不重复计费提交。
- 所有上游任务成功后按 ordinal 形成一个 GoodGood 原子批次；任一任务失败、短结果或存储失败时不公开部分 Assets，保留现有重试与设置恢复。
- 支持参考图、14 种比例、1K/2K/4K、连续点击产生独立并行批次。
- 不包含 Nano Banana Pro、部分成功结算、生产部署或由 agent 发起的真实付费生图。

## 当前检查点

- UI/API 已开放 Nano Banana 2 的 `1 / 2 / 4`；本地浏览器确认 2/4 张报价为
  20/40 积分，生成按钮保持可用。
- O1Key route v3 将 2/4 张编排为 2/4 个单图任务。参考图每次 worker
  invocation 只上传一次；每次 POST 前写 submission-started 标记，返回后以
  compare-and-swap 保存有序 task ID 前缀。恢复只补交可证明尚未开始的后缀。
- `npm run check:local`：216 项，210 通过、6 个 opt-in 跳过、0 失败。
  隔离 PostgreSQL 积分/多 Asset 专项 5/5 通过；0016 迁移、Compose 全健康和
  Web readiness 五项依赖均通过。
- 本次最初误将 M6 opt-in 测试指向仍连接真实 O1Key Worker 的主本地数据库；
  本次产生 3 个、此前遗留 2 个合成上游任务。5 个 task 均查询为 `FAILURE`，
  6 条合成活动 job 已终止，遗留 10 积分预留已释放，当前活动 job 为 0。
  上游是否对失败任务计费只能由站长在 O1Key 使用记录核对。
- 已补防护：所有 M6/PostgreSQL opt-in 测试必须显式指定无应用 Worker 的
  `GOODGOOD_M6_DATABASE_URL`；原始计费 fixture 默认以 terminal 状态插入。
- 3010 真实 O1Key 联调栈已重建并运行；未执行成功的付费生图验收。下一步由
  站长实测 Banana 2/4 张、参考图和快速连续点击。
