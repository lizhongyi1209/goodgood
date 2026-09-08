# GG-005 — 显示分辨率档位与资产实际尺寸

- 状态：待验收（本地已实现并验证，未发布）
- 用户需求：分辨率统一显示为 `1K / 2K / 4K`；资产库同时显示每张图片的实际像素尺寸。
- 最后更新：2026-09-07
- 分支 / worktree：`feat/GG-005-resolution-metadata` / `F:/goodgood`
- 基线：`bab17fd`；线上源版本见 `CURRENT_STATE.md`

## 范围与验收

- 要做：创作设置及所有生成参数摘要直接显示 `1K / 2K / 4K`。
- 要做：资产 API 返回已持久化的实际宽高；资产批次、画廊和图片详情显示类似
  `4K · 3584 × 4800` 的档位与实际尺寸组合。
- 要做：本地联调栈重启时保留生成后的积分和资产状态，便于重建镜像后继续验收。
- 不做：不把静态比例尺寸当成真实资产尺寸，不修改 provider 请求、数据库结构、定价、
  已生成文件或生产数据，不在本任务发布生产。
- 验收点：成功 Asset 使用数据库 `pixel_width / pixel_height`；缺少尺寸的兼容数据只显示
  档位；创建设置、失败摘要、资产三种展示入口及 API 映射有回归覆盖。
- 决策影响：[ADR 0027](../decisions/0027-expose-resolution-values-and-actual-asset-dimensions.md)
  取代原 `标准 / 高清 / 超清` 展示词，持久化枚举保持不变。
- 授权边界：本地实现与验证；未授权生产发布或生产数据修改。

## 实现与证据

- 相关文件/专题文档：`shared/contracts/generation.ts`、
  `server/generation/repository.mjs`、`features/creation/generation-options.ts`、
  `app/page.tsx`、`server/persistence/seed-local-fixtures.mjs`、
  `docs/DATA_MODEL.md`、`docs/UX_FLOWS.md`。
- 已完成：Generation output API 暴露 accepted Asset 的实际宽高；分辨率选项直接显示
  `1K / 2K / 4K`；批次在共同尺寸一致时显示档位和尺寸，画廊/详情按单张 Asset 显示。
- 已完成：本地 fixture seeder 验证身份、账户和一次性欢迎积分记录，同时允许余额和资产
  随测试变化；`work/` 排除出镜像构建上下文，重复重建不再要求清空本地数据。
- 验证：先新增回归，旧实现稳定出现 3 个失败（旧标签、API 缺少宽高、资产展示未接线）。
  实现后 `npm run check:local` 共 193 项，189 通过、4 个 opt-in 跳过、0 失败；相关
  generation/assets/runtime/documentation 测试 25/25 通过，类型检查通过。
- 验证：对已有 2 个真实 O1Key 本地 Asset、余额 80 的联调库重复运行 fixture seeder 成功；
  保留数据卷重建集成镜像后 Web/Worker/provider 均 healthy。API 返回
  `2K · 1792 × 2400` 和 `1K · 896 × 1200`，浏览器已核对创作设置、资产批次、画廊和
  图片详情。组合联调分支现为 `test/GG-004-GG-005-local`，镜像包含 GG-004—GG-006。
- 发布：未发布。

## 交接

- 尚未完成：站长人工验收、CI、正式合并镜像与生产发布。
- 阻塞/风险：本地候选无实现阻塞；生产发布仍需先闭环 GG-003，并审查三项独立候选。
- 下一步：站长在 `http://127.0.0.1:3010/` 完成人工验收后决定是否进入发布准备。
