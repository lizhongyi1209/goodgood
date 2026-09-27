# GG-135 — 画布图片移动对齐辅助线

- 状态：本地实现与门禁完成，待站长手动验收；沿用 `F:/goodgood-worktrees/GG-116` 的 `feature/GG-116-asset-history-actions`，不切分支；未部署。
- 基线：GG-134 `e8f6c59`，工作区干净；站长已确认四角缩放光标位置可以使用。
- 决策关系：新增临时画布移动反馈，不改变既有画布的节点归属、图片尺寸、位置持久化或 [ADR 0110](../decisions/0110-canvas-image-selection-frame.md) 的选中/缩放规则；无需新 ADR。

## 范围与验收

- 画布至少有两张已加载图片时，拖动一张或同时拖动多张，在移动图片组与其他图片的左右边、中线、上下边接近时显示水平或垂直灰色辅助线；可同时显示两个方向，每个方向只选最近的一条。
- 辅助线使用画布坐标，随缩放和平移保持准确；只连接参与比较的图片范围，不铺满画布。拖动结束立即消失，不阻挡点击和拖动。
- 只提供视觉对齐反馈，不自动吸附或改写落点；空画布、单图、加载中/失败节点、缩放图片或平移画布时不显示辅助线。
- 保留 React Flow 对节点位置和尺寸的所有权，不新增图片 DOM 尺寸观察或真实上传/生成。

## 实施与验证

`CanvasWorkspace` 沿用 React Flow 内部持有节点；拖动回调只读取已加载图片的公开节点边界，比较移动组与其余图片，不调用 `setNodes` 或更新尺寸。对齐计算独立在 `canvas-alignment-guides.mjs`，用 6 屏幕像素阈值、280 屏幕像素相邻范围，每方向取距离最近的边缘或中心。`ViewportPortal` 在画布坐标中渲染一像素灰线，透明且不接收指针；松开拖动即清空。参考 React Flow 官方 [拖动事件](https://reactflow.dev/api-reference/react-flow)、[节点边界](https://reactflow.dev/api-reference/types/react-flow-instance)与[视口层](https://reactflow.dev/api-reference/components/viewport-portal)公开 API；官方 Helper Lines 示例带 Pro License，本任务没有复制该示例代码。

定向测试 19/19（含画布、文档）、TypeScript 检查通过；`npm run check:local` 共 596 项 / 573 通过 / 23 跳过 / 0 失败，lint 0 错误 / 110 条既有警告；现有 5173 `/canvas` HTTP 200。未做已登录浏览器交互验收、真实上传或付费生成，也未替换 32131 检查点或部署生产。

## 下一步

站长在现有已登录 5173 `/canvas` 放置两张以上图片，移动单张及多张，确认靠近其他图片边缘或中心线时出现灰色辅助线、松开后消失；同时确认不吸附、不改变落点。
