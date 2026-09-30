# GG-240 — 子 agent 与 worktree 收口规范

- 状态：已完成（不需上线）
- 用户需求：把多子 agent 任务的磁盘治理写成项目规范，避免再次积累历史 worktree、重复依赖和构建缓存。
- 最后更新：2026-09-30
- 分支 / worktree：`docs/GG-240-subagent-worktree-hygiene` / `F:/goodgood-worktrees/GG-116`
- 基线：`goodgood-local-2026-09-30-gg239`（`6e8b5242171169c9c4785c1cecf1e065b56c85b4`）

## 范围与验收

- 要做：规定子 agent 的启用条件、所有权、依赖/构建缓存、集成、干净目录退役、dirty 目录保护和交接证据。
- 不做：不删除仍有未提交内容的历史 worktree，不改变产品决定、运行时代码、服务或生产环境。
- 验收点：入口合同明确硬约束；WORKFLOW 给出闭环命令和完成标准；任务模板强制登记；自动测试防止规范被静默移除。
- 决策影响：无产品决策变化，不需要 ADR；这是开发交付治理。
- 授权边界：本地文档、文档契约测试与 Git 提交；不发布、不部署。

## 实现与证据

- 相关文件/专题文档：`AGENTS.md`、`docs/WORKFLOW.md`、`docs/DEVELOPMENT_HANDOFF.md`、任务卡模板与连续性测试。
- 已完成：已增加“只在真实并行收益时创建”“先登记后创建”“根目录集中验证”“干净目录退役”“dirty 目录禁止强删”和零未登记残留标准。
- 验证：2026-09-30，`node --test tests/documentation-continuity.test.mjs` 9/9 通过；`git diff --check` 通过。
- 发布：未发布。

## 并行与 worktree 收口

- 子 agent/worktree 清单：无；本任务未创建子 agent 或额外 worktree，直接在当前干净检查点新建隔离分支。
- 依赖/构建缓存：无新增；文档任务不执行 `npm ci`、构建或浏览器测试。
- 交付与集成：当前分支直接形成可审查提交，不合并任何历史分支。
- 收口：创建数 0，退役数 0；本任务没有新增 dirty 路径或磁盘缓存。

## 恢复工作

- 尚未完成：无；GG-237/GG-238 的 5173 手验属于原任务，不阻塞本规范。
- 阻塞/风险：无。
- 下一步：后续任务从 GG-240 检查点分配 GG-241+，仅在并行写任务时按 WORKFLOW 创建并退役 worktree。
