# GG-265 · 画布资产移入文件夹后移除原位置

- 日期：2026-10-01；状态：子agent完成并精确接入实际5173，根定向验证完成，辅助目录已退役；未部署，浏览器验收由用户完成。
- 范围与验收：画布资产侧栏图片移入文件夹应为移动；确认成功后从原位置移除，目标文件夹出现同一素材，刷新/重新打开保持；失败保留原位置及重试。不得复制素材、重上传或影响画布节点。
- 决定：修复GG-256既有移动承诺；沿用授权归档接口、保留真实标签/名称/资产身份，根列表不再把已归档图片当作未归档项目展示。若实现发现涉及其他已确认决策先向根报告。
- 分支 / worktree：子agent `folder_move_membership` 拥有 `fix/GG-265-canvas-folder-move` / `F:/goodgood-worktrees/GG-265-canvas-folder-move`，从当前干净`2ff0113`登记后的`26b28af`开始。实际5173在GG-116，不切换共享分支。
- 文件边界：features/canvas/canvas-asset-panel.tsx、实际helper canvas-folder-drop.mjs/d.mts、tests/gg265-canvas-folder-membership.test.mjs和本卡；初始登记的move文件名为笔误，根已确认以drop为准。共享产品/交接文档由根维护，不修改GG-264查看器、导航、计费、生成、存储API。
- 原因与边界：GG-256通过既有PUT更新同一kind:id的folderId，服务端事务upsert保留displayName，未复制素材；panel确认后也正确合并返回arrangement并广播刷新。重复展示直接来自根visibleItems无条件返回data.items。本次恢复既有移动承诺，不新增ADR、CAS/持久化机制或全局集合语义。
- 实现：selectCanvasFolderItems统一按已确认归属筛选。根目录只显示无arrangement、null归属及失效目录归属素材；现存文件夹仅显示相同folderId。保留原有顺序、对象引用、名称/标签和完整data.items，readyAssetKeys不受影响；当前文件夹删除后安全回根。返回按钮aria-label相应简化为「返回资产」。请求中/失败不更改归属，确认成功自动从原位置消失，已有重试/读取刷新/卸载保护保持。
- 验证：子与根`node --test tests/gg256-canvas-folder-drop.test.mjs tests/gg265-canvas-folder-membership.test.mjs`均12/12通过；新增4项覆盖kind复合身份/顺序/无修改、loading/empty/失效目录、根移动确认前保留/确认后同对象唯一显示/重新读取、失败保持及标签/名称重试。根相关panel/helper/声明/测试ESLint零错误/警告；实际两个Vite模块HTTP200含新过滤接线，diff通过。均为内存合成集合/Promise，无真实资源写入；不做浏览器验收、全面门禁/构建、服务重建或真实素材写入。
- 集成：子限定提交`fb7cc90`精确回放为`b1f364c`，GG-264初始contain修正和并行GG-263保留。仅画布侧栏按归属呈现，大厅全局资产集合、持久化/API和画布节点无修改；文档连续性9/9、diff通过。
- 恢复工作：子agent/worktree创建1/退役1；未安装依赖、启动服务或创建构建缓存。根确认源码回放一致、clean/ignored、绝对路径位于指定根内且无Node服务使用后Git remove/prune退役，分支/提交保留；零本任务dirty路径/目录或缓存残留。
- 下一步：用户刷新5173验收图片移动后的原位置/目标文件夹及重新打开；代码开发无待完成步骤。
