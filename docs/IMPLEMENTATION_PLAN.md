# Production implementation plan

- Last synchronized: 2026-09-30
- Current phase: GG-240 为并行子 agent 和 worktree 建立强制登记、集成与退役闭环；运行时代码仍为 `goodgood-local-2026-09-30-gg239`，生产仍为 GG-098 应用和 GG-100 单槽 Compose。
- Current objective: 让后续任务只在确有并行收益时创建子 worktree，并在交接前清除已整合目录和重复缓存、登记所有 dirty 保留项。
- Previous objective: GG-239 已将 5173 累计源码固化为单一提交和标签。

## Current checkpoint

- Task [GG-240](tasks/GG-240-subagent-worktree-hygiene.md)：入口合同、工作流、任务模板和文档契约测试已统一约束子 agent/worktree 生命周期；分支为 `docs/GG-240-subagent-worktree-hygiene`，基线为 GG-239 标签。
- 5173 源码目录：`F:/goodgood-worktrees/GG-116`。目录名只是历史 worktree 名；当前分支只增加流程文档和文档测试，运行时代码仍由 GG-239 标签确认。
- 5173 API 代理：Web `32131` 为 verified `70e10c6ae6bd83542ba870f54059b54b999e9fdf`；唯一真实开发 Worker `32142` readiness 五项为 `ok`。
- 本地依赖：PostgreSQL `54449`、Valkey `56549`、RustFS `58049/58050`、Mailpit `58045/58046`；数据库迁移为 `0056`。
- GG-235 已恢复本地媒体只读链路；GG-236 外框已获用户确认；GG-237 和 GG-238 仍需用户在 5173 手验。
- 生产身份继续为 revision `7888554a4650b1b06dbce4293c52e8c018e5c71b`、迁移 `0044_gg098_raise_manual_grant_ceiling.sql`，详见 [CURRENT_STATE](CURRENT_STATE.md)。GG-239 未部署。
- 生产入口仍为 `https://goodgood.o1key.com`，预发布入口为 `https://staging-goodgood.o1key.com`；本地 5173、开发数据库与生产数据继续严格隔离。
- 早期生产实施流水保存在 [2026-09-07 implementation log](history/2026-09-07-implementation-log.md)，仅在追溯历史时读取。
- Next action: 用户刷新 5173 手验 GG-237 四列项目布局和 GG-238 图片查看器；后续需求从 GG-240 当前检查点分配 GG-241+，仅在真实并行编辑时创建独立 worktree。
- Blockers: 无源码收口阻塞；GG-237/GG-238 的浏览器手验尚未完成，生产发布未获授权。

## Verification sequence

1. 核对 GG-240 当前分支、`git merge-base --is-ancestor goodgood-local-2026-09-30-gg239 HEAD` 成功且 `git status --short` 为空。
2. 核对 `http://127.0.0.1:5173/`、`32131/api/health/version`、`32142/health/ready`；不得凭旧 PID 推断版本。
3. 纯文档流程任务运行文档连续性测试和 `git diff --check`；运行时代码稳定后再执行一次 `npm run check:local`，准确记录通过、跳过或现有失败。
4. 浏览器手验只覆盖尚未确认的 GG-237/GG-238；真实生成必须另获该次计费请求授权。
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

## New-session recovery

1. 读 `AGENTS.md`、`CURRENT_STATE.md`、`WORKFLOW.md`、本文件、`BACKLOG.md` 和 `DEVELOPMENT_HANDOFF.md`。
2. 使用 `git worktree list`、`git show docs/GG-240-subagent-worktree-hygiene --no-patch` 和 GG-239 祖先检查找到当前检查点；不得从目录名、main 或 parked C6 猜测最新源码。
3. 新需求分配 GG-241+ 并创建隔离分支；只有并行写任务才创建 worktree，并按 WORKFLOW 登记所有权、缓存和退役结果。
4. 本地真实 Worker 可能计费；先检查活动任务、队列和冻结积分，再决定是否启动或切换服务。
5. 生产操作必须另有明确授权，且生产事实以 CURRENT_STATE 和发布记录为准。
