# GG-007 — GPT IMAGE 2 SD 尺寸与真实生成

- 状态：已上线；本次发布未新增 GPT 付费冒烟
- 用户需求：第一个版本只提供 `gpt-image-2-c-sd`；1K、2K、4K 均为每张 10 积分，并按 O1Key 精确尺寸生成和展示。
- 最后更新：2026-09-09
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
- 验证：独立分支 `npm run check:local` 通过，194 项中 190 项通过、4 项跳过、0 失败；组合分支通过 206 项中的 200 项、6 项跳过、0 失败；GPT 参考图专项 12/12 通过；`git diff --check` 通过。
- 联调：3010 真实 O1Key 本地栈已重建，迁移 0013 已应用，Web/Worker 健康。浏览器确认 3:4 的 2K 为 `2048 × 2736`、4K 为 `2448 × 3264`，1:1 的 4K 为 `2880 × 2880`，均显示 `10 积分/张`；资产库保留实际像素展示。
- 发布：随 `65ceb168` 上线；本次生产发布只获批 1 次 Nano 冒烟，未新增 GPT 费用。

## 恢复工作

- 尚未完成：如站长需要，可另行授权生产 GPT 精确组合验收；实现与发布已完成。
- 风险：真实生成会产生上游费用，因此自动验证只覆盖到提交前契约与本地浏览器交互，没有代替站长点击生成。
- 下一步：观察生产；GPT 真实验收须按具体调用单独授权。
