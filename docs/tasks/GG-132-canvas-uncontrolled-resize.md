# GG-132 — 消除画布缩放时的 ResizeObserver 循环

- 状态：本地实现与门禁完成，站长确认缩放正常且 ResizeObserver 报错消失；继续使用 `F:/goodgood-worktrees/GG-116` 的 `feature/GG-116-asset-history-actions`，不切分支；未部署。
- 基线：GG-131 `d65cc34`，工作区干净。
- 现象：站长确认 GG-131 后四角缩放正常，但 vinext 的 `ResizeObserver loop completed with undelivered notifications.` 覆盖层仍出现。
- 决策关系：修正 React Flow 节点状态和初始尺寸设置，不改变 [ADR 0110](../decisions/0110-canvas-image-selection-frame.md) 的视觉/交互；无需新 ADR。

## 诊断与验收

- 用不登录、不读用户资产的临时合成图片画布稳定复现：受控 `nodes` 模式将 240×300 缩放为 360×450 时产生约 20 次相同通知；将相同组件改为 `defaultNodes` 模式并只镜像变化时，尺寸同样达到 360×450，通知数为 0。
- 画布由 React Flow 持有节点；页面的镜像状态继续支持本地拖图、生成任务增量更新、适应视野和本地 blob 清理，避免每次观察回调都把 `nodes` prop 写回 React Flow。
- 图片原比例、四角缩放、移动与结果详情不变；错误不能用全局 `window.error` 屏蔽。
- 定向测试、完整本地门禁及现有 5173 `/canvas` HTTP 检查；站长在已登录浏览器复核，未授权真实上传或付费生成。

## 实施与验证

- `CanvasWorkspace` 使用 React Flow 的 `defaultNodes`/`defaultEdges`。`CanvasPage` 用 `flow.setNodes` 添加本地图片与更新生成任务，只用 `onNodesChange` 保存供按钮与 blob 清理使用的状态镜像；移除 GG-131 的测量回写队列。没有注册全局错误屏蔽器。
- 核对 [React Flow Node 文档](https://reactflow.dev/api-reference/types/node) 和 [NodeResizeControl 文档](https://reactflow.dev/api-reference/components/node-resize-control)：官方没有独立图片加载节点，推荐自定义节点展示图片；四角缩放沿用已安装的官方 `NodeResizeControl`，节点初始尺寸通过官方推荐的 `style` 设置，后续尺寸交给 React Flow。浏览器原生 `createImageBitmap` 仅用于读取本地文件比例；生成图优先使用已有输出宽高，未提供宽高时保留图片载入后的回退处理。
- 临时合成图片诊断：受控节点右下角连续拖动从 240×300 到 360×450，捕获约 20 条 ResizeObserver 通知；同组件在 React Flow 持有节点后同样缩放为 360×450，通知 0。图片完成初始尺寸加载后，四角依次拖动均正常，镜像尺寸与节点同步，通知 0。诊断文件和浏览器会话已清理。
- 追加诊断：首次尺寸调整后立即缩放在未预设尺寸时偶发 1 次通知，React Flow 的 `initialWidth/initialHeight` 方案在此样例中仍会报错；采用文档推荐的 `style` 初始尺寸后，隔离样例连续 20 次立即缩放均为 0 次。临时诊断文件和会话已清理。
- 定向画布测试 8/8，TypeScript 检查通过；`npm run check:local` 592 项 / 569 通过 / 23 跳过 / 0 失败，Lint 0 错误 / 110 条既有警告；现有 5173 `/canvas` HTTP 200。代理未在已登录浏览器验收；未执行真实上传或付费生成、未替换 32131 检查点或部署生产。
- 站长随后在已登录页面确认缩放可用，且错误不再出现；继续反馈缩小后固定圆角过大，由 [GG-133](GG-133-canvas-proportional-image-corners.md) 处理。

## 下一步

按 GG-133 检查缩小图片的圆角，画布其他功能继续逐步验收。
