# GG-098 生产发布记录：单次手动积分上限提升到 ¥10,000（2026-09-21）

## 发布身份

| 项 | 值 |
| --- | --- |
| 入口 | https://goodgood.o1key.com |
| 源码 revision | `7888554a4650b1b06dbce4293c52e8c018e5c71b` |
| 镜像 | `ghcr.io/lizhongyi1209/goodgood@sha256:7deeab8c0257e9127326eb2fc14b5beecf370f5a22408361f613465a0b432270` |
| 数据库迁移 | `0044_gg098_raise_manual_grant_ceiling.sql`（44 条，59 张 public 表） |
| 配置契约 checksum | `65202c281c37eb8e7c2639ee850e9ffe1085cad98f5ef2a85995a4d55d124f3e`（未变） |
| CI | run `35449483809`（#60），`Verify source and image` 与 `Publish immutable image` 均 success |
| 工件证据 | artifact `10585568052`，SHA-256 `8854c577114cb173c1be4ee6cce46dc61dc9a26150162585de57bbd7ef5c4067` |
| 活跃槽位 | **blue**（Web `127.0.0.1:3100`、Worker health `3101`） |
| 回退候选 | green Web 运行中未接流（`71df5145` = `5b65601`）；green Worker 已停止 |

这是**首次带迁移的热修发布**，走的是 `DEPLOYMENT.md` 新增的「生产热修清单」。

## 本次变更

单次手动积分发放上限 `5000` → `1000000` 积分（100 积分/元，即 ¥10,000）；删除账号管理
对话框的 `100 / 500 / 1000` 快捷按钮，改为始终手动输入。上限原本写在浏览器、两个服务端
检查与数据库约束三处，本次统一到共享常量 `ADMIN_CREDIT_AMOUNT_MAX`。

迁移 `0044` 只重建 `administrative_actions_status_check`，把 `credit_amount BETWEEN 1 AND 5000`
改为 `BETWEEN 1 AND 1000000`，其余子句逐字照抄 `0039_gg081_classified_credit_grants.sql`，
已用逐行 diff 核对；不修改或删除任何既有行。应用后实测约束为
`credit_amount >= 1 AND credit_amount <= 1000000`，既有 4 条审计行完好。

## 执行过程

1. 发布前恢复点：Restic 快照 `36f2a437`（`automated_backup=passed`）。
2. 主机候选检出更新到 `7888554`（经 `git bundle` 传输，主机无 GitHub 凭据）。
3. `production:preflight` 全通过（含 SMTP 连接与认证验证，不发信），reference
   `gg098-preflight-20260919`，evidence `checkedAt 2026-09-21T15:00:30Z`。
4. `production:artifact-evidence` 导入工件，绑定同一 revision 与 CI run。
5. blue 候选 Web 启动 → 迁移 `0044` → 停 green Worker（`Exited (0)`）→ 起 blue Worker。
6. 备份 `/etc/nginx/goodgood/production-active-upstream.conf`（`.pre-gg098-green.conf`），
   原子替换为 blue `3100`，`nginx -t` 通过后 `nginx -s reload`。

## 切流后核验

- 公网 `/`、`/login`、`/register` 均 **200**；未登录 `/api/auth/session` **401**；
  维护标记 `disabled`。
- 流量确实落到 blue；green 仅切流瞬间有残留连接。
- 队列深度 0、活动 generation job 0、冻结积分 0；green web/worker 与 blue 全部 healthy。
- 连续运行 26 小时以上无中断。

## 真实生图冒烟（站长 2026-09-21 单独授权）

走**完整真实登录链路**，不伪造身份：

1. `POST /api/auth/email/request` → **202**，`delivery: accepted`，真实发信至站长邮箱。
2. 站长提供收到的六位验证码 → `POST /api/auth/email/verify` → **200**
   `{"authenticated":true}`。
3. `GET /api/auth/session` → `role: site_owner`、`invitedCode 405513`、
   `availableCredits 8976`、`reservedCredits 0`。
4. `POST /api/generations`（Nano Banana 2、1K、1:1、1 张）→ **202** queued。

结果：

| 项 | 值 |
| --- | --- |
| 任务状态 | `succeeded`，`attempt_count 1` |
| 路由 | `o1key-gemini-3.1-flash-image-c-sp-v4`（provider `o1key`） |
| 积分流水 | `reserve` 1 次 + `settle` 1 次；余额 8976 → 8956 |
| 冻结积分 | 归零（全局 `sum(reserved_balance) = 0`） |
| 生成资产 | 1024×1024、783672 字节，`owner_id` 为站长本人 |
| 私有读取 | 自有 `GET /api/assets/<id>/download-url` → **200**（15 分钟签名 URL） |
| 未认证读取 | 同路由无 Cookie → **401** |

**未完成项**：**跨账户拒绝未实测**——站长指示「不用测试了」。因此
`controlled-alpha-member-journey` 中的 `crossOwnerReadDenied` 不得填 `true`，
本次未跑完整 `production:alpha-gate`。

**探针瑕疵**：提交时的提示词中文在 curl 传输中被破坏，落库显示为乱码。这不影响计费、
路由、私有性结论，但不应把它当作提示词持久化的正确性证据。

## 发布中发现的主机隐患：旧的 compose.production.yaml

blue 候选槽位**首次启动直接崩溃**，日志：

```text
Error: GOODGOOD_EMAIL_OTP_SECRET_FILE could not be read.
    at loadEmailOtpConfig (file:///app/server/runtime/web.mjs:93244)
```

根因不在代码，而在主机：`/opt/goodgood-production/compose.production.yaml` **是旧版本**。

- 其 web 服务只绑定 4 个 secret，缺 `goodgood_email_otp_secret` 与
  `goodgood_email_smtp_password`（两个文件 root 均可读，是 compose 定义里根本没列）。
- 这两个绑定由 `d1af9ca`（email OTP 生产切换）引入；主机那份还缺
  `email-auth-status`、`email-auth-cleanup`、`bind-existing-owner-emails` 三个 maintenance 服务。
- 现场证据：`docker compose config` 解析后 web 只绑定 4 个 secret；
  `docker inspect` 显示 green 挂载 6 个而 blue 只有 4 个。
- green 之所以一直正常，是因为它当初用当时较新的 compose 启动后**再未重建过**，
  所以 GG-097 发布没有暴露这个偏差。

处理：用 `candidate-5b65601/compose.production.yaml`（即本次 revision 的版本）覆盖主机文件，
旧版保留为 `compose.production.yaml.pre-gg098-backup`。覆盖后候选立即健康。

**对后续发布的意义**：不同步该文件，任何**新建**槽位都会崩溃。起槽位前必须先核对主机
compose 与候选 revision 一致。

另注：`blue.env` / `green.env` 在主机的实际位置是 `/etc/goodgood/production/slots/`，
不是仓库内路径。

## 遗留与下一步

- green 仍作为未接流的回退候选运行，但其镜像（`5b65601`）早于当前 schema `0044`。
  **回退兼容性从未演练**，本次发布经站长明确同意接受该风险；不要把它当作已验证的回退路径。
- `controlled-alpha-operations` 门禁项仍为缺口（无对外告警通道，站长 2026-09-15 已授权接受）。
- 参考图校验超时缺陷（2026-09-17 发现）仍然未修，见
  [演练与缺陷记录](../operations/2026-09-17-production-restore-drill.md)。
