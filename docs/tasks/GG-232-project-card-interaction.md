# GG-232 项目卡片进入与悬停反馈

- 日期：2026-09-30
- 状态：子agent完成，已精确合入本地5173，相关专项/构建与隔离组件浏览器验证通过；原IDB类型错误阻塞全门禁，待站长手验，未部署
- 分支 / worktree：fix/GG-232-project-card-interaction / F:/goodgood-worktrees/GG-232-project-cards
- 基线：a3f29b8（GG226交接），05e90d2祖先已核验；三项目源等价当时GG116，后端边界等价verified70e10c6。未整树合并或从C6启动。
- 源提交：18ed5ecf22775f12d61d7100ce8bf82cb742e2bf，只有本任务三个项目源及docs；精确回放到GG116，禁止整树合入。
- 决策：[ADR0114补记](../decisions/0114-durable-canvas-projects.md)，改变GG226显式继续按钮入口，补记先于代码。

## 实现

子agent仅三个项目源文件：project-library.tsx、project-library.module.css、canvas-project-preview.tsx。整卡主体是独立链接/按钮，画布沿原href、旧创作沿原onRestore；预览仅展示，菜单/快照重试为独立兄弟控件、z-index高于入口，无嵌套交互。footer仅名称、更新年月日与更多菜单，继续创作按钮移除，新建创作保持。禁用/恢复状态与重命名/确认删除/错误重试沿用。

鼠标pointer，浅灰hover与预览1.015倍缩放、180ms；键盘灰色可见焦点。hover菜单/重试不触发卡片进入动效；reduce-motion禁运动。项目局部菜单容器/trigger和重命名输入去黑边框/黑焦点环，以灰底显示focus，不改公共Input/Dialog/Dropdown。隔离截图暴露原保存黑底黑字，最小局部confirm类统一提交黑底白字，取消灰底保持。原测试文件无语义修改，不新增镜像markup/CSS断言。

## 验证

- 原项目专项10/10与文档8/8（共同18/18）通过，最终文档交接再复核；子agent两TSX局部ESLint通过。build:local通过，git diff --check通过。
- check:local源码稳定后执行，后续提交按钮局部修复后重新执行：lint0错误/116警告；均停于原canvas-project-local.ts:21,35两处IDB类型错误，完整测试阶段未运行。该画布文件未编辑，未为此扩大任务。
- 忽略work/gg232-ui-review.*隔离React组件，Vite51832无真实backend代理/密钥，所有写请求拒绝；独立Chrome headless九类实际检查通过：快照失败重试不进入；旧创作名称区域鼠标与Enter进入；画布Enter原目的地；rename/delete菜单与取消不进入；无继续按钮；hover pointer/浅灰/scale1.015；菜单/输入无黑框；灰色键盘focus；reduce-motion transform none/transition0s。新增保存色彩核验白字rgb255/近黑底rgb24通过；0 pageerror/0写请求。截图已人工查看，合成数据不构成现有账户/项目浏览器验收。
- 最后精确回放三个源到GG116，与被验证源码归一化完全相同；5173项目模块HTTP200，cardEntry/renameInput在位且styles.continue不存在。代理仍verified70e10c6 / Web34208，未服务重启、迁移、上传或provider请求。隔离51832服务已按PID/命令核验后停止。

## 下一步

站长刷新5173手验真实项目卡片/hover、菜单及重命名输入。画布GG222/228/229/230/231与编辑/同步/节点源码保持；后端仍70e10c6/56迁移和唯一Worker6304。活跃核心文档已有长度债务，本次增量保留；本任务候选CURRENT_STATE/IMPLEMENTATION_PLAN150、BACKLOG100行上限保持。无需生产操作。
