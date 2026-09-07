# GG-007 — GPT IMAGE 2 SD 尺寸与真实生成

- 状态：已实现并通过独立分支本地门禁；待组合联调与站长实测
- 用户需求：第一个版本只提供 `gpt-image-2-c-sd`；1K、2K、4K 均为每张 10 积分，并按 O1Key 精确尺寸生成和展示。
- 最后更新：2026-09-08
- 分支 / worktree：`feat/GG-007-gpt-image-2-sd` / `F:\goodgood`
- 基线：`main` 的 `bab17fd4d4c4d88eec6194bb5d024769ca8e26fa`；线上版本另查 CURRENT_STATE。

## 范围与验收

- 要做：模型级比例/尺寸能力；GPT IMAGE 2 的 7 个比例 × 3 档尺寸；前后端校验；O1Key `gpt-image-2-c-sd` 路由；参考图；每档 10 积分；相关文档与测试。
- 不做：`auto`、多图输出、透明背景/quality 等新控件、Nano Banana Pro、Seedream、生产发布。
- 验收点：选择 GPT IMAGE 2 后只显示 7 个受支持比例并显示精确像素；提交发送小写 `x` 的精确 `size`、`n: 1` 且不发送 `aspect_ratio`；三档均显示并预占 10 积分；非法组合在调用上游前失败；Nano Banana 2 行为不回归。
- 决策影响：[ADR 0030](../decisions/0030-open-gpt-image-2-sd-with-model-specific-sizes.md)；用户确认第一版只走 SD 路线且三档统一 10 积分。
- 授权边界：本地实现与验证；未授权生产发布或付费的真实上游冒烟。

## 实现与证据

- 已完成：前端按模型切换比例集合与精确像素；历史草稿、项目和失败快照会归一到 GPT 支持的最近比例。
- 已完成：服务端使用模型级能力校验；Worker 在领取任务后选择并持久化对应 provider route；GPT IMAGE 2 提交到 `gpt-image-2-c-sd`。
- 已完成：GPT 请求发送精确小写 `WIDTHxHEIGHT`、`n: 1` 和有序参考图，不发送 Nano 专用的 `aspect_ratio` 或 `response_modalities`。
- 已完成：迁移 `0013_gg007_gpt_image_2_prices.sql` 为 1K、2K、4K 各写入不可变的 10 积分价格版本；账单摘要返回 Nano 与 GPT 两组报价。
- 验证：`npm run check:local` 通过，194 项中 190 项通过、4 项需显式开启的集成测试跳过、0 失败；补充参考图覆盖后 `node --test tests/m5-us-gateway.test.mjs` 12/12 通过；`git diff --check` 通过。
- 发布：未发布；未调用真实上游产生费用。

## 恢复工作

- 尚未完成：把 GG-007 合入本地组合联调候选，应用迁移 0013，重建 3010 环境并完成浏览器验收；随后交给站长实测真实生成。
- 风险：GG-005/GG-006 只在本地组合候选中集成，合并时必须保留资产实际像素展示和 1:1 参考图预览布局。
- 下一步：更新组合联调分支并验证 GPT 比例、精确尺寸和 10 积分展示；不主动触发付费生成。
