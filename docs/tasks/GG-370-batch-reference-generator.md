# GG-370 · 画布独立批量生成节点

- 日期：2026-10-05；用户在GG-369演示后确定公共参考+1–5个批量素材组、每次总输入最多10张、独立画布节点并复用chat，保持其他节点。
- 基线：GG-116干净212583e，应用源码d8197c1；先核验祖先再从登记提交创建managed辅助。
- 范围：右键新建「批量生成」；公共参考+最多5个独立候选组，支持画布单图/共用端点/参考组接入；共用prompt/参数，全部组合和按序配对，实际单次去重输入≤10，显式并发生成、逐任务恢复/重试与结果对应；其他节点路径保持。
- 决策：扩展ADR0108/0131/0135；1–5指素材组数量，并非只生成1–5个任务。公共参考额外加入，每候选组每次取1张；沿既有任务和存储边界，不新增批量/并发硬上限或provider协议。
- 技术方向：独立批量节点组件、planner和chat参考面板；生成任务复用imageGenerator既有存储/快照/runner；在浏览器独立逻辑标识及已接受edge handle内保存分组/模式，避免给当前Web发送未知字段。候选图沿已有源节点/组及转换引用授权。实施若旧云兼容无法完整表达，应先记录真实限制，不能绕过所有权校验。
- 验证：沿GG-276只开发/精确集成并补回归来源，不自动构建/lint/typecheck/代码检查/测试/浏览器/HTTP/SQL/Provider或扣费，不自动更新运行/生产。
- 分工：根agent拥有集成辅助及canvas-page/workspace的控制器/连线/快照/报价/复制恢复与docs；batch_planner拥有纯planner/.d.mts和对应回归来源；batch_ui拥有批量节点组件/参考面板/CSS及generator-node的最小展示路由；batch_persistence拥有批量ID/handle/model和可逆云边适配及对应回归来源。每写入agent单独managed worktree，从同一登记基线创建，互不改对方文件；绝对路径在返回后登记。
- 状态：源码已精确接入8e3e45b4d14fdec3d02044f9bb693826c9ff2bd7；未运行检查/未验收/未部署。接受标准涵盖空/加载/失败、1/5组、公共参考总数10/11拒绝、两模式、独立任务/取消未知提交、云/本地恢复、历史/跨页复制、普通节点保持。
- 下一动作：用户刷新5173右键批量生成，手验素材连接/两模式/任务数/报价/实际输入及恢复；GG-366运行身份保持，未经另行授权不自动更新运行。

## 实际辅助目录

- 根agent：C:/Users/Admin/.codex/worktrees/gg-370-batch-controller/goodgood，codex/GG-370-batch-controller；控制器及UI由根agent实现。
- batch_planner：C:/Users/Admin/.codex/worktrees/gg-370-batch-planner/goodgood，codex/GG-370-batch-planner；仅planner和回归来源。
- batch_persistence：C:/Users/Admin/.codex/worktrees/gg-370-batch-persistence/goodgood，codex/GG-370-batch-persistence；仅model/云适配和回归来源。
- 预建UI辅助C:/Users/Admin/.codex/worktrees/gg-370-batch-ui/goodgood因子agent线程上限无法派发，不写代码，立即归档；没有用户阻塞，根agent继续UI。创建4，退役状态交付时记录。

## 实施记录

- 分工实际：两个写入子agent完成planner/预算及model/云适配；UI派发因线程上限未启动，根agent完成独立节点/面板/控制器，无等待用户或扩大范围。
- 根分支精确接入c000b4a（原2445604）/4d90638（原cf978e4）/613c521（原2d06dc8）三个限定提交；节点入口/分桶引用与连接门控、全部组合/配对报价、惰性冻结提交、同源多端口云恢复/解组/复制及本地空配置保存已写。
- UI：公共/素材组端口，默认1组/最多5组、组增减与逐张移除/重试，折叠前6组合真实图序，共用chat模型/参数/发送及原结果stack；普通节点原路径保持。
- 云边界：imageGenerator wire+ID前缀/handle兼容，不加后台未知字段；batchConfiguration仅浏览器，remote显式剥离；云按有效端口恢复末尾索引及模式，空末尾组/无候选模式只有本机保存。
- 任务容量：只沿既有1MiB云文档限制，提交前真实基线+精确冻结记录/UTF-8/逗号增量门控；保存后真实远端文档再判断，超容量无收费请求。不存在新的人为组合/并发硬上限。
- 回归来源：gg370-batch-reference-plan/gg370-batch-reference-document/gg370-batch-document-budget均只写未运行；本轮没有自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收/HTTP/SQL/Provider/扣费/服务/生产操作，也没有依赖缓存。

## 交付与清理

- GG-370独立画布「批量生成」源码已精确接入8e3e45b4d14fdec3d02044f9bb693826c9ff2bd7（前置aa68728/0aa2a23/23310e2；隔离c000b4a/4d90638/613c521/ae5fbb3）。公共参考+1–5候选组，画布源图/多选共用端点/参考组接入，全部组合或顺序配对，实际单请求去重≤10；chat共享提示词/模型/参数、实际总额与折叠前6图序预览。逐组合冻结输入复用并发slot/恢复/独立失败重试，逐实际引用数报价；沿1MiB文档容量预检及保存后门控，超额不静默截断或提交。独立组件+既有imageGenerator wire/批量ID/handle适配，不新增后台未知字段；本机batchConfiguration保存空组/空模式并在远端剥离，云按有效端口恢复。普通节点原路径保持。沿GG-276只写回归来源，未自动构建/lint/typecheck/代码或diff检查/测试/浏览器验收，无HTTP/SQL/Provider/生成/扣费、运行更新或生产操作；GG-366运行receipt保持未重查。创建4/退役4，全部managed辅助确认归档，两个写入子agent完成，无依赖缓存。用户刷新5173手验；未验收/未部署。
- 预建UI辅助已归档，其余controller/planner/persistence辅助在精确集成后由archive_worktree归档；list_artifacts四项均archived_worktree，无新依赖缓存/运行句柄。下一任务仍从GG-116当前HEAD核验源码祖先，保持受保护生产与其他窗口状态。
