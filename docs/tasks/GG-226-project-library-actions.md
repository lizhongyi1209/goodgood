# GG-226 项目界面管理与画布快照

- 日期：2026-09-30
- 状态：已实现并精确合入本地5173，专项/构建及后端运行验证通过；全门禁被原画布类型错误阻塞，待手验，未部署
- 分支 / worktree：前端 feature/GG-226-project-library / F:/goodgood-worktrees/GG-226-project-library；后端 feature/GG-226-project-management-backend / F:/goodgood-worktrees/GG-226-project-backend。
- 基线：前端3d7fe5e，后端verified05e90d2，祖先已核验；当前5173为GG116，仅精确任务差异回放。
- 前端整合源提交：222a79487ddf2c7d70df214f2a56f8a035306391（含GG227三行）；后端运行提交70e10c6保持不变。
- 决策：[ADR0114补记](../decisions/0114-durable-canvas-projects.md)。用户改变原静态项目卡片决策，补记先于实现。

## 实现

去掉GOODGOOD PROJECTS；两类项目复用shadcn菜单/弹框，支持名称校验、重命名和确认删除，失败保留并可重试；日期显示更新于 YYYY年MM月DD日。新增功能收敛features/projects，保留恢复/新建创作。画布只读快照来自真实已存节点位置/尺寸/连线及授权媒体，优先本地脏文档和本机活动页、否则第一页；可视卡片延迟读入，空/加载/失败与素材重试明确，不挂载编辑器、同步或生成。旧创作使用真实批次封面，无假示例图。

画布PATCH仅改名称并CAS，DELETE写0056独立退役记录，GET/PUT返回410并从索引过滤，未同步项目也能先退役，旧窗口无法自动保存复活。事务共用workspace独占锁，授权隔离不变；原画布文档/素材/任务/正常积分及历史币表保留。旧创作仅名称PATCH保留整状态，DELETE复用archive。远端成功后本地清理失败仍视为已删除并提示重试；只清该项目非共享待传文件。

另一个会话的GG222/228/229/230/231画布编辑器/选择/同步/节点均未覆盖；仅新增canvas-project-boundary管理请求。GG227仅合入footer三个删除行。活跃Next画布detail route保留原GET/PUT，单独增PATCH/DELETE；schema.ts保留此前canvasProjects定义。

## 验证与运行

- 稳定源码执行：GG226前端/后端 + GG059导航 + GG217退役导航 + 文档专项40/40通过；独立后端GG226/GG218/m4-projects 25/25通过，后端typecheck通过。测试使用注入mock，无真实provider/DB写入。
- build:local通过。修正新增lint错误后重跑check:local：lint 0错误/116警告，停在原canvas-project-local.ts:21,35两处IDB类型错误，完整测试阶段未运行；该文件与基线相同。
- 精确回放后5173 /projects、主页模块和两个新项目模块均HTTP200，主页无旧英文标题。活跃树单独tsc显示原IDB两处和独立canvas-page pathOptions/selection-controls bounds类型问题共7条，均在未编辑画布源码；新增项目/路由无错误。此核对不代替登录浏览器手验。
- 后端源提交70e10c6ae6bd83542ba870f54059b54b999e9fdf；build:checkpoint / verify:checkpoint通过。sourceHash 46621e22610407f820fc135ff982885961128ac7899119c4667ccd375aff6988，artifactHash c1dcb50c71a4853c03379f1d4b871291153bc956ce9af99d7df7456f312653b1。
- 本地54449/goodgood：两次核验active jobs/outbox/冻结积分/Valkey ready/processing均0，再串行停旧Web25808/Worker6240；只applyMigrations应用0056，无seed。56迁移，14张既有表计数/fingerprint完全相同，2画布/1创作项目保留，新增退役记录0。
- 当前Web32131 PID34208/唯一Worker32142 PID6304 ready五项ok，5173 PID34440代理verified70e10c6；数据库/队列/对象存储不切换。未真实重命名/删除用户项目、上传或生成，无生产操作。

## 交接与下一步

刷新现有5173手验项目快照、菜单/弹框、更新年月日；新项目功能已就绪，现有用户数据不为验收自动改写。后续运行须接续70e10c6/0056，勿启动旧币Worker或并行第二Worker。原画布类型缺口和活跃文档长度债务由所属会话另行处理；活跃核心文档已先超限，本次只保留并增量更新，自有候选遵守150/100上限。
