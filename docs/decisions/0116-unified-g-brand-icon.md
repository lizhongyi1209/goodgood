# ADR 0116: 全站统一使用 G 品牌图标

- Status: Accepted
- Date: 2026-09-30
- Task: [GG-215](../tasks/GG-215-unified-g-logo.md)

## Decision

站长要求「将网站用到 logo 的地方都统一改用最新的 G 这个图标」。以当前画布 GG-149 的 `public/goodgood-g-icon.svg` 为唯一品牌图形：黑色圆底和三片白色几何形，保持原始 1:1 比例。

所有 GoodGood 品牌展示（桌面与移动导航、登录/注册及错误/账户状态、创作空态、管理页、Hero 预览、浏览器 favicon 和维护页）只展示一个 G，不再组合旧 Double G 或 GoodGood 字标。保留既有品牌可访问名称和链接行为；功能图标及模型供应商图标不属于此变更。

这取代 AGENTS 与 DESIGN_SYSTEM 中要求 Double G/custom wordmark 的品牌展示决定，并扩展 GG-149/GG-153 的局部 G 使用规则。旧 SVG 文件保留作历史资源，无当前界面引用。

## Delivery boundary

GG-214 画布会话在 `F:/goodgood-worktrees/GG-116` 开发。本任务从已核验 GG-213 后端检查点 `257f959` 建独立分支/worktree，只修改品牌相关文件。最新 G 资产只读复制，不编辑活跃画布文件（本分支旧画布页仅替换品牌引用），仅核对其手动验收交接后精确合入品牌补丁，不重启原 5173、32131、32142 或修改数据库/队列/生产。维护页使用相同 SVG 几何内联，保证应用不可用时品牌仍可显示。
