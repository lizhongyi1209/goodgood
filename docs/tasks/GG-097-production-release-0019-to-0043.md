# GG-097 — 累计功能生产发布（0019 → 0043）

- 状态：计划已建立，等待用户授权与人工验收；未开始部署
- 用户需求：2026-09-15 当天把本地累计功能（GG-024 — GG-096）发布到生产 `goodgood.o1key.com`。
- 最后更新：2026-09-15
- 分支 / worktree：发布分支从 `feature/GG-096-production-auth-entry`（`cd9af10`）切出，建议 `release/GG-097-cumulative-alpha`；本目录保持单一窗口。
- 基线：本地 HEAD `cd9af10`；生产仍为 `65ceb168` / 迁移 `0019`。

## 范围与验收

- 要做：把 `cd9af10` 经 main 与 CI 产出不可变镜像，走受控 alpha 门禁发布到生产，并完成站长初始化与一次真实链路冒烟。
- 不做：不重置生产数据库、不清理 R2、不重放旧转换脚本、不恢复已删除的测试账户、不开启支付/支付宝、不实现 C6（删除/举报）、不部署视频正式结算。
- 验收点：生产 `/login`、`/register` 可用；新账户为 `pending` 且拿到 100 欢迎积分；站长能审批；一次真实生图成功且资产私有；跨账户读取被拒；门禁证据全部 `pass` 且绑定同一 revision。
- 决策影响：不改变已确认的产品决定；ADR 0088 已覆盖认证入口。发布动作本身需要新的明确授权。
- 授权边界：**本任务卡不构成发布授权。** 用户需在开工前明确批准：合并 main、推送、CI 发布镜像、生产迁移、切流窗口、以及一次真实 provider 生成。

## 阻断性发现（开工前必须解决）

### B1 — 邮件验证码模式下无法创建第一个账户（死锁）

事实链：

1. 生产当前**用户数为 0**（`CURRENT_STATE.md` GG-091 清理记录，含站长）。
2. `server/auth/email-repository.mjs:348-357`：新邮箱注册必须有邀请码，且邀请码必须属于 `status='active'` 的用户。
3. 生产没有 active 用户 → 没有邀请码 → 无法注册第一个账户。
4. `server/admin/bootstrap-site-owner.mjs:54-72`：站长初始化要求该邮箱**已经登录过一次**并存在 `users` 行，否则 `SITE_OWNER_BOOTSTRAP_ACCOUNT_NOT_FOUND`。
5. 因此「先注册站长 → 再 bootstrap」在 email_otp 模式下**无法启动**。

可行路径（三选一，需用户决定）：

- **A（推荐，风险最低）**：先以 **OIDC 模式**部署，让站长用 Authing 完成一次真实登录，产生 `pending` owner（OIDC 首登不需要邀请码，见 `server/auth/repository.mjs:118-165`）；随后执行站长 bootstrap，再由站长在界面生成自己的邀请码；确认链路无误后，才切换 `GOODGOOD_AUTH_MODE=email_otp`。代价是认证切换变成两步。
- **B**：email_otp 上线前，用一次性受控脚本在生产数据库插入一个 active owner 及其邀请码。**属于直接写生产数据**，需要独立授权，且违反「不从旧脚本转换」的惯例，风险最高。
- **C**：生产先保持 OIDC，本次只发布 GG-024 — GG-095 的功能面，GG-096 的邮箱验证码入口延后。代价是本次发布不含用户最关心的认证改造。

### B2 — main 不包含累计功能

`git rev-list --left-right --count main...HEAD` = `0 224`。本地 `main` = `bab17fd`，`origin/main` = `42fc8d8`，两者不同；但 `18fe779`（Sharp 安全候选）与 `42fc8d8` **都已是 HEAD 的祖先**，因此是纯快进关系。

CI 只在 `pull_request`、`push: main`、`workflow_dispatch` 触发；GHCR 镜像只在受信任的 `main` 提交上发布。所以**必须先合入 main**，否则拿不到可部署镜像。

### B3 — 24 个迁移 + 旧 Web 并行期

生产在 `0019`，目标 `0043`，中间是 `0020`—`0043` 共 24 个迁移。共享同一生产数据库，蓝绿期间旧 Web（`65ceb168`）仍可能接流。**迁移必须对旧代码前向兼容**，否则旧槽位会在切换窗口内报错。

### B4 — 门禁证据时效

alpha 门禁为 `artifact-security` 168h、`production-preflight` 72h，其余四项 **24h**。证据一collect 就必须一口气走到切流。

## 实施步骤

### 阶段 0 — 决策与前置（用户主导）

- 0.1 就 B1 选定路径（A/B/C）。**未选定不得开工。**
- 0.2 明确授权范围并记录在本卡：合并 main / 推送 / CI 发布 / 生产迁移 / 切流窗口 / 一次真实生成。
- 0.3 确认生产主机可访问、备份新鲜、维护标记可用。

### 阶段 1 — 合并与 CI（本地 + GitHub）

- 1.1 `git fetch origin`，确认 `origin/main` 仍为 `42fc8d8`，核验 `git merge-base --is-ancestor 42fc8d8 HEAD` 退出 0。
- 1.2 `npm ci`，运行 `npm run check:local`，记录完整数字（当前基线 559：533 通过/26 跳过/0 失败）。
- 1.3 从 `cd9af10` 建 `release/GG-097-cumulative-alpha`，推送并开 PR 到 `main`。
- 1.4 等 PR CI 全绿（check:local + 两次 Trivy 扫描 + 镜像构建）。PR 不发布镜像。
- 1.5 合并到 `main`，触发 main CI，取得 **不可变 GA 镜像 digest**、完整 revision、最新迁移文件名、runtime-config checksum，以及 `artifact-security-evidence.json` 工件 ID 与 SHA-256。

### 阶段 2 — 迁移前向兼容审计（可在阶段 1 并行）

- 2.1 逐个读 `migrations/0020` — `0043`，列出所有 `ALTER TABLE`、`DROP`、`ADD COLUMN ... NOT NULL`、重命名、约束/索引变更。
- 2.2 对每一项判断：旧 Web 的读写路径在迁移后是否仍能成功。重点关注 `users`、`credit_accounts`、`assets`、`projects`、`jobs`、`auth_*`。
- 2.3 产出「不兼容项清单」；若有任何一项不兼容，切流必须停写（进入维护）而非并行。
- 2.4 结论写入本卡。

### 阶段 3 — 主机候选（不接流量）

- 3.1 在 `/etc/goodgood/production/` 安装 release.env / runtime.env（`root:root 0600`）与六个凭据文件（`root:<group> 0640`）。
- 3.2 运行 `npm run production:preflight -- --release-file ... --runtime-env-file ... --evidence-reference <记录名>`，确认全通过并取得 evidence 对象。
- 3.3 用 `npm run production:artifact-evidence -- ...` 导入 CI 工件，取得 `artifact-security` 对象。
- 3.4 在非活动槽位启动候选 Web，跑 `candidate-health-invariants`：live/ready、公网合成检查、队列、数据库、积分。
- 3.5 确认只有一个活动 Worker；旧 Worker 按 bounded grace 停止。

### 阶段 4 — 迁移与切流

- 4.1 保证没有活动 job、没有冻结积分、队列为空。
- 4.2 执行**一次**前向迁移 `0019` → `0043`。
- 4.3 启动候选 Worker，确认 readiness。
- 4.4 原子替换 Nginx upstream，`nginx -t` 通过后 reload。
- 4.5 重复公网合成、队列、数据库、积分指纹校验。

### 阶段 5 — 站长初始化与真实链路冒烟

- 5.1 站长走真实登录路径（模式取决于 B1 选择）。
- 5.2 确认新账户为 `pending` 且恰好 100 欢迎积分。
- 5.3 `bootstrap-site-owner` 先 dry-run，核对掩码账户，再 `--execute`。
- 5.4 在 `/admin/users` 审批一个受控非站长测试账户，并做一次小额测试积分发放；确认不产生支付记录。
- 5.5 一次**明确授权**的真实生图：1K、1:1、1 张，验证 reserve → settle、资产私有、重新登录可见。
- 5.6 用另一账户验证该资产不可读（跨账户拒绝）。

### 阶段 6 — 恢复、监控与门禁

- 6.1 新建加密异机恢复点，确认 RPO ≤ 60 分钟、RTO ≤ 240 分钟、14/8/12 保留点。
- 6.2 隔离环境恢复演练，比对迁移与行数。
- 6.3 验证维护标记可重新进入并返回 503。
- 6.4 记录 operator、通知通道、`MemAvailable`、根磁盘、备份新鲜度、provider 失败事件。
- 6.5 触发一次非计费测试信号，确认通知送达。
- 6.6 填 `controlled-alpha-boundary`、`-member-journey`、`-recovery`、`-operations` 四项证据（24h 内）。
- 6.7 运行 `npm run production:alpha-gate -- --evidence-file /var/lib/goodgood-production/controlled-alpha/readiness.json`，必须全 `pass`。
- 6.8 复查后解除维护，立即检查公网 root / login / pending / 创作行为。

### 阶段 7 — 收尾

- 7.1 更新 `CURRENT_STATE.md`：新 revision、digest、迁移 0043、活跃槽位、回退候选。
- 7.2 写 `docs/releases/2026-09-15-cumulative-alpha-release.md` 发布记录。
- 7.3 更新 BACKLOG / IMPLEMENTATION_PLAN / 本卡，区分「已实现 / 已验证 / 已部署」。

## 用户人工验收清单（由用户执行，agent 不代跑）

在 32131 上逐项确认并回填结果：

- [ ] `/login` 直接访问与刷新正常，无邀请码字段
- [ ] `/register` 直接访问与刷新正常，显示六位邀请码字段
- [ ] 登录/注册子导航与 URL 同步
- [ ] 未登录访问受保护页跳 `/login?returnTo=...`，登录后回到原目标
- [ ] 外部 returnTo、`//`、反斜杠、控制字符被拒绝
- [ ] 邮箱验证码经 Mailpit（http://127.0.0.1:58045）收到
- [ ] 新邮箱验证后自动切注册并保留邮箱与验证码
- [ ] 邀请码缺失 → `INVITATION_REQUIRED`；错误 → 保持注册态
- [ ] 发送成功后改邮箱不清除冷却，不能立即重发
- [ ] pending 账户无法创作，配额与提示正确
- [ ] 站长审批后可创作，且不重复发放欢迎积分
- [ ] 邀请码在余额下方为纯文本、无复制按钮
- [ ] 390px 无横向溢出
- [ ] 创作、参考图、项目保存恢复、资产库、图片详情
- [ ] 模型/价格管理、企业/分销、档案、灵感、问题反馈、JCoin 卡片
- [ ] 视频入口保持未接通状态，不误发真实视频请求

## 实现与证据

- 相关文件/专题文档：`AGENTS.md`、`docs/CURRENT_STATE.md`、`docs/WORKFLOW.md`、`docs/DEPLOYMENT.md`、`docs/TESTING.md`、`infra/production/CONTROLLED_ALPHA_RUNBOOK.md`、`docs/decisions/0088-addressable-login-registration-entry.md`
- 已完成：无（计划阶段）
- 验证：未开始
- 发布：未发布

## 恢复工作

- 尚未完成：B1 决策、main 合并、迁移审计、主机候选、迁移切流、站长初始化、门禁证据。
- 阻塞/风险：B1 认证死锁（**最高**）；B2 main 落后 224 提交；B3 24 个迁移对旧 Web 的前向兼容未审计；B4 证据 24h 时效；仅 2 vCPU / 4 GiB 主机需同时容纳候选槽位。
- 下一步：用户就 B1 选定 A/B/C，并在本卡记录发布授权范围；随后 agent 执行阶段 2（迁移审计），因为它不依赖 B1 决策且是切流安全的前置。
