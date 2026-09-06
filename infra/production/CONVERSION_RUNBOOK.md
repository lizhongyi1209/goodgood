# GoodGood 首次正式环境转换运行手册

状态：**仅供本地审阅与演练，不构成任何线上操作授权。**

本手册落实 ADR 0021：把现有香港主机从 M7 测试环境干净转换为首个
GoodGood 正式环境。执行窗口最多 4 小时。维护页必须先于冻结测试写入，
任何门禁失败或时间耗尽都保持公开维护状态。不得把测试数据库、会话、队列
或对象作为正式数据导入。

## 固定边界

- 正式域名：`goodgood.o1key.com`。
- 主机：已核验的香港 Ubuntu 24.04 x86_64，2 vCPU、4 GiB、50 GiB。
- 依赖项目：`goodgood-production-dependencies`。
- 正式卷：`goodgood-production-postgres-data`、
  `goodgood-production-valkey-data`；与所有 `goodgood-staging-*` 卷隔离。
- 应用槽位：blue=`3100/3101`，green=`3200/3201`；一个 Worker 进程并发处理
  已接受任务，容器停止宽限 5 分钟。
- 对象：现有私有 R2 `goodgood` bucket，仅在精确盘点、另行批准的测试对象
  清除、空桶核验和凭据轮换后继续使用。
- 恢复：正式 PostgreSQL 每 30 分钟触发备份，随机延迟最多 5 分钟；
  加密异地主存储保留 `24h + 14 daily + 8 weekly + 12 monthly`，RPO 不超过
  1 小时，恢复演练目标 RTO 不超过 4 小时。
- 公开入口：主机 Nginx 后接 Cloudflare；数据库、Valkey、Web 和 Worker
  健康端口均不公开。
- 支付：`GOODGOOD_FAKE_PAYMENT_ENABLED=false`，没有客户结账入口。

仓库文件安装到以下固定位置，所有复制件先核对当前候选版本的 CI
`runtimeConfigVersion`：

| 仓库文件 | 主机路径 | 所有权/模式 |
| --- | --- | --- |
| `compose.production.dependencies.yaml` | `/opt/goodgood-production/compose.production.dependencies.yaml` | `root:root 0644` |
| `compose.production.yaml` | `/opt/goodgood-production/compose.production.yaml` | `root:root 0644` |
| `infra/production/slots/{blue,green}.env` | `/etc/goodgood/production/slots/{blue,green}.env` | `root:root 0644` |
| `infra/production/r2-inventory.env.example` | `/etc/goodgood/production/r2-inventory.env` | `root:root 0600` |
| `infra/production/nginx/goodgood.conf` | `/etc/nginx/sites-enabled/goodgood.conf` | `root:root 0644` |
| `infra/production/nginx/cloudflare-origin-only.conf` | `/etc/nginx/snippets/goodgood-cloudflare-origin-only.conf` | `root:root 0644` |
| reviewed active-upstream file | `/etc/nginx/goodgood/production-active-upstream.conf` | `root:root 0644` |
| `infra/production/maintenance/index.html` | `/var/www/goodgood-production/maintenance/index.html` | `root:root 0644` |
| `infra/production/maintenance-control.sh` | `/usr/local/sbin/goodgood-production-maintenance` | `root:root 0755` |
| `infra/production/postgres-backup-restore.sh` | `/usr/local/sbin/goodgood-production-postgres` | `root:root 0755` |
| `infra/production/postgres-backup-automated.sh` | `/usr/local/sbin/goodgood-production-postgres-backup-automated` | `root:root 0755` |
| production backup units | `/etc/systemd/system/goodgood-production-postgres-{backup,maintenance}.{service,timer}` | `root:root 0644` |

正式 release/runtime/backup 环境文件、凭据、证据和批准只存在主机或批准的
异地保管位置，绝不复制到仓库或操作员电脑。

`/etc/goodgood/production` 必须为 `root:root 0711`：Nginx Worker 只能穿越该
目录并检查公开的 `0644` maintenance marker，不能列出目录；`release.env`、
`runtime.env` 继续为 `root:root 0600`，`secrets/` 及其中凭据继续使用专用组和
更严格的既定权限。不要把生产配置根目录设为 `0700`，否则 Worker 无法识别
maintenance marker，静态维护门禁会失效并触发入口关闭。

## 执行前一天：无变更审阅

以下任一项未通过就不预约转换：

1. CI 对同一 revision 的测试、依赖扫描、镜像扫描、运行时导入 smoke 和
   immutable GHCR digest 全部成功；migration 至少为
   `0011_m8_account_admission.sql`。
2. `npm run production:work-package -- rehearse` 通过，JSON 仍为
   `executed:false`、`executionAvailable:false`。
3. 在仓库外填写 conversion manifest；保留所有实时和破坏性批准为 false，
   直到对应步骤前另行取得批准。
4. 记录当前主机资源、容器/卷/网络、端口、release labels、数据库表/行数、
   活跃会话、非终态任务、outbox、Valkey 队列以及 R2 元数据摘要。输出放入
   `/var/lib/goodgood-production/conversion/evidence/`，目录为 `root:root 0700`。
5. 核验 Cloudflare 代理、Full (strict)、源站证书、源站防火墙和当前官方 IP
   allowlist；不在转换窗口更换 DNS 或域名。
6. 明确主操作员、复核人、事件联系人、4 小时截止时间和可用的私有诊断路径。
7. 证明现有 staging Restic 仓库可读、最新自动快照可列出，且恢复工具校验过；
   不以同机 dump 代替异地恢复证据。
8. 监控接手方已准备记录活跃任务、提交率、队列深度/年龄、应用和提供商
   延迟/失败、PostgreSQL/Valkey 压力、重启、可用内存、根盘和备份新鲜度。

## Authing 控制台核对单

转换中复用 Authing 应用和身份目录，不删除任何 Authing 用户或第三方身份。
由两人复核并保存不含 secret/token 的控制台证据：

- Login callback allowlist 最终只保留
  `https://goodgood.o1key.com/api/auth/callback`；移除 GoodGood loopback 和所有
  旧 staging callback。
- Logout URL 最终只保留 `https://goodgood.o1key.com/`。
- Authorization Code、S256 PKCE、RS256 ID Token、`openid profile email`、
  verified email 要求保持不变。
- 登录方式仍只有 Google 和邮件验证码；密码、手机号及其他社交入口不启用。
- Google Cloud redirect URI 仍精确等于 Authing Google 连接显示的回调；
  不把 GoodGood callback 填到 Google Cloud。
- 轮换 Authing application client secret，撤销旧值；新值只写入
  `/etc/goodgood/production/secrets/auth-client-secret` 并以
  `root:goodgood-runtime-secrets 0640` 挂载给 Web。
- Authing user-pool management secret 不被 GoodGood 运行时使用；如在操作中
  接触或披露则轮换并撤销旧值，但不得写入主机 runtime 文件。
- 用新的正式 secret 执行 network preflight；随后分别证明 Google 和邮件
  验证码登录落到同一 Authing `sub`，并经新鲜 GoodGood 数据库创建一个
  `pending` owner，而不是恢复旧 GoodGood 身份绑定。

## 正式 secret 轮换核对单

每一项都记录“已签发、旧值已撤销、文件路径/模式已核验”，不记录实际值：

| 边界 | 正式处理 |
| --- | --- |
| PostgreSQL | 新随机密码；依赖 secret 为 `root:root 0600`，root-only runtime 文件内的连接串使用同一值 |
| Valkey | 仅内部 Docker 网络，无主机端口；不把它接到任何 staging 网络 |
| Authing client | 新 client secret，仅 Web 可读；旧值撤销 |
| GoodGood session | 当前实现使用数据库中散列的随机不透明 session token，没有共享签名 secret；新空数据库不复制 `auth_sessions`，所以旧 token 无效，不虚构一个未实现的 secret |
| O1Key | 新生产 key，仅 Web/Worker 所需角色挂载；旧 staging key 撤销 |
| R2 application | 清空核验后签发仅限 `goodgood` bucket 的 Object Read & Write 新凭据；撤销 staging 凭据 |
| Backup R2 | 与 application R2 不同的凭据，仅限 `goodgood-postgres-backups/production` 边界 |
| Restic | 新的至少 32 字符密码，root-only 文件与批准的灾难恢复保管各一份；不得遗失 |
| GHCR/SSH/Cloudflare/ESA | 核验最小权限、有效期和审计；只有暴露或策略要求时轮换，不能与应用 secret 共用 |
| TLS private key | 保持只在主机；若曾离开主机或暴露则重新签发并替换 Origin CA 证书 |

## 四小时转换窗口

在外部事件记录中写下 `T0` 和 `deadline=T0+4h`。每个阶段均先记录输入和
预览，再取得该阶段的明确批准。下面命令是未来窗口的操作模板，不得在本地
演练中执行。

### C0 — 进入维护（目标 0–10 分钟）

1. 确认 blue upstream 示例指向 `127.0.0.1:3100`，安装全部生产 Nginx
   文件和维护资源，但先不 reload。
2. `sudo nginx -t` 通过。
3. 取得 `production-ingress-maintenance` 操作批准后执行：

   ```bash
   sudo /usr/local/sbin/goodgood-production-maintenance plan-enable
   sudo /usr/local/sbin/goodgood-production-maintenance enable --execute
   ```

   `enable` 在锁内创建不可跟随符号链接的 marker、reload Nginx，并从本机
   origin 核验 HTTP 503。reload 或 503 核验失败时停止 Nginx。该工具没有
   disable/open 操作。
4. 从外部网络确认主页、登录和生成都只得到静态维护页，不向应用代理。

检查点 R0：在 marker 创建前可无变更取消。marker 创建后，所有失败均保持
维护或关闭 Nginx；不得把 staging 重新公开。

### C1 — 冻结、盘点和最终 staging 归档（目标 10–45 分钟）

1. 停止 staging Web 接受写入，再让 staging Worker 在 5 分钟 grace 内排空；
   记录并要求活跃会话、非终态任务、pending outbox 和 Valkey ready/processing
   为零。不得取消或重提已提交的 provider 任务。
2. 记录 staging image digest、revision、migration、runtime config hash、所有
   业务表行数和 credit fingerprint。保存 root-only 输出，不保存 credential。
3. 使用已安装、checksum 匹配的 staging backup 工具创建最终
   `staging-final-<window>.dump`，发布到 staging 的加密异地 Restic 仓库，并在
   独立 `network=none`/`tmpfs` 容器中完成恢复和表/行/迁移一致性校验。
4. 给最终 snapshot 保存不可变 ID、archive SHA-256、创建时间和
   `delete-not-before=conversion-success+7d`。七天前不得删除。

检查点 R1：归档验证失败则停止转换，维护保持。旧 staging volumes、release
和归档保持只读/私有用于诊断；不能把它重新命名为 production。

### C2 — R2 精确盘点和清理批准（目标 45–75 分钟）

1. 使用旧 staging 的 bucket-scoped 凭据和专用 root-only inventory env，仅运行
   `r2-inventory` 维护角色。该角色不接收数据库、队列、Authing 或 O1Key 配置，
   把 stdout 直接写入主机 root-only
   `/var/lib/goodgood-production/conversion/evidence/r2-current.json`。角色只调用
   `ListObjectsV2`，不下载或删除对象。
2. 运行：

   ```bash
   npm run production:r2-deletion-plan -- plan --inventory-file /var/lib/goodgood-production/conversion/evidence/r2-current.json
   ```

   预览必须显示 `executionAvailable:false`，批准绑定值为
   `r2-goodgood-current:<inventorySha256>`，且对象数/字节数与数据库和控制台
   独立盘点一致。
3. `ListObjectsV2` 只证明 current object versions。Cloudflare 控制台必须证明
   bucket 不存在未盘点的非当前版本/删除标记；若相关版本能力已启用，则先用
   独立审核过的全版本盘点补齐清单，当前工具不得被当作完整证明。
4. 只有另行批准精确 bucket、hash、对象 key/etag/size 列表后，才可由复核过的
   Cloudflare 运维方法删除该批测试对象。本仓库故意不提供删除执行命令。
5. 删除后以新的 metadata inventory 和 Cloudflare 控制台同时证明当前版本及
   任何历史版本均为空；否则停止。随后轮换 application R2 credential，撤销
   staging credential，并复核私有访问与正式 CORS。

检查点 R2：批准前无对象变更。对象删除不可逆，因此 hash、版本范围或计数有
任何漂移都重新盘点并重新批准，不能扩大通配范围。

### C3 — 建立全新正式状态和备份（目标 75–130 分钟）

1. `docker volume inspect` 必须证明两个 production volume 不存在。若已存在，
   停止并盘点；本手册不授权重置或删除它们。
2. 安装全新的 PostgreSQL secret 后，在单独批准下用
   `/opt/goodgood-production/compose.production.dependencies.yaml` 创建依赖。
   不挂载 staging volume，不 attach staging network，不运行导入。
3. 核验 PostgreSQL/Valkey healthy、无主机端口、资源限制、production volume
   名称及 internal network。此时 PostgreSQL 只能有初始化 catalog，尚无 public
   application table；migration 保留到 C5。Valkey `DBSIZE=0`。
4. 安装 production backup 配置、脚本和 units。初始化隔离 Restic 前缀一次，
   立即执行一次 `run` 和 `restore-latest-drill`；记录 snapshot freshness、
   archive hash、表/行/迁移相等和 RTO。C3 的预迁移基线必须明确报告
   `public_tables=0`、`public_rows=0`、`migrations=0`，不能靠创建占位表绕过。
5. 仅在恢复演练通过后启用：

   ```bash
   sudo systemctl enable --now goodgood-production-postgres-backup.timer
   sudo systemctl enable --now goodgood-production-postgres-maintenance.timer
   sudo systemctl list-timers 'goodgood-production-postgres-*'
   ```

   backup timer 为每半小时加最多 5 分钟随机延迟；maintenance timer 每日执行
   retention prune 和 `restic check --read-data`。首次开放前最近一次成功快照
   必须小于 1 小时。

检查点 R3：新卷中还没有客户数据时，可保持维护并在另行精确卷批准后重新创建；
绝不能回填 staging 行。正式 Restic 仓库使用独立 `/production` 前缀。

### C4 — Authing 与全部生产凭据轮换（目标 130–170 分钟）

逐项完成上面的 Authing 和 secret 核对单，撤销旧凭据，保存不含 secret 的
证据。用 production runtime/release 文件运行 offline preflight，再运行 network
OIDC discovery preflight。任何旧 callback、inline secret、错误权限或旧 session
可用性都会停止转换。

检查点 R4：凭据撤销不能通过恢复旧 secret 回滚。失败时签发新值、保持维护并
重新执行 preflight；Authing 目录身份保持不变。

### C5 — 迁移、初始站长和 isolated candidate（目标 170–225 分钟）

1. 选择 blue 作为首次槽位。release 文件绑定同一 CI digest/revision/migration/
   runtimeConfigVersion，Compose 只读取 production runtime 和 secret 路径。
2. 以 `--profile release run --rm migrate` 执行一次前向 migration；重复运行必须
   checksum/idempotency 通过。不得降级 schema。迁移 0012 后，在第一次真实登录
   前必须证明 users、auth identities/sessions、credit accounts/ledger、content、
   role 和 administrative action 均为零；本地 fixture seeder 在 production 禁用。
3. 先只启动 blue Web，在 loopback `3100` 完成 `/live`、`/ready`、数据库、队列、
   R2、O1Key 和 release-label 校验。资源余量必须仍满足 500 MiB/80% 安全线。
4. 通过私有 operator 路径完成正式 Authing 登录：返回身份在新数据库中创建
   `pending` member，恰好一个 100 welcome grant，无旧内容、角色或 session。
5. 对该稳定 owner ID 运行 `bootstrap-site-owner` dry-run，取得独立批准后再
   `--execute`；核验审计记录和 `site_owner` 唯一性。
6. 启动一个 blue Worker。核验 health `3101`；不得并行启动 green Worker。

检查点 R5：isolated candidate 失败时停 blue Web/Worker，保留生产数据库用于
诊断，保持维护。migration 只允许 forward fix，不能 schema rollback。

### C6 — 完整产品、恢复和回滚证明（目标 225–235 分钟）

在公开仍为维护时，由站长和一个新测试身份完成：

- 新身份公开注册/登录后为 `pending`，能看到 100 待启用积分，但所有产品能力
  在读取 owner 数据或 provider capacity 前返回 pending；刷新和退出可用。
- 站长审核为 `active` 后立即可用且不重复欢迎 grant；`suspended` 与恢复路径、
  防止站长自停用、1–5000 手工测试积分及审计/idempotency 全部通过。
- 上传 reference、提交一次真实生成、credit reserve/settle、R2 私有签名读取、
  asset/project 恢复和跨 owner 拒绝通过。不得为了失败自动重提付费任务。
- 生产 backup `run` 和异地 `restore-latest-drill` 通过，RPO/RTO 证据满足门禁。
- 在 green loopback 只启动 Web candidate，验证后模拟一次 blue↔green upstream
  变更和回退；Worker 必须先 drain 旧进程再启动新进程，任意时刻只有一个。
  回滚后数据库、队列和 credit fingerprints 不变，`schemaDowngradeAttempted=false`。
- 执行以下固定种子门禁和只读计划；两者均通过。不得把延期的 ICP/domain 或
  Alipay 项改写为 `pass`，也不得用完整付费门禁失败替代种子门禁结果：

  ```bash
  npm run production:seed-gate -- --evidence-file /var/lib/goodgood-production/conversion/evidence/production-readiness.json
  npm run production:seed-release-plan -- plan --evidence-file /var/lib/goodgood-production/conversion/evidence/production-readiness.json
  ```

- public synthetic 的预期状态、告警 firing/resolved 接手证据和事件联系人均通过。
  维护状态下 public synthetic 的预期是受控 503；应用健康只走 loopback/私有路径。

检查点 R6：任何子项失败都保持维护并回到相应组件修复；不得删除新正式状态、
不得导入测试状态、不得为了赶 4 小时跳过门禁。

### C7 — 公开或到时停止（最迟 240 分钟）

公开不是 `maintenance-control.sh` 的能力。只有以下全部为真并取得单独
`publicTrafficOpen` 批准，复核人才可通过另行审核的原子 Nginx 步骤移除 marker、
执行 `nginx -t`、reload 并立即完成 public synthetic：

- conversion manifest 无 blocker；`production:seed-gate` 与
  `production:seed-release-plan` 均为 pass，计划 action 明确为
  `seed-production-release-dry-run`；
- 正式状态新鲜、R2 为空后已轮换并完成首个生产对象验证；
- Authing、站长、pending isolation、credit、生成/读取、备份恢复、监控和回滚
  证据均绑定当前候选；
- 当前时间早于 deadline，主机资源和所有 health 仍通过。

本仓库不提供 public-open 执行命令，避免把作业包审阅误当作流量授权。若 4 小时
到期或公开后 synthetic 失败，立即恢复 maintenance marker/受控 503；若应用
回滚，切回先前健康槽位和 Worker，但绝不降级 schema 或恢复 staging 公网。

检查点 R7：首次公开后产生的数据即为正式数据。只能做应用槽位回滚或前向修复，
不能重置 PostgreSQL、Valkey、R2、身份映射或 credit ledger。

## 七日后清理（不属于转换窗口）

转换成功至少七天后，重新盘点并分别申请精确批准，才可清理旧 staging
PostgreSQL/Valkey/RustFS volumes、旧 release 文件和最终 staging Restic snapshot。
批准必须写出每个目标、最新引用检查和可恢复性。不得使用通配删除，不得删除
production volumes、production Restic prefix、当前/保留 rollback image 或正式
R2 对象。清理完成后再次验证正式备份、公开 health 和对象私有性。

## 证据与停止条件

每个证据只保存非 secret 摘要、UTC 时间、候选 revision/digest、命令版本、
检查结果和外部证据引用。不要保存 cookie、授权 URL、邮件地址、对象签名 URL、
对象正文、API 响应 token 或 credential。

立即停止并保持维护的条件包括：目标不精确、inventory hash 漂移、R2 版本范围
未知、备份/恢复失败、Authing allowlist 漂移、旧 session 仍有效、旧数据出现、
重复 welcome grant/ledger 不一致、真实生成或私有读取失败、第二个 Worker 启动、
资源保护触发、Nginx 校验失败、监控无人接手、所选种子门禁失败或超过四小时。
