# GG-329 · 画布 React Flow 上下文修复

- 日期：2026-10-03；用户报告 `Seems like you have not used ReactFlowProvider as an ancestor`。
- 基线：IMPLEMENTATION_PLAN 当前8c2997f，已核验祖先；根agent使用独立codex/GG-329-reactflow-context、F:/goodgood-worktrees/GG-329-reactflow-context，不启用子agent。
- 范围：canvas-workspace 的共享 ReactFlowProvider 祖先与上下文边界说明，保留并行GG-326/327/328源码。
- 决策影响：实现缺陷修复，不改变已确认产品决定，无新ADR。
- 根因：GG-327 CanvasImageMetadataProvider 在 ReactFlow 外调用useReactFlow；ReactFlow自身的隐式Provider只能覆盖其后代，不能覆盖元数据Provider。
- 方案：在画布工具Provider链外增加一个共享ReactFlowProvider，同时覆盖元数据与ReactFlow，初始化沿现有空节点/10%–800%缩放。已安装xyflow的Wrapper发现外层StoreContext后复用，不创建独立画布状态。
- 验收：用户刷新后进入画布、选中文本生成结果、打开图片元数据；所有工具读取当前节点，无祖先错误，连线/缩放/页面恢复保持。
- 状态：隔离登记7f0efdc/源码14ffdef已精确接入GG-116/5173为47fd0b8/efe7aa6；元数据工具与ReactFlow复用同一store，初始化保留当前edges/空节点/缩放边界。按用户约定不编译、lint/typecheck、代码/diff检查、测试或浏览器验收，不调用Provider/HTTP/SQL、不重启服务或部署。
- 生命周期：创建1/退役1；独立目录无依赖/缓存/Node进程，确认干净与绝对路径后正常Git移除，保留分支/提交，无未登记目录。
- 交接：保留GG-326/327/328及既有运行身份；仅一个应用文件与上下文说明。用户刷新手验选中文本生成结果/图片元数据/连线和缩放；源码完成，未验证或部署，无后台更新。
