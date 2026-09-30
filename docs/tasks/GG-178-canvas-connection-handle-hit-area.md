# GG-178 · 画布连线端点样式与命中区

- 状态：GG-116 本地代码已修改，待站长手验；未提交、未部署。
- 请求：站长 2026-09-29 指出小白点不清晰、鼠标连线容错低；优先寻找 React Flow 现成方案。
- 决策：[ADR 0108 的 GG-178 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-178-addendum--connection-handle-visibility-and-hit-area-2026-09-29)。

## 范围与验收

- 图片/生成结果右侧输出端与生成器左侧输入端仍是同一个 React Flow `Handle`，保留 `reference` ID、方向和现有连线校验。
- 可见端点从不醒目的白点改为克制的灰色实心圆点；鼠标悬停/选中节点、拖线过程和连线目标有效状态有明确但简约的反馈。
- 端点实际可点击区域大于可见圆点；拖线松开时使用 React Flow 的 `connectionRadius` 扩大容差。图片主体拖动、四角缩放、现有连线和上传/生成逻辑不变。

## 实施与证据

- 官方依据：[Handles](https://reactflow.dev/learn/customization/handles)、[ReactFlow connectionRadius](https://reactflow.dev/api-reference/react-flow)、[React Flow UI Base Handle](https://reactflow.dev/ui/components/base-handle)、[Easy Connect](https://reactflow.dev/examples/nodes/easy-connect)。复用已安装的原生 `Handle`，不引入整个节点都可连线的行为。
- 文件：`features/canvas/canvas-workspace.tsx` 和 `canvas-workspace.module.css`；本任务卡、ADR、设计系统、UX 流程与交接文档。
- 验证：仅静态差异检查。按站长此前要求，未运行自动测试、构建或浏览器复测。

## 恢复工作

- 站长在 5173 `/canvas` 手动尝试从图片右侧端点拖到生成器左侧，尤其检查圆点周围及轻微偏离目标位置松开的容错；确认图片仍可正常拖动和缩放。

后续位置与动效由 [GG-179](GG-179-canvas-handle-offset-breathing.md) 调整；本卡的命中区、落点容差和端点类型仍有效。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
