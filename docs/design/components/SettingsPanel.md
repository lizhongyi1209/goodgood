# SettingsPanel

创作页左侧的设置面板外壳。

## 规格
- 宽 `panel-width`，`white`，右侧 1px `line`。
- 标题行 64px：`subheading` 标题 + 右侧「清空」。设置区左右 `space-6`，字段间 `space-4`，字段标题 `label`。
- 底部固定生成区：内边距 16px 24px 20px，放 GenerateButton；积分不足时上方加积分提示条。
- 设置区独立滚动（ScrollArea），生成区始终纯 `white`。

## 规则
- 图片、视频、批量共用这个外壳，只换字段。控件一律 `soft` 底、无描边。
