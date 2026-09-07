# GG-007 — GPT IMAGE 2 SD 尺寸与真实生成

- 状态：进行中
- 用户需求：第一版只提供 `gpt-image-2-c-sd`；1K、2K、4K 均为每张 10 积分，并按 O1Key 精确尺寸生成和展示。
- 最后更新：2026-09-08
- 分支 / worktree：`feat/GG-007-gpt-image-2-sd` / `F:\goodgood`
- 基线：`main` 的 `bab17fd4d4c4d88eec6194bb5d024769ca8e26fa`；线上版本另查 CURRENT_STATE

## 范围与验收

- 要做：模型级比例/尺寸能力；GPT IMAGE 2 的 7 个比例 × 3 档尺寸；前后端校验；O1Key `gpt-image-2-c-sd` 路由；参考图；每档 10 积分；相关文档与测试。
- 不做：`auto`、多图输出、透明背景/quality 等新控件、Nano Banana Pro、Seedream、生产发布。
- 验收点：选择 GPT IMAGE 2 后只显示 7 个受支持比例并显示精确像素；提交发送小写 `x` 的精确 `size`、`n: 1` 且不发送 `aspect_ratio`；三档均显示并预占 10 积分；非法组合在调用上游前失败；Nano Banana 2 行为不回归。
- 决策影响：[ADR 0030](../decisions/0030-open-gpt-image-2-sd-with-model-specific-sizes.md)；用户确认第一版只走 SD 路线且三档统一 10 积分。
- 授权边界：本地实现与验证；未授权生产发布或付费的真实上游冒烟。

## 实现与证据

- 相关文件/专题文档：`features/creation/`、`server/generation/`、`server/billing/`、迁移、生成/计费契约测试、ARCHITECTURE、DATA_MODEL、UX_FLOWS、TESTING。
- 已完成：分配任务，确认基线和分支，记录 ADR 0030。
- 验证：待实现后记录。
- 发布：未发布。

## 恢复工作

- 尚未完成：实现、完整本地门禁、组合联调栈和浏览器验收。
- 阻塞/风险：本任务独立分支以 main 为基线；GG-005/GG-006 只在本地组合候选中集成，避免把并行任务混进单项交付分支。
- 下一步：实现共享模型能力和 GPT O1Key/计费路径，并补齐针对性测试。

