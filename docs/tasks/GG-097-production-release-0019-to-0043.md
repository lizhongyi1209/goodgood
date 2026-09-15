# GG-097 — 累计功能生产重发布（全新上线）

- 状态：计划已建立；邀请码改可选已本地实现/门禁/32131 切换完成；本地全功能手动测试进行中（已修上传 CORS、mock 契约）；未部署
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

- 尚未完成：路线决策、B5 取舍、main 合并、迁移审计、主机候选、迁移切流、站长初始化、门禁证据。
- 阻塞/风险：B2 main 未合并；B3 迁移兼容未审计（路线甲）；B4 证据 24h 时效；B5 注册即创作需用户确认；2 vCPU / 4 GiB 需容纳候选槽位。
- 下一步：用户选定路线甲/乙并确认 B5，记录发布授权范围；随后执行阶段 1.1—1.2 与阶段 2 迁移审计。
