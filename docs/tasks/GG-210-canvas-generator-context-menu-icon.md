# GG-210 · 画布右键图片生成器图标

- 日期：2026-09-30
- 状态：GG-116 本地源码已修改，待站长手验；未提交、未部署。
- 请求：空白画布右键菜单「图片生成器」左侧增加图标，图标与文字垂直居中。
- 实现：复用 GG-180 的 12px 图片轮廓与右上角 8px 星点，以及现有 `generatorMetadataIcon` / `generatorMetadataSparkle` 样式。SVG 显式 `size-3` / `size-2`，避免菜单默认 16px SVG 样式扩大图标；图标隐藏于读屏。
- 布局：现有 shadcn `ContextMenuItem` 的 `flex items-center gap-2` 保持图标和文字垂直居中、相距 8px；无新依赖或 CSS 改动。
- 范围：仅 `features/canvas/canvas-workspace.tsx` 与本任务卡。GG-207「图片生成器」文案及 onSelect 原样，创建和生成行为不变。
- 决策：延伸 GG-180 生成器识别规则及 GG-207 入口命名，无新产品决定或 ADR。
- 工作区：既有 dirty `F:/goodgood-worktrees/GG-116`，分支 `feature/GG-116-asset-history-actions` / HEAD `efb72d9`；保留其他修改，共同文档由主 agent 汇总。
- 验证：静态源码审阅与 `git diff --check`；按站长要求未测试、构建、浏览器复测、生成或重启，后端与生产不变。
- 下一步：站长在 5173 `/canvas` 空白处右键，手验图标识别、垂直对齐及创建入口。
