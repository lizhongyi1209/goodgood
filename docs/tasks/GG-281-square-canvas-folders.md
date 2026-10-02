# GG-281 · 画布资产文件夹显示正方形卡片

- 日期：2026-10-02；状态：代码已完成并接入5173，未部署；检查和验收由用户负责。
- 范围/验收：点击画布资产后，文件夹在自适应网格内显示1:1正方形卡片，保留居中图标/名称、打开、右键重命名/删除、拖入与移动状态。
- 基线：实际5173目录`F:/goodgood-worktrees/GG-116`的`1a82b18`，核验`55717e8`祖先，保留已交付文本缩略等范围。
- 原因：现有正方形CSS依赖data-slot=button，但GG-270的ContextMenuTrigger asChild会传入context-menu-trigger，导致原样式未匹配。改为按实际button和folderCard类匹配全部基础/交互样式。
- 决策：恢复已有正方形设计，不改变产品决定，无新ADR。
- 所有权：根agent独占`fix/GG-281-square-canvas-folders`的canvas-asset-panel.module.css及本任务文档；不委派子agent。初始GG-280与并行裁剪任务撞号，收口为GG-281，已退役辅助路径`F:/goodgood-worktrees/GG-280-square-canvas-folders`。
- 检查：按用户要求，不运行编译、lint、测试、代码检查或浏览器验收。
- 集成：独立源码`995359c`→`b560f33`，所有文件夹基础/hover/focus/移动状态/减弱动画样式统一按button.folderCard匹配。无服务/后端/数据库变化，保留并行GG-280裁剪登记与开发。
- 生命周期：创建1/退役1，无依赖/构建缓存；原生Git remove/prune已完成，保留分支/提交。
- 下一步：用户刷新手动查看，未运行编译、lint、测试、代码检查或浏览器验收。
