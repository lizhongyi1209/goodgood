# 当前开发版本与跨窗口交接

## GG-113 资产卡片与选择器缩略图（实现中）

隔离工作树 `F:/goodgood-worktrees/GG-113` 从 GG-112 已验证提交 `85eea1a` 创建。
站长选择资产库全部图片卡片和选择器；[任务卡](tasks/GG-113-private-image-previews.md)
及 [ADR 0101](decisions/0101-private-card-image-previews.md) 记录范围。OSS 测试前缀
真实图片的只读转换探测为 2,380,052 → 30,556 字节，生成 288 × 512 WebP。
当前 5173/32131 仍运行 GG-112；GG-113 的 `check:local` 563/26/0，
OSS 与 RustFS 真实只读缩略图转换均通过，精确检查点尚待切换。
新检查点运行前，继续保留 GG-112 会话和服务；32142 Worker 保持关闭。

## GG-112 本地真实邮件验证码（已验收）

基于 GG-111 `6067cda` 的独立工作树 `F:/goodgood-worktrees/GG-112`。5173 已经通过
32131 使用真实 GoodGood 邮箱验证码 API；GG-112 只将 32131 的邮件投递从 Mailpit
切为显式配置的 TLS SMTP。站长选用现有发信账号；本地数据库、用户及会话继续隔离，
不导入生产身份。见[任务卡](tasks/GG-112-real-email-local-login.md)和
[ADR 0100](decisions/0100-local-real-email-delivery.md)。

将 `infra/local/email-smtp.env.example` 的内容复制到仓库外，单独创建密码文件，
再用以下命令启动已验证的 32131 工作区；5173 仍代理此服务：

~~~powershell
node scripts/local-checkpoint.mjs start workspace --cloud-env-file C:\Users\Admin\AppData\Local\GoodGood\local-cloud-upload\cloud-upload.env --email-env-file C:\Users\Admin\AppData\Local\GoodGood\local-real-email\email-smtp.env
~~~

真实邮件模式启动前执行 SMTP TLS/认证 `verify()`，不发送信件。浏览器里手动发送
验证码才会发真实邮件。站长提供了仓库外密码文件；SMTP 预检 5/5 通过。32131 已切
GG-112 首次验收检查点 `49e5f7d`，5173 Vite 也已切到 GG-112 工作树并代理该 Web。
站长确认收到真实邮件、登录成功、刷新后会话正常。每次提交新 HEAD 后须重建并重启精确检查点；Mailpit
容器保留，但当前 32131 不使用它。

## GG-111 本地页面连接 OSS 参考图直传（已验收）

GG-111 在 `F:/goodgood-worktrees/GG-111`，基于 GG-110 `65fa299`。默认本地上传仍写
RustFS。站长明确指定本地开发复用生产 OSS 桶；仅在显式启用云端模式时，新参考图写入
`o1key-goodgood/local-dev/references/`，本地数据库与原 RustFS 素材继续保留。
参见 [ADR 0099](decisions/0099-local-upload-probes-in-production-oss-bucket.md) 与
[任务卡](tasks/GG-111-cloud-reference-upload-development.md)。

GG-111 验收时，5173 Vite 与 32131 Node Web 均从 GG-111 工作树运行；站长在页面服务切换后
再次刷新，确认参考图仍在、页面正常。当前服务已由 GG-112 接续，32142 真实 O1Key Worker 保持关闭。

云端配置按 `infra/local/cloud-upload.env.example` 放在**仓库和工作树之外**，并将
RAM AccessKey ID / Secret 放在两个单独的仓库外文件；不要把值、CSV 内容、签名 URL
或用户图片放进 Git、日志或聊天。GG-111 启动器只接受该配置中的六个指定字段，
校验数据库、旧素材库仍为本机隔离栈。现有 5173 Vite 可继续代理到 32131，但 32131
必须先以 GG-111 的已提交检查点重新构建并重启：

~~~powershell
npm run build:checkpoint
node scripts/local-checkpoint.mjs start workspace --cloud-env-file C:\Users\Admin\AppData\Local\GoodGood\local-cloud-upload\cloud-upload.env
~~~

已在本机仓库外准备上述配置和凭据文件，来源为站长明确指定的现有 RAM 密钥，未打印
密钥。RAM 身份读取桶 CORS 返回 `AccessDenied 403`，站长已在 OSS 控制台追加
5173 规则；`upload-goodgood.o1key.cn` 的 PUT 预检现返回 200，允许来源、方法及
`content-type` 均正确。OSS HeadBucket 200；以全新可丢弃 `local-dev/references/`
对象执行签名 PUT 200、私有 GET 200 和字节比对、精确 DELETE 204。随后 GG-111
`2674c90` 代码检查点在 32131 启动，5173 代理该版本；站长实传 PNG 并确认刷新
仍可见。本地记录 `ready / accepted`、2,380,052 字节、940×1672 像素，OSS HEAD
200 且长度一致。后续文档提交也须重建检查点，使 32131 的 `build.revision` 与
工作树 HEAD 一致。本次未触发 O1Key 生成。

- 日期：2026-09-24；GG-110 在 GG-107 `4d5ad94` 上修复 5173 参考图上传预览的运行配置。5173 仅监听 loopback，`/api` 代理到本地 32131 Node Web，RustFS 直传已用真实 JPEG 验证 `ready / accepted`。分支 `fix/GG-110-functional-upload-preview`，工作树 `F:/goodgood-worktrees/GG-107`；32131 运行已验证 `35b1f12` 检查点，32142 Worker 当前未启动。生产未变。
- 当前项目入口：F:/goodgood；累计代码包含a73835f、GG081—091与GG092交接。`.codex/`是用户本地设置，保留不提交。
- **生产已部署并开放**：`goodgood.o1key.com`，revision `7888554` / 迁移 `0044` / 配置 `b3d7310a…ddf3`；应用仅 `goodgood-production` 单项目。详见 CURRENT_STATE.md 与 [GG-100 记录](operations/2026-09-22-gg100-single-slot-host-cleanup.md)。
- 新窗口先读AGENTS/CURRENT_STATE/WORKFLOW/IMPLEMENTATION_PLAN/BACKLOG，然后本页；GG-106 OSS 文档在原 `F:/goodgood` 工作树继续，GG-107 位于 `F:/goodgood-worktrees/GG-107`。

## 先确认版本，避免退回历史

在F:/goodgood执行：

~~~powershell
git status --short --branch
git log -5 --oneline
git worktree list
git merge-base --is-ancestor a73835f HEAD
git merge-base --is-ancestor bb782c0 HEAD
~~~

两个祖先检查必须退出0。**main 现在包含全部累计功能**（GG-097 已把 `main` 快进到发布候选）；
旧文档说「main bab17fd 不含累计功能」已过期。不从旧 GG024/C6 工作树开始，不bulk merge C6。
若窗口显示GG024或旧任务，先检查工作目录和分支，保留未提交内容；不reset、不丢弃`.codex/`用户设置。

新需求使用隔离分支/worktree，起点为 `main`；不要在两个窗口同时编辑同一目录。
**生产已上线，任何影响运行时的改动都必须走新的任务卡与明确授权；不要直接改生产。**

## 当前本地功能与确定的规则

- 保留原图片创作、模型/价格管理、企业/分销、档案、灵感等累计功能。Seedance有传输适配器及显式开启的本地preview，正式视频任务/积分结算/资产入库仍未接通，不能默认发真实请求。
- 积分后台用枚举下拉分类，充值登记须可信支付证据；站长默认运营看板，统计现金充值与并发，8项导航顺序见GG089。
- JCOIN总量1亿，用户回馈池50%；一期100万枚、每100有效充值消费积分2枚，正常约50万元消费分完；发完为止无期限。上海2026-09-18起算，初始未开启；不兑换、不锚定人民币、不向普通用户展示总池/批次额度。站长管理批次卡片/进度；创作池与后续批次另行实施。
- 私有问题反馈支持最多5张图、类型、文字、状态与回复；类型菜单始终向下。
- 每账户一个固定唯一随机6位数字邀请码，可无限邀请。**邀请码已改为选填**（ADR 0089）：不填即可注册，填了必须有效；注册成功即建 `active` 账户并立得 **200** 欢迎积分（`WELCOME_CREDIT_AMOUNT`，= 单张 20 积分 × 10 张），可立即创作。准入收口**唯一依赖** `GOODGOOD_EMAIL_REGISTRATION_ENABLED`（ADR 0090）；`pending` 审批模型已废弃。GG096提供独立`/login`与`/register`及固定子导航；登录隐藏邀请码、注册直接显示邀请码（标注选填）。邮箱可直接编辑，换邮箱作废旧挑战但不解除发送冷却。
- 邀请码在本人余额下方仅普通文本，没有整行点击或复制按钮。账户入口无焦点外框，键盘焦点用浅色背景。最后两处样式按用户要求未做自动/browser验证，不能宣称最新样式已全量验收。
- 精确规则/边界以GG081、GG083—091任务及ADR0087为准，专题文档中明确标号的旧规则属于历史，不优先于新决定。

## 当前本地预览与依赖（保留用户数据）

GG-105 的 200 MiB 大文件仍待手动验收；GG-110 已验证普通 JPEG 参考图上传。GG-104
旧门禁 581 项（555 通过/26 隔离跳过/0 失败）。拖入图片/视频立即本地预览并后台上传；
参考原图与视频均为 200 MiB，模型输入仍为单张 10 MB/整批 32 MB，失败原因可见；
新增迁移 0045 与私有视频素材库。本地数据库原停在 0043；通用迁移器因更早的
0001 校验值不符安全停止，旧记录未重置。核对目标、活动任务 0 及提交 SQL 后，
只在本地事务中前进 0044/0045，当前记录 45 条；32131 已由 GG-110 检查点重启，
版本来源已核对，32142 Worker 当前停止。GG-110 的普通 JPEG 上传已完成端到端本地验证；GG-105 大文件与 GG-104 视频素材仍未做真实文件端到端验收，见各任务卡。

GG-103 代码门禁已通过（575 项：549 通过/26 隔离跳过/0 失败）。参考图选择后
本地立即预览、后台最多两张同时直传；上传完成超时会查询真实素材状态。Worker
对 Nano Banana/GPT Image 实际上传 O1Key 的副本限制单张 10,000,000 字节、
整批 32,000,000 字节；原图仍保留在私有素材库。尚未进行真实付费多参考图
生成。GG-103 当时核对了 32131 Web 检查点来源与 32142 真实 O1Key Worker 健康状态；
后续启动必须使用当前提交重新构建检查点，不得沿用 GG-102 产物。

GG-102 已在本地验证：视频与图片共用仓库外专用 O1Key 凭据，默认提供真实 Seedance
文生视频入口，无需单独手动开关。32131 的 `/api/video/preview` 返回
`available:true,persistence:false`；32142 设计为真实 O1Key Worker，当前未启动；Vite serve 也返回相同
状态。视频结果仍是临时预览，非正式任务、积分或资产记录；每次用户提交可能计费。
真实图片单张 1K 本地生成成功，积分 180→160；本次未提交付费视频任务。每次恢复后
仍须核对 `/api/health/version` 的 `build.verified=true` 且 revision 等于当前 Git HEAD。

| 组件 | 当前入口 | 本次记录的进程/来源 |
| --- | --- | --- |
| 工作区Web | http://127.0.0.1:32131/login | `node scripts/local-checkpoint.mjs start workspace`；`/register`为注册入口；邮箱验证码、无local账户预设；端口实时核验PID，代码由version接口证明 |
| 真实 worker | http://127.0.0.1:32142/health/ready | 当前未启动；需要生成时核验队列后运行 `node scripts/local-checkpoint.mjs start worker`；**真实 O1Key，真实计费** |
| PostgreSQL | loopback54449/goodgood | goodgood-gg052-postgres-1，最新0045 |
| Valkey | loopback56449/db0 | goodgood-gg052-valkey-1 |
| RustFS | loopback58049/58050 | goodgood-gg052-object-storage-1，桶goodgood-gg052-local |

GG-101起本地 Web/Worker **强制调用真实 O1Key**（真实计费）；GG-102起本地视频
无需额外开关。令牌只从仓库外路径读取：

~~~text
%USERPROFILE%\.claude\goodgood-local-secrets\o1key-api-key.txt
（可用 GOODGOOD_LOCAL_O1KEY_KEY_FILE 覆盖；启动器拒绝仓库内路径）
~~~

令牌缺失、位于仓库内、为空或多行时启动器直接报错退出，**不会**回退 mock。
worker 启动横幅会打印真实 provider 与计费提示。只能放专用开发令牌，绝不要放生产
令牌，也不要把值复制进仓库、文档或聊天记录。mock 仅由 `stack:mock-test:*` 的隔离
自动化测试 profile 启动，不能作为开发环境或线上接口验收证据。

## GG-097 本地测试窗口结论（2026-09-15）

- **真实链路已在本地验证通过**：用户实测真实 O1Key 出图成功、消费记录正常。此外接口侧验证：令牌鉴权（404 vs 401 对照）、`GET /v1/models` 与本项目 15 个 provider 模型 **15/15 全部存在**、参考图上传契约（https URL、整数 `expires_at`、24h）满足 adapter 校验。
- 本窗口四项修复（均已提交）：本地上传 CORS 过期来源（`736a959`）；mock provider 改为实现真实 O1Key 契约（`15cc1f5`）；本地 worker 默认真实 provider（`cfb8331`）；生成被 Linux 专用资源门锁死（`f2bbbcd`）。
- 重要认知：`host-resource-admission.mjs` 原读 `/proc/meminfo` 与 `statfs("/")`，非 Linux 主机必然落入「无法观测」并**永久锁死**生成。生产走 Linux 分支未改动。
- 末次 `npm run check:local` 563 项（537 通过/26 隔离跳过/0 失败）。

本次Docker清理删除37个确认废弃容器、9个旧GoodGood应用镜像、5个空网络和无引用的postgres:16-alpine/node:24.12.0-bookworm-slim，构建缓存回收21.92GB。保留goodgood-gg052三个依赖、gg044 Mailpit、new-api/redis/postgres及全部34个卷；清理后共7个容器，旧GoodGood端口3010/3030/32029/32133无监听。没有删除数据库或素材卷。

## 构建来源与启动保护

版本构建必须在运行时源码已提交时执行；文档、测试和`.codex`改动不阻挡来源检查：

~~~powershell
npm ci
npm run build:checkpoint
npm run verify:checkpoint
node scripts/local-checkpoint.mjs start workspace
~~~

`build:checkpoint`构建`dist/client`与`dist/server`，写入忽略的`dist/goodgood-build.json`，绑定当前Git revision、源码指纹、产物指纹和文件数。`verify:checkpoint`会拒绝缺失/过期/篡改产物；`start workspace`仅接受loopback状态依赖、Mailpit、真实 O1Key及email_otp配置，并显式清空local auth账户预设。主入口使用32131；worker使用32142健康端口。`start login`保留为诊断兼容命令但正常流程不启动32191；`start provider`已移除。

启动后检查：

~~~powershell
Invoke-RestMethod http://127.0.0.1:32131/api/health/version
# 仅在生成 Worker 已启动时检查：Invoke-RestMethod http://127.0.0.1:32142/health/ready
~~~

Web响应的`build.verified`必须为`true`且revision等于`git rev-parse HEAD`；仅有`/api/health/ready`返回200不能证明页面来自当前提交。构建产物`dist/`被忽略，不提交到Git；旧Docker `goodgood:gg027-local`已删除，不能再作为当前版本依据。

PID是交接时的记录，不是以后可直接kill的授权目标。先用Get-NetTCPConnection/Get-CimInstance核验端口、命令行、目录；不要停陌生进程或重载用户带未提交草稿的浏览器标签。原预览账户/作品/反馈保留，禁止fixture/reset/自动重新初始化。

当前32131使用email_otp并保留原用户数据，不配置local auth token/default token，也不自动写入登录Cookie；使用新的`goodgood_workspace_email_session` Cookie名称，旧local/32191 Cookie不会形成预设登录。邮件仅进入现有本地Mailpit（SMTP58046，查看http://127.0.0.1:58045），不向外发信。独立32191正常流程已停用。

## 启动与恢复

Node >=22.13.0，npm；本机记录v24.12.0/npm11.6.2。切换版本后用npm ci恢复锁定依赖，忽略旧node_modules/dist。普通纯 UI 开发用 `npm run dev:local`，它使用演示会话，不能上传真实素材。需在热更新预览中使用本地素材和邮箱会话时，先启动已验证的 GG-110 32131 Node Web 与本地 Compose 依赖，再从 GG-110 工作树运行 `npm run dev:workspace -- --env-file F:\goodgood\.env.login-review --port 5173`。该入口验证状态服务在 loopback、真实 O1Key 开发密钥位于仓库外，并将 5173 的 `/api` 全部代理到 32131，避开 Vite Worker 跨请求复用 PostgreSQL 连接的失败。图片上传无需启动 32142 Worker；若要进行生成，须另行核验并启动唯一 Worker。两个端口共享本地会话 cookie，浏览器直传的 RustFS CORS 包含 5173 和 32131。实际端口以 Vite 输出为准；停止进程用 Ctrl+C。

本机 GG-110 工作树中已有从根目录本地配置复制的忽略文件 `.env.login-review`，不提交。其 32131 Web 检查点需在该工作树运行 `npm run verify:checkpoint` 后用 `node scripts/local-checkpoint.mjs start workspace` 启动；若 Git revision 或源码改变，先提交并重新运行 `npm run build:checkpoint`。当前进程 PID/版本必须重新核验，不能沿用本页记录。

根目录已有忽略的.env.local-review，保留本机loopback状态服务配置；其中历史 mock/provider 值不再控制开发运行时。未提交、不打印、不复制到报告；不得含生产凭据。它不能替代其他机器的独立环境安装。若文件或容器缺失，按DEPLOYMENT的独立本地栈步骤配置，不运行旧数据转换，也不从生产导入。

当前工作区入口为32131。完成提交后使用上方`build:checkpoint`与`start`命令；若端口占用，先核验命令行和工作目录，只停止已识别的GoodGood进程，保留Worker/provider/容器。

Web readiness为/api/health/ready；Worker用表内/health/ready。仅Web替换无需迁移；不要运行db:migrate去重播已记录的迁移，新增迁移须按新任务范围保护原历史。若Worker确实已停止，先核验没有重复实例，再用`node scripts/local-checkpoint.mjs start worker`恢复；该命令只允许真实 O1Key。

## 验证与安全SQL测试

一般改代码先最小定向测试，稳定后一次npm run check:local；纯文档用：

~~~powershell
node --test tests/documentation-continuity.test.mjs tests/m8-production-release.test.mjs
git diff --check
~~~

GG093构建来源定向测试5/5通过；完整门禁在代码稳定后运行并把实际结果写入任务卡。后续邀请码文本/焦点样式按用户要求由用户手验，不能宣称浏览器全量验收。旧M6 opt-in价格断言10/20问题见GG090，不作为本任务修复，不隐瞒也不向生产执行。

GG091、GG029、GG031数据库测试均可用以下仓库内命令；先确认容器是表内本地PG，勿改flags指向原goodgood或线上：

~~~powershell
node --env-file=.env.local-review scripts/run-checkpoint-sql.mjs gg091
node --env-file=.env.local-review scripts/run-checkpoint-sql.mjs gg029
node --env-file=.env.local-review scripts/run-checkpoint-sql.mjs gg031
~~~

runner只在loopback54449创建固定命名的新空库，拒绝已存在库，核验无peer，不启动Worker/Redis/S3/provider。tests使用捕获邮件和内存对象mock，自动跑最新0043全迁移，结束只删除刚创建且无peer的临时库。若被打断而遗留库，下次会拒绝重置，先人工检查目标/连接，不能改为原goodgood。其余opt-in测试按TESTING各自命名隔离契约；不能把26项跳过当26项已通过。

## 生产事实与下一步

**生产已上线并开放**（GG-097 2026-09-15 完成，GG-098 2026-09-21 上线）：

- 入口 `goodgood.o1key.com`；revision `7888554`、镜像 `sha256:7deeab8c…3270`、迁移 `0044`、
  配置契约 `65202c28…`；当前线上事实以 `CURRENT_STATE.md` 为准。
- GG-100 已把主机迁移到固定 `goodgood-production` Compose（Web `3100` / Worker health `3101`）；
  旧 blue/green 容器、网络、槽位文件和动态 upstream 已清理，未来不得恢复。
- **公网与注册均开放**。注册收口唯一依赖 `GOODGOOD_EMAIL_REGISTRATION_ENABLED`（当前 `true`）。
- 真实数据（09-21 核对）：users 28、assets 166、references 141 ready、
  生成任务 201（151 成功 / 50 失败）；运营手动登记充值 4 笔共 15100 积分；冻结 0。
- **授权测试用户清理（GG-091）已执行完毕，不要重跑**；线上站长 `951565127@qq.com`（邀请码 405513）。
- GG-098 上线了什么：单次手动积分发放上限 `5000` → `1,000,000`（含迁移 `0044`），删除快捷按钮，
  始终手动输入。这是**首次带迁移的热修发布**。完整发布记录：[GG-098 发布记录](releases/2026-09-21-gg098-manual-grant-ceiling.md)。

**发布中发现的主机隐患（2026-09-21）**：

主机 `/opt/goodgood-production/compose.production.yaml` 是旧版本（web 只绑 4 个 secret，
缺 email OTP/SMTP），导致 GG-098 候选首次启动崩溃。已用本次 revision 的 compose 覆盖，
旧版留 `.pre-gg098-backup`。**下次原地替换前必须先核对主机 Compose 与候选 revision 一致**。

GG-097/GG-098 的双槽位和上游切换只属于历史发布记录；新窗口不得复用。

**唯一的门禁缺口**：

1. **无任何对外告警通道**——`controlled-alpha-operations` 门禁项如实为 `fail`，
   站长授权带着该缺口开站，通知渠道「以后再做」。

**此前记录的「备份 timer disabled」已更正为不成立**：那是历史 staging timer。
生产 `goodgood-production-postgres-backup.timer` 自 2026-09-06 起 `enabled`/`active`、
每 30 分钟一次；2026-09-17 首轮恢复演练通过（快照 `ce191630`，59 表 / 2403 行 / 43 迁移）。
演练需要**短暂公网 503 维护窗口**，关闭维护无现成 disable 动作。

**下一步**：无待办发布步骤。若需改动生产，另开任务卡并取得明确授权；
不要重放历史迁移、旧转换脚本或 GG-091 清理。**新任务从 GG-099 分配。**
**待排查缺陷**：参考图 `/api/references/*` 校验耗时最长近 6 分钟，超过 nginx 70s 读超时，
用户会看到上传失败（素材实际入库）。未定位根因、未修改。

## 提交正确但打开旧页面的排查

- f68ba81源码包含视频；Git提交不等于Docker镜像或dist构建产物。GOODGOOD_REVISION是启动时填入的字符串，单看它不能证明页面构建来源。
- 清理前只读核验发现goodgood-gg025-web-1使用goodgood:gg027-local，在127.0.0.1:3030；本任务已按授权移除该容器及同组历史Web/镜像。3000另有new-api，不能猜默认端口属于GoodGood；new-api及其他无关项目仍保留。
- Node入口server/runtime/web.mjs从process.cwd()/dist加载页面，startProdServer只检查产物是否存在，不核验它对应Git提交；切换版本须从正确目录重建，再重启已识别的Web。旧进程也不会随git checkout更新页面模块。
- Docker服务须检查实际容器镜像ID、构建revision标签及端口映射；仅checkout或compose up启动现有容器不会自动把旧镜像换成当前源码。不得把旧gg027-local标签当本检查点，也不得重建会触碰用户数据的陌生栈。
- 新窗口打开页面前核对五项：Git提交/目录、version接口实际构建来源、监听进程/镜像、浏览器精确URL、页面关键功能（图片/视频及问题反馈等）。健康200只证明服务可用；`start:checkpoint`现在会先拒绝缺失或不匹配的构建来源。
- 本次缺少另一窗口的URL/启动记录，旧镜像/旧dist/旧端口是有实现依据的候选原因，不把候选写成该事件已证实的根因。
