# GG-423 新增 token

来源为已接受的 ADR 0144 组件规格；累计新增 33 个 token，设计基线的既有 token 数值全部保留。合并前第 4 个提交补充 space-14 和 control-check，其余 31 个只重新分组并补充用途；第 6 个提交将本任务新增的 logo-height 从 22px 调整为 18px，仅用于完整侧栏 Good Good 字标。

tokens.json 不再使用 homepage 分组，按语义归入 spacing、border、motion、state、control、icon、layout、type；Tooltip 从 motion 读取 preview-duration。prompt-line-height 必须等于 prompt 文字样式的行高，当前均为 24px。

| 分组 | 名称 | 值 | 用途 |
| --- | --- | --- | --- |
| spacing | `--ds-space-half` | `2px` | 模式切换容器内边距。 |
| spacing | `--ds-space-1-5` | `6px` | Tooltip 上下内边距。 |
| spacing | `--ds-space-2-5` | `10px` | 导航图标与文字间距、导航及分组标题左右内边距。 |
| spacing | `--ds-space-14` | `56px` | 中屏和手机首页标题、常用模板、灵感区块的上间距。 |
| border | `--ds-border-width` | `1px` | 默认控件、侧栏分隔线及面板描边厚度。 |
| border | `--ds-border-strong` | `1.5px` | 失败素材虚线描边及链接输入框强调描边厚度。 |
| border | `--ds-focus-width` | `2px` | 键盘可见焦点环厚度。 |
| border | `--ds-focus-offset` | `2px` | 键盘可见焦点环与控件外缘的偏移。 |
| motion | `--ds-motion-duration` | `160ms` | 控件颜色与媒体操作显隐的过渡时长；减少动态效果时禁用。 |
| motion | `--ds-preview-duration` | `180ms` | Tooltip 悬停提示的出现延迟。 |
| motion | `--ds-motion-easing` | `ease` | 控件颜色与媒体操作显隐过渡的缓动曲线。 |
| motion | `--ds-spinner-duration` | `1s` | 加载指示器旋转一周的时长；减少动态效果时停止。 |
| state | `--ds-opacity-disabled` | `0.5` | 普通按钮及上传上限状态的禁用透明度。 |
| state | `--ds-opacity-menu-disabled` | `0.4` | 菜单禁用项透明度。 |
| state | `--ds-layer-control` | `1` | 媒体卡片操作按钮相对图片的叠放层级。 |
| state | `--ds-layer-tabbar` | `20` | 手机固定底部标签栏的叠放层级。 |
| control | `--ds-control-toggle` | `28px` | 模式切换按钮、账户头像及链接提交按钮的边长。 |
| control | `--ds-control-check` | `22px` | 媒体卡片选择控件的宽高。 |
| control | `--ds-credit-height` | `24px` | 积分胶囊高度。 |
| icon | `--ds-icon-rail` | `18px` | 中屏图标侧栏的导航图标边长。 |
| icon | `--ds-icon-send-stroke` | `2px` | 向上箭头发送图标的线条厚度。 |
| layout | `--ds-logo-height` | `18px` | 完整侧栏 Good Good 字标高度。 |
| layout | `--ds-add-reference-menu-width` | `264px` | 添加参考素材菜单宽度。 |
| layout | `--ds-empty-icon-size` | `48px` | 空状态图标容器边长。 |
| layout | `--ds-preview-max-height` | `70dvh` | 首页媒体预览弹窗中媒体的最大高度。 |
| layout | `--ds-template-aspect` | `4 / 3` | 常用模板封面的裁切比例，不用于灵感作品原始比例。 |
| layout | `--ds-home-columns-wide` | `4` | 桌面常用模板网格与灵感瀑布流的列数。 |
| layout | `--ds-home-columns-medium` | `3` | 中屏灵感瀑布流的列数。 |
| layout | `--ds-home-columns-narrow` | `2` | 手机灵感瀑布流的列数；模板滑动卡片宽度独立按 2.3 张视区计算。 |
| layout | `--ds-composer-lines-min` | `2` | 提示词输入框的最小可见文字行数。 |
| layout | `--ds-composer-lines-max` | `8` | 提示词输入框自动增高的最大文字行数，超出后滚动。 |
| type | `--ds-weight-semibold` | `600` | 积分数值与空状态标题的半粗字重。 |
| type | `--ds-prompt-line-height` | `24px` | 计算提示词输入框行数的行高；必须等于 prompt 文字样式的行高。 |

首页中屏和手机的标题、常用模板、灵感上间距使用 space-14，不借用 reference-slot；媒体选择控件使用 control-check，不借用 logo-height。手机底栏按实际子项自动均分列宽，不依赖作品列数；无障碍隐藏标签的 1px 尺寸直接定义，不借用描边 token。

第 5 个截图审查修正沿用这 33 个 token，当时不增加或修改数值。手机模板卡片采用 `(100% - space-3) / 2.3`，home-columns-narrow 只表示手机灵感的两列布局；菜单与底栏继续使用 white / shadow-md / line / ink / muted / fill-hover。

第 6 个提交明确区分字标与 G 标志：完整侧栏使用 logo-height（18px）；中屏图标栏和手机顶栏使用既有 icon-lg（20px），不借用 logo-height。不新增 token，除 logo-height 外数值保持。
