# GG-133 — 画布图片缩小时同步收小圆角

- 状态：历史本地实现；动态圆角已按站长新要求由 GG-136 直角图片替代。继续使用 `F:/goodgood-worktrees/GG-116` 的 `feature/GG-116-asset-history-actions`，不切分支；未部署。
- 基线：GG-132 `f378a06`；站长已确认四角缩放正常且 ResizeObserver 报错消失。
- 现象：图片节点缩小时仍沿用固定 14px 圆角，小图的角显得过大。
- 决策关系：延续 [ADR 0110](../decisions/0110-canvas-image-selection-frame.md) 的紧贴图片的圆角轮廓，仅调整圆角随尺寸变化；无需新 ADR。

## 范围与验收

- 本地图片和已生成图片的外层裁切圆角随卡片宽高缩小，常规大图仍不超过 14px；悬停遮罩与选中细框跟随相同轮廓。
- 加载、失败节点及四角缩放点的样式和行为不变；不增加图片尺寸监听或 JS 缩放计算。
- 样式使用 `min(14px, 6%)`，百分比分别按卡片宽高计算；小图角度按比例变小，大图保持既有上限。
- 完整本地门禁与 5173 `/canvas` 可达性通过；站长手动确认实际缩小效果。

## 实施与验证

- `canvas-workspace.module.css` 只在 `.sourceNode.imageNode` 和 `.resultNode.imageNode` 上使用 `min(14px, 6%)`。常规 238px 宽图片保持 14px 上限；48px 宽图片的水平圆角随之减小到约 2.88px。两种图片的 `overflow: hidden` 继续统一裁切图片与悬停遮罩；选中轮廓沿用同一圆角。
- 加载、失败节点继续使用固定 14px；四角官方 `NodeResizeControl` 的尺寸与行为未修改，没有新增 JS 尺寸监听。
- `npm run check:local` 592 项 / 569 通过 / 23 跳过 / 0 失败，Lint 0 错误 / 110 条既有警告；现有 5173 `/canvas` HTTP 200。未做已登录浏览器视觉验收、真实上传/生成、32131 检查点替换或生产部署。
- 站长反馈小图圆角效果「好多了」，随后要求四角缩放控件也贴合圆角；后续控件外观见 [GG-134](GG-134-canvas-rounded-corner-resize-handles.md)。

## 下一步

后续以 [GG-136 画布图片直角外形](GG-136-square-canvas-images.md) 为当前验收范围；本任务的动态圆角仅保留历史记录。
