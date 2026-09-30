# GG-197 · 画布多图生成结果堆叠

- 日期：2026-09-29。
- 工作区：`F:/goodgood-worktrees/GG-116`。
- 请求：当一次生图数量大于 1 时，画布上呈现图片堆叠效果；先核对 React/shadcn 是否有现成组件。站长随后指定 [CodeFronts 的扇形叠卡示例](https://codefronts.com/components/tailwind-stacked-cards/tailwind-fan-spread-hand-of-cards/)，要求图片向右叠放、悬停切换。
- 状态：**历史方案，已由 [GG-198](GG-198-canvas-generation-batch-stack.md) 取代**。独立余图节点允许用户拆散同一批次，不再是当前验收目标；未提交、未部署。

## 现状与组件调研

- [React Flow Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes) 支持在自定义节点内组合普通 React 内容与 CSS，但没有针对多图堆叠的内置节点。
- [shadcn/ui 组件表](https://ui.shadcn.com/docs/components) 没有图片堆叠组件。现有 [Carousel](https://ui.shadcn.com/docs/components/aria/carousel) 可切换多张内容，其基础是 Embla；它不提供堆叠外观，在 React Flow 节点内还需处理拖动与切换手势冲突。
- 当前实现：成功任务的第 1 张在图片生成器内，第 2/3/4 张通过 `upsertCanvasJobNodes(..., firstOutputIndex=1)` 自动成为生成器右侧的独立图片结果节点。画布项目会分别保存这些节点；刷新可恢复。已接受的 [ADR 0108 · GG-182](../decisions/0108-standalone-canvas-image-generation.md#gg-182-amendment--results-belong-to-their-generator-2026-09-29)规定额外结果独立放置。

## 方案与决策

站长明确了向右堆叠和悬停切换。保留 GG-182 的「首图在生成器，其余为独立结果节点」数据和操作方式，将后续结果的**初始坐标**改为从生成器向右错位；等宽时每张约 18–28px，宽度不同时按真实初始宽度确保每张右缘仍露出可悬停的一段。它们在同一画布区域重叠为一叠。参考示例中的同一低支点与 hover 抬升/置顶，但弱化旋转、阴影和位移以适应 GoodGood 的白色画布。此修改 GG-182 中「额外结果排开」的默认布局，已写入 [ADR 0108 的 GG-197 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-197-addendum--fan-stacked-multi-image-canvas-results-2026-09-29)。

每张卡仍是 React Flow 节点，悬停或键盘聚焦时置顶并显示自己的原始尺寸；余图可继续单独选择、缩放或从堆中拖出来。已手动挪动的旧/新结果在任务更新、项目恢复、撤销/重做时沿用存储的坐标，不重新归堆。首图仍属于生成器，仅保留原有左侧参考图输入点，不新增输出连线；余图的现有 source handle 保留。单张生成及原 `/create` 的独立结果布局不变。

同一生成器再次提交并成功时，上一批仍停留在原叠位的余图自动横向展开到生成器右侧，避免旧批遮住新批，保留旧图本身的宽高、资产与连线；手动拖走的旧图不移动。新任务排队、运行或失败时不挪动旧图。

## 验收与限制

- 2/4 张成功结果初始呈向右错位的轻扇形；指针停在每张露出的右侧区域，该卡移到最上方并轻微抬起。减少动态效果时没有过渡动画。
- 将任意余图拖离、选中、缩放、连到其他生成器，或刷新画布后，各结果仍为同一张图、原像素尺寸与资产；已展开的节点不会自动归堆。生成器首图仍可选中打开原提示词设置，但不提供输出连接点。
- 在同一生成器再次完成多图或单图生成时，上批仍在叠位的余图展开，当前任务结果清晰可见；已手动调整尺寸的旧图保持尺寸。
- 结果可能有不同原始比例，保持每张的真实宽高而不强制裁成相同卡片。当前没有整叠批量移动或一键重新归堆；这些属于后续交互。
- 仅做静态差异检查；站长在 5173 手动验收，未触发真实生成、上传或费用。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
