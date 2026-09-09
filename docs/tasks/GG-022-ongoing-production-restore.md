# GG-022 — 修复 alpha 后续发布的恢复演练

- 状态：已完成、已部署并通过生产验收
- 用户需求：继续完成 2026-09-09 当前累计候选的生产发布
- 最后更新：2026-09-09
- 实现分支：`fix/GG-022-ongoing-production-restore`
- 部署候选：`65ceb16823138dd220813fbc3ae5672234fd1f43`

## 范围与验收

- 让隔离恢复演练支持正常有效登录会话，同时仍要求受审维护标记存在、活动 generation
  job 为零，并保留无网络、tmpfs、逐表计数与迁移校验。
- 不撤销用户 session，不放宽活动生图任务，不读取 session 内容，不绕过恢复，不删除
  生产数据，也不恢复 C6 的账户删除/举报运行时。
- ADR 0042 取代仅适用于首次空库转换的“有效 session 必须为零”限制。
- 授权边界只包含发布、精确修正 1 条历史 attempt 和执行仅 1 次预计 10 积分的非敏感
  真实生图；其他数据处置不在范围内。

## 实现与证据

- 恢复脚本要求 root 所有、0644 的受审维护标记；输出有效 session 和活动 job 的聚合数。
  有效 session 不再阻塞演练，任一活动 generation job 仍 fail-closed。
- 定向测试 17/17；工作包 9 组契约通过；`npm run check:local` 共 252 项（246 通过、
  6 个 opt-in 跳过、0 失败），lint、typecheck、production build、`bash -n` 与
  `git diff --check` 通过。
- GitHub main CI run `34298537112` 全部通过；artifact evidence `10084128969` 和不可变
  镜像摘要匹配。生产 preflight 23/23、controlled-alpha 门禁 8/8 通过。
- 真实隔离恢复通过：22 个 public 表、140 行、19 个迁移，无网络、tmpfs，约 12.7 秒。
- 精确数据修复只命中 1 条历史孤立 attempt；前后活动 job 为 0、冻结积分为 0，保留
  provider task、错误、资产和积分证据。
- 获授权的唯一真实 Nano Banana 2 请求成功：1K、1:1、1 张，余额 115→105，冻结归零，
  生成 1 个私有 Asset；无重复提交，队列归零，跨所有者素材/资产读取均拒绝。
- 发布后公网首页/readiness 为 200，未登录资产/账单为 401，登录为 302；blue Web 和唯一
  blue Worker 健康且重启计数为 0，旧 green Web 保留为应用层回退候选。
- 完整非敏感证据见[发布记录](../releases/2026-09-09-cumulative-alpha-release.md)。

## 恢复工作

- 发布：已部署源码 `65ceb16823138dd220813fbc3ae5672234fd1f43` 与迁移 0019；维护已解除。
- 尚未完成：无 GG-022 实现、验证或发布待办。
- 风险：后续候选不得复用本次精确证据；回退只允许兼容的应用层切换，不做 schema 降级。
- 下一步：进入发布后观察；新的普通产品需求从 GG-023 建卡。
