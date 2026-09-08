# GG-003 — 干净基线的 alpha 发布工具闭环

- 状态：已实现并通过完整本地门禁；等待精确候选生产证据
- 最后更新：2026-09-09
- 分支 / worktree：`feature/GG-003-alpha-release-tooling` / `F:\goodgood`
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

- 已从 `d65838a` 仅提取 alpha 检查集和只读 CLI；保留当前干净基线的 schema v2，
  未引入 C6 的内容安全、删除、举报代码、迁移或新依赖。
- `production:alpha-gate`、`production:seed-gate` 与 `production:gate` 保持独立；
  alpha 的 artifact/preflight 时效分别为 168/72 小时，四项 alpha 证据为 24 小时，
  六项证据全部绑定候选 Git SHA。
- 定向验证：`node --test tests/m8-controlled-alpha-readiness.test.mjs
  tests/m8-production-readiness.test.mjs tests/ci-workflow.test.mjs`，18/18 通过。
  覆盖有效、缺失、过期、错误候选、错误模式、受阻模板、不可读文件与 CLI 参数失败。
- 完整门禁：`npm run check:local` 通过；251 项中 245 通过、6 项明确的 opt-in
  集成测试跳过、0 失败，lint、类型检查与本地生产构建均通过。
- 本地测试不构成候选生产通过，也不会创建秘密、迁移、切流或生图。
- 下一步：提交干净候选后取得 CI 发布的精确摘要，再在主机上生成新鲜、非敏感、
  精确候选证据；门禁非零则保持维护并停止发布。
