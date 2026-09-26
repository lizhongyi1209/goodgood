# GG-120 — Impeccable 项目级共享技能

- 状态：本地整理与静态验证完成；Codex 已在 `F:/goodgood` 新会话发现 `$impeccable`；Claude Code 待本分支合入后确认；未部署。
- 请求：2026-09-26 站长要求将现有 Impeccable 整理为项目级通用技能，同时支持 Codex。
- 工作树 / 分支：`F:/goodgood-worktrees/GG-116` / `feature/GG-116-asset-history-actions`；按本会话要求不切换分支。
- 来源：`F:/goodgood/.claude/skills/impeccable` 的本地未跟踪 4.4.0 安装；仅复制，原目录保持原状。

## 范围与验收

- 一份技能正文、参考资料和脚本位于 `.agents/skills/impeccable/`，供 Codex 在项目级发现。
- `.claude/skills/impeccable/SKILL.md` 是 Claude Code 的发现入口，指向同一份项目正文；四个原有 Claude 子代理定义随项目保存。
- 将技能资料中的固定命令路径指向共享目录；GoodGood 的 `AGENTS.md`、`docs/PRODUCT.md`、`docs/DESIGN_SYSTEM.md` 与已接受 ADR 仍是项目权威，不因缺少根目录 `PRODUCT.md` / `DESIGN.md` 自动新建它们。
- 保留 Apache 2.0 许可证及第三方 NOTICE；忽略 `.impeccable/` 运行产物。
- 不启用 Claude/Codex 自动 hooks，不下载或运行 Impeccable 引擎，不改应用代码和生产环境。
- 决策影响：开发辅助工具布局调整，不改变产品决定，无需 ADR。

## 验证与交接

- 两个入口的 `quick_validate.py` 均通过；49 个 Markdown 文件中的 100 个链接
  检查为 0 个断链；随包的 5 个 JavaScript 脚本通过 `node --check`。
- `node --test tests/documentation-continuity.test.mjs` 为 8/8 通过；
  `git diff --check` 通过。应用代码未改，按仓库流程未重跑 `check:local`。
- 后续新会话验证发现：Codex 使用 `$impeccable`，Claude Code 使用 `/impeccable`；本会话的技能目录快照不会因仓库新文件自动刷新。
- 现有 `F:/goodgood` 的未跟踪 `.claude/` 安装保持原状；将本分支合入该工作树前，应先审查那里的同名未跟踪文件，避免覆盖。
- 2026-09-26 用户澄清 Agent 平台从 `F:/goodgood` 启动。已将本分支的 56 个
  `.agents/skills/impeccable` 文件复制到该目录作为本机未跟踪副本；入口文件
  哈希一致，原有 `.claude/` 未改动。当前会话的技能目录快照仍未列出 Impeccable，
  因此自动发现尚未验证。合入本分支前需处理该未跟踪副本，避免同名文件冲突。
- 随后从 `F:/goodgood` 启动的新 Codex 会话把 `r7/impeccable/SKILL.md` 列入
  可用技能，并按 `$impeccable` 处理 GG-121。Codex 自动发现已确认；Claude Code
  尚未在共享入口合入后核验。

## 下一步

从 `F:/goodgood` 启动新的 Codex 会话，确认 `$impeccable` 被发现；本分支合入后，
再分别确认 Codex 与 Claude Code 的项目级发现。
引擎相关命令仅在明确需要时另行验证，不改变当前 5173/32131 服务。
