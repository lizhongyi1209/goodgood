# ModeGrid

视频的六种生成方式，三列选项格。

## 规格
- 三列、间距 `space-2`；每格 `control-field` 高、`radius-md`，16px 图标 + 13px 文字。
- 未选中 `soft` 底；选中 `white` + 1.5px `ink` 内描边 + 600。
- 图标：文生视频 `Type`、首帧 `Image`、首尾帧（自绘双框）、全能参考 `Layers`、视频编辑 `Pencil`、视频延长 `MoveHorizontal`。

## 规则
- 切换时保留提示词，只清掉新方式不支持的素材，并用 InlineNotice 说明。
