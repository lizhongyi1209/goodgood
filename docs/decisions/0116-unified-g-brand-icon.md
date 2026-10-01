# ADR 0116: 全站统一使用 G 品牌图标

- Status: Accepted
- Date: 2026-09-30
- Task: [GG-215](../tasks/GG-215-unified-g-logo.md)

## Decision

站长要求「将网站用到 logo 的地方都统一改用最新的 G 这个图标」。以当前画布 GG-149 的 `public/goodgood-g-icon.svg` 为唯一品牌图形：黑色圆底和三片白色几何形，保持原始 1:1 比例。

所有 GoodGood 品牌展示沿用同一个 G。GG-266（2026-10-01）按用户要求在大厅桌面导航与移动顶部的图标右侧展示新「Good Good」字标：G复用图标三片几何，o/d采用对应粗笔画与圆润轮廓，字标为本地SVG路径，不依赖系统字体。登录/注册及错误/账户状态、创作空态、紧凑画布、管理页、Hero预览、浏览器favicon和维护页保留单G。保留品牌可访问名称和链接行为；功能图标及模型供应商图标不属于此变更。

这取代 AGENTS 与 DESIGN_SYSTEM 中旧 Double G/custom wordmark 的品牌展示决定，并扩展 GG-149/GG-153 的局部 G 使用规则。GG-266原位更新 `public/goodgood-wordmark.svg` 为新字标；旧Double G文件仅作为历史资源，无当前界面引用。见 [GG-266](../tasks/GG-266-geometric-good-good-wordmark.md)。

## Delivery boundary

GG-214 画布会话在 `F:/goodgood-worktrees/GG-116` 开发。本任务从已核验 GG-213 后端检查点 `257f959` 建独立分支/worktree，只修改品牌相关文件。最新 G 资产只读复制，不编辑活跃画布文件（本分支旧画布页仅替换品牌引用），仅核对其手动验收交接后精确合入品牌补丁，不重启原 5173、32131、32142 或修改数据库/队列/生产。维护页使用相同 SVG 几何内联，保证应用不可用时品牌仍可显示。
