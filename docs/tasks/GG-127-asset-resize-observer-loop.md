# GG-127 — 修复资产网格的 ResizeObserver 报错

- 状态：本地修复与门禁完成，待站长在 5173 手动确认；未部署。沿用 `F:/goodgood-worktrees/GG-116` 与 `feature/GG-116-asset-history-actions`，未切分支。
- 基线：GG-126 `a59590a`。
- 现象：站长在打开 `/assets` 时看到 vinext 开发覆盖层报告 `ResizeObserver loop completed with undelivered notifications.`
- 决策关系：仅修正 GG-121 六列瀑布流的尺寸调度，不改变已确认的资产展示或数据决定；无需 ADR。

## 范围与验收

- `ResizeObserver` 回调只收集变化，不在同一轮写 `gridRowEnd`；卡片尺寸写入合并到下一帧，清理时取消未执行的帧。
- 资产网格仍保持最多六列、响应式与图片/视频原比例排列；列表模式不受影响。
- 定向测试、完整本地门禁与 `/assets` HTTP 检查通过。站长继续做浏览器确认，不自动操作真实资产。

## 实现与证据

- `asset-workspace.tsx` 的瀑布流仍在首次布局时同步定位卡片；随后 ResizeObserver 只收集变化并按帧合并测量与 `gridRowEnd` 写入。卸载或切换视图时取消未执行帧，避免旧卡片写入。
- 定向资产与文档测试 10/10、类型检查及文件级 ESLint 通过。完整 `npm run check:local` 590 项 / 567 通过 / 23 跳过 / 0 失败，Lint 0 错误、110 条既有警告。
- 5173 `/assets` HTTP 200；这只证明页面可访问，不代表浏览器里的尺寸观察错误已手动验收。
- [MDN ResizeObserver 错误说明](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#observation_errors) 记录了同一帧写回被观察元素会触发此错误，以及使用 `requestAnimationFrame` 延迟的处理方式。本次没有屏蔽全局错误、改数据或自动操作真实资产。

## 恢复工作与下一步

- 站长刷新现有 5173 `/assets` 检查覆盖层是否消失；自动门禁与 HTTP 检查不替代这项浏览器确认。
