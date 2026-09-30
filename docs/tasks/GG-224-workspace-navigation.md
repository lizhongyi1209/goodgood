# GG-224 删除探索与替换资产图标

- 日期：2026-09-30
- 状态：子agent完成，已精确合入本地5173；共同专项/构建通过，完整门禁有原画布类型缺口，未部署。
- 分支 / worktree：`fix/GG-224-workspace-navigation` / `F:/goodgood-worktrees/GG-224-workspace-nav`
- 基线：当前共享壳层f2d7cbd，verified05e90d2祖先已核验；修改前GG-116主页相同。
- 决策：[ADR0118补记](../decisions/0118-expanded-desktop-sidebar-home.md)

## 范围与验收

删除共享功能栏无处理函数的「探索」占位；资产入口从Images改Lucide LibraryBig资料库标志，表达混合素材集合。名称、原路径/handler、提醒/权限、展开/Home/无hover重复文字保持；不新增文本功能，不改画布GG222/后端/服务。

## 实现与证据

前端子agent仅编辑app/page.tsx：移除探索按钮和Compass闲置导入，资产改LibraryBig 17px并清理Images导入。根审阅差异，导航11项/文档8项共19/19通过，diff check通过；与GG225共同21/21专项/文档、构建通过；check:local仅跑一次，被原canvas-project-local.ts:21,35类型缺口阻塞，0 lint errors/116 warnings。证据详见[GG225](GG-225-asset-search.md)。无新业务逻辑或镜像源码测试。

## 恢复工作与下一步

只回放相对f2d7cbd的主页差异，不合入其他快照。下一步站长刷新5173手验探索消失、资产入口与提醒正常，以及GG225搜索焦点和过滤。未触发真实provider、上传、数据库写或生产操作。
