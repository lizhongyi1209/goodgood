# ConfirmDialog

破坏性或不可撤销操作前的确认框。

## 规格
- 宽 360px，`white`、1px `line`、`radius-lg`、`shadow-lg`，内边距 20px；背后 `scrim` 遮罩。
- 标题 `subheading` 写成问句，说明一句 `body`、`muted` 写后果。
- 右下「取消」（`soft`）与确认（`action`），确认按钮写具体动作：「删除」「删除文件夹」。

## 规则
- 可以撤销的操作不弹确认，改用 Toast 的「撤销」。
- 空的对象（空组、空文件夹）直接删除。
