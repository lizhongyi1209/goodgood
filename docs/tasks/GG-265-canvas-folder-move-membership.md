# GG-265 · 画布资产移入文件夹后移除原位置

- 日期：2026-10-01；状态：子agent已实现，12项定向纯逻辑检查通过，待根精确集成/局部lint和模块编译；未部署，浏览器验收由用户完成。
- 范围与验收：画布资产侧栏图片移入文件夹应为移动；确认成功后从原位置移除，目标文件夹出现同一素材，刷新/重新打开保持；失败保留原位置及重试。不得复制素材、重上传或影响画布节点。
- 决定：修复GG-256既有移动承诺；沿用授权归档接口、保留真实标签/名称/资产身份，根列表不再把已归档图片当作未归档项目展示。若实现发现涉及其他已确认决策先向根报告。
- 分支 / worktree：子agent `folder_move_membership` 拥有 `fix/GG-265-canvas-folder-move` / `F:/goodgood-worktrees/GG-265-canvas-folder-move`，从当前干净`2ff0113`登记后的`26b28af`开始。实际5173在GG-116，不切换共享分支。
- 文件边界：features/canvas/canvas-asset-panel.tsx、实际helper canvas-folder-drop.mjs/d.mts、tests/gg265-canvas-folder-membership.test.mjs和本卡；初始登记的move文件名为笔误，根已确认以drop为准。共享产品/交接文档由根维护，不修改GG-264查看器、导航、计费、生成、存储API。
- 原因与边界：GG-256通过既有PUT更新同一kind:id的folderId，服务端事务upsert保留displayName，未复制素材；panel确认后也正确合并返回arrangement并广播刷新。重复展示直接来自根visibleItems无条件返回data.items。本次恢复既有移动承诺，不新增ADR、CAS/持久化机制或全局集合语义。
- 实现：selectCanvasFolderItems统一按已确认归属筛选。根目录只显示无arrangement、null归属及失效目录归属素材；现存文件夹仅显示相同folderId。保留原有顺序、对象引用、名称/标签和完整data.items，readyAssetKeys不受影响；当前文件夹删除后安全回根。返回按钮aria-label相应简化为「返回资产」。请求中/失败不更改归属，确认成功自动从原位置消失，已有重试/读取刷新/卸载保护保持。
- 验证：`node --test tests/gg256-canvas-folder-drop.test.mjs tests/gg265-canvas-folder-membership.test.mjs` 12/12通过；新增4项覆盖kind复合身份/顺序/无修改、loading/empty/失效目录、根移动确认前保留/确认后同对象唯一显示/重新读取、失败保持及标签/名称重试。`git diff --check`通过。均为内存合成集合/Promise，无网络和真实资源写入。局部lint、实际Vite模块编译及共享文档检查由根整合后执行；不做浏览器验收、全面门禁/构建、服务重建或真实素材写入。
- 恢复工作：子agent/worktree创建1/退役0待集成；未安装依赖、启动服务或创建构建缓存。精确提交后保持clean，根回放后核对clean/进程/绝对路径，以Git退役并保留提交。
- 下一步：根审查精确回放此限定提交，定向lint/实际Vite编译、共享文档收口及干净worktree退役；用户刷新验收移动行为。
