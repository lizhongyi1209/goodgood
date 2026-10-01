# Production implementation plan

- Last synchronized: 2026-10-01
- Current phase: GG-267大厅字标收小为108px/约14px，Logo按内容宽度展示，已进入5173，源码/diff与页面/CSS编译通过，无新辅助目录；GG-266字形和此前功能保留。verified Web `9f9d788`/本地0060不变，免费政策待用户，生产仍为GG-098/GG-100。
- Current objective: 用户刷新5173验收字标及此前交付；免费数量/适用模型与规格明确后补ADR、实现真实quota。按GG-247定向验证，不把手验作为开发阻塞。
- Previous objective: GG-244 资产 hover 小按钮、无视频外置文字与节点式视频预览已进入实际 5173。

## Current checkpoint

- 当前字标比例 [GG-267](tasks/GG-267-compact-lobby-wordmark.md)：从干净`27bd4f4`核验祖先后建`fix/GG-267-compact-lobby-wordmark`，源码`0dfd499`。132px收至108px、间距8px，品牌按钮fit-content，移动组合142px；只改三个样式与两处尺寸。源码/diff和实际页面/CSS编译通过，创建0/退役0，无服务/后端变化，用户视觉验收。
- 当前字标交付 [GG-266](tasks/GG-266-geometric-good-good-wordmark.md)：从`26b28af`隔离开发，`b7f27e8`→`4756c7b`；沿用图标G几何的Good Good本地SVG，放在大厅桌面/移动图标右侧，响应式收缩与首页行为保持。SVG解码、局部lint零错误（11既有警告）、实际页面/样式/字标HTTP200通过；创建1/退役1、无依赖/构建缓存，ADR0116/DESIGN_SYSTEM已同步。
- 当前移动修复 [GG-265](tasks/GG-265-canvas-folder-move-membership.md)：从干净`2ff0113`/登记`26b28af`建立子树，`fb7cc90`→`b1f364c`。画布根层过滤已归档素材，确认成功从原位置消失、目标保留同一身份，失败保留及重读/失效归属恢复完整；子与根12/12、局部lint/两模块编译通过，创建1/退役1，无缓存/API/数据库/服务变更。
- 当前图片详情交付 [GG-264](tasks/GG-264-image-detail-fill-and-centered-rail.md)：初版`1c9ae74`后用户澄清，从`f10e8b1`隔离修正`c48e68e`→`5409cce`，恢复初次打开/换图/复位完整contain适配，放大可铺满整个舞台；无计数/缩略图动态居中和并行GG-263保持。本轮16/16、相关lint/两模块编译通过，累计创建2/退役2、无缓存，无Web/数据库变更。
- 当前资料交付 [GG-262](tasks/GG-262-profile-inline-edit-layout.md)：从`c0d8d08`/登记后`ee2c9fc`建立隔离分支，`3338fa9`精确回放为`2f0d8fd`；透明下划线编辑、稳定文字/动作网格、无可见滚动条及统一14px图标。12/12、局部lint/两个实际模块编译通过；创建1/退役1、零子缓存，无Web重建/数据库变更，用户验收。
- 当前交付 [GG-260](tasks/GG-260-credit-details-and-free-quota.md) / [GG-261](tasks/GG-261-daily-free-image-quota.md)：从 `c6f6bb9` 登记并创建两子树；UI `dbe7f38`→`e1d7f61`，来源 `936da92`→`d9e5aff`，根接线/微秒分页修复 `9f9d788`。UI15、生成12、来源/M615、账户/报价/导航24、隔离SQL1均通过；相关lint零错误（画布7既有警告）、实际模块编译通过。0060与verified Web完成，子树创建2/退役2、无缓存；免费额度尚未实现/发放。
- Task [GG-258](tasks/GG-258-canvas-detail-minimal.md)：从干净 `821705e` 核对祖先后建立 `fix/GG-258-canvas-detail-minimal`；移除缩放按钮/倍率及无用样式，非生成素材只展示标题和已知尺寸。SSR/导航 10/10、相关 lint 零错误/警告、三个 Vite 模块编译 HTTP 200；保留滚轮/拖动/键盘及真实参数，无新 worktree/依赖/缓存。
- Task [GG-259](tasks/GG-259-random-user-id-stable-edit.md)：独立 `d4ec0be` 回放为 `c6f6bb9`；现有/新增随机六位数字、不重号，常驻铅笔、下方提示预留换行高度。12/12、两组隔离 SQL 2/2、相关 lint、本地 0059 完成，创建 1/退役 1（初始编号/路径更正一次），API 兼容原 Web，不重建服务。
- Task [GG-254](tasks/GG-254-account-identity-editor.md)：子 `bbf26d5` 精确回放为 `422c32f`；用户名默认 mimi、后端六位 ID、内容文字编辑、局部确认/外部撤销、头像确认后上传，撤去个人主页。定向 20/20、资料 SQL 1/1、ID SQL 10/10、相关 lint 完成；0058 与 verified Web `41df2dc` 同步，创建 1/退役 1。
- Task [GG-253](tasks/GG-253-canvas-media-detail.md)：源码 `896bce2`；素材信息独立列、完整适配后的图片平移/滚轮缩放、原比例图片视频缩略列，选中项轻微向左抽出。22/22 导航/播放与 3/3 SSR、相关 lint、五个实际 Vite 模块编译通过，无新增依赖/缓存。
- Task [GG-255](tasks/GG-255-canvas-paste-image.md)：子 `c7d878c`/`31f5290` 精确回放为 `41df2dc`/`d4ea42c`；原生图片 Ctrl+V 复用拖入上传/节点/持久化，body 焦点可直接粘贴，输入/弹层隔离，保留内部复制。子与根 19/19、相关 lint 零错误、四个 Vite 模块编译通过；创建 1（初始路径改名 1 次）/退役 1。
- Task [GG-256](tasks/GG-256-canvas-folder-drop.md)：子 `df7cdf4` 回放为 `5183287`；图面默认光标、查看按钮 grab、图片拖入既有文件夹，pending/成功/失败重试和减少动效完整接线。子与根 8/8、相关 lint 零错误/警告、三个 Vite 模块编译通过；创建 1/退役 1。
- Task [GG-257](tasks/GG-257-canvas-edge-hover-flow.md)：子 `53f1934` 回放为 `6f63a8f`；CSS 覆盖原 animated 基态为静止实线，连线/剪刀 hover 才流动，reduced motion 始终静止。源审阅、实际 Vite CSS 编译通过；创建 1/退役 1，不改变图数据/断线逻辑。
- 共同交接：文档连续性 9/9、diff 检查通过；三子树经 clean/ignored/绝对路径/缓存/服务核对后以 Git remove/prune 退役，其他工作树保留。未执行浏览器验收、全量门禁/构建或真实资源写入。
- Task [GG-252](tasks/GG-252-personal-info-cleanup.md)：`2feef8c` 精确回放为 `4fd9be3`，默认文字资料、删除复制与解释、仅改动后显示操作；默认 goder 例外共享、自定义保持唯一，头像新上传/绑定 2 MB。22/22、lint、必要 Web 构建/同步、0057 已完成，创建 1/退役 1；并行 GG-251 `3e2add5` 保留。
- Task [GG-251](tasks/GG-251-canvas-preview-fit.md)：从 `4152490` 核对 GG-249/250 祖先后创建 `fix/GG-251-canvas-preview-fit`；显式画布边界/完整适配、稍大浮层、按放大后尺寸保留间隙和原位 1.12 倍放大。9/9、相关 lint、实际 Vite 模块编译通过，无新增 worktree/缓存；用户验收。
- Task [GG-250](tasks/GG-250-inline-personal-information.md)：独立 `9ea1002` 精确回放为 `99fb14a`，个人信息直接编辑头像、昵称/用户名并保存/取消；13/13 功能、相关 lint、最终文档 9/9，5173 编译接线通过，辅助目录创建 1/退役 1。保留并行 GG-249 文件及后继 `8ee22d8`。
- Task [GG-249](tasks/GG-249-canvas-media-viewer.md)：从 `e857437` 新建 `fix/GG-249-canvas-media-viewer`，画布图片入口改为受限完整预览、无标题/滚动条的混合媒体轮播；15/15、相关 lint、四个 Vite 模块编译通过，无新增 worktree/缓存，用户验收。
- Task [GG-248](tasks/GG-248-account-personal-information.md)：`b4a34a6` 回放为 `520b452`，六项真实资料、ID/邀请码复制与每次默认入口已接入实际目录；20/20、定向 lint，无全量检查，辅助目录创建 1/退役 1，不改变 GG-245 范围。
- Task [GG-247](tasks/GG-247-targeted-verification.md)：用户要求高频小需求默认定向验证，完整门禁按批次/发布或必要回归执行，规则见 AGENTS/WORKFLOW；不改变 GG-245 的并行开发范围。
- 当前集成分支`fix/GG-267-compact-lobby-wordmark`，目录`F:/goodgood-worktrees/GG-116`，源码检查点`0dfd499`含GG-267字标收小、GG-266字形与GG-265/264/263及此前功能；文档后继HEAD是新任务基线。实际verified Web仍为`9f9d788`，免费政策待补，未授权生产。
- Task [GG-246](tasks/GG-246-asset-video-hover.md)：子提交 `c563d98`/根回放 `ec51488` 已整合为 `83a4306`，实际目录 `F:/goodgood-worktrees/GG-116`，基于 GG-244 收口 `dd8dca9`，仅修改大厅资产视频。定向 31/31、一次完整共同门禁 685 通过/22 隔离跳过/0 失败；5173 编译模块 HTTP 200 含新接线；辅助目录创建 2/退役 2。不改变 GG-245 并行任务。
- Task [GG-244](tasks/GG-244-canvas-asset-hover.md)：分支 `fix/GG-244-canvas-asset-hover` 基于 `86ee3b7`；子提交精确回放 `be84c53`、`9d7d18c`，定向 9/9、完整门禁 674/22/0；子目录创建 1/退役 1，沿用 GG-242/243 与云配置。
- Task [GG-245](tasks/GG-245-canvas-image-link-read.md)：子八文件 `e471c1c` 精确回放为 `7ddb78d`；34/34、定向 lint/typecheck、必要 checkpoint 构建通过，实际 cafe24 JPEG 新读取器下载/解码成功（900×1190）。ADR 0122 与原上传/归档保持，本地 Web 同步完成。
- Task [GG-243](tasks/GG-243-project-create-card.md)：独立实现 `f647e13` 及其记录分支已整合到 `F:/goodgood-worktrees/GG-116`；基线为 GG-242 收口 `00f7568`。首位新建卡片取代页头按钮，复用 `/canvas` 新建流程；不修改画布源码。
- 共同整合 `dec0025` 已通过实际运行目录完整门禁：665 通过/22 隔离跳过/0 失败；定向 14/14，5173 编译模块 HTTP 200、包含新卡片和 /canvas 入口。GG-242/243 均为祖先，本任务辅助目录创建 2/退役 2。当前分支名是历史名称，不能单凭名称推断范围。
- Task [GG-242](tasks/GG-242-canvas-image-preview.md)：子 agent 最小源码修复已精确回放为 `c3700b7`，基于 GG-241 `f1570de`，继续保留。GG-240 生命周期规范继续有效。
- 5173源码目录：`F:/goodgood-worktrees/GG-116`，当前代码含GG-239累计基线及GG-242—267已交付范围；目录名/旧标签不能代表最新代码，免费quota仍未实现。
- 5173 API 代理：Web `32131` 为 GG-116 verified `9f9d788e31d6a671bf9b79a4f3294d6179310b06`，指纹见 GG-261；唯一真实开发 Worker `32142` 保留 GG-226 `70e10c6`、readiness ready。来源记录不需新Worker hook；将来free必须同步两角色，文档HEAD不是实际新构建身份。
- 本地依赖：PostgreSQL `54449`、Valkey `56549`、RustFS `58049/58050`、Mailpit `58045/58046`；数据库迁移为 `0060`，0059随机ID与用户/任务/积分流水保持，0060仅新增授权来源列/约束。
- 云参考图：Web 必须加载仓库外 `cloud-upload.env`，Worker 同样保持 `cloud-development`；否则 23 条 `local-dev/references/` 图像会读取失败，readiness 正常不能代替素材预览验证。
- GG-242 验证：定向 23/23、只读预览 13/13；一次 `check:local` 通过（683 总数，661 通过、22 隔离跳过、0 失败）。浏览器验收交给用户。
- 2026-10-01 启动前只读核对活动任务、待分发 outbox、冻结积分和两队列均为 0；保留原数据卷，没有执行迁移或生成。
- GG-235 已恢复本地媒体只读链路；GG-236 外框已获用户确认；GG-237 和 GG-238 仍需用户在 5173 手验。
- 生产身份继续为 revision `7888554a4650b1b06dbce4293c52e8c018e5c71b`、迁移 `0044_gg098_raise_manual_grant_ceiling.sql`，详见 [CURRENT_STATE](CURRENT_STATE.md)。GG-239 未部署。
- 生产入口仍为 `https://goodgood.o1key.com`，预发布入口为 `https://staging-goodgood.o1key.com`；本地 5173、开发数据库与生产数据继续严格隔离。
- 早期生产实施流水保存在 [2026-09-07 implementation log](history/2026-09-07-implementation-log.md)，仅在追溯历史时读取。
- Next action: 用户验收GG-267收小字标及此前交付；每日免费数量/模型/规格明确后补ADR并开发quota/预留/终态释放，届时同步Web和Worker。本任务无辅助目录，已交付代码无待完成步骤，无生产授权。
- Blockers: 已交付明细无代码/运行阻塞；免费政策仍缺每日数量和适用模型/规格，不因等待默认启用。浏览器验收由用户负责；生产发布未获授权。

## Verification sequence

1. 核对当前分支 HEAD，确认 GG-253 `896bce2`、GG-254 `422c32f`、GG-255 `d4ea42c`、GG-256 `5183287` 与 GG-257 `6f63a8f` 均为祖先；交付 `git status --short` 为空。Web/Worker 身份按 CURRENT_STATE/HANDOFF 核对。
2. 核对 `http://127.0.0.1:5173/`、`32131/api/health/version`、`32142/health/ready`；不得凭旧 PID 推断版本。
3. 按 GG-247 默认定向验证；GG-245 检查客户端、公开链接读取与 reference API，实际 Web 同步需要 verified checkpoint 构建，不叠加无关全项目测试。文档流程只运行文档连续性与 diff 检查，准确记录实际结果。
4. 浏览器交互及产品验收由用户完成，覆盖 GG-245 图片链接、GG-244/246 hover 视频、GG-243 首位卡片、GG-242 预览恢复和未确认的 GG-237/GG-238；agent 无需代验。真实生成必须另获该次计费请求授权。
5. 发布是独立任务，必须取得不可变 CI 镜像并按单槽 Compose 清单执行。

## Milestones

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| 生产 GG-098 / GG-100 | 已部署 | controlled alpha 应用 + 单槽 Compose；身份见 CURRENT_STATE |
| GG-101—121 | 本地累计 | 真实本地接口、素材/资产工作区；具体边界见任务卡 |
| GG-122—155 | 本地累计 | Hero、shadcn/AI Elements、独立画布、资产栏与运行兼容 |
| GG-156—189 | 本地累计 | 积分明细、画布交互/持久化、真实生成与 Nano 多图 |
| GG-190—218 | 本地累计 | 画布视觉、批次、模型路由、Seedream、平台币退役与多页面 |
| GG-219—238 | 本地累计 | 导航、项目管理、选择/排列、资产面板和图片查看器 |
| GG-239 | 本地检查点 | 当前 5173 累计源码首次形成单一可恢复提交和标签；未部署 |
| GG-240 | 流程检查点 | 子 agent/worktree 创建、缓存、集成、退役与脏目录保留形成可测试规范；未部署 |
| GG-241 | 本地启动完成 | 原依赖、5173、Web/Worker 恢复，Windows 54449 端口冲突已处理；原数据保留，未部署 |
| GG-242 | 本地预览恢复 | Web 云配置补回；画布重开 generated source 使用稳定受权 content URL，子 worktree 已退役 |
| GG-243 | 已整合实际 5173 并验证 | 首位新建项目卡片直接进入新画布；共同门禁 665/22/0，辅助目录已退役，未部署 |
| GG-244 | 已整合实际 5173 并验证 | hover 小按钮与节点式视频预览；门禁 674/22/0，子目录已退役，未部署 |
| GG-245 | 已整合 5173/Web 并验证 | 受鉴权公开图片链接读取，34/34 与实际 URL 解码通过，verified Web 同步和子目录退役完成 |
| GG-246 | 已整合实际 5173 并验证 | 大厅视频仅 mouse hover 预览，定向 31/31，辅助目录已退役 |
| GG-247 | 验证规范生效 | 小需求默认定向检查，完整门禁用于批次/发布或必要回归 |

## New-session recovery

1. 读 `AGENTS.md`、`CURRENT_STATE.md`、`WORKFLOW.md`、本文件、`BACKLOG.md` 和 `DEVELOPMENT_HANDOFF.md`。
2. 使用 `git worktree list` 和当前分支 HEAD 核对上述 GG-253—257 祖先；GG-245 标签仅为历史来源，不得从目录名、main 或 parked C6 猜测最新源码。
3. GG-243 已整合共同运行目录；新需求核对并分配未占用编号，仅在并行写任务时创建 worktree，并按 WORKFLOW 登记所有权、缓存和退役结果。
4. 本地真实 Worker 可能计费；先检查活动任务、队列和冻结积分，再决定是否启动或切换服务。
5. 生产操作必须另有明确授权，且生产事实以 CURRENT_STATE 和发布记录为准。
