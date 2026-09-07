# GG-003 — 干净基线的 alpha 发布工具闭环

- 状态：待办（下次实际发布前的依赖；不阻塞本地功能开发）
- 最后更新：2026-09-07
- 分支 / worktree：尚未开始；不得在 C6 快照目录继续叠加新产品需求。
- 来源：GG-001 隔离旧 WIP 时发现的工具可移植性缺口，不是新业务需求。

## 问题与范围

线上已按 ADR 0024 开放 alpha，但当时执行的 `production:alpha-gate` 工具
随未发布的 C6 工作保存。干净 main 只有 paid/seed 门禁，不能拿它们冒充 alpha。
下一次发布不能依赖本机忽略目录脚本或偷偷打包整个 C6。

- 从 `archive/c6-deletion-content-safety-20260907` 的 `d65838a` 检查
  `scripts/production-readiness-contract.mjs`、`scripts/verify-controlled-alpha-readiness.mjs`
  和对应测试；仅提取独立的 alpha 证据验证/CLI，不带账户删除/举报运行时代码。
- 明确 schema 版本与过期/绑定规则，旧证据不能借提取自动刷新或跨候选复用。
- 保持三个门禁隔离、fail-closed；验证器只读，不创建秘密、不切流、不生图。
- 使用合成夹具测试有效、缺失、过期、错误候选、错误模式及 CLI 失败路径。
- 更新 package 命令、TESTING、DEPLOYMENT、runbook 和此任务卡，跑完整门禁。
- 无迁移 0013–0020、无新依赖于搁置的内容安全策略；确认发布 diff 干净。

## 验收与下一步

- 干净 checkout 能安装并运行受测试的 alpha 门禁，失败不能继续发布。
- 本地通过不代表新的候选线上通过；具体发布仍需批准及新鲜精确候选证据。
- 下一步：在准备下一次发布时建立独立任务分支，先检查最小工具依赖图。
