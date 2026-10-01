# Production implementation plan

- Last synchronized: 2026-10-01
- Current phase: GG-243 首位新建项目卡片已在独立大厅分支实现并通过完整代码门禁；GG-242 画布会话继续拥有 5173 运行目录，生产仍为 GG-098 应用和 GG-100 单槽 Compose。
- Current objective: 保持已验证大厅增量可整合，协调共同运行目录 owner 收口后整合；浏览器与预期验收由用户完成。
- Previous objective: GG-241 恢复当前本地依赖、5173、verified Web 和唯一 Worker，保留原数据。

## Current checkpoint

- Task [GG-243](tasks/GG-243-project-create-card.md)：大厅工作目录 `F:/goodgood-worktrees/GG-243-home` / `feature/GG-243-home-project-card`，verified 代码提交 `f647e13`（含子任务集成 `bafb988`），从 GG-241 `f1570de` 开始；GG-239/GG-240 祖先已核验。`check:local` 665 通过 / 22 隔离跳过 / 0 失败，未部署。
- 子 worktree 创建 1 / 退役 1，无子缓存或未登记目录；大厅集成目录作为本会话活动目录保留。GG-243 仍未写入 5173 运行目录，用户验收尚未进行。
- GG-243 与 GG-242 的文件、服务和 worktree 所有权独立；本任务不更改 `features/canvas/**` 或 5173 的运行目录、配置和进程。

- Task [GG-241](tasks/GG-241-local-startup.md)：恢复现有本地服务并记录 Windows 保留端口故障的修复；分支为 `chore/GG-241-local-startup`，基线为 GG-240 `5b14466`。GG-240 生命周期规范继续有效。
- 5173 源码目录：`F:/goodgood-worktrees/GG-116`。目录名只是历史 worktree 名；当前分支只增加流程文档和文档测试，运行时代码仍由 GG-239 标签确认。
- 5173 API 代理：Web `32131` 为 verified `70e10c6ae6bd83542ba870f54059b54b999e9fdf`；唯一真实开发 Worker `32142` readiness 五项为 `ok`。
- 本地依赖：PostgreSQL `54449`、Valkey `56549`、RustFS `58049/58050`、Mailpit `58045/58046`；数据库迁移为 `0056`。
- 2026-10-01 启动前只读核对活动任务、待分发 outbox、冻结积分和两队列均为 0；保留原数据卷，没有执行迁移或生成。
- GG-235 已恢复本地媒体只读链路；GG-236 外框已获用户确认；GG-237 和 GG-238 仍需用户在 5173 手验。
- 生产身份继续为 revision `7888554a4650b1b06dbce4293c52e8c018e5c71b`、迁移 `0044_gg098_raise_manual_grant_ceiling.sql`，详见 [CURRENT_STATE](CURRENT_STATE.md)。GG-239 未部署。
- 生产入口仍为 `https://goodgood.o1key.com`，预发布入口为 `https://staging-goodgood.o1key.com`；本地 5173、开发数据库与生产数据继续严格隔离。
- 早期生产实施流水保存在 [2026-09-07 implementation log](history/2026-09-07-implementation-log.md)，仅在追溯历史时读取。
- Next action: 共同 5173 目录 owner 收口 GG-242 后整合 GG-243 已验证增量；用户验收新建卡片与画布。后续大厅代码从本分支已验证提交开始并先核对共同检查点，继续保持独立文件所有权。
- Blockers: 5173 目录仍由 GG-242 会话编辑，尚未整合大厅增量；无代码实现阻塞，生产发布未获授权。

## Verification sequence

1. 核对 GG-241 当前分支、GG-240 与 GG-239 祖先检查成功且 `git status --short` 为空；后端来源仍由 GG-226 已验证构建确认。
2. 核对 `http://127.0.0.1:5173/`、`32131/api/health/version`、`32142/health/ready`；不得凭旧 PID 推断版本。
3. 纯文档流程任务运行文档连续性测试和 `git diff --check`；运行时代码稳定后再执行一次 `npm run check:local`，准确记录通过、跳过或现有失败。
4. 用户明确负责浏览器和视觉/预期验收；agent 只完成代码层验证。真实生成必须另获该次计费请求授权。
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
| GG-243 | 独立大厅实现/代码验证完成 | 首位新建卡片及 /canvas 导航；665/22/0，子目录已退役；待共同目录整合及用户验收，未部署 |

## New-session recovery

1. 读 `AGENTS.md`、`CURRENT_STATE.md`、`WORKFLOW.md`、本文件、`BACKLOG.md` 和 `DEVELOPMENT_HANDOFF.md`。
2. 使用 `git worktree list`、`git show chore/GG-241-local-startup --no-patch` 和 GG-239/GG-240 祖先检查找到当前检查点；不得从目录名、main 或 parked C6 猜测最新源码。
3. GG-243 大厅工作以本分支提交与任务卡为准；GG-242 是另一会话的画布任务。后续先核对任务编号占用，新建隔离分支；并行写任务按 WORKFLOW 登记所有权、缓存和退役结果。
4. 本地真实 Worker 可能计费；先检查活动任务、队列和冻结积分，再决定是否启动或切换服务。
5. 生产操作必须另有明确授权，且生产事实以 CURRENT_STATE 和发布记录为准。
