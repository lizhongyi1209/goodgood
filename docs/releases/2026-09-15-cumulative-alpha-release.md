# GG-097 累计功能生产发布记录（2026-09-15）

- 任务卡：[GG-097](../tasks/GG-097-production-release-0019-to-0043.md)
- 结果：**已部署并开放公网**。生产身份从 `65ceb168`/`0019` 前移到 `5b65601`/`0043`，
  门禁五项 `pass`、一项 `fail`，站长明确授权带着该缺口开站。
- 授权范围（站长 2026-09-15 明确）：合并 main、推送、CI 发布镜像、生产迁移、切流窗口、
  一次真实 provider 生成；期间追加批准 Next.js 安全升级、ADR 0090 门禁契约对齐，
  以及**授权带着 `controlled-alpha-operations` 缺口开站**。

## 发布身份

| 项 | 值 |
| --- | --- |
| 源码 revision | `5b656013807b0fdaeb22b3cbb5b7af029c9ec16e` |
| 镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:71df51455abd7e6b98fda399a1b1b691e794056e4317a4704076aa0e6ba8b75a` |
| 迁移 | `0043_gg091_account_invitations.sql`（43 条，59 张 public 表） |
| 配置契约 | `65202c281c37eb8e7c2639ee850e9ffe1085cad98f5ef2a85995a4d55d124f3e` |
| CI run | `34992632227`（main，全 `success`） |
| artifact-security | 工件 `10406826398`，SHA-256 `e51d69ce3063023cfe03d7c43488aecd0c333c09cf1e7b76f80ba1b41f35e0a6` |
| 接流槽位 | **green**（web `127.0.0.1:3200`，worker health `3201`） |
| 回退候选 | blue Web 运行中未接流（旧镜像 `40ebfc40`）；blue Worker 已停止。不做 schema 降级 |
| 公网 | **开放**（`/`、`/login`、`/register` 均 200；未登录 session 401） |
| 注册开关 | `GOODGOOD_EMAIL_REGISTRATION_ENABLED=true`（2026-09-15 站长要求打开） |

## 发布过程中修复的两个阻断

两者都不是顺手改动，而是 main CI 产出可发布镜像的**硬前提**：

1. **`c343351` — Next.js 16.2.11 的 CRITICAL CVE。**
   首次 main CI（run `34972549492`）倒在 `Scan locked production dependencies`：
   `CVE-2026-75604` / `GHSA-2xp9-vwfh-vxw4`，CRITICAL 且状态 `fixed`。
   `next` 与 `eslint-config-next` 及全部 `@next/*` 对齐到 **16.3.3**。
   GG-023 当时已把这条 advisory 明确留给运行时镜像 Trivy 门禁判定，本次是走完该预留路径。
2. **`89afedb` — Debian `libpcre2-8-0` 的两个 HIGH。**
   `CVE-2026-86145`、`CVE-2026-89161`，`fixed` 到 `10.42-1+deb12u1`。
   处置为只取该安全更新（`--only-upgrade libpcre2-8-0`），不做全量升级。

**方法论教训**：本地 `npm ci` 通过**不能**证明镜像能构建。本地 npm 11.6.2 生成的
`package-lock.json` 缺少嵌套 `@emnapi` 记录，而镜像构建阶段的 npm 11.19.0 会直接
`npm ci` 失败（EUSAGE）。锁文件必须用**镜像内的 npm** 重新生成。

## 迁移

- 路线甲（原地前向迁移 0019 → 0043）。迁移前逐条审计 24 个迁移：
  **无 `DROP TABLE` / `DROP COLUMN` / `TRUNCATE` / `DELETE FROM`**，无不可兼容项。
- 迁移前只读核验：`0019` 已应用 checksum 与本地文件一致；业务行数全 0。
- 排空检查实做：`jobs_active=0`、`frozen_personal=0`、`pending_orders=0`。
- 结果：24 个迁移全部 `migration.applied`，`count:43`。**未重放任何历史迁移**，
  `0019` checksum 迁移后未变。

## 冒烟与验收

- **preflight 12/12 全 pass**（含 SMTP 实连 `verify()`，未发信）。
- **工件证据 5/5 全 pass**，含与 GitHub 不可变摘要的字节一致性校验。
  **不需要任何凭据**——仓库为公开仓库，导入器按设计在无 token 时走匿名 API。
- 站长账户：`951565127@qq.com`，`site_owner`，邀请码 **405513**，200 积分。
- 第二账户：`lizhongyi1209@gmail.com`，经开放注册 + 站长邀请码建立。
- **一次真实生图成功**：nano-banana-2 / 1K / 1:1 / 1 张 / `succeeded`，
  reserve −20 → settle −20，冻结归零。
- 生成资产：`dca428c3-a7b6-4194-a548-a026d7fd4057`，`1024x1024`，JPEG 625155B，
  `moderation=accepted`，**`visibility=private`**。
- 私有限读与重新登录：站长确认通过。
- **跨账户拒绝**：站长会话请求小号资产的下载地址返回
  **404 `ASSET_NOT_FOUND`**（不泄露存在性），非 200。
- **手动赠送测试积分**：站长在 `/admin/users` 向 gmail 账户赠送积分，
  180 → 280，无支付记录。
- **参考图上传**：站长上传成功，`reference_assets` 有 2 条 `ready` 记录。

## 恢复与运维

- 加密异机恢复点：快照 `c49b2fc11366bda5636521614823faa3b3bcf96fcfd7e56e4a2534cedd380f3a`，
  本地明文归档 277656 字节 / SHA-256 `6ee7862c…`，上传后按设计删除。
- 仓库完整性 `check`：103 快照 / 88 packs / 无错。保留策略 `14/8/12`。
- 隔离恢复演练**通过**：59 表 / 163 行 / 43 迁移 / 1 有效会话 / 0 活动 job，
  `network=none` + `tmpfs`，未覆盖生产。
- 维护标记幂等重入通过。
- 观测：`MemAvailable` 2.27 GiB（阈值 500 MiB）、根盘 41%（止损 80%）、
  green web/worker `restarts=0` 且 healthy、队列 `DBSIZE=0`。

## 门禁结果：五项 pass，一项 fail（站长授权带缺口开站）

`npm run production:alpha-gate` → **`ok: false`**：

| 项 | 状态 |
| --- | --- |
| `artifact-security` | pass |
| `production-preflight` | pass |
| `controlled-alpha-boundary` | pass |
| `controlled-alpha-member-journey` | pass |
| `controlled-alpha-recovery` | pass |
| `controlled-alpha-operations` | **fail** |

**`operations` 未通过的原因：主机上不存在任何对外告警/通知通道。**
ADR 0016 把监控平台与通知路由交给独立责任方，生产从未接入。
没有渠道可供触发并确认送达，故 `notificationDelivered: false`、
`backupFreshnessObserved: false`、`manualContactDocumented: false`。

**站长 2026-09-15 明确决定：「通知渠道以后再做」，并授权带着该缺口开站。**
本记录如实保留该项为 `fail`，不将其写成通过。

**该缺口的实际含义**：站点出现故障、数据库异常、磁盘/内存触顶、备份停止或
provider 持续失败时，**不会有任何自动通知**。站长需主动查看主机状态或依赖用户反馈。

> **2026-09-17 更正**：本节早期版本写的「此外 `goodgood-postgres-backup.timer`
> 自 2026-09-05 起为 `disabled`，不存在 RPO ≤ 60 分钟的持续备份保障」**是错的**，
> 已作废。真正 `disabled` 的是历史 staging timer `goodgood-postgres-backup.timer`；
> 生产用的是 `goodgood-production-postgres-backup.timer`，自 2026-09-06 12:00 起
> `enabled`/`active`、每 30 分钟一次。2026-09-17 首轮恢复演练通过（见文末）。
> **`operations` 项仍然 `fail` 的唯一原因是缺少对外告警通道**，与备份无关。

## 门禁契约的一次修正（ADR 0090，`5b65601`）

首次门禁未通过的两项中，`member-journey` 的原因是**契约与产品行为不一致**而非执行缺陷：
门禁硬要求 100 欢迎积分与 `pending` 准入门，而产品实际为 200 积分、
email 注册直接建 `active`（GG-090/ADR 0089 已取代 ADR 0020 的 pending 模型）。

站长明确「我接受任何人注册成功后就激活」，据此写入 **ADR 0090**，
门禁验证项与产品实际行为对齐；**未放宽任何其他门禁**。

**同时更正了一处自身的填报错误**：本记录早期版本中 `controlled-alpha-boundary`
曾取 `pass`，但其 `registrationDefaultState: "pending"` 与
`siteOwnerApprovalRequired: true` 是**不实值**——生产库 `pending` 用户为 0、
审批审计为 0。主机保留 `readiness.json.passclaimed` 作为对照，不掩盖。

## 开站后冒烟

解除维护后立即复查：`/`、`/login`、`/register` 均 200；未登录 `/api/auth/session`
401；`/api/health/ready` 200；green Worker readiness `provider: ok`；
队列深度 0；green Web/Worker 与依赖容器全部 healthy。

打开注册后另做一次真实链路探针：`POST /api/auth/email/request` 返回 **202**
且 `delivery: accepted`，即服务端已放行到发信阶段且 SMTP 接受。
探针未创建任何账户（`users` 仍为 2）；仅留下一个未消费的挑战行。

## 开站后首轮真实运行核对（2026-09-17）

开站并开放注册约 36 小时后核对：

| 项 | 值 |
| --- | --- |
| 账户 | 21（全部 `active`；站长 + 20 位真实注册用户） |
| 生成资产 | 60 |
| 参考素材 | 44 |
| 生成任务 | 56（51 成功 / 5 失败） |
| 累计结算积分 | 1900 |
| 冻结积分 | 0 |
| 运营登记充值 | 4 笔，共 15100 积分（支付宝 ×2、支付宝收款、微信，经 `operator` 登记） |

- 注册链路在真实公网条件下连续 36 小时正常工作，无阻断。
- 充值记录为**运营按「登记已收到的充值款」手动录入**的，不是自动支付；
  支付/支付宝结算仍搁置。
- **本次发布记录中早先写下的「users 2 / assets 1 / references 2」是该时点的快照，
  已被本节取代。**

## 附加记录的独立缺口（非本次引入）

- ~~备份 timer `disabled`，自 2026-09-05 未自动运行。~~ **2026-09-17 更正：此条不成立。**
  见上节更正说明与文末恢复演练记录。
- blue Web 长期闲置占资源，可在观察期后退役。
- 注册开关已于开站后按站长要求打开为 `true`；开放注册即意味着任何访问者可立得 200 积分
  并消费真实 O1Key 费用（ADR 0090 已显式记录该取舍）。站长账户与邀请码 405513 已在此之前建立。
- 因开放注册，**累计功能**的开源仓（`private: false`）意味着任何人都能看到源码；
  这与仓库长期设置一致，非本次变更。

## 第二轮核对与首次生产恢复演练（2026-09-17）

- 增长中的实时计数（当日）：users 25（全 `active`）、assets 79、generation_jobs 98
  （70 成功 / 28 失败）、参考素材 94 `ready` / 7 `pending` / 12 `rejected`；
  上一节的 21/60/44/56 是当日更早的快照。
- **首次恢复演练通过**：维护窗口 17:09:25–17:10:31（约 66 秒）。演练前先触发一次新备份，
  取最新快照 `ce191630`（17:09:37）。`restore_drill=passed`、`network=none`、
  `storage=tmpfs`，还原 **59 张 public 表 / 2403 行 / 43 个迁移**，与生产 schema 一致；
  观察到的会话 29（ADR 0042 允许保留）、活动生成 job 0。Restic 仓库当时 90 个快照，
  `check --read-data` 60/60 packs 无错误。归档 SHA-256
  `70f5e737e2a31eaa9ee43409b35e5e8fa39e00409f812008d4534549e6db7b80`。
  演练容器与临时归档已清理，生产库未被写入。
- 演练后公网 `/`、`/login`、`/register` 均 200；维护标记已移除并核验 `maintenance=disabled`。
- 操作边界：本次只使用既有 `goodgood-production-maintenance`（enable）与备份/演练脚本；
  关闭维护按审查步骤手工移除标记后 `nginx -t` + reload，未改动应用镜像、迁移或生产数据。
- **发现独立缺陷（未修复）**：当日 nginx 记录 41 次 `/api/references/*` 上游超时，
  集中在 15:48–16:12（本次操作之前）。素材最终全部 `ready`，但校验耗时最长 5 分 56 秒，
  超过 70s 读超时，用户会看到失败提示。详见 `CURRENT_STATE.md` 的「待排查的线上缺陷」。
