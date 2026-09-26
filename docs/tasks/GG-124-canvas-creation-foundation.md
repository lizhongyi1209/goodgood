# GG-124 — 画布创作初始界面

- 状态：本地实现与门禁完成；待站长手动浏览器验收，未部署。
- 基线：`F:/goodgood-worktrees/GG-116` 的 `cc41525`；沿用现有分支 `feature/GG-116-asset-history-actions`。
- 请求：新增画布创作初始界面，使用 React Flow 与 React Flow UI；纯白背景，移除 React Flow 默认角标，保持空白、简洁。细节功能留待后续讨论。
- 决策影响：当前没有画布路由或画布功能；本任务新建独立工作界面，不改变现有图片/视频创作与项目保存的已确认流程，无需 ADR。

## 本次验收

- 从现有工作区导航进入 `/canvas`，直接访问和刷新仍显示同一画布；返回其他页面不清空现有创作状态。
- React Flow 提供空白可平移/缩放的画布，背景纯白，无网格、示例节点或引导卡；不显示默认 React Flow 角标。
- 安装并使用一个最小的 React Flow UI 缩放控件，保持 GoodGood 灰阶样式和键盘可用性。
- 只做本地前端初始界面；不新增画布保存、资产拖入、节点生成、后端接口或生产操作。

## 验证与交接

- `@xyflow/react@12.12.0` 已安装。使用 React Flow UI 官方 Zoom Select 源码作为基础放入 `components/ui/zoom-select.tsx`，仅调整为当前倍率显示、中文标签和灰阶窄控件；既有 shadcn Select 原语保持不变。官方注册表 CLI 在询问是否覆盖现有 `select.tsx` 时中止，因此没有覆盖项目控件；CLI 顺带安装的无用 `cn` 包已移除。
- `npm run typecheck` 与现有路由定向测试 5/5 通过；新增画布路由测试涵盖尾斜杠、稳定 URL 与浏览器历史保留。
- 锁文件只增加 React Flow 及其 13 个新依赖条目，保留既有包解析；`npm ci --dry-run --ignore-scripts` 通过。
- 首次 `check:local` 的构建和类型检查通过，文档契约因 BACKLOG 超行及任务卡缺“下一步”失败；修订后文档/画布测试 9/9，通过完整 `npm run check:local`：585 项 / 562 通过 / 23 跳过 / 0 失败，lint 0 错误 / 111 警告（其中 1 条来自沿用旧企业路由的内部跳转模式）。`git diff --check` 通过。
- React Flow 官方允许通过 `hideAttribution` 隐藏角标，同时请求移除角标的产品订阅 React Flow Pro；本任务未购买订阅或使用 Pro 组件。画布无保存和节点状态，刷新后仍为空白；没有运行浏览器验收或真实外部服务请求。
- 下一步：站长在现有 5173 热更新预览中手动查看 `/canvas` 的桌面/窄屏显示、拖动和缩放；后续再确认节点、资产与保存需求。
