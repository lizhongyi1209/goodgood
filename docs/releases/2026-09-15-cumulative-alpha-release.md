# GG-097 累计功能生产发布记录（2026-09-15）

- 任务卡：[GG-097](../tasks/GG-097-production-release-0019-to-0043.md)
- 结果：**已部署，未开放**。生产身份已从 `65ceb168`/`0019` 前移到 `89afedb`/`0043`，
  但 alpha 门禁如实未通过，公网停留在维护页（503）。
- 授权范围（站长 2026-09-15 明确）：合并 main、推送、CI 发布镜像、生产迁移、切流窗口、
  一次真实 provider 生成。期间追加批准了 Next.js 安全升级。

## 发布身份

| 项 | 值 |
| --- | --- |
| 源码 revision | `89afedbc7363c9a1f8195271178f0ab1d607ffae` |
| 镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:72ac3253b3cde4b51a9a022b8378be34fe7841979855ef2fa97b773fc76d16e4` |
| 迁移 | `0043_gg091_account_invitations.sql`（43 条，59 张 public 表） |
| 配置契约 | `6358dc04d5bcfb352e85a768cf7f880379edde8033846cbdae92f5fd0531a4e8` |
| CI run | `34981296562`（main，全 `success`） |
| artifact-security | 工件 `10401841455`，SHA-256 `3605168ba0de8482f4eee6bc3bd9d2e7d151a33c8384f7027bfb7ddbc431f97d` |
| 接流槽位 | **green**（web `127.0.0.1:3200`，worker health `3201`） |
| 回退候选 | blue Web 运行中未接流（旧镜像 `40ebfc40`）；blue Worker 已停止。不做 schema 降级 |

## 发布过程中修复的两个阻断

两者都不是顺手改动，而是 main CI 产出可发布镜像的**硬前提**：

1. **`c343351` — Next.js 16.2.11 的 CRITICAL CVE。**
   首次 main CI（run `34972549492`）倒在 `Scan locked production dependencies`：
   `CVE-2026-75604` / `GHSA-2xp9-vwfh-vxw4`，CRITICAL 且状态 `fixed`。
   CI 用 `ignore-unfixed: true`，因此必须真修。`next` 与 `eslint-config-next`
   及全部 `@next/*` 对齐到 **16.3.3**（扫描器给出的最低修复版）。
   GG-023 当时已把这条 advisory 明确留给运行时镜像 Trivy 门禁判定，本次是走完该预留路径。
2. **`89afedb` — Debian `libpcre2-8-0` 的两个 HIGH。**
   修完 Next 后本地构建镜像并用同版本 Trivy 0.70.0 扫描，发现
   `CVE-2026-86145`、`CVE-2026-89161`（`fixed` 到 `10.42-1+deb12u1`）。
   base 镜像早于 Debian 修复构建，runtime 阶段原先不做 OS 补丁。
   处置为只取该安全更新（`--only-upgrade libpcre2-8-0`），不做全量升级。

**方法论教训**：本地 `npm ci` 通过**不能**证明镜像能构建。本地 npm 11.6.2 生成的
`package-lock.json` 缺少嵌套 `@emnapi` 记录，而镜像构建阶段的 npm 11.19.0 会直接
`npm ci` 失败（EUSAGE）。锁文件必须用**镜像内的 npm** 重新生成。

## 迁移

- 路线甲（原地前向迁移 0019 → 0043），迁移前逐条审计 24 个迁移：
  **无 `DROP TABLE` / `DROP COLUMN` / `TRUNCATE` / `DELETE FROM`**。
- 唯一非加法项是 `0026` 的 `<creation_drafts>` 主键替换与两处幂等索引替换；
  BEFORE 触发器 `goodgood_assign_creative_workspace` 会自动补 `workspace_id`，
  幂等索引为放宽，判定旧 Web 读写路径仍然成功 → **无不兼容项**。
- 迁移前只读核验：`0019` 已应用 checksum
  `12b253518ce174549f88e389a43b6af15dcd7858892d3f776a4d798022372b3e` 与本地文件一致；
  业务行数全 0。
- 排空检查实做：`jobs_active=0`、`frozen_personal=0`、`pending_orders=0`。
- 结果：24 个迁移全部 `migration.applied`，`count:43`，`localFixturesEnabled:false`。
  **未重放任何历史迁移**，`0019` checksum 迁移后未变。

## 冒烟与验收

- **preflight 12/12 全 pass**，含 SMTP 实连 `verify()`（未发信）。
- **工件证据 5/5 全 pass**，含与 GitHub 不可变摘要的字节一致性校验。
- 站长账户：`951565127@qq.com`，`site_owner`，邀请码 **405513**，200 积分。
- 第二账户：`lizhongyi1209@gmail.com`，经开放注册 + 站长邀请码建立。
- **一次真实生图成功**：nano-banana-2 / 1K / 1:1 / 1 张 / `succeeded`，
  reserve −20 → settle −20，冻结归零，余额 200 → 180。
- 生成资产：`dca428c3-a7b6-4194-a548-a026d7fd4057`，`1024x1024`，JPEG 625155B，
  `moderation=accepted`，**`visibility=private`**。
- 私有限读与重新登录：站长确认通过。
- **跨账户拒绝**：站长会话请求小号资产的下载地址返回
  **404 `ASSET_NOT_FOUND`**（不泄露存在性），非 200。

## 恢复与运维

- 加密异机恢复点：快照 `c49b2fc11366bda5636521614823faa3b3bcf96fcfd7e56e4a2534cedd380f3a`，
  本地明文归档 277656 字节 / SHA-256 `6ee7862c…`，上传后按设计删除。
- 仓库完整性 `check`：103 快照 / 88 packs / 无错。保留策略 `14/8/12`。
- 隔离恢复演练**通过**：59 表 / 163 行 / 43 迁移 / 1 有效会话 / 0 活动 job，
  `network=none` + `tmpfs`，未覆盖生产。
- 维护标记幂等重入通过，公网 503 一致。
- 观测：`MemAvailable` 2.27 GiB（阈值 500 MiB）、根盘 41%（止损 80%）、
  green web/worker `restarts=0` 且 healthy、队列 `DBSIZE=0`。

## 门禁结果：未通过（如实）

`npm run production:alpha-gate` → **`ok: false`**，四项 `pass`、两项 `fail`：

| 项 | 状态 | 原因 |
| --- | --- | --- |
| `artifact-security` | pass | — |
| `production-preflight` | pass | — |
| `controlled-alpha-boundary` | pass | — |
| `controlled-alpha-recovery` | pass | — |
| `controlled-alpha-member-journey` | **fail** | 见下 |
| `controlled-alpha-operations` | **fail** | 见下 |

**member-journey 失败的原因是契约与产品不一致，不是执行缺陷：**

- 门禁硬要求 `welcomeCredits === 100`，但 `server/billing/repository.mjs:22` 为
  `WELCOME_CREDIT_AMOUNT = 200n`，两个账户实际都得到 200（= 单张 20 积分 × 10 张）。
- 门禁硬要求 `pendingBeforeApproval === true` 与 `generationBlockedWhilePending === true`，
  但 email 注册路径 `createEmailOwner` 直接建 `status='active'`。
  这是 GG-090 / ADR 0089 的既定行为，**已取代 ADR 0020 的 OIDC pending 模型**。
  实测中小号注册后立即出图成功，正是该模型的正常表现。
- 门禁契约描述的是旧模型，尚未随 ADR 0089 更新。

填 `pass` 需要写入假值，未做。

**operations 失败的原因是通知渠道不存在：**

- 主机上没有任何对外告警/通知通道；ADR 0016 把监控与通知路由交给独立责任方，生产从未接入。
- 没有渠道可供触发并确认送达，`notificationDelivered: false`。
- 站长 2026-09-15 指示：如实记为未接入。

## 未执行

- **阶段 6.8 解除维护**：门禁未通过，公网保持 503。
- 站长人工验收清单中「参考图上传」等 UI 项未逐条回填。

## 附加记录的独立缺口（非本次引入）

- `goodgood-postgres-backup.timer` 为 `disabled`，自 2026-09-05 未自动运行。
  本次恢复点是手动产生的，**不存在 RPO ≤ 60 分钟的持续保障**。
  站长指示「不动，只记录」。
- blue Web 长期闲置占资源，可在观察期后退役。
- 本地 32131/32142 栈在 `npm ci` 前停止，尚未恢复。

## 当前可对外状态

**站点对公众不可用（503 维护页）。** 站长账户可正常登录（已绑定账户
不受注册开关影响），但公网入口被维护页拦截。开放公网需要先解决上述两项门禁。
