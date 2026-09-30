# GG-177 · 画布快捷键入口、复制粘贴与撤销重做

- 状态：GG-116 本地代码已修改，待站长手验；未提交、未部署。
- 请求：站长 2026-09-29 要求把快捷键提示移到左下角地图图标旁，以图标表示，并补齐复制粘贴和撤销。
- 决策：[ADR 0108 的 GG-177 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-177-addendum--shortcut-panel-copy-and-edit-history-2026-09-29)。

## 范围与验收

- 左下角地图按钮旁有键盘图标；点击显示快捷键提示，点击外部关闭。空白右键菜单只保留画布动作。
- 画布获得焦点时，Ctrl/Cmd+C 复制选中节点及两端都被选中的参考图连线，Ctrl/Cmd+V 在附近粘贴并选中新副本；素材和已生成结果沿用已有服务器资产，不重复上传、生成或扣费。
- Ctrl/Cmd+Z 撤销画布节点位置、尺寸、添加、删除、粘贴与连线变更；Ctrl/Cmd+Shift+Z 或 Ctrl/Cmd+Y 重做。输入框保留原生文本撤销。项目自动保存最终编辑结果。
- 历史只涵盖稳定的画布图。上传中、上传失败及生成中的对象不能复制，上传/生成和素材库记录不由画布撤销回滚；这些外部生命周期变化会重置画布编辑历史。历史仅保留在当前标签页内。

## 实施与证据

- React Flow 提供选中、删除和节点状态 API；其[复制粘贴](https://reactflow.dev/examples/interaction/copy-paste)和[撤销重做](https://reactflow.dev/examples/interaction/undo-redo)是 Pro 示例，不是安装包内现成操作。本项目接入本地编辑历史，沿用已有素材/生成/自动保存边界。
- 文件：`components/ui/zoom-select.tsx`、`features/canvas/canvas-workspace.tsx`、`canvas-workspace.module.css`、`canvas-page.tsx`；本任务卡、ADR、UX 流程与交接文档。
- 验证：静态差异检查无错误。按站长要求，未运行自动测试、构建、浏览器复测或真实上传/生成。

## 恢复工作

- 完成实现后由站长在 5173 `/canvas` 手验图标位置、菜单关闭、复制粘贴、撤销重做以及输入框 Ctrl/Cmd+Z；刷新确认编辑结果保存。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
