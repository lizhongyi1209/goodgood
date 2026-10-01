# Production implementation plan

- Last synchronized: 2026-10-01
- Current phase: GG-250 个人信息直接编辑已接入实际 5173，13 项功能、相关 lint 与文档 9/9；并行 GG-249 完整预览与轮播也已收口，原功能和 verified Web 保留，生产仍为 GG-098/GG-100。
- Current objective: GG-250 直接编辑/保存/取消与 GG-249 预览交用户验收；后续继续按 GG-247 定向验证规范推进小需求。
- Previous objective: GG-244 资产 hover 小按钮、无视频外置文字与节点式视频预览已进入实际 5173。

## Current checkpoint

- Task [GG-250](tasks/GG-250-inline-personal-information.md)：独立 `9ea1002` 精确回放为 `99fb14a`，个人信息直接编辑头像、昵称/用户名并保存/取消；13/13 功能、相关 lint、最终文档 9/9，5173 编译接线通过，辅助目录创建 1/退役 1。保留并行 GG-249 文件及后继 `8ee22d8`。
- Task [GG-249](tasks/GG-249-canvas-media-viewer.md)：从 `e857437` 新建 `fix/GG-249-canvas-media-viewer`，画布图片入口改为受限完整预览、无标题/滚动条的混合媒体轮播；15/15、相关 lint、四个 Vite 模块编译通过，无新增 worktree/缓存，用户验收。
- Task [GG-248](tasks/GG-248-account-personal-information.md)：`b4a34a6` 回放为 `520b452`，六项真实资料、ID/邀请码复制与每次默认入口已接入实际目录；20/20、定向 lint，无全量检查，辅助目录创建 1/退役 1，不改变 GG-245 范围。
- Task [GG-247](tasks/GG-247-targeted-verification.md)：用户要求高频小需求默认定向验证，完整门禁按批次/发布或必要回归执行，规则见 AGENTS/WORKFLOW；不改变 GG-245 的并行开发范围。
- 当前集成分支 `fix/GG-249-canvas-media-viewer`，目录 `F:/goodgood-worktrees/GG-116`，最新前端包含 GG-250 `99fb14a`、GG-249 `8ee22d8` 与 GG-248 `520b452`；GG-245 历史标签不代表最新前端。源码 `7ddb78d` 与 Web 构建 `09c7060` 保留，Web 不因 UI 修改重建。
- Task [GG-246](tasks/GG-246-asset-video-hover.md)：子提交 `c563d98`/根回放 `ec51488` 已整合为 `83a4306`，实际目录 `F:/goodgood-worktrees/GG-116`，基于 GG-244 收口 `dd8dca9`，仅修改大厅资产视频。定向 31/31、一次完整共同门禁 685 通过/22 隔离跳过/0 失败；5173 编译模块 HTTP 200 含新接线；辅助目录创建 2/退役 2。不改变 GG-245 并行任务。
- Task [GG-244](tasks/GG-244-canvas-asset-hover.md)：分支 `fix/GG-244-canvas-asset-hover` 基于 `86ee3b7`；子提交精确回放 `be84c53`、`9d7d18c`，定向 9/9、完整门禁 674/22/0；子目录创建 1/退役 1，沿用 GG-242/243 与云配置。
- Task [GG-245](tasks/GG-245-canvas-image-link-read.md)：子八文件 `e471c1c` 精确回放为 `7ddb78d`；34/34、定向 lint/typecheck、必要 checkpoint 构建通过，实际 cafe24 JPEG 新读取器下载/解码成功（900×1190）。ADR 0122 与原上传/归档保持，本地 Web 同步完成。
- Task [GG-243](tasks/GG-243-project-create-card.md)：独立实现 `f647e13` 及其记录分支已整合到 `F:/goodgood-worktrees/GG-116`；基线为 GG-242 收口 `00f7568`。首位新建卡片取代页头按钮，复用 `/canvas` 新建流程；不修改画布源码。
- 共同整合 `dec0025` 已通过实际运行目录完整门禁：665 通过/22 隔离跳过/0 失败；定向 14/14，5173 编译模块 HTTP 200、包含新卡片和 /canvas 入口。GG-242/243 均为祖先，本任务辅助目录创建 2/退役 2。当前分支名是历史名称，不能单凭名称推断范围。
- Task [GG-242](tasks/GG-242-canvas-image-preview.md)：子 agent 最小源码修复已精确回放为 `c3700b7`，基于 GG-241 `f1570de`，继续保留。GG-240 生命周期规范继续有效。
- 5173 源码目录：`F:/goodgood-worktrees/GG-116`。当前代码含 GG-239 累计基线、GG-242—246、GG-248 和 GG-249；目录名和旧标签不能单独代表最新代码。
- 5173 API 代理：Web `32131` 为 GG-116 verified `09c70604d37a9b06eae9cbedc203c27c1b8c0cc1`，构建指纹见 GG-245；唯一真实开发 Worker `32142` 保留 GG-226 `70e10c6`，readiness 五项为 `ok`。文档后继 HEAD 不是新构建身份。
- 本地依赖：PostgreSQL `54449`、Valkey `56549`、RustFS `58049/58050`、Mailpit `58045/58046`；数据库迁移为 `0056`。
- 云参考图：Web 必须加载仓库外 `cloud-upload.env`，Worker 同样保持 `cloud-development`；否则 23 条 `local-dev/references/` 图像会读取失败，readiness 正常不能代替素材预览验证。
- GG-242 验证：定向 23/23、只读预览 13/13；一次 `check:local` 通过（683 总数，661 通过、22 隔离跳过、0 失败）。浏览器验收交给用户。
- 2026-10-01 启动前只读核对活动任务、待分发 outbox、冻结积分和两队列均为 0；保留原数据卷，没有执行迁移或生成。
- GG-235 已恢复本地媒体只读链路；GG-236 外框已获用户确认；GG-237 和 GG-238 仍需用户在 5173 手验。
- 生产身份继续为 revision `7888554a4650b1b06dbce4293c52e8c018e5c71b`、迁移 `0044_gg098_raise_manual_grant_ceiling.sql`，详见 [CURRENT_STATE](CURRENT_STATE.md)。GG-239 未部署。
- 生产入口仍为 `https://goodgood.o1key.com`，预发布入口为 `https://staging-goodgood.o1key.com`；本地 5173、开发数据库与生产数据继续严格隔离。
- 早期生产实施流水保存在 [2026-09-07 implementation log](history/2026-09-07-implementation-log.md)，仅在追溯历史时读取。
- Next action: 用户刷新 5173 验收 GG-250 直接编辑/保存/取消和 GG-249 完整预览/轮播；GG-248 复制与 GG-245 手验保留。新需求从当前 HEAD 核对祖先并按范围推进，没有待完成开发或运行步骤。
- Blockers: 无代码或本地运行阻塞；浏览器验收由用户负责，不阻塞开发交付。生产发布未获授权。

## Verification sequence

1. 核对当前标签/分支 HEAD，确认 GG-245 `7ddb78d`/`09c7060` 与 GG-242—246 均已整合；交付 `git status --short` 为空。Web 和 Worker 的来源分别按下表交接和健康身份验证。
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
2. 使用 `git worktree list`、`git show goodgood-local-2026-10-01-gg245 --no-patch` 和 `7ddb78d`/`09c7060` 祖先检查找到当前检查点；不得从目录名、main 或 parked C6 猜测最新源码。
3. GG-243 已整合共同运行目录；新需求核对并分配未占用编号，仅在并行写任务时创建 worktree，并按 WORKFLOW 登记所有权、缓存和退役结果。
4. 本地真实 Worker 可能计费；先检查活动任务、队列和冻结积分，再决定是否启动或切换服务。
5. 生产操作必须另有明确授权，且生产事实以 CURRENT_STATE 和发布记录为准。
