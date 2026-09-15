# GG-097 — 累计功能生产重发布（全新上线）

- 状态：计划已建立；邀请码改可选已本地实现/门禁/32131 切换完成；未部署
- 用户需求：2026-09-15 当天把本地累计功能（GG-024 — GG-096）以**全新方式**发布到生产 `goodgood.o1key.com`；旧测试数据无需保留，所有人重新注册。
- 最后更新：2026-09-15
- 分支 / worktree：`feature/GG-096-production-auth-entry`（`31302f0`）/ F:/goodgood；发布分支建议 `release/GG-097-cumulative-alpha`
- 基线：本地 HEAD `31302f0`；生产仍为 `65ceb168` / 迁移 `0019`

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
- **B5 注册即创作 —— 已确认采用「站长先注册再放行」。** `createEmailOwner` 建立的账户直接是 `active`（非 pending），故 `GOODGOOD_EMAIL_REGISTRATION_ENABLED` 是唯一收口开关。`server/auth/email-repository.mjs:330` 的关门判断先于邀请码校验，且只作用于**未绑定**邮箱：已绑定用户即使注册关闭仍可登录。发布时序为：关闭注册部署 → 站长注册首账户并 bootstrap → 打开注册放行。

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

### 阶段 3 — 主机候选（不接流量）

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
- 5.1 站长用真实邮箱验证码在 `/register` 创建首个账户（无需邀请码），确认恰好 100 欢迎积分。
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

### 阶段 7 — 收尾

- 7.1 更新 `CURRENT_STATE.md`：新 revision、digest、迁移 `0043`、活跃槽位、回退候选。
- 7.2 写 `docs/releases/2026-09-15-cumulative-alpha-release.md`。
- 7.3 更新 BACKLOG / IMPLEMENTATION_PLAN / 本卡，区分「已实现 / 已验证 / 已部署」。

## 用户人工验收清单（由用户执行，agent 不代跑）

在 32131（`http://127.0.0.1:32131`）上逐项确认并回填：

- [ ] `/login` 直接访问与刷新正常，无邀请码字段
- [ ] `/register` 直接访问与刷新正常，邀请码标注「选填」
- [ ] **不填邀请码即可注册**，注册后获 100 欢迎积分
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

## 实现与证据

- 相关文件/专题文档：`AGENTS.md`、`docs/CURRENT_STATE.md`、`docs/WORKFLOW.md`、`docs/DEPLOYMENT.md`、`docs/TESTING.md`、`infra/production/CONTROLLED_ALPHA_RUNBOOK.md`、`docs/decisions/0089-optional-invitation-registration.md`
- 已完成：邀请码改可选（ADR 0089）。`server/auth/email-repository.mjs` 仅在提供时校验邀请码并保留 pending 账户门槛；`server/auth/email-operations.mjs` 文案；`features/auth/authentication-gate.tsx` 选填字段与提交门槛。
- 验证：定向 41/41（gg091 2、gg096 3、gg095 1、gg029 15、ui-components 18…）；完整 `npm run check:local` 559 项（533 通过/26 隔离跳过/0 失败）；`tsc --noEmit` 通过。
- 构建/运行：`build:checkpoint` + `verify:checkpoint` 通过（revision `31302f0`，artifactHash `bab263dc…`）；32131 已切换，PID 32932，`build.verified=true` 且 revision 与 HEAD 一致；`/`、`/login`、`/register` 均 200。
- 发布：未发布。

## 恢复工作

- 尚未完成：路线决策、B5 取舍、main 合并、迁移审计、主机候选、迁移切流、站长初始化、门禁证据。
- 阻塞/风险：B2 main 未合并；B3 迁移兼容未审计（路线甲）；B4 证据 24h 时效；B5 注册即创作需用户确认；2 vCPU / 4 GiB 需容纳候选槽位。
- 下一步：用户选定路线甲/乙并确认 B5，记录发布授权范围；随后执行阶段 1.1—1.2 与阶段 2 迁移审计。
