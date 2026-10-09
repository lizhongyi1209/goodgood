# SecondaryNav

侧栏右边的二级栏：资产文件夹、对话历史。

## 规格
- 宽 `secondary-width`，右侧 1px `line`，内边距 20px 12px。
- 项 36px 高、`radius-sm`；可带 16px 图标；右侧数量 `caption`、`muted`。
- 当前 `fill-selected`；悬停时数量换成「…」更多按钮。
- 分组标题 `caption`、`muted`，右侧可放新建按钮。

## 状态
- 改名：原位变成 `soft` 输入框加 `ink` 描边，回车确认、Esc 取消；重名或为空时下方一行说明。
- 拖入目标：白底 + `ink` 描边，右侧显示「+N」。
