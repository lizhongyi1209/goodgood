# GoodGood 设计系统

> 状态：**已接受**（2026-10-10），见 [ADR 0144](../decisions/0144-design-system-v3.md)。GG-423 从 5e404e2 先迁移首页，先界面、后接已有功能；其他页面保持原样，画布范围例外继续有效。历史视觉记录见 [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)。

- 数值：[tokens.json](tokens.json)；代码里对应 `app/design-tokens.css` 的 `--ds-*` 变量（首页按 GG-423 接入，其他页面逐页迁移）。
- 页面：[首页](home.md)、[创作页（图片 / 视频 / 批量）](create.md)、[对话](chat.md)、[资产](assets.md)、[画布](canvas.md)、[迁移对照](migration.md)
- 组件：
  - 基础：[ConfirmDialog](components/ConfirmDialog.md)、[EmptyState](components/EmptyState.md)、[GhostButton](components/GhostButton.md)、[InlineNotice](components/InlineNotice.md)、[Menu](components/Menu.md)、[ScrollArea](components/ScrollArea.md)、[Toast](components/Toast.md)、[Tooltip](components/Tooltip.md)
  - 导航：[AccountRow](components/AccountRow.md)、[CreditPill](components/CreditPill.md)、[NavItem](components/NavItem.md)、[SecondaryNav](components/SecondaryNav.md)
  - 输入面板：[AddReferenceMenu](components/AddReferenceMenu.md)、[Composer](components/Composer.md)、[ModeToggle](components/ModeToggle.md)、[ReferenceThumb](components/ReferenceThumb.md)、[SendButton](components/SendButton.md)
  - 生成设置：[DurationSlider](components/DurationSlider.md)、[FieldSelect](components/FieldSelect.md)、[GenerateButton](components/GenerateButton.md)、[ModeGrid](components/ModeGrid.md)、[SegmentedControl](components/SegmentedControl.md)、[SettingsPanel](components/SettingsPanel.md)、[Switch](components/Switch.md)
  - 媒体：[MediaInfoPanel](components/MediaInfoPanel.md)、[MediaTile](components/MediaTile.md)、[MediaViewer](components/MediaViewer.md)
  - 生成记录：[RunGroup](components/RunGroup.md)
  - 批量：[GroupCard](components/GroupCard.md)
  - 对话：[ChatMessage](components/ChatMessage.md)
  - 资产：[SelectionBar](components/SelectionBar.md)
  - 首页：[CategoryTabs](components/CategoryTabs.md)、[TemplateCard](components/TemplateCard.md)

## 基础

GoodGood 是简体中文、以图片为中心的 AI 视觉创作工作台。黑字白底，灰色只做辅助，蓝色只代表积分，让作品成为画面里最主要的颜色。所有界面从这里取值；没有合适的值时先用最近的 token，不新写数字。

## 文案

- 简体中文，短而具体。按钮写动作本身：「生成」「下载」「用于创作」，不写「提交」「OK」。
- 同一动作全程同名：「移动到」→「正在移动…」→「已移动 5 项」。进行中一律「正在…」，用 `…`。
- 固定名称：首页、项目、资产、图片、视频、批量、对话、站长管理；首帧、尾帧、源视频、做同款、使用模板、用于创作。
- 错误写清发生了什么、怎么办，并说明积分是否已退回；不道歉、不用感叹号。
- 价格只出现在生成按钮里。模型列表、模板、详情都不写单价。
- 不写常驻说明文字：只在触到限制或出错时提示。
- 不用 emoji。数字用等宽数字（`tabular-nums`）。

## 颜色

- 文字默认 `ink`；说明与分组小标题 `muted`；`quiet` 只用于输入框占位符。
- 只用中性灰。地面 `canvas`，浮起表面 `white`，一个区域最多一层灰底。
- 可编辑控件：`soft` 底、无描边；打开或选中时加 1.5px `ink` 内描边。
- 素材格子：已添加用 `fill-active`，空格子与添加按钮用 `soft`。
- 交互只改灰度：悬停 `fill-hover`，当前 / 开启 `fill-selected`，按下 `fill-active`。
- 主操作只有一种：`action` 底、`action-fg` 字，每个视图最多一个。
- `accent` 只用于积分与付费，底色配 `accent-soft`。
- 错误不用红色：`ink` 文字加提示图标，失败格子用虚线框，留在原位。
- `edge-live` 只用于画布连线，`annotation` 只用于图片框选标注。

## 字体

- 字族 `sans`：Inter（自托管 latin 子集）+ 系统中文字体。中文不加载网页字体。`brand` 只属于标志。
- 字号只用文字样式里的九档；中文不小于 12px，12px 不用 `quiet`。
- 字重只用 400 / 500 / 600。必须在 Windows 上也显得粗的文字（标题、余额）用 600。

## 尺寸与圆角

- 间距只取 `space-*`。控件高度取 `control-*`；所有素材格子都是 `reference-slot` 见方。
- 圆角按层级：小控件 `radius-sm`，卡片与媒体 `radius-md`，缩略图与弹窗 `radius-lg`，菜单 `radius-popover`，输入面板 `radius-xl`，胶囊 `radius-pill`。
- 嵌套圆角已写成 token：`radius-xl` 里用 `radius-lg`，`radius-popover` 里用 `radius-item`，`radius-item` 里用 `radius-xs`。

## 表面与阴影

- 浮起表面 = `white` + 1px `line` + 阴影：输入面板与菜单 `shadow-md`，弹窗 `shadow-lg`，画布工具栏 `shadow-sm`，分段切换选中项 `shadow-xs`。
- 卡片与面板只描边、不加阴影。不写新的阴影值。
- 遮罩统一 `rgba(17,17,17,.32)`。

## 布局

- 页面骨架：侧栏 `sidebar-width` →（可选）二级栏 `secondary-width` → 内容区。二级栏用于对话历史和资产文件夹。
- 三档响应：≥ `breakpoint-lg` 完整侧栏；`breakpoint-md`–`breakpoint-lg` 图标栏；更小为顶栏 + 底部标签栏。换档只改导航形态，不改控件。
- 手机上点击目标不小于 40px。

## 滚动

- 统一 ScrollArea：6px 悬浮滚动条，不占宽度、无轨道。
- 滚动区上下固定的区域保持纯 `white`，不加分隔线和阴影。

## 图标

- lucide-react，`icon-md` 16px，描边 1.5px，颜色 `ink`。只用 `icon-sm` / `icon-md` / `icon-lg` 三档。
- 并排的图标外轮廓必须一致（都是方框或都是圆形）。
- 固定对应：

| 含义 | 图标 | 含义 | 图标 |
| --- | --- | --- | --- |
| 首页 | `House` | 项目 / 工作流模板 | `Workflow` |
| 资产 | `Library` | 文件夹 | `Folder` |
| 图片 | `Image` | 视频 | `SquarePlay` |
| 批量 | `Images` | 对话 | `MessageSquare` |
| 积分 | `Zap`（实心） | 快速生成 | `Zap`（空心） |
| 用于创作 | `Sparkle` | 站长管理 | `UserCog` |

- `SquarePlay` 的三角向右平移 0.75（24 网格）。发送箭头描边 2px。

## 动效

- 状态切换 160ms ease，预览出现 180ms。只回应用户操作，不做入场动画。
- 尊重 `prefers-reduced-motion`。

## 状态

- 焦点：2px `focus` 外框，偏移 2px。禁用：50% 不透明度。
- 加载：有真实进度才画进度条，否则灰色占位 +「正在…」。
- 失败：原位虚线框，写原因，给「重试」或可行的下一步。
- 破坏性操作先用 ConfirmDialog 确认；可撤销的操作用 Toast 提供「撤销」。

## 标志

- 浅色背景 `goodgood-logo.svg`，深色背景 `goodgood-logo-white.svg`；侧栏中高 22px。
- 小于 24px 只用 `goodgood-app-icon.svg` 或 `goodgood-mark.svg`。
- 不改字、不改色、不拉伸。正文里写「GoodGood」，只有标志本身小写。
