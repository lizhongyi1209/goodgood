# NavItem

侧栏导航项，完整侧栏与中屏图标栏两种形态。

## 规格
- 完整：`control-md` 高，左右 10px，`radius-sm`；16px 图标 + `nav` 文字，间距 10px。
- 图标栏：40px 见方，图标 18px，必须有 `aria-label` 与 Tooltip；组之间 24px 短分隔线。
- 当前页 `fill-active` + `aria-current="page"`；悬停其他项使用 `fill-hover`，当前项悬停时仍保持 `fill-active`，完整侧栏与图标栏一致。

## 分组
- 首页 `House`、项目 `Workflow`、资产 `Library`。
- 创作：图片 `Image`、视频 `SquarePlay`、批量 `Images`、对话 `MessageSquare`。
- 管理：站长管理 `UserCog`（仅管理员）。
