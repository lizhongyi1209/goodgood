# GG-220 PC端展开左侧功能栏与Home入口

- 日期：2026-09-30
- 状态：本地实现/精确整合完成；导航专项与构建通过，全门禁有现有画布类型错误，未部署。
- 分支 / worktree：`feature/GG-220-expanded-sidebar-home` / `F:/goodgood-worktrees/GG-220-home-sidebar`
- 基线：verified05e90d2；当前GG-116主页和静态依赖快照单独保存为6f38c28，不整树合入。
- 决策：[ADR0118](../decisions/0118-expanded-desktop-sidebar-home.md)取代ADR0111的PC仅图标窄栏。

## 范围与验收

PC端（720px以上）左侧默认206px展开，图标和名称常驻；首入口Home房屋图标、首页标签/可访问名称与data-nav=home，继续复用handleCreateNav和内部create/项目上下文。账户、角色权限、选中/键盘焦点、资产轻提示、G26px与手机布局保持；移动同义主入口同步首页。独立画布不改，无新增折叠、偏好、路由或后端功能。

## 实现与证据

- 子agent仅实施app/page.tsx、app/globals.css；根更新原GG059导航断言为Home语义，维护ADR/文档、验证并精准回放这三个文件。当前5173源与CSS均200且已含Home/206px；后端05e90d2/PID25808来源verified不变，无服务重启。
- 源差异仅侧栏宽度/图标文字/底部账户显示与Home入口；原handleCreateNav、720px移动断点、角色守卫、资产动画、正常积分/平台币退役保留。G品牌和画布各自状态不覆盖。
- 一次check:local：lint0错误/116警告，类型检查被features/canvas/canvas-project-local.ts:21,35的Promise<unknown>/可空Promise阻塞。该文件与修改前6f38c28基线内容一致，本任务没有编辑它；不宣称全门禁通过。
- 独立build:local通过；GG059/画布路由/GG217导航专项12/12，文档连续性8/8与diff检查通过。未浏览器视觉验收、provider请求或DB写入。
- 画布会话并行GG-219缩小头部。一次目录编号碰撞误复制基线后，恢复了全部非画布内容并移除自己新增的临时依赖；剩余内容差异仅画布会话原三文件，未覆盖其实现。备份%TEMP%/goodgood-sidebar-collision-copy。后续只使用GG-220隔离树。
- 日志：%TEMP%/goodgood-gg220-check.log、goodgood-gg220-build.log（UTF16LE）；活跃回放前备份%TEMP%/goodgood-gg220-integration。

## 恢复工作与下一步

下一步站长刷新5173手验PC展开/Home及手机同义入口。两处既有IDB类型问题留给画布会话独立处理，再运行完整门禁；不以本任务扩大画布修复。后续只合入本任务提交相对6f38c28的差异，不带入前端快照，不修改verified05e90d2/55迁移或生产。
