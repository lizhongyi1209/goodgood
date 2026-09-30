# GG-196 — 图片生成中隐藏生成器外框

- 日期：2026-09-29
- 工作区：`F:/goodgood-worktrees/GG-116`。
- 请求：生图时去掉图片生成器的外边框样式。
- 决策：此请求修改 [ADR 0108 的 GG-188 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-188-addendum--generator-shimmer-and-rounded-output-2026-09-29)中生成器选中描边始终贴合卡片的视觉约定；变更已写入 [GG-196 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-196-addendum--borderless-generator-during-generation-2026-09-29)。

## 范围与验收

- 生成任务处于 `queued`、`running` 或 `refining` 时，选中的图片生成器不显示外轮廓，只保留卡片内扫光。
- 未生成、成功出图及失败后的原有选中/悬停边框不变；节点大小、圆角、元数据、连接点和下方输入框不变。

## 实施与状态

- 外框来自 `canvas-workspace.module.css` 中生成器选中态的灰色 `outline`。React Flow 安装版只对内置节点类型绘制默认选中阴影，自定义 `imageGenerator` 节点无额外选中阴影；工作区也已将其 wrapper 边框清零。
- 选中态规则排除 `.generatorShimmering`，沿用该类现有的三种任务状态判定，不增加状态、副作用或接口调用。
- 本地代码已修改，待站长在 `/canvas` 手验；仅做静态差异检查。按站长要求未运行自动测试、构建、浏览器复测或付费生图；未部署。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
