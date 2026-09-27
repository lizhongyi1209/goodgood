# GG-131 — 修复画布图片缩放时的 ResizeObserver 报错

- 状态：本地实现与门禁完成，但站长复核确认报错仍在；修复方法由 [GG-132](GG-132-canvas-uncontrolled-resize.md) 替代；未部署。
- 基线：GG-130 `1e27c4a`，工作区干净。
- 现象：站长拖动画布图片的四角缩放点时，5173 vinext 开发覆盖层报告 `ResizeObserver loop completed with undelivered notifications.`
- 决策关系：仅修正尺寸测量回写的时序；不改变 [ADR 0110](../decisions/0110-canvas-image-selection-frame.md) 的外观、拖动或等比缩放决策，无需新 ADR。

## 范围与验收

- React Flow 的节点测量通知不在同一轮 `ResizeObserver` 回调中同步写回受控节点状态；同一节点的一帧内重复测量合并。
- 用户主动缩放和移动仍即时响应；四角等比缩放、图片原比例和生成结果详情导航不变。
- 卸载画布时取消待执行的帧；移除节点时不回写旧测量结果。
- 定向画布测试、本地完整门禁及现有 5173 `/canvas` HTTP 检查通过。站长负责浏览器交互验收，不执行真实上传或付费生成。

## 实施与验证

- `canvas-page.tsx` 对 React Flow 在 `ResizeObserver` 回调中发出的测量尺寸变化按节点合并，到下一动画帧再写回受控状态；指针操作的尺寸、位置和选择变化仍即时应用。移除节点时丢弃待处理测量，卸载时取消待执行帧。
- 定向画布与文档测试 14/14；`npm run check:local` 591 项 / 568 通过 / 23 跳过 / 0 失败，Lint 0 错误 / 110 条既有警告；现有 5173 `/canvas` HTTP 200。
- 未在已登录浏览器中复现拖动或确认覆盖层消失；未执行真实上传、付费生成、32131 检查点替换或生产部署。独立测试浏览器在登录页，已关闭。
- 站长随后确认四角缩放正常，但 ResizeObserver 覆盖层仍出现。GG-131 的受控节点跨帧回写未解决问题；GG-132 改为 React Flow 持有节点。
- [MDN ResizeObserver 观察错误说明](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#observation_errors) 解释了同一轮观察中尺寸写回引发错误以及跨帧处理方式。本轮针对项目自己的受控节点状态回写，不屏蔽全局错误。

## 下一步

按 GG-132 的节点所有权修复继续验证，最终由站长在已登录的 5173 `/canvas` 复核。
