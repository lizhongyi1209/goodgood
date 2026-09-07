# GG-001 — 新会话接续与历史精简

- 状态：已完成（文档/验证维护，不需线上部署）
- 用户需求：整理项目上下文，精简历史开发材料，方便新窗口高频迭代线上功能。
- 最后更新：2026-09-07
- 开发分支：`chore/project-continuity`；交付到 `main` / `F:/goodgood`。
- 基线：`94cecb0aa53f7adf1dd6c3b6be23325a535ed5c0`
- 决策：ADR 0026；只调整交接/开发流程，不改变产品和生产环境。

## 范围与验收

- 修正根入口“仅本地原型”的过期状态；不同 agent 统一从 AGENTS 读取。
- 将 2,881 行计划提炼成短检查点，拆分当前状态、工作流、任务索引与历史。
- 完整保留原 118 个 C6 改动文件、原 stash 和历史记录；隔离到独立分支/worktree。
- 新窗口能找到线上版本、未发布内容、本地测试方式、发布边界及下一步。
- 通过文档连续性检查和 `npm run check:local`；不改变运行时代码或生产数据库。
- 非目标：不发布新镜像，不重跑 C6/C7，不实现新业务功能或 alpha 门禁提取。

## 实现与证据

- C6 快照：`d65838a077aeb21e0f7327d6b82ce696d0363a47`，分支已推送 origin。
- 独立目录：`F:/goodgood-worktrees/c6-deferred`。
- 归档分支额外加了 parked 入口保护，提交 `cbe48cb` 已推送；原始快照保持可恢复。
- 可恢复 bundle：`F:/goodgood/work/c6-preserved-20260907.bundle`，`git bundle verify` 通过。
- 保全前常见凭据模式扫描：118 个文件、0 命中；这不等于完整秘密审计。
- 原始完整计划归档，ADR 0022–0024 与 alpha 历史开站 runbook 纳入决策记忆。
- 发布状态：未触碰生产；线上仍为上述基线。文档合并不会自动部署。
- `npm ci --no-audit --no-fund` 按干净基线重新安装成功。
- `npm run check:local` 通过：lint、typecheck、Vinext build，192 项测试，
  188 通过、4 个 opt-in 集成跳过、0 失败（2026-09-07）。本任务不需要新的实机生图。
- 专项连续性/发布合同测试通过；当前文档链接、入口一致性、大小预算、
  生产身份/发布摘要一致性均检查通过；`git diff --check` 通过。
- 原计划归档正文与 `d65838a` 完全一致（忽略换行格式），ADR 0022–0024 原文保留。
- 已核对 app/features/server/shared/db/migrations/package/Compose/Docker/CI 配置
  相对 `94cecb0` 无变化；仍为 12 个迁移。原计划 2,881 行，精简检查点 51 行。
- main 推送会触发既有 CI，但本轮不请求部署；本地门禁通过不冒充新 CI/线上证据。

## 恢复工作

- 尚未完成：无本任务实现/验证待办。
- 已发现但不扩展本任务：clean main 缺 alpha 门禁 CLI；已登记 GG-003。
- 下一步：站长在本项目中新开窗口提出新需求；按 WORKFLOW 从 main 创建独立任务。
