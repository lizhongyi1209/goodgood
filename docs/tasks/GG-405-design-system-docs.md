# GG-405 — 设计系统文档与并存 token

- 状态：本地完成，待推送与评审
- 用户需求：把设计画布中整理好的设计系统合并进仓库；先只加文档和新 token，不改现有数值
- 最后更新：2026-10-09
- 分支 / worktree：`design/GG-405-design-system-docs`
- 基线：main `7c49272`

## 范围与验收

- 要做：新增 `docs/design/`（基础规范、6 个页面章节、33 个组件说明、tokens.json）；新增 `app/design-tokens.css`（`--ds-*`）并由 `app/globals.css` 引入；登记 ADR 0144（提议中）。
- 不做：不改现有变量数值和任何页面样式；不改 AGENTS.md 的视觉约束（待 ADR 接受后另行处理）。
- 验收点：界面无可见变化；文档链接可解析；ADR 与任务卡已登记。
- 决策影响：[ADR 0144](../decisions/0144-design-system-v3.md)（提议中）。
- 授权边界：仅本地文档与样式变量。

## 实现与证据

- 相关文件/专题文档：[docs/design](../design/README.md)、`app/design-tokens.css`、`app/globals.css`。
- 已完成：上述文件已生成；`--ds-*` 变量只定义未使用。
- 验证（2026-10-09）：`node --test tests/documentation-continuity.test.mjs` 8/8 通过；`git diff --check` 通过；`npm run build:local` 通过，打包后的 CSS 含 `--ds-*`；现有变量数值未改。未跑完整 `check:local`。
- 发布：未发布。

## 恢复工作

- 尚未完成：推送分支、开拉取请求、评审 ADR 0144。
- 阻塞/风险：ADR 接受前 AGENTS.md 仍要求宫廷红主色。
- 下一步：评审通过后接受 ADR 0144，再从首页开始按页面迁移到 `--ds-*`。
