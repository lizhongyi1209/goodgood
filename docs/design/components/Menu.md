# Menu

所有弹出菜单：更多操作、用于创作、模型选择、移动到。

## 规格
- `white`、1px `line`、`radius-popover`、`shadow-md`，内边距 8px。
- 菜单项 36px 高、`radius-item`，16px 图标 + `nav` 文字；带说明时第二行 `caption`、`muted`。
- 悬停 `fill-hover`；单选的当前项 `fill-selected` + 右侧对勾；不可用 40% 不透明度。
- 键盘高亮用 `fill-hover`，不画外框；保持方向键与 Escape 焦点返回。菜单使用不透明 `white` 与 `shadow-md`，不继承会造成透底的淡入淡出。
- 分组用 1px `line` 分隔线，可选顶部 `caption` 标题。

## 规则
- 删除等破坏性项放在最后、分隔线之后，颜色不变，点击后走 ConfirmDialog。
- 模型菜单不写价格。
