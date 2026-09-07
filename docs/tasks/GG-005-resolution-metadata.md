# GG-005 — 显示分辨率档位与资产实际尺寸

- 状态：进行中（决策已确认，等待实现）
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
- 已完成：确认 accepted Asset 已持久化非空正数宽高，但现有 API 输出未暴露这些字段。
- 验证：尚未运行实现验证。
- 发布：未发布。

## 恢复工作

- 尚未完成：实现 API/类型/展示及回归测试，重建 O1Key 本地联调环境供人工验收。
- 阻塞/风险：无本地实现阻塞；当前真实联调容器仍运行上一提交构建的镜像。
- 下一步：先写尺寸映射与格式化回归测试，再实现最小展示改动。
