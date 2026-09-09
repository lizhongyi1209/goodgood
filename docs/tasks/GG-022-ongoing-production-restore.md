# GG-022 — 修复 alpha 后续发布的恢复演练

- 状态：本地已验证；等待新候选 CI 与生产隔离恢复验收
- 用户需求：继续完成 2026-09-09 当前累计候选的生产发布
- 最后更新：2026-09-09
- 分支 / worktree：`fix/GG-022-ongoing-production-restore` / `F:\goodgood`
- 基线：`e7dbc3859ee43f36ef4b46c478aa83e82193f1af`；线上仍为 `94cecb0`

## 范围与验收

- 要做：让隔离恢复演练支持包含正常有效登录会话的 controlled-alpha 备份，同时要求
  维护标记存在、活动 generation job 为零，并保留无网络/tmpfs/逐表计数校验。
- 不做：不撤销用户 session，不放宽活动生图任务，不读取 session 内容，不绕过恢复、
  不删除生产数据，不恢复 C6 的账户删除/举报运行时。
- 验收点：有有效 session 且零活动 job 时可演练；无维护标记或存在活动 job 时 fail-closed；
  输出仅包含聚合数量；本地完整门禁、CI 和真实主机隔离恢复均通过。
- 决策影响：[ADR 0042](../decisions/0042-restore-drills-with-active-alpha-sessions.md)
  取代仅适用于首次空库转换的“有效 session 必须为零”限制。
- 授权边界：站长已授权发布、精确修正 1 条历史 attempt，并执行 1 次预计 10 积分的
  非敏感真实生图验收；其他数据处置仍不在范围内。

## 实现与证据

- 相关文件：`infra/production/postgres-backup-restore.sh`、
  `scripts/production-work-package-contract.mjs`、`tests/m8-production-work-package.test.mjs`、
  `docs/DEPLOYMENT.md`、`infra/production/CONTROLLED_ALPHA_RUNBOOK.md`。
- 已完成：main 候选 `e7dbc38` 与镜像 `sha256:cbefa5e5…c15bc3832` 的 CI 全通过；
  公网已进入维护并验证 503；新鲜加密异地备份已成功，但旧恢复工具因 1 个正常有效
  session 直接拒绝，尚未修改生产数据或迁移。
- 验证：定向测试 17/17 通过；`npm run production:work-package -- rehearse` 的 9 组
  契约全部通过；`npm run check:local` 通过（252 项，246 通过、6 项 opt-in 跳过、
  0 失败），lint、typecheck 与 production build 通过；脚本经 LF 归一化后
  `bash -n` 通过，`git diff --check` 通过。
- 发布：尚未发布；线上 Web/Worker 仍为 `94cecb0` green。

## 恢复工作

- 尚未完成：生成新候选镜像、安装匹配工具、恢复演练、精确数据修正、迁移、
  inactive blue 验证、单 Worker 交接、真实生图、alpha 门禁与切流。
- 阻塞/风险：恢复工具修复必须先通过完整门禁和新 CI，不能复用 `e7dbc38` 的摘要。
- 下一步：提交并合并 GG-022，等待精确 main 候选 CI 与不可变镜像。
