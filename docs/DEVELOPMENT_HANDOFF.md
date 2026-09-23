# 当前开发版本与跨窗口交接

- 日期：2026-09-23；GG-104 拖拽上传与视频素材入库**本地实现/门禁/运行预览完成，未部署**；当前分支 `codex/GG-104-media-dropzone-layout`，基线为 GG-103 `1f24318`。
- 当前项目入口：F:/goodgood；累计代码包含a73835f、GG081—091与GG092交接。`.codex/`是用户本地设置，保留不提交。
- **生产已部署并开放**：`goodgood.o1key.com`，revision `7888554` / 迁移 `0044` / 配置 `b3d7310a…ddf3`；应用仅 `goodgood-production` 单项目。详见 CURRENT_STATE.md 与 [GG-100 记录](operations/2026-09-22-gg100-single-slot-host-cleanup.md)。
- 新窗口先读AGENTS/CURRENT_STATE/WORKFLOW/IMPLEMENTATION_PLAN/BACKLOG，然后本页；**下一普通任务从GG-105分配**。

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

GG-104 代码门禁 581 项（555 通过/26 隔离跳过/0 失败）。拖入图片/视频
立即本地预览并后台上传；上传前图片 20 MiB、视频 200 MiB 限制，失败原因可见；
新增迁移 0045 与私有视频素材库。本地数据库原停在 0043；通用迁移器因更早的
0001 校验值不符安全停止，旧记录未重置。核对目标、活动任务 0 及提交 SQL 后，
只在本地事务中前进 0044/0045，当前记录 45 条；32131 已由 GG-104 检查点启动，
版本、页面、未登录视频素材 401 与 32142 真实 Worker 健康均核对。未写测试素材到
真实 Worker 共用数据库，也未做真实文件上传端到端测试，见 GG-104 任务卡。

GG-103 代码门禁已通过（575 项：549 通过/26 隔离跳过/0 失败）。参考图选择后
本地立即预览、后台最多两张同时直传；上传完成超时会查询真实素材状态。Worker
对 Nano Banana/GPT Image 实际上传 O1Key 的副本限制单张 10,000,000 字节、
整批 32,000,000 字节；原图仍保留在私有素材库。尚未进行真实付费多参考图
生成。32131 Web 检查点来源与 32142 真实 O1Key Worker 健康状态已核验；
后续启动必须使用当前提交重新构建检查点，不得沿用 GG-102 产物。

GG-102 已在本地验证：视频与图片共用仓库外专用 O1Key 凭据，默认提供真实 Seedance
文生视频入口，无需单独手动开关。32131 的 `/api/video/preview` 返回
`available:true,persistence:false`，32142 为真实 O1Key Worker；Vite serve 也返回相同
状态。视频结果仍是临时预览，非正式任务、积分或资产记录；每次用户提交可能计费。
真实图片单张 1K 本地生成成功，积分 180→160；本次未提交付费视频任务。每次恢复后
仍须核对 `/api/health/version` 的 `build.verified=true` 且 revision 等于当前 Git HEAD。

| 组件 | 当前入口 | 本次记录的进程/来源 |
| --- | --- | --- |
| 工作区Web | http://127.0.0.1:32131/login | `node scripts/local-checkpoint.mjs start workspace`；`/register`为注册入口；邮箱验证码、无local账户预设；端口实时核验PID，代码由version接口证明 |
| 真实 worker | http://127.0.0.1:32142/health/ready | `node scripts/local-checkpoint.mjs start worker`；**真实 O1Key，真实计费** |
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
Invoke-RestMethod http://127.0.0.1:32142/health/ready
~~~

Web响应的`build.verified`必须为`true`且revision等于`git rev-parse HEAD`；仅有`/api/health/ready`返回200不能证明页面来自当前提交。构建产物`dist/`被忽略，不提交到Git；旧Docker `goodgood:gg027-local`已删除，不能再作为当前版本依据。

PID是交接时的记录，不是以后可直接kill的授权目标。先用Get-NetTCPConnection/Get-CimInstance核验端口、命令行、目录；不要停陌生进程或重载用户带未提交草稿的浏览器标签。原预览账户/作品/反馈保留，禁止fixture/reset/自动重新初始化。

当前32131使用email_otp并保留原用户数据，不配置local auth token/default token，也不自动写入登录Cookie；使用新的`goodgood_workspace_email_session` Cookie名称，旧local/32191 Cookie不会形成预设登录。邮件仅进入现有本地Mailpit（SMTP58046，查看http://127.0.0.1:58045），不向外发信。独立32191正常流程已停用。

## 启动与恢复

Node >=22.13.0，npm；本机记录v24.12.0/npm11.6.2。切换版本后用npm ci恢复锁定依赖，忽略旧node_modules/dist。普通UI开发用npm run dev:local，按Vite实际打印的URL访问；它不能替代有数据的32131原预览。

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
