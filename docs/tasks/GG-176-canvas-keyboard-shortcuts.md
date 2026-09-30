# GG-176 · 画布常用快捷键

- 状态：GG-116 本地代码已修改，待站长手验；未提交、未部署。
- 请求：站长 2026-09-29 要求新增画布常用快捷键，并优先核对 React Flow 自带能力。
- 决策：[ADR 0108 的 GG-176 补充](../decisions/0108-standalone-canvas-image-generation.md#gg-176-addendum--canvas-keyboard-actions-2026-09-29)。

## 范围与验收

- 沿用 React Flow 自带的 Tab 焦点导航、Enter/Space 选择、Shift 框选、Ctrl/Cmd 多选、Space 拖动平移、方向键移动节点（Shift 加速）。
- 点击空白画布后可用 Ctrl/Cmd+A 全选可选的节点和连线；Delete/Backspace 删除选中内容；Escape 取消选择。快捷键提示放入空白画布右键菜单的「快捷键」子菜单。
- 删除只在画布自身、节点或连线获得焦点时发生，使用 React Flow `deleteElements` 派发既有 node/edge remove 变化；提示词、项目名称、资产改名、按钮、菜单及对话框保留各自键盘行为。删除源节点时保留服务端素材记录，但释放其本地上传/预览状态和关联参考图连线；删除生成器释放其草稿与直接参考图状态。
- 选中状态不进入项目快照；方向键移动节点产生的最终位置仍按 GG-175 内容变更流程保存。复制粘贴、撤销重做需先定义待上传文件、生成结果和引用的复制/历史边界，暂不加入。

## 实现与证据

- React Flow 官方文档：[交互默认键](https://reactflow.dev/learn/concepts/adding-interactivity)、[键盘属性](https://reactflow.dev/api-reference/react-flow#keyboard-props)、[可访问键盘操作](https://reactflow.dev/learn/advanced-use/accessibility)。本地安装版 `@xyflow/react` 的 `deleteKeyCode` 默认仅为 Backspace，且其监听在 document 上；此处禁用全局监听并在画布焦点范围内调用其内置删除 API。
- 文件：`features/canvas/canvas-workspace.tsx`、`canvas-page.tsx`、`canvas-workspace.module.css`；本任务卡、ADR 与相关交接文档。
- 验证：仅静态差异检查；按站长持续要求，未运行自动测试、构建、浏览器复测或真实上传/生成。
- 发布：未发布，生产未变。

后续变更：GG-177 将快捷键提示移至左下角地图图标旁，并补齐复制粘贴与撤销重做；本卡的右键入口和未实现范围仅记录 GG-176 当时状态。见 [GG-177](GG-177-canvas-shortcut-panel-copy-history.md)。

缺陷修正：GG-201 补齐 Shift 框选后的多选范围框焦点，使 Delete / Backspace 能一次删除全部选中内容；删除 API 与既有清理边界不变。见 [GG-201](GG-201-canvas-multi-selection-delete.md)。

## 恢复工作

- 站长在 5173 `/canvas` 手验空白画布及节点焦点下的全选、删除、取消选择；多选删除图片/视频/生成器/连线后刷新确认图和草稿保存；输入提示词、标题、资产改名与打开菜单时 Ctrl/Cmd+A、Backspace、Escape 只影响当前控件。检查方向键移动后的刷新恢复和右键快捷键提示。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
