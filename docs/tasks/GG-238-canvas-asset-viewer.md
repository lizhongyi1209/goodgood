# GG-238 画布资产方形添加卡与图片查看器

- 日期：2026-09-30
- 状态：子agent实现/源码审阅/精确回放完成，UI待手验，未部署
- 分支/worktree：feature/GG-238-canvas-asset-viewer / F:/goodgood-worktrees/GG-238-canvas-asset-viewer
- 基线：verified70e10c6祖先核验；从GG235 c40f786接续，面板/CSS/add-card与当前GG116等价，仅捕获已有资产页调用方到061b8b7，不bulk merge此基线。
- 决策：ADR0108实施前补记，替换GG233/234/235的hover大图展示；添加1:1要求保持，修复菜单asChild令data-slot变化后选择器失效的实现缺陷。

## 范围与验收

首位添加卡填满单个瀑布流列宽且1:1，保留菜单、上传/链接/归档与原灰色。移除媒体hover/focus的额外预览图；图片右上常驻白底圆角放大图标，明确点击后在画布内打开大图，右侧竖排图片缩略图，按当前可见图片范围/顺序滚轮或方向键切换，不跳转资产路由或更改画布。关闭/Escape恢复触发器焦点，原图片比例完整显示，加载/失败与有界重试区分，减少动效偏好保持。视频/音频保留当前静止类型呈现与失败重试，不扩展新播放器范围。

现有generated图片详情在app/page.tsx中已有stage/竖rail/滚轮导航，上传图片在asset-workspace.tsx为单文件Dialog。最小提取共用图片查看器供画布与现有资产页上传图片两个调用方使用，保留generated详情路由/提示参数/下载与原视频音频播放器。局限panel/CSS、asset-workspace局部调用方及新viewer模块，根维护本任务文档；不碰canvas-page/workspace/editor、全局CSS、项目四列GG237或任何后端/同步/数据。

## 交接与验证边界

沿用当前画布源码/diff审阅、不功能复测的交付约束，不install/tests/check:local/typecheck/build/浏览器/API/真实上传/生成/服务或数据库。先静态核对既有能力与复用边界，隔离实施，根审阅键盘/焦点/滚轮/高度与生命周期后仅精确回放061b8b7以后的增量到GG116；其它窗口改动保留。现有后端verified70e10c6/56迁移与唯一Worker保持，无新运行修复或生产授权。实现提交16a8e202b3c6ef68e9d2eac19f8bb89aa21b9c3b，五源增量apply预检通过后回放GG116，归一化换行全文等价；staged/source diff检查通过，未功能复测，UI手验待站长。

## 静态交付证据

- 五源：panel TSX/CSS、asset-workspace调用方、新image-viewer TSX/CSS；无其它实现文件、节点/同步/路由/API/全局CSS变化。
- asChild将data-slot透传为dropdown-menu-trigger，button.addCard[data-slot]不依赖具体值，覆盖默认h9/SVG尺寸，保留busy/焦点与灰色；现有masonry自然测方卡高度。
- 放大button是改名role=button的兄弟，使用原data-asset-media-control/pointer guard，不误拖/改名；仅当前visible图像按既有序进入rail。
- viewer portal中的stage ref挂载后native passive:false滚轮，纵向delta归一化/18累积/280ms节流，ctrl/meta/横向保持；rail自身滚动和点击。箭头边界停留；listener/timer清理。
- ESC capture preventDefault/stopPropagation后仅关闭viewer，内容keyboard隔离画布；onCloseAutoFocus显式返回捕获且connected的HTMLElement。原图contain、载入后浅淡入，reduce禁动效/smooth；transform/translate none消除Dialog默认居中偏移。
- loading/失败有手动有界retry，丢selected/空范围有准确提示；asset页rail仅reference，generated仍onOpenGenerated，旧video/audio播放器保留。
- 根审阅和精确patch预检/五源等价通过，源码提交与文档分开保存；不运行tests/check:local/typecheck/build/浏览器或真实请求，手验不宣称已通过。

## 下一步

以后续任务卡和 GG-239 当前检查点为准；本卡保留当时范围与证据。
