# GG-097 — 累计功能生产重发布（全新上线）

- 状态：**已完成并开放公网**。生产身份 `5b65601` / 迁移 `0043` / green 接流；门禁五项 pass、`controlled-alpha-operations` 如实 fail 并经站长明确授权带缺口开站（唯一原因：无对外告警通道）。2026-09-17 补做首次生产恢复演练并通过。
- 用户需求：2026-09-15 当天把本地累计功能（GG-024 — GG-096）以**全新方式**发布到生产 `goodgood.o1key.com`；旧测试数据无需保留，所有人重新注册。
- 最后更新：2026-09-17（补第二轮核对与首次恢复演练；更正备份结论）
- 分支 / worktree：`main`（`5b65601`）/ F:/goodgood；发布分支 `release/GG-097-cumulative-alpha`
- 基线：本地 HEAD `5b65601`；生产已为 `5b65601` / 迁移 `0043`（旧为 `65ceb168` / `0019`）

## 范围与验收

- 要做：把 `31302f0` 经 main 与 CI 产出不可变镜像，迁移到 `0043`，走受控 alpha 门禁发布，完成站长初始化与一次真实链路冒烟。
- 不做：不开启支付/支付宝、不实现 C6（删除/举报）、不部署视频正式结算、不重放旧转换脚本、不恢复已删除的测试账户。
- 验收点：生产 `/login`、`/register` 可用；站长可完成首个账户创建与 bootstrap；新用户注册即得 100 欢迎积分；一次真实生图成功且资产私有；跨账户读取被拒；门禁证据全部 `pass` 且绑定同一 revision。
- 决策影响：邀请码改可选由 **ADR 0089** 记录，部分取代 ADR 0086/0087。
- 授权边界：**本任务卡不构成发布授权。** 开工前需明确批准：合并 main、推送、CI 发布镜像、生产迁移、切流窗口、一次真实 provider 生成。

## 「全新方式」的含义与选择

用户明确：旧数据只是测试，全员重注册可接受。这让迁移风险大幅下降，但仍有两条技术路线，需在阶段 1 前选定：

- **路线甲 — 原地前向迁移（推荐）**：保留现有生产数据库，把 `0019` 前进到 `0043`。生产当前用户/文件为 0，无业务数据可损坏；`server/persistence/migrate.mjs` 会校验已应用迁移的 checksum，历史文件未被改动即可安全前进。
- **路线乙 — 重建生产库**：另起空库跑完整 `0001`—`0043`。更"干净"，但要重新走主机/凭据/恢复边界，且在 2 vCPU / 4 GiB 上成本更高、不可逆步骤更多。

**建议甲**：风险与工作量都更低，且不触碰既有备份/恢复链。

## 阻断项状态

- **B1 首个账户死锁 —— 已解除。** 邀请码改可选后，`server/auth/email-repository.mjs` 允许无邀请码注册；站长用真实邮箱验证码即可创建首个 account 并拿到邀请码（0043 触发器自动分配）。详见 ADR 0089。
- **B2 main 落后 224 提交 —— 待处理。** `git rev-list --left-right --count main...HEAD` 原为 `0 224`；`18fe779`（Sharp 安全候选）与 `42fc8d8` 均已是 HEAD 祖先，是纯快进关系。CI 只从 `push: main` / PR / 手动触发运行，GHCR 镜像只在受信任 main 发布。注意本地 `main` = `bab17fd`，`origin/main` = `42fc8d8`。
- **B3 24 个迁移对旧 Web 的前向兼容 —— 未审计。** 路线甲下蓝绿期间旧 Web 可能并行接流；若选乙则蓝绿窗口问题消失。
- **B4 门禁证据时效 —— 操作约束。** `artifact-security` 168h、`production-preflight` 72h，其余四项 **24h**；证据一 collect 必须一口气走到切流。
- **B5 注册即创作 —— 已确认采用「站长先注册再放行」，但原记录的时序是错的（2026-09-15 实做时更正）。**
  `createEmailOwner` 建立的账户直接是 `active`（非 pending），故 `GOODGOOD_EMAIL_REGISTRATION_ENABLED`
  是唯一收口开关。**原记录称关门判断「只作用于未绑定邮箱」不成立**：
  `server/auth/email-repository.mjs:331-339` 的条件是
  `if (!identity && !input.registrationEnabled)`——**任何未绑定邮箱**都被拒，
  包括站长本人；对外只返回 `EMAIL_REGISTRATION_CLOSED`「当前暂不开放新账号注册。」
  （`server/auth/email-operations.mjs:364-370`）。
  因此「关闭注册部署 → 站长注册 → 打开注册」这条时序**执行不通**，实际采用：
  ① 临时将 `GOODGOOD_EMAIL_REGISTRATION_ENABLED=true` 并开公网 →
  ② 站长注册首账户（此窗口对公网任何人也开放，故必须最短）→
  ③ 立即恢复 `false` 并退回维护页 → ④ `bootstrap-site-owner` 设站长。
  「已绑定用户即使注册关闭仍可登录」这句是对的，登录路径不受该开关影响。

## 实施步骤

### 阶段 0 — 决策

- 0.1 选定路线甲 / 乙。
- 0.2 ~~确认 B5 取舍~~ —— 已确认：站长先注册，随后再打开注册开关（见阶段 5.0—5.4）。
- 0.3 记录发布授权范围：合并 main / 推送 / CI 发布 / 生产迁移 / 切流窗口 / 一次真实生成。
- 0.4 确认生产主机可访问、备份新鲜、维护标记可用。

### 阶段 1 — 合并与 CI

- 1.1 `git fetch origin`，确认 `origin/main` 仍为 `42fc8d8`；`git merge-base --is-ancestor 42fc8d8 HEAD` 退出 0。
- 1.2 `npm ci`；`npm run check:local`，记录数字（当前基线 559：533 通过/26 跳过/0 失败）。
- 1.3 从 `31302f0` 建 `release/GG-097-cumulative-alpha`，推送并开 PR 到 `main`。
- 1.4 等 PR CI 全绿（check:local + 两次 Trivy + 镜像构建）。PR 不发布镜像。
- 1.5 合并 main，触发 main CI，取得不可变 GHCR digest、完整 revision、最新迁移文件名、runtime-config checksum，以及 `artifact-security-evidence.json` 的工件 ID 与 SHA-256。

**阶段 1 执行结果（2026-09-15）：**

- 1.1 通过：`origin/main` = `42fc8d8`，`git merge-base --is-ancestor origin/main HEAD` 退出 0，
  `git rev-list --left-right --count origin/main...HEAD` = `0 177`，**纯快进**。
- 1.2 通过：`npm ci` 成功（为保证锁文件可被镜像内的 npm 读取，先停了本机 32131/32142
  两个已识别 GoodGood 进程）；`check:local` 563 项 / 537 通过 / 26 隔离跳过 / 0 失败。
- 1.3 完成：`release/GG-097-cumulative-alpha` 已推送。**没有开 PR**——本机无 `gh` CLI，
  无法创建 PR。改用直接快进 `main` 的路径（分支为快进关系，等价且不引入合并提交）。
- 1.4 **首次 main CI 失败，已定位并修复（见下）。**
- 1.5 待 CI 绿后取得 digest 等身份信息。

#### CI 失败 1 — Next.js CRITICAL（已修复 `c343351`）

- main CI run `34972549492`：`completed / failure`，倒在第 6 步
  `Scan locked production dependencies`（Trivy），后续镜像构建与发布全部 `skipped`。
  这就是 GHCR 上 `5d5ab3a` 一直 404 的原因——**该 tag 从未产生**，不是 CI 还在跑。
- 发现：`next 16.2.11` 的 `CVE-2026-75604` / `GHSA-2xp9-vwfh-vxw4`，CRITICAL，
  状态 `fixed`，修复版 `15.5.24, 16.3.3`。CI 用 `ignore-unfixed: true`，此项必须真修。
- 这与 GG-023 记录的**同一条** advisory 一致。GG-023 当时把它明确留给了运行时镜像
  Trivy 门禁判定（原文：「仍由实际 runtime 镜像 Trivy 门禁 fail-closed 判定」）。
  该门禁现在判了，本修复是走完当初预留的路径，不是新决定。
- 处置：`next` 与 `eslint-config-next` 及全部 `@next/*` 族对齐到 **16.3.3**
  （扫描器给出的最低修复版，不顺手多跨补丁）。`tests/ci-workflow.test.mjs` 是故意的
  版本钉死契约，按新版本更新两处断言。
- 附带修复：**锁文件必须用镜像里的 npm 重新生成**。本地 npm 11.6.2 生成的
  `package-lock.json` 缺少嵌套 `@emnapi/core@1.10.0` / `@emnapi/runtime@1.10.0` 记录，
  而镜像构建阶段的 npm 11.19.0 会因此 `npm ci` 失败（EUSAGE）。
  **本地 `npm ci` 通过并不能证明镜像能构建**——此坑只有实际 `docker build` 才暴露。

#### CI 失败 2 — Debian libpcre2（已修复 `89afedb`）

- 修完 Next 后本地构建镜像并用**同版本 Trivy 0.70.0** 扫描，发现新的、与 Next 无关的
  发现：`libpcre2-8-0 10.42-1` 的 `CVE-2026-86145`、`CVE-2026-89161`，均为 HIGH 且
  `fixed` 到 `10.42-1+deb12u1`。CI 的镜像扫描是 `vuln-type: os,library`，**会命中**。
- 根因：`node:24.20.0-bookworm-slim@sha256:ba849c60…` base 早于 Debian 的修复构建，
  而 runtime 阶段原本不做任何 OS 补丁。
- 处置：在 runtime 阶段只取该安全更新
  （`apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0`），
  不做全量 `apt-get upgrade`，保持 base 与其余包不变。

#### 本地等效验证（对最终候选镜像 `goodgood:next1633-check2`）

用与 CI 同版本 Trivy 0.70.0 逐项复跑 CI 的门禁，结果：

| CI 步骤 | 本地结果 |
| --- | --- |
| `npm run check:local` | 563 项 / 537 通过 / 26 隔离跳过 / 0 失败 |
| Trivy 依赖扫描 | 根 `package-lock.json` **0 项** |
| `docker build` | 成功 |
| runtime import smoke | `IMPORT_SMOKE_OK` |
| Trivy 镜像扫描 `os,library` | **0 项**，`--exit-code 1` 退出 0 |

- 依赖扫描剩余 3 项位于 `work/sites-42ad465/`（未跟踪的历史 worktree 副本），
  CI 的干净 checkout 中不存在，不影响 CI。
- 探针镜像里出现的 `brace-expansion` / `ip-address` / `tar` 属 npm 自带依赖树；
  真实镜像已删除 npm，故不出现（这正是真实镜像只报 pcre2 的原因）。
- **本地复验不等于 CI 通过**：CI 在 Linux 上执行同样的 `check:local` 与构建，
  最终判定仍以 CI 为准。

（未做：1.5 的 digest / artifact 工件 ID 与 SHA-256，需 CI 绿后取得。）

### 阶段 2 — 迁移前向兼容审计（可与阶段 1 并行）

- 2.1 逐个读 `migrations/0020` — `0043`，列出所有 `ALTER TABLE`、`DROP`、`ADD COLUMN ... NOT NULL`、重命名、约束/索引变更。
- 2.2 判断旧 Web（`65ceb168`）的读写路径在迁移后是否仍成功；关注 `users`、`credit_accounts`、`assets`、`projects`、`jobs`、`auth_*`。
- 2.3 产出不兼容项清单；有任一项不兼容则切流必须停写（进维护）而非并行。
- 2.4 结论写入本卡。选路线乙时本阶段可跳过。

**初步静态扫描结果（2026-09-15，agent 预审）：**

- `0020`—`0043` 共 24 个迁移中**没有** `DROP TABLE`、`DROP COLUMN`、`TRUNCATE`，也没有 `DELETE FROM`。
- 唯一的破坏性 `ALTER` 是 `0026_gg030_creative_workspace_scope.sql:72-104` 的 `SET NOT NULL`，其前文先对六张表做回填并 `RAISE EXCEPTION` 校验回填完整性，自洽。
- `0029_gg052_cent_credits_and_models.sql` 会**关闭**旧 `credit` 单位账户并新建 `credit-cny-cent` 账户（2 倍换算）。它先以 `ACCESS EXCLUSIVE` 锁检查无活动 job、无冻结预留、无 pending 订单，否则直接 `RAISE EXCEPTION`。此迁移**不可撤销**，且会改变积分单位语义。
- 结论：结构层面为加法式迁移，风险集中在**并行窗口内的旧 Web 读写**与 0029 的排空前置。选路线甲时阶段 4.1 的排空检查必须实做，不能假定通过。

**路线甲对"全新发布"的影响：** 不影响功能内容。两条路线最终都得到同一套 `0043` schema 与同一份代码；差别只在数据库历史。生产用户/文件为 0，甲路线没有业务数据可损坏，且不触碰既有备份/恢复链；乙路线需把 `0001`—`0043` 全量重放，其中 `0012` 等迁移涉及固定 UUID 夹具清理，步骤更多、不可逆边界更多。

### 阶段 2 执行结果（2026-09-15，路线甲）

**生产只读核验（ssh `goodgood-staging` → 现有生产主机）：**

- 已应用迁移 19 条，最新 `0019_gg021_nano_banana_pro_prices.sql`，其 checksum
  `12b253518ce174549f88e389a43b6af15dcd7858892d3f776a4d798022372b3e` 与本地 HEAD 的
  `sha256sum migrations/0019…` **完全一致**。→ `applyMigrations` 的已应用 checksum 校验
  不会因历史文件被改写而中断，可以安全向前追加 0020—0043。
- 业务行数：users 0 / assets 0 / jobs 0 / credit_accounts 0 / payment_orders 0 /
  冻结积分 0。与 GG-091 清理后记录一致，**没有业务数据可损坏**，0026 回填与 0029 排空
  前置天然满足。
- 运行槽位：`goodgood-production-blue-web-1`、`goodgood-production-blue-worker-1`
  均在跑且 healthy；`goodgood-production-green-web-1`（旧镜像 `fe52e0093336`）健康但
  **未接流**。`/etc/nginx/goodgood/production-active-upstream.conf` 指向 `127.0.0.1:3100`
  （blue）。green Worker 不存在。维护标记 `/etc/goodgood/production/maintenance.enabled`
  **当前不存在**，即公网正在接流。
- 依赖：`goodgood-production-dependencies-postgres-1` / `-valkey-1` 健康；另有
  `goodgood-staging-dependencies-*` 三个容器仍在跑（历史 staging 栈，本次不触碰）。

**24 个迁移的逐条静态审计（2.1）：**

| 迁移 | 变更类型 | 对旧 Web（`65ceb168`）的影响 |
| --- | --- | --- |
| 0020 | `credit_accounts`/`credit_ledger_entries` 加列 + 回填 + 收紧 CHECK | 加列有默认值；旧代码不写这两列时按 0 通过 |
| 0021 | 新增表 + 索引；仅放宽 `administrative_actions` 类型/状态枚举 | 兼容（旧值仍在允许集合内） |
| 0022 | 放宽 `credit_ledger_entries` 四个 CHECK（新增 transfer 类型） | 兼容 |
| 0023 | 新增 `auth_email_*`/`auth_rate_limits`/`auth_events` 表 | 兼容（旧 Web 不读不写） |
| 0024 | 新增 workspace 表族 + `users` AFTER INSERT 触发器建个人工作区 | 兼容（旧 Web 插入 users 时触发器自动补） |
| 0025 | 新增 workspace 积分/预算表族 | 兼容 |
| 0026 | 六张创作表加 `workspace_id`/`creator_owner_id` 并 **SET NOT NULL**；`creation_drafts` 换主键；`projects`/`generation_jobs` 的幂等唯一索引改为含 workspace 列 | **唯一的破坏性结构变更**。回填后空库无残留；`goodgood_assign_creative_workspace` BEFORE 触发器自动补 workspace_id，旧 Web 的裸 INSERT 仍成功；幂等索引为**放宽**，不产生新冲突。`creation_drafts_pkey` 改为 `(workspace_id, creator_owner_id)`：旧代码按 `owner_id` 定位，该列仍在表中 |
| 0027 | 放宽 `workspace_audit_events` 动作枚举 | 兼容 |
| 0028 | 放宽 model/quality 枚举 | 兼容 |
| 0029 | **积分单位换汇**：旧 `credit` 账户置 `closed`，新建 `credit-cny-cent`（×2）；重写 prices/products；新增 `managed_models` | 空库下全部子句影响 0 行。非空库风险：旧 Web 只读 `credit_accounts` 且过滤/读取 `unit`（`server/auth/repository.mjs:66` 等按 `credit-cny-cent` 过滤），旧镜像则读旧 unit；账号为 0 故无影响。**不可撤销** |
| 0030—0034 | 保价、新增线路/质量 CHECK、归档约束 | 兼容（加约束或放宽枚举） |
| 0035—0041 | 新增表（档案、灵感、JCoin、问题反馈） | 兼容 |
| 0042 | 新增注册邀请表 | 兼容 |
| 0043 | 新增 `account_invitations`/`account_invitation_uses` + `users` AFTER INSERT 触发器发码 | **旧 Web 插入 users 时会被新触发器自动发一个邀请码**，无副作用；旧 Web 不读该表 |

- **全程无** `DROP TABLE`、`DROP COLUMN`、`TRUNCATE`、`DELETE FROM`。
- **2.3 不兼容项清单：无。** 唯一非加法项是 0026 的主键替换与两处幂等索引替换，已逐条
  判定为「触发器自动补 + 索引放宽」，旧 Web 读写路径仍然成功。
- **2.4 结论：切流不强制停写，但本任务仍按维护窗口执行**（见下方决策），原因不是结构
  不兼容，而是：① 0029 不可撤销且改变积分单位语义；② 蓝绿存在但 green 仍是旧镜像，
  本轮是「原地前向迁移 + 提交候选镜像」，不是真正的零停写蓝绿；③ 公网当前无任何站长
  账户，短暂维护的代价远低于风险。

**阶段 2 需求变更（新增前置条件，需站长提供）：**

- 阶段 3.1 要求六个凭据文件，主机当前**只有四个**（`auth-client-secret`、`o1key-api-key`、
  `r2-access-key-id`、`r2-secret-access-key`）。缺失的是 `email-otp-secret` 与
  `email-smtp-password`。
- `email-otp-secret` 由我生成（≥32 随机字节，`root:goodgood-production-secrets 0640`）。
- `email-smtp-password` **只能由站长在服务器上直接安装**：阿里云 Direct Mail
  新加坡 SMTP（`smtpdm-ap-southeast-1.aliyuncs.com:465`）的当前密码不在本仓库、本机或
  任何历史记录中，我不能读取、不能猜测、不能写在命令行。这是阶段 3 的硬阻塞。

### 阶段 3 — 主机候选（不接流量）

- 3.1 在 `/etc/goodgood/production/` 安装 release.env / runtime.env（`root:root 0600`）与六个凭据文件（`root:<group> 0640`）。
- 3.2 `npm run production:preflight -- --release-file ... --runtime-env-file ... --evidence-reference <记录名>`，确认全通过并取得 evidence 对象。
- 3.3 `npm run production:artifact-evidence -- ...` 导入 CI 工件，取得 `artifact-security` 对象。
- 3.4 非活动槽位启动候选 Web，跑 `candidate-health-invariants`：live/ready、公网合成、队列、数据库、积分。
- 3.5 确认只有一个活动 Worker；旧 Worker 按 bounded grace 停止。

### 阶段 3—5 执行结果（2026-09-15，实际已执行）

**阶段 3（主机候选）**

- 3.0 候选源码：主机 `/opt/goodgood-production/repository` 是 detached HEAD 且**无候选对象、
  无 GitHub 凭据**（私有仓库匿名拉不到）。按「服务器拉镜像、不从工作目录构建」的契约，
  用 `git bundle` 把**精确** `89afedb`（只含一个 ref，完整历史）送到主机，在
  `/opt/goodgood-production/candidate-89afedb` 独立检出。`git status` 干净、
  `git rev-parse HEAD` 与 `release.env` 精确相等。**未改动主机原 `repository/` 目录**
  （仍停在 `65ceb168`，保留为历史）。
- 3.1 六个凭据齐全（`root:goodgood-production-secrets 0640`）：`auth-client-secret`(32B)、
  `email-otp-secret`(64B，本次生成)、`email-smtp-password`(12B，站长经剪切板提供)、
  `o1key-api-key`(51B)、`r2-access-key-id`(32B)、`r2-secret-access-key`(64B)。
  `release.env` 换成新身份；`runtime.env` 按 email 模式重组（旧版备份为
  `runtime.env.pre-89afedb` 与 `releases/runtime-65ceb168-0019.env`）。
- 3.2 **preflight 12/12 全 pass**，含 `authentication:smtp-authentication`
  （实连 `smtpdm-ap-southeast-1.aliyuncs.com:465` 并 `verify()`，**未发信**）。
  证据 `checkedAt 2026-09-15T14:44:15.733Z`、reference `gg097-preflight-20260915`。
- 3.3 **工件证据 5/5 全 pass**，含 `github-artifact-integrity`——本地字节 SHA-256
  `3605168ba0de8482f4eee6bc3bd9d2e7d151a33c8384f7027bfb7ddbc431f97d` 与 GitHub 记录一致。
  reference `github:run:34981296562/artifact:10401841455`。
  注意：导入器**只校验并打印**，按设计由操作者把 `evidence` 对象原样写进 manifest。
- 3.4 候选 Web 起在**非活动槽位 green**（`3200`）：live/ready 200、revision 精确匹配、
  `/`·`/login`·`/register` 200、未登录 `/api/auth/session` 401。
  **未跑名为 `candidate-health-invariants` 的独立命令**——仓库无此脚本（`package.json`
  无对应项），以等价的直接探针替代，如实记录以免把探针说成工具产出。
- 3.5 恰好一个 Worker：blue Worker 以 300s bounded grace 停止，再起 green Worker。

**阶段 4（迁移与切流）**

- 4.1 排空检查实做：`jobs_active=0`、`frozen_personal=0`、`pending_orders=0`、
  `users=0`、`assets=0`、`migrations=19`。
- 4.2 进维护窗口后执行**一次**前向迁移：`0020`—`0043` 共 24 个全部 `migration.applied`，
  `migration.complete` 报 `count:43`、`localFixturesEnabled:false`。
  **未重放任何历史迁移**；迁移后 `0019` checksum 仍为
  `12b253518ce174549f88e389a43b6af15dcd7858892d3f776a4d798022372b3e`（未变）。
  结果：43 条迁移、59 张 public 表、0 用户 0 资产 0 job、`managed_models=9`、`workspaces=0`。
- 4.3 green Worker readiness 200，body 为
  `{"database":"ok","objectStorage":"ok","provider":"ok","queue":"ok","runtime":"ok"}`。
- 4.4 `production-active-upstream.conf` 从 `127.0.0.1:3100` 原子替换为 `3200`，
  `nginx -t` 通过后 reload；旧文件备份为 `production-active-upstream.blue.backup`。
- 4.5 切流后复核：公网仍 503（维护中，预期）、经 `3200` 的 `/`·`/login`·`/register` 200、
  未登录 session 401、version revision 精确、队列深度 0。

**阶段 5（站长初始化）——已执行部分**

- 5.0 与 5.4 的**时序按代码实际更正**（见上文 B5）。
- 5.1 站长账户已建：`756eb90a-d57c-465d-987e-63d7cf1d6e88` / 951565127@qq.com /
  `status=active` / `tier=seed` / 工作区自动创建 / 邮箱绑定 `self_service`。
  **欢迎积分为 200，不是 100**——`WELCOME_CREDIT_AMOUNT = 200n`
  （`server/billing/repository.mjs:22`），单位 `credit-cny-cent` 与扣费同单位，
  单张 20 积分，metadata 记 `images: 10`。本卡 5.1 与验收清单里的「100」是旧文案，已更正。
- 5.2 `bootstrap-site-owner` dry-run 命中 `95*******@qq.com`/`active` 后 `--execute` 成功：
  `administration.site_owner_bootstrapped`，`system_role_assignments` 有且仅有
  `site_owner`，审计行 `bootstrap_site_owner`、`prev=active -> active`、
  `reason=initial_site_owner_bootstrap`、幂等键 `site-owner-bootstrap:v1:739d…`。
- 5.3 邀请码已自动分配：**405513**。
- 5.4 / 5.5 / 5.6 / 5.7 **未完成**——见下方「待站长验收」。注册开关已回到 `false`，
  维护页已恢复，公网 503。


- 3.1 在 `/etc/goodgood/production/` 安装 release.env / runtime.env（`root:root 0600`）与六个凭据文件（`root:<group> 0640`）。
- 3.2 `npm run production:preflight -- --release-file ... --runtime-env-file ... --evidence-reference <记录名>`，确认全通过并取得 evidence 对象。
- 3.3 `npm run production:artifact-evidence -- ...` 导入 CI 工件，取得 `artifact-security` 对象。
- 3.4 非活动槽位启动候选 Web，跑 `candidate-health-invariants`：live/ready、公网合成、队列、数据库、积分。
- 3.5 确认只有一个活动 Worker；旧 Worker 按 bounded grace 停止。

### 阶段 4 — 迁移与切流

- 4.1 确认无活动 job、无冻结积分、队列为空。
- 4.2 执行**一次**前向迁移到 `0043`（路线乙则初始化空库并跑全量迁移）。
- 4.3 启动候选 Worker，确认 readiness。
- 4.4 原子替换 Nginx upstream，`nginx -t` 通过后 reload。
- 4.5 重复公网合成、队列、数据库、积分指纹校验。

### 阶段 5 — 站长初始化与真实链路冒烟

- 5.0 确认 runtime.env 中 `GOODGOOD_EMAIL_REGISTRATION_ENABLED=false`，使放行前只有站长能建账户。
- 5.1 站长用真实邮箱验证码在 `/register` 创建首个账户（无需邀请码），确认欢迎积分。
- 5.2 `bootstrap-site-owner` 先 dry-run 核对掩码账户，再 `--execute`。
- 5.3 站长在账户区确认自动生成的六位邀请码已显示。
- 5.4 将 `GOODGOOD_EMAIL_REGISTRATION_ENABLED` 置回 `true` 并重启 Web；确认已绑定的站长账户在关/开两态下均可登录。
- 5.5 用第二个真实邮箱走 `/register`（可带站长邀请码）验证开放注册链路。
- 5.6 一次**明确授权**的真实生图：1K、1:1、1 张，验证 reserve → settle、资产私有、重新登录可见。
- 5.7 用另一账户验证该资产不可读（跨账户拒绝）。

### 阶段 6 — 恢复、监控与门禁

- 6.1 新建加密异机恢复点，确认 RPO ≤ 60 分钟、RTO ≤ 240 分钟、14/8/12 保留点。
- 6.2 隔离环境恢复演练，比对迁移与行数。
- 6.3 验证维护标记可重新进入并返回 503。
- 6.4 记录 operator、通知通道、`MemAvailable`、根磁盘、备份新鲜度、provider 失败事件。
- 6.5 触发一次非计费测试信号，确认通知送达。
- 6.6 填 `controlled-alpha-boundary`、`-member-journey`、`-recovery`、`-operations`（24h 内）。
- 6.7 `npm run production:alpha-gate -- --evidence-file /var/lib/goodgood-production/controlled-alpha/readiness.json`，必须全 `pass`。
- 6.8 复查后解除维护，立即检查公网 root / login / pending / 创作行为。

**阶段 6 执行结果（2026-09-15）**

- **6.1 通过。** `goodgood-production-postgres-backup-automated run`：
  本地明文归档 277656 字节 / SHA-256 `6ee7862ca7d3980e7ff8dbc88af0a556ca783107a1a0cd22c90a174a35783895`，
  上传 Restic 后**按设计删除本地明文**（工具含 `trap cleanup EXIT`）。
  异机快照 `c49b2fc11366bda5636521614823faa3b3bcf96fcfd7e56e4a2534cedd380f3a`，
  时间 `2026-09-15 23:06:38 +08`，距操作仅数分钟 → RPO 充分。
  仓库完整性 `check`：103 快照 / 88 packs / `no errors were found`。
  保留策略确认为 `--keep-daily 14 --keep-weekly 8 --keep-monthly 12`，与门禁要求一致。
  **此处原写「备份 timer 为 `inactive`/`disabled`」是查错了对象**——见下方更正。
- **6.2 通过。** `restore-latest-drill`：`off_host_restore_drill=passed`，
  `public_tables=59`、`public_rows=163`、`migrations=43`、
  `active_sessions_observed=1`、`active_generation_jobs=0`，
  `network=none`、`storage=tmpfs`。归档 SHA-256 与 6.1 一致。
- **6.3 通过。** 标记已启用状态下再次 `enable --execute` 幂等成功，
  `origin_verification=passed`；公网 root/login/register 均 503，
  返回的是受审静态资产（`index.html`，`noindex, nofollow`）。
- **6.4 部分完成。** 观测值：`MemAvailable` **2.27 GiB**（阈值 500 MiB）、
  根盘 **41%**（止损阈值 80%）、green web/worker 与 blue web 三者
  `restarts=0` 且 `healthy`、队列 `DBSIZE=0`。
  **operator 与通知通道无法记录**——见 6.5。
- **6.5 未完成，且我无法自行完成。** 主机上**不存在任何对外告警/通知通道**：
  ADR 0016 把监控平台与通知路由交给独立责任方，生产从未接入。
  没有任何渠道可供"触发一次非计费测试信号并确认送达"，凭空断言 `notificationDelivered: true`
  属于伪造证据，不做。因此 `controlled-alpha-operations` 中
  `notificationDelivered` 保持 `false`。
- **6.6 / 6.7 / 6.8 未完成**，取决于 6.5、站长验收（5.4—5.7）与第二个账户。

**阶段 6 暴露的独立问题（不属本卡范围，但影响 RPO 承诺）**

- ~~`goodgood-postgres-backup.timer` 处于 `disabled`；最后一次自动运行是 **2026-09-05**。
  也就是说 09-05 之后的恢复点（含本次 `c49b2fc1`）**都是手动或发布时产生的**，
  不存在「RPO ≤ 60 分钟」的持续保障。这是既有缺口，不是本次发布引入的。
  是否启用 timer 属于新的生产变更，需站长单独决定，本卡不擅自启用。~~

  **2026-09-17 更正：以上整段不成立，是我查错了 timer 对象。**
  `goodgood-postgres-backup.timer` 是已退役的 **staging** timer（09-04 安装，确实 disabled）。
  生产用的是 `goodgood-production-postgres-backup.timer`：`enabled`、`active`，
  **自 2026-09-06 12:00 起每 30 分钟运行一次**（`OnCalendar=*:00,30`、`RandomizedDelaySec=5m`）。
  因此 09-05 之后一直存在 ≤ 60 分钟的持续恢复点保障，`c49b2fc1` 只是发布时点的快照，
  不是唯一的恢复点。当天实测仓库 90 个快照、`check --read-data` 60/60 packs 无错误。
  **结论：不存在「无自动备份」缺口，也无需站长决定是否启用 timer。**
  2026-09-17 已完成首轮正式恢复演练，见 `CURRENT_STATE.md`。

### 阶段 8 — 第二轮核对与首次恢复演练（2026-09-17）

- 8.1 更正上述备份结论；确认生产 timer `enabled`/`active` 与既有快照。
- 8.2 在约 66 秒维护窗口（17:09:25–17:10:31）内：触发新备份 →
  `restore-latest-drill` → 关闭维护并验证公网 200。
- 8.3 演练结果：快照 `ce191630`（17:09:37），`restore_drill=passed`，
  `network=none`/`storage=tmpfs`，**59 张 public 表 / 2403 行 / 43 个迁移**，
  会话 29、活动生成 job 0；归档 SHA-256 `70f5e737…7b80`。演练容器与临时归档已清理。
- 8.4 未改动应用镜像、迁移、生产数据或凭据；关闭维护按审查步骤手工移除标记后
  `nginx -t` + reload。
- 8.5 **新发现未修缺陷**：当日 nginx 41 次 `/api/references/*` 上游超时
  （15:48–16:12，早于本次操作），素材最终全部 `ready` 但校验最长 5 分 56 秒，
  超过 70s 读超时。另记 `rejected` 12 条（`UPLOAD_DECODE_INVALID`）。见 `CURRENT_STATE.md`。

### 阶段 7 — 收尾

- 7.1 更新 `CURRENT_STATE.md`：新 revision、digest、迁移 `0043`、活跃槽位、回退候选。
- 7.2 写 `docs/releases/2026-09-15-cumulative-alpha-release.md`。
- 7.3 更新 BACKLOG / IMPLEMENTATION_PLAN / 本卡，区分「已实现 / 已验证 / 已部署」。

## 用户人工验收清单（由用户执行，agent 不代跑）

在 32131（`http://127.0.0.1:32131`）上逐项确认并回填：

- [ ] `/login` 直接访问与刷新正常，无邀请码字段
- [ ] `/register` 直接访问与刷新正常，邀请码标注「选填」
- [ ] **不填邀请码即可注册**，注册后获 200 欢迎积分（= 单张 20 积分 × 10 张）
- [ ] 填无效邀请码被拒（`INVITATION_INVALID`），清空后可再次提交
- [ ] 填有效邀请码可注册
- [ ] 登录/注册子导航与 URL 同步
- [ ] 未登录访问受保护页跳 `/login?returnTo=...`，登录后回到原目标
- [ ] 外部 returnTo、`//`、反斜杠、控制字符被拒绝
- [ ] 邮箱验证码经 Mailpit（http://127.0.0.1:58045）收到
- [ ] 发送成功后改邮箱不清除冷却，不能立即重发
- [ ] 邀请码在余额下方为纯文本、无复制按钮
- [ ] 390px 无横向溢出
- [ ] 创作、参考图、项目保存恢复、资产库、图片详情
- [ ] 模型/价格管理、企业/分销、档案、灵感、问题反馈、JCoin 卡片
- [ ] 视频入口保持未接通，不误发真实视频请求

### 问题 3 — 本地默认改走真实 provider（已实现，用户实测通过）

- 用户要求：本地测试必须能真实调用接口，否则无法高效修复线上问题；用户提供
  本地专用令牌，预算充足，默认即真实 API。
- 实现 `cfb8331`：`start worker` 默认 `o1key`（`LOCAL_GENERATION_PROVIDER_KIND=mock`
  可退回）；令牌从**仓库外**路径读取
  （`%USERPROFILE%\.claude\goodgood-local-secrets\o1key-api-key.txt`，可用
  `GOODGOOD_LOCAL_O1KEY_KEY_FILE` 覆盖），启动器断言该路径不在仓库内；令牌缺失或为空
  直接报错退出，不静默回退 mock；worker 启动打印 provider 身份横幅；真实模式下拒绝
  同时启动 mock provider 进程。
- 接口验证（均不计生成费）：
  - 令牌鉴权：`GET /async/v1/tasks/<不存在>` → 404「任务不存在」（错令牌对照为 401）。
  - **模型名一致性**：`GET /v1/models` 对比本项目 15 个 provider 模型 → **15/15 存在，
    0 缺失**。此项专门覆盖「配置模型名在上游不存在」这类只在首次真实调用才暴露的漂移。
  - 参考图上传：真实 PNG → 200，返回 https URL、整数 `expires_at`、24h 过期，
    完全满足 adapter 的 `normalizeTemporaryUpload` 校验。
  - worker readiness 的 `provider: ok` 走 `probeGenerationResources`，首次对真实端点通过。
- **用户已实测真实生成通过，接口可用、消费记录正常。** 这是本地首次完成端到端真实
  链路（真实 provider → 真实扣费 → 本地持久化）。
- 未覆盖：真实 provider 的配额上限与异常/退避分支；发布后仍建议做一次受控冒烟。

### 问题 4 — 本地生成被资源保护门锁死（已修复）

- 现象：用户点击生成报「服务器正在保护生成资源，请稍后再试。你的输入内容已保留。」
- 根因：`server/runtime/host-resource-admission.mjs` 为 Linux 编写，读
  `/proc/meminfo` 与 `statfs("/")`；Windows 上两者均抛错，落入
  `resource-observation-unavailable` 分支，且 `protection` 一旦置位**不再重探**，
  等于把生成功能锁死到进程重启。
- 修复 `f2bbbcd`：非 Linux 改用 `os.freemem()` 与「工作目录所在文件系统」；
  Linux 路径未改动。本机实测可用内存 14.17 GB、盘用率 58%，均在阈值内。
- 验证：m8 定向 7/7；`npm run check:local` 563 项（537 通过/26 隔离跳过/0 失败）；
  checkpoint 重建并重启 32131（revision `f2bbbc`，`build.verified=true`）。
- 注意：该文件生产同样生效，但生产走的是未改动的 Linux 分支。

## 本地全功能测试窗口记录- 2026-09-15 09:42Z 窗口开工：只读复验环境（非凭交接描述）。
  - Git：分支 `feature/GG-096-production-auth-entry`，HEAD `7e5cf2f`，仅 `.codex/` 未跟踪。
  - 端口：32131（Web，PID 31644）、32142（Worker，PID 13180）、32143（provider，PID 30872）；
    54449/56449/58045/58046/58049/58050 均由同一容器进程 PID 22432 监听。三者命令行均为
    `scripts/local-checkpoint.mjs start workspace|worker|provider`，非陌生进程。
  - `/api/health/version`：revision `7e5cf2fd…3430e` = `git rev-parse HEAD`，`build.verified=true`，
    artifactHash `83791e5d…d68dd`。Worker/provider `/health/ready` 均 `ready`。
  - 数据库（只读计数）：users=3、assets=2、projects=1、migrations=43、
    最新 `0043_gg091_account_invitations.sql`。未做任何写入。
  - 路由：`/`、`/login`、`/register` 均 200（SPA 壳，未登录态重定向需浏览器验证）。
  - Web 启动配置取自 `.env.login-review`：`GOODGOOD_AUTH_MODE=email_otp`、
    `GOODGOOD_ALLOW_LOCAL_AUTH=false`、SMTP 指向本机 58046、`GOODGOOD_EMAIL_REGISTRATION_ENABLED=true`；
    `start workspace` 覆盖 `GOODGOOD_AUTH_PUBLIC_ORIGIN=http://127.0.0.1:32131`，
    `server/auth/email-operations.mjs:66` 据此校验 Origin，无需改文件。
- 待用户逐条回填「用户人工验收清单」；agent 不代跑、不代填。

### 问题 1 — 参考图上传失败（已修复，待用户复测）

- 现象：用户在创作区上传本地图片，前端提示上传失败并要求移除失败项。
- 定位（复现证据，非推断）：
  - 数据库只读查询：`09:44`、`09:45` 四条 `reference_assets` 停留在 `pending`；
    `09:14` 的两条 `ready` 是上一窗口 32141 会话留下的。
  - 浏览器直传是 `PUT` 预签名 URL 到 `http://127.0.0.1:58049`，带 `content-type` 头，
    必然先发 CORS 预检。`OPTIONS` 携带 `Origin: http://127.0.0.1:32131` 实测 **403 且无
    `Access-Control-Allow-Origin`**；同一预检换成 `32141` 则 200。桶 CORS 只放行旧端口。
  - 用签发路径重放 `PUT`（带 Origin）得 200，说明服务端本身可用，是浏览器侧被预检拦下，
    HTTP 层永远收不到该请求。
- 根因：`scripts/local-checkpoint.mjs` 把服务端口设为 32131 并覆盖
  `OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS`，但 `.env.login-review` 的
  `OBJECT_STORAGE_PROVISIONING_MODE=verify` 让 `prepareObjectStorage`
  （`server/generation/resources.mjs:45`）只 `HeadBucket` 就返回，从不重写桶 CORS 规则。
  规则停留在更早以 `manage` 模式运行时写入的 32141，之后换端口无人纠正。
- 修复 `736a959`：本地启动派生实际服务来源、改用 `manage` 模式纳管桶规则。
  生产仍为 `verify`（CORS 由云厂商控制台管理），不受影响。
- 验证：定向 2/2；`npm run check:local` 560 项（534 通过/26 隔离跳过/0 失败）；
  `build:checkpoint` + `verify:checkpoint` 通过（revision `736a959`，artifactHash `8eadf939…`）；
  32131 已切换，PID 28416，`build.verified=true` 且 revision 与 HEAD 一致。
  重启后预检 `Origin: 32131` 返 200，且 `32141` 已从规则中消失——证明是代码在纳管，
  不是一次性手工改桶。
- 未处理：上述 4 条 `pending` 参考图行保留原样，未清理、未改状态；由用户在前端移除。

### 问题 2 — 本地 mock 与真实 provider 协议不一致（已修复，待用户复测出图）

- 用户问题：「发布到线上后不匹配怎么办」——本地出图全绿能否证明真实链路可用。
- 定位：`server/generation/mock-provider-server.mjs` 说自己的协议
  （`POST /v1/generations`，`{modelId, prompt, count, idempotencyKey}`），
  而生产走 `server/generation/us-gateway-adapter.mjs`
  （`POST /async/v1/generateImage`，`{model, prompt, images, aspect_ratio,
  response_modalities, size, thinking_level}`，参考图先经 `/v1/o1key/uploads`）。
  `provider-router.mjs` 按 kind 分成两条互不相关的分支。**结论：本地跑通只证明
  GoodGood 侧生命周期（预留/结算/释放、队列、私有资产、UI 状态），完全没有执行过
  生产使用的报文构造与响应归一化代码。**
- 修复 `15cc1f5`：
  - mock 改为实现 O1Key 的四个端点，并按模型对应的 O1Key 路由校验报文，
    拒绝未知模型、错误的 response_modalities / aspect_ratio / size / 像素尺寸 /
    输出张数 / quality / background / output_format，以及未经过上传端点签发的引用。
  - `provider-router.mjs` 统一由 adapter 驱动所有 provider kind；mock 路由改为
    「同一 model+line 的 O1Key 路由 + 本地 provider 身份」，路由对象记忆化以保证
    身份比较成立。
  - 顺带修正 mock 的幂等键：原先只由 `model/prompt/张数/引用数` 推导，四张输出的
    任务会被折叠成同一个 task。改为一任务一提交的计数器键。
    （**更正**：本卡曾记录「修了 `o1keyTaskToken` 按期望总数编码的既有缺陷」。
    该说法不成立——该函数自本窗口起点起实现未变，我曾修改过一次，但在为调试备份
    文件时误执行 `git checkout server/generation/provider-router.mjs` 一并回退，
    重新应用时遗漏了它。四张输出任务转绿的真正原因是上面的幂等键修正。
    该函数当前仍按期望总数编码，行为正确，未改动。）
  - loopback 例外同样覆盖返回的资源/上传 URL；转发给 provider 的引用除非显式开启
    本地例外否则必须 HTTPS（该开关在生产环境被 `config.mjs` 直接禁止）。
- 验证：定向 m3 5/5、m5 12/12；`npm run check:local` 561 项（535 通过/26 隔离跳过/0 失败）；
  `build:checkpoint` + `verify:checkpoint` 通过（revision `15cc1f5`，artifactHash `53848d46…`）；
  web/worker/provider 三者全部重启并 ready，web `build.verified=true` 且 revision 与 HEAD 一致。
  运行中直接探针：旧协议报文 → `unknown_model`，缺 `response_modalities` →
  `invalid_response_modalities`，未上传引用 → `unregistered_reference`。
- 仍未覆盖：真实 provider 的鉴权、配额、模型可用性与真实计费对账——只能由发布后
  一次明确授权的真实调用覆盖（阶段 5.6）。
- 数据：users 4、assets 2、references 17、jobs 2，未做任何清理或重置。

## 实现与证据

- 相关文件/专题文档：`AGENTS.md`、`docs/CURRENT_STATE.md`、`docs/WORKFLOW.md`、`docs/DEPLOYMENT.md`、`docs/TESTING.md`、`infra/production/CONTROLLED_ALPHA_RUNBOOK.md`、`docs/decisions/0089-optional-invitation-registration.md`
- 已完成：邀请码改可选（ADR 0089）。`server/auth/email-repository.mjs` 仅在提供时校验邀请码并保留 pending 账户门槛；`server/auth/email-operations.mjs` 文案；`features/auth/authentication-gate.tsx` 选填字段与提交门槛。
- 验证：定向 41/41（gg091 2、gg096 3、gg095 1、gg029 15、ui-components 18…）；完整 `npm run check:local` 559 项（533 通过/26 隔离跳过/0 失败）；`tsc --noEmit` 通过。
- 构建/运行：`build:checkpoint` + `verify:checkpoint` 通过（revision `31302f0`，artifactHash `bab263dc…`）；32131 已切换，PID 32932，`build.verified=true` 且 revision 与 HEAD 一致；`/`、`/login`、`/register` 均 200。
- 发布：未发布。

## 恢复工作

**下一步**

- 无待办发布步骤。站点已开放，观察运行状态。热修路径见
  `docs/DEPLOYMENT.md` 的「生产热修清单（2026-09-17）」。
- 待站长决定：通知渠道（已同意「以后再做」）与 blue Web 是否退役。
- **待排查缺陷**：参考图 `/api/references/*` 校验耗时最长近 6 分钟，超过 nginx 70s 读超时。
- 若需变更生产，按新的任务卡与授权范围执行；不要重放历史迁移或旧转换脚本。

**当前生产事实（2026-09-15）**

- 身份：revision `5b656013807b0fdaeb22b3cbb5b7af029c9ec16e`、镜像
  `ghcr.io/lizhongyi1209/goodgood@sha256:71df51455abd7e6b98fda399a1b1b691e794056e4317a4704076aa0e6ba8b75a`、
  迁移 `0043_gg091_account_invitations.sql`、runtime-config
  `65202c281c37eb8e7c2639ee850e9ffe1085cad98f5ef2a85995a4d55d124f3e`。
- 槽位：**green 接流**（web `3200` / worker health `3201`）。blue Web 仍在运行但**未接流**，
  blue Worker **已停止**。Nginx upstream 备份 `production-active-upstream.blue.backup`。
- 公网：**开放（200）**。注册开关：**`true`**（2026-09-15 站长要求打开）。
- 数据（2026-09-17 第二轮核对）：users 25（全部 active）、assets 79、
  references 94 ready / 7 pending / 12 rejected、generation_jobs 98（70 成功 / 28 失败）、
  累计结算 1900 积分、冻结 0；运营手动登记充值 4 笔共 15100 积分（支付宝 ×2、支付宝收款、微信）。
  站长 951565127@qq.com 余额 180，邀请码 405513。
  （上一行「21/60/44/56」是当日更早的首轮快照，已被本行取代。）

**已完成**

- 阶段 1 合并与 CI（含两个安全阻断修复 `c343351`、`89afedb`）。
- 阶段 2 迁移前向兼容审计：无不可兼容项。
- 阶段 3 候选与证据（preflight 12/12、工件证据 5/5）。
- 阶段 4 迁移 0019→0043 与切流（43 迁移、59 表、0019 checksum 未变）。
- 阶段 5.1—5.3、5.5—5.7：站长账户、bootstrap、邀请码、开放注册链路、
  一次真实生图（reserve→settle）、私有限读、跨账户拒绝（404 `ASSET_NOT_FOUND`）。
- 阶段 6.1—6.4：恢复点 `c49b2fc1`、隔离恢复演练通过、维护重入通过、运维观测。

**未完成 / 阻塞**

- 阶段 6.5 **通知渠道不存在**：主机无任何对外告警通道（ADR 0016 未落地）。
  已按站长指示如实记为未接入，`notificationDelivered: false`。站长 2026-09-15 决定：
  **通知渠道后面再做**，不阻塞本次上线。
- `controlled-alpha-operations`：仍取决于 6.5，保持 `fail`。

**已解决：门禁契约与产品行为不一致（ADR 0090，`5b65601`）**

- 站长 2026-09-15 明确：「我接受任何人注册成功后就激活。」
  → 写入 **ADR 0090**：「注册即激活」是目标行为而非缺陷；准入收口唯一依赖
  `GOODGOOD_EMAIL_REGISTRATION_ENABLED`；欢迎积分为 **200**。
- 门禁验证项据此对齐：`controlled-alpha-boundary` 改为要求
  `registrationDefaultState === "active"`、`siteOwnerApprovalRequired === false`；
  `controlled-alpha-member-journey` 的 `welcomeCredits` 改为 `200`，并移除描述已放弃
  pending 模型的两项。**未放宽任何其他门禁**（维护遏制、私有资产、恢复演练、通知送达、
  跨账户拒绝全部不变）。
- **更正一处自身错误**：此前本卡记录的 `controlled-alpha-boundary` 为 `pass`，
  但其 `registrationDefaultState: "pending"` 与 `siteOwnerApprovalRequired: true`
  是**不实值**——生产库 `pending` 用户为 0、审批审计为 0。契约修正后该两项已改为
  实际值，当时的 `pass` 属填报错误，已在主机保留
  `readiness.json.passclaimed` 作为对照，不掩盖。

**剩余工作**

- **已完成开站。** 站长 2026-09-15 明确授权「带着 `controlled-alpha-operations` 缺口开站」，
  并决定通知渠道以后再做。维护标记已移除，
  `/`、`/login`、`/register` 均 200，未登录 session 401，readiness 200，队列 0。
- 门禁最终结果：`artifact-security` / `production-preflight` / `controlled-alpha-boundary` /
  `controlled-alpha-member-journey` / `controlled-alpha-recovery` 五项 **pass**；
  `controlled-alpha-operations` 如实 **fail**（主机无告警通道，已授权接受）。
- `manualTestCreditGrantPassed` 与 `referenceUploadPassed` 由站长在浏览器实测通过后填 `true`
  （前者 180→280 无支付记录，后者 `reference_assets` 2 条 `ready`），非默认假定。

**其他已记录的独立缺口**

- 备份 timer `disabled`（自 2026-09-05 未自动运行），站长指示「不动，只记录」。
  **2026-09-17 更正：此条不成立**，见「阶段 6 暴露的独立问题」下的更正说明与阶段 8。
- 主机 2 vCPU / 4 GiB 同时跑 green Web+Worker 与 blue Web，`MemAvailable` 2.27 GiB，
  余量可接受但 blue Web 长期闲置占用资源，可在观察期后退役。
- 无任何对外告警通道（已授权接受的缺口，**这是 `operations` 项 `fail` 的唯一原因**）。
- 本地 32131/32142 栈已恢复。
- 参考图校验耗时缺陷（见阶段 8.5），未定位根因、未修改。
