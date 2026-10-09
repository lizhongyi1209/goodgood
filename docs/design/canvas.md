# 画布

画布与页面用同一套 token。React Flow 的样式通过 `.react-flow` 上的 `--xy-*` 变量映射到 token（如 `--xy-edge-stroke` → `muted`），不逐个覆盖 `.react-flow__*`。

## 节点

- 共用外壳：`white`、1px `line`、`radius-md`；选中 2px `ink` 外框。
- 标题在外框左上方 6px，`micro`，单行省略；组名同样式。
- 未生成的空节点：`soft` 灰卡，中央图标（`Image` / `FileText` / `SquarePlay`），按目标比例显示。
- Radix 浮层放在 `ReactFlowProvider` 内。

## 连线

- 默认 `muted` 实线 1.2px；悬停与拖动预览为 `edge-live` 的 `7 4` 虚线流动（1.3s 线性）；减少动效时不流动。

## 工具

- 节点快捷工具栏：标题上方 `space-3`，`white`、1px `line`、`radius-md`、`space-1` 内边距、`shadow-sm`；按钮 `control-sm`、`radius-sm`。不随画布缩放。
- 左下常驻工具（资产、地图、快捷键、缩放）共用一块底板：`white`、1px `line`、`radius-md`、3px 内边距，无阴影。

## 生成面板

- 与首页 Composer 同一外壳（`radius-xl`、`shadow-md`），在节点下方 `space-3`，最大宽 660px。
- 提示词 `prompt`，三行起，八行后内部滚动；素材格子见 ReferenceThumb；生成按钮是面板内唯一的 `action`。

## 组

- 组框 `radius-lg`、1px `line`、低透明灰底，无阴影；内容上下各留 28px。组名前可放用户选的 emoji。

## 设备

- 画布编辑只在 ≥ `breakpoint-md` 提供；平板上点击区域不小于 40px。
- 手机打开项目时显示说明页：项目名、「画布编辑需要在电脑或平板上进行」、「复制项目链接」。不是错误样式。
