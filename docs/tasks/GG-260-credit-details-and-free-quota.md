# GG-260 · 积分明细与每日免费图片

- 日期：2026-10-01；状态：明细/图标源码已整合并代码验证，运行同步中；免费额度待规则，未部署；浏览器验收由用户完成。
- 基线：`c6f6bb9`，含 GG-258 与并行 GG-259 源码；已核对 GG-258 祖先。集成分支 `feat/GG-260-credit-details-and-free-quota`，实际 5173 为 `F:/goodgood-worktrees/GG-116`。
- 范围：顶部当前积分；表头「类型」；任务 ID 独立右列、缩略展示/小复制按钮；项目和模型记录；每页最多 20 条、真正分页；账户管理积分图标同形空心、选中不加粗。每日免费图片额度走实际计费与失败恢复链路，规则待用户补充；不执行真实生成或生产操作。
- 决策：延续 ADR 0112 明细展示，新增免费额度需补 ADR，不用充值流水假装免费图片次数。
- 子任务负责人/目录：UI 复用 `/root/canvas_folder_drop` 子 agent，`feat/GG-260-credit-details-ui` / `F:/goodgood-worktrees/GG-260-credit-details-ui`；只拥有 features/billing 前端、相关局部 CSS/纯辅助测试与本卡 UI 证据，不改后端/个人资料组件。
- 后端子任务：GG-261 每日免费额度及活动来源契约，规则澄清期间先读计费/持久化与提出最小实现，不能自行决定免费适用模型/规格。独立分支/树登记见 GG-261。
- 根负责共享契约协调、集成、定向检查、文档与 runtime 同步。子树不得安装依赖/构建缓存，复用 GG-116 唯一依赖；每个创建 1，精确集成、clean/服务检查后 Git remove/prune 退役，不清理其他工作树。
- 下一步：完成已验证来源接口的本地 0060/verified Web 同步和两个子树退役；免费图片数量、适用模型/规格待用户答复，确认后单独接续 quota 实现。

## UI 实施证据

- 子树：`feat/GG-260-credit-details-ui` / `F:/goodgood-worktrees/GG-260-credit-details-ui`，源码基线 `c6f6bb9`，仅快进父登记卡 `62f4e26`；旧 GG-256 目录已退役，不复用旧目录。
- `features/billing`：顶部直接使用真实 `account.availableCredits` 字符串，保留今日/周/月消耗；七列表格为类型、项目、模型、状态筛选、日期、积分变化、最右任务 ID。名称由后台显式字段提供，旧缺项显示破折号；完整 taskId 仅由明确字段复制，不从 batchReference/活动 ID 推导。
- `http-billing-boundary` 兼容 optional/null 活动来源字段；请求 `view=usage&limit=20` 并转发 AbortSignal。page-level dailyFreeQuota 使用有界 number 图片计数，只在真实摘要存在时显示「今日免费图片 / 剩余 x / limit 张」，reserved 大于 0 时显示生成中数量；不加到积分余额，不创建默认免费数。
- 分页 helper：20 条替换页面，保留跨 cursor 剩余和一个真实可见 lookahead；兼容旧服务忽略 usage 的 release/refund 隐藏，不产生空假页或丢条目。前后页缓存保留时间顺序和最新已读取账户/额度摘要；筛选/reset/关闭取消并忽略旧请求，提交中防重复，失败保留原页/余量供重试。
- 复制入口有小号图标、完整 ID 可访问名称、成功反馈和失败重试；无 ID 不渲染伪复制。账户导航调用处 `fill="none"` 保留同形空心闪电，普通/选中文字均 400；全局 CreditIcon 默认与个人信息组件未改。所有新样式在局部模块，无 globals 修改。
- 纯 Node `node --test tests/gg260-credit-activity-pagination.test.mjs`：11/11，通过，含溢出不丢、超过十页隐藏项、空、精确余额、缓存摘要、失败 retry、防重复、filter/reset/abort、卸载、游标循环和完整 ID/复制拒绝。
- 内存 SSR/读取边界：`GOODGOOD_TEST_DEPENDENCY_ROOT=F:/goodgood-worktrees/GG-116` 下执行 `node --test tests/gg260-credit-activity-ui.test.mjs`，4/4，通过；esbuild write=false，使用父唯一依赖与隔离 fetch stub，无网络/缓存。覆盖七列 loading/disabled、真实来源与无伪 ID、摘要只用实值、usage/20/cursor/abort/失败。
- 定向 ESLint（父绝对 bin + --config、无 cache）检查 view/boundary/dialog/helper/声明与三份相关测试，退出 0；无子 node_modules 仅 React detect 提示。旧 `m6-credit-activity.test.mjs` 最后接线断言同步为真实 pager/七列契约，其全文件待父整合后执行。`git diff --check` 通过。
- 未执行：浏览器/Playwright、真实 provider/API 写入、Worker/DB 测试、安装、全量 build/typecheck/check:local。父负责实际模块编译、后端契约/免费政策、生成报价接线与统一交接。
- 生命周期：本任务子树创建 1、待退役 1；无 node_modules/.next/dist/coverage/test-results/playwright-report 或运行服务。限定提交交付后 clean；父精确集成/检查后 Git remove/prune，禁止强删或新增缓存。

## 根集成与验证

- UI 子 `dbe7f38` 精确回放为 `e1d7f61`；后端子 `936da92` 回放为 `d9e5aff`。根已接线生成快照/恢复中的 canvasProjectId 和首次项目同步门控，保留旧请求形状与输入，不重发计费任务。
- 根执行 UI 15/15、generation-contracts 12/12、来源/M6 15/15，均通过；21个相关代码/类型/测试文件局部 lint 0错误，画布仅7个既有警告。六个实际 billing Vite 模块 HTTP 200。
- 命名临时库 `goodgood_gg261_source_test_20261001` 验证来源权限/冻结和分页。首次真实 SQL 揭示微秒时间戳被公共毫秒 cursor 截断；根修正按 owner+ID+毫秒区间恢复精确 SQL 时间，加入同一微秒时间的25条记录跨页验证，SQL 1/1通过；临时库每轮均删除，活动库没有 fixture。
