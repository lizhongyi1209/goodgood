# 首页

只做一件事：让用户马上开始创作。自上而下：标题、输入面板、常用模板、灵感。

## 侧栏

- 宽 `sidebar-width`，右侧 1px `line`。顶部标志 22px 高。
- 三组导航，组间 `space-6`：首页 / 项目 / 资产；「创作」图片 / 视频 / 批量 / 对话；「管理」站长管理（仅管理员）。见 NavItem。
- 底部 AccountRow，右侧 CreditPill。

## 内容

- 右上角只放「公告」GhostButton。
- 标题「今天想创作什么？」：`display`，居中，距顶栏 `space-24`。
- Composer：宽不超过 `composer-max`，与标题间距 `space-6`，不展示参数/抽屉。Enter 后图片 / 视频使用现有默认或上次参数进入现有生成视图并立即生成；对话当前只做开发开关下的本地界面，不调用未实现接口。
- 常用模板：距输入面板 `space-18`，一行四张 TemplateCard，间距 `space-3`。
- 灵感：CategoryTabs 按内容分类（服装、摄影、广告…），下方四列 MediaTile 瀑布流，滚动到底自动加载。

## 中屏（768–1199px）

- 侧栏收为 `rail-width` 图标栏，组之间 24px 短分隔线；CreditPill 移到右上角「公告」左侧。
- 标题距顶栏、输入面板到常用模板都收为 56px；灵感三列。

## 手机（≤767px）

- 顶栏 `topbar-height`：左侧标志 20px，右侧 CreditPill 与公告图标按钮。
- 底部标签栏 `tabbar-height` + 安全区：首页、项目、资产、我的。站长管理与账户设置收进「我的」。
- 内容边距 `space-4`；标题 `display-mobile`；常用模板横向滑动；灵感两列。
