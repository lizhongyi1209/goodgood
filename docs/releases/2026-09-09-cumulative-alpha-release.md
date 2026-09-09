# 2026-09-09 累计 controlled-alpha 发布记录

## 结果

GG-004—GG-010、GG-012—GG-022 的累计候选已发布到公开 controlled alpha。维护页只在
迁移、候选验证、恢复演练和精确 alpha 门禁期间保持；全部通过后才切换流量并解除维护。

## 不可变发布身份

| 项目 | 值 |
| --- | --- |
| 源码 revision | `65ceb16823138dd220813fbc3ae5672234fd1f43` |
| 容器镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:40ebfc40ced1963f02250bd8518823567e25692f82c31793817760cdb58db2cb` |
| 数据库迁移 | `0019_gg021_nano_banana_pro_prices.sql` |
| 配置契约 checksum | `98b82bc6760206c1316b3d6ca44db519dd3843c0aae74e9aff16d711d8618da6` |
| GitHub main CI | run `34298537112` |
| artifact evidence | ID `10084128969`；SHA-256 `264dbed1042d5996adca916c859068a79bbeeef96294820353371168f5c8b86c` |

文档收尾提交会使 main 领先线上；线上身份仍以上述完整 revision、镜像摘要和迁移为准。

发布记录合并后的 main run `34302821815` 随后使用更新的 Trivy 数据库扫描出
`sharp 0.35.0` 的 `GHSA-rgj7-g3m4-5g8c`（HIGH，修复版 0.35.4）。源码门禁通过，
该文档镜像发布失败且从未部署；GG-023 跟进依赖升级。此发现不改变上表的实际线上身份，
也不授权绕过新候选 alpha 门禁或再次调用计费 provider。

## 发布门禁与顺序

- CI 的源码、依赖、运行时和镜像安全检查全部通过；生产 preflight 23/23 通过。
- 生产先进入维护并完成新鲜异地备份，再执行隔离恢复、受控数据修复和迁移。
- 候选 Web 在不接公网流量的 blue 槽验证；旧 green Worker 停止后才启动唯一 blue Worker。
- 精确候选 controlled-alpha gate 的 schema、release、artifact、preflight、边界、成员、
  恢复和运维 8 项全部通过。
- 只有在门禁通过后，Nginx 才切至 blue `127.0.0.1:3100` 并移除维护标记。

## 授权的数据修复

发布前存在 1 条历史孤立活动 attempt，而无活动 generation job、无冻结积分。修复事务
以精确条件保护且只匹配 1 行，仅把该 attempt 收敛为 failed 并补齐完成/更新时间；没有
改写其错误、job、provider task、资产或积分证据。修复后活动 attempt 为 0。

## 唯一真实 provider 冒烟

- 仅提交 1 次非敏感 Nano Banana 2 请求：1K、1:1、1 张，无参考图，约 23 秒成功。
- 使用固定幂等键；结果为 1 个私有 Asset、1 个 attempt、1 次 reserve 和 1 次 settle，
  没有重复 provider 提交。成员余额 115→105，冻结积分前后均为 0，队列归零。
- 持久快照确认 O1Key Gemini 3.1 Flash Image v4 路由、隐藏的 `thinking_level: high`、
  `google_search: false`。生成图片经所有者签名读取返回 200 且字节非零。
- 当前成员已有 1 个可复用参考素材；其签名读取为 200。跨所有者参考素材和生成资产读取
  均被拒绝。
- 没有发起第二次计费请求，也没有用这次 Nano 冒烟替代 GPT 透明输出等人工验收。

## 备份与恢复

- 发布后的数据库备份：`/var/backups/goodgood-production/production-auto-20260909T014459Z.dump`，
  106122 字节，SHA-256
  `99a6a09a1570fbf93ee69c27f27f3e2df324225b983c45f17bbb6854fd1211a3`。
- 加密异机 restic snapshot：
  `acf611920537d2ed0e081354cb0382bce69d7a44346fdfd6ec2fecf9fe2307b2`。
- 隔离恢复演练通过：22 个 public 表、140 行、19 个迁移；观察到 1 个有效 session、
  0 个活动 generation job；容器无网络、恢复数据使用 tmpfs。
- 目标 RPO 1 小时、RTO 4 小时；本次新鲜备份约 0 分钟 RPO，演练实际约 12.7 秒。

## 发布后观察

- 公网首页和 readiness 返回 200；未登录 `/api/assets` 与 `/api/billing/summary` 返回 401；
  `/api/auth/login` 返回 302。
- blue Web/Worker 均健康且重启计数为 0；PostgreSQL/Valkey 健康。只有 1 个 Worker，
  队列、活动 job/attempt 和冻结积分均为 0。
- 发布后数据库聚合：2 个用户、4 个资产、2 个参考素材、可用积分合计 185、冻结积分 0、
  19 个迁移。没有在记录中保存用户身份、提示词、provider task ID 或对象键。
- 旧 green Web 保持健康，作为兼容的应用层回退候选；旧 green Worker 已停止。没有执行
  schema 降级，也没有回退需要。
- Chrome 可见标签页已打开并显示 `GoodGood · AI 视觉创作`。页面树读取工具随后两次超时，
  因此本记录不宣称完成新的全 UI 流程；HTTP、数据库、队列、对象存储和真实 provider
  证据不受影响。

## 保持关闭或搁置

- Nano Banana Pro 只上线 15 积分/张报价，provider 路由仍关闭。
- 支付、自动账户删除、举报、完整外部删除条款和完整 seed readiness 没有进入本次候选。
- 后续候选必须重新生成与其完整 SHA 绑定的新鲜发布证据，不能复用本次门禁结果。
