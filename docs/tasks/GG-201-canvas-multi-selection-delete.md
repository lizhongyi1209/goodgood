# GG-201 · 画布多选内容整体删除

- 状态：GG-116 本地缺陷已修复，待站长手验；未提交、未部署。
- 请求：按住 Shift 框选或多选画布内容后，Delete / Backspace 应一次删除全部选中节点与连线。
- 决策：这是 GG-176 已确认快捷键行为的缺陷修正，不改变产品决定，无需新 ADR。

## 根因

React Flow 在 Shift 框选结束后会把键盘焦点放到 `.react-flow__nodesselection-rect` 多选范围框。GG-176 的画布快捷键守卫只接受画布根、单个节点或连线作为事件目标，因此多选范围框上的 Delete / Backspace 会在调用 `deleteElements` 前被拦截。

## 范围与验收

- 画布或 React Flow 内部非交互元素持有焦点时，Delete / Backspace 收集当前全部选中节点和边，并通过一次 React Flow `deleteElements` 调用整体删除。
- Shift 框选、多选节点与同时选中的连线均适用；删除节点时由 React Flow 一并移除连接边。
- 继续通过现有 `onNodesChange` / `onEdgesChange` 路径取消本地上传、回收 Blob URL、移除生成器草稿和直接参考图、取消连接引用转换、记录编辑历史并触发项目自动保存。
- `input`、`textarea`、`select`、按钮、链接、contenteditable、文本框、菜单、对话框和 `.nokey` 区域保持原生键盘行为，不误删画布内容。

## 实现与验证

- 文件：`features/canvas/canvas-workspace.tsx`，以及本任务卡与当前交接文档。
- 修复：画布键盘守卫接受当前画布内 `.react-flow` 的所有非交互后代，包括 React Flow 自动聚焦的多选范围框；删除仍沿用原有批量 `deleteElements` 与清理链路，没有新增旁路状态删除。
- 验证：仅运行 `git diff --check`。按站长持续要求，未运行自动测试、构建或浏览器复测。

## 恢复工作

- 由站长在 5173 `/canvas` 用 Shift 框选图片、视频、生成器和连线，分别按 Delete 与 Backspace，确认整批删除、撤销恢复和刷新后的项目状态。
- 在提示词、项目名称、资产改名、按钮、菜单或弹框获得焦点时按相同按键，确认只影响当前控件。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
