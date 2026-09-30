# GG-188 · 生成器扫光与出图圆角

- 状态：GG-116 本地实现，待站长手动验收；未提交、未部署。
- 请求：按 [CodeFronts Dark Mode Skeleton](https://codefronts.com/motion/css-shimmer-skeleton-cards/dark-mode-skeleton/) 的扫光方向调整生成器进行中动效，并将生成器内的图片改为圆角；先调查 React 生态现成样式。
- 决策：[ADR 0108 GG-188 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-188-addendum--generator-shimmer-and-rounded-output-2026-09-29)。用户此前明确要求普通画布图片直角（ADR 0110 GG-136），本任务只改图片生成器。

## 现成方案调查

- [React Flow 自定义节点](https://reactflow.dev/learn/customization/theming)可以直接用普通 CSS 调整外观；其 [NodeResizer](https://reactflow.dev/api-reference/components/node-resizer) 管尺寸，不提供图片专属圆角形态。当前生成器已是自定义节点，复用它自己的容器最贴合。
- [shadcn/ui Aspect Ratio](https://ui.shadcn.com/docs/components/radix/aspect-ratio) 官方图片示例使用 `rounded-md object-cover`；项目里已有 `AspectRatio`，但生成器已有真实比例和随图片调整的节点尺寸，另包一层比例组件会重复控制几何。项目现有 AI Elements `Attachment` 有 `rounded-lg` 缩略图样式，针对小方形附件，不适合生成器的原比例大图。
- CodeFronts 示例的核心是灰色占位层上由浅色渐变形成的水平扫光，用 `transform` 移动并在减少动态效果时停用。沿用机制，改用 GoodGood 白画布上的浅灰配色；没有复制示例卡片的标题、文字条或暗色背景。

## 范围与验收

- `queued`、`running`、`refining` 时不显示旧图或中央占位图，只有贴合节点大小的灰底扫光；成功出图后扫光立即消失。
- 生成器卡片和成功图片共用不超过 8px、随极小节点收敛的圆角裁切；图片、悬停与选中描边贴合，不留内边距。普通图片节点在 GG-188 时保持直角，后由 GG-190 同步圆角。
- 保留真实像素尺寸标签、连线、原比例和生成提交逻辑；减少动态效果时留下静态灰底。

## 实现与验证

- 仅修改生成器 CSS。未引入新的 React 组件、依赖、网络资源或任务状态。
- 按站长持续指示，不运行自动测试、构建、浏览器复测或真实生图；仅做静态差异检查。
- 下一步：站长在 `/canvas` 手验生成中扫光的速度/亮度及成功出图后的圆角边缘，尤其是较小尺寸时。
