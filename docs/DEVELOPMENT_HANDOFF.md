# 当前开发版本与跨窗口交接

- 日期：2026-09-15；任务GG-093；本地分支chore/GG-093-docker-cleanup-build-handoff，最终提交后标签为goodgood-local-2026-09-15-gg093。
- 当前项目入口：F:/goodgood；累计代码包含a73835f、GG081—091与GG092交接。`.codex/`是用户本地设置，保留不提交；生产未部署。
- 新窗口先读AGENTS/CURRENT_STATE/WORKFLOW/IMPLEMENTATION_PLAN/BACKLOG，然后本页；新任务从GG-094分配。不要从main或旧GG024工作树开始。

## 先确认版本，避免退回历史

在F:/goodgood执行：

~~~powershell
git status --short --branch
git log -5 --oneline
git worktree list
git show --no-patch goodgood-local-2026-09-15-gg093
git merge-base --is-ancestor a73835f HEAD
git merge-base --is-ancestor bb782c0 HEAD
~~~

两个祖先检查必须退出0；HEAD必须包含上述检查点。main bab17fd不含当前累计功能，不从main新建后续分支，不bulk merge C6。若窗口显示GG024或旧任务，先检查工作目录和分支，保留未提交内容再进入本检查点。根目录旧GG024分支仍保留，未reset、未丢弃.codex用户设置。

新需求使用隔离分支/worktree，起点为本标记或已确认包含它的后续版本；不要在两个窗口同时编辑同一目录。

## 当前本地功能与确定的规则

- 保留原图片创作、模型/价格管理、企业/分销、档案、灵感等累计功能。Seedance有传输适配器及显式开启的本地preview，正式视频任务/积分结算/资产入库仍未接通，不能默认发真实请求。
- 积分后台用枚举下拉分类，充值登记须可信支付证据；站长默认运营看板，统计现金充值与并发，8项导航顺序见GG089。
- JCOIN总量1亿，用户回馈池50%；一期100万枚、每100有效充值消费积分2枚，正常约50万元消费分完；发完为止无期限。上海2026-09-18起算，初始未开启；不兑换、不锚定人民币、不向普通用户展示总池/批次额度。站长管理批次卡片/进度；创作池与后续批次另行实施。
- 私有问题反馈支持最多5张图、类型、文字、状态与回复；类型菜单始终向下。
- 每账户一个固定唯一随机6位数字邀请码，可无限邀请；新用户邮件码+活动邀请者邀请码均有效才开户，老active可只用邮件码登录。统一单一表单，邮箱可直接编辑，换邮箱作废旧挑战；新用户200欢迎积分仅一次。
- 邀请码在本人余额下方仅普通文本，没有整行点击或复制按钮。账户入口无焦点外框，键盘焦点用浅色背景。最后两处样式按用户要求未做自动/browser验证，不能宣称最新样式已全量验收。
- 精确规则/边界以GG081、GG083—091任务及ADR0087为准，专题文档中明确标号的旧规则属于历史，不优先于新决定。

## 当前本地预览与依赖（保留用户数据）

| 组件 | 当前入口 | 本次记录的进程/来源 |
| --- | --- | --- |
| 工作区Web | http://127.0.0.1:32131 | `node scripts/local-checkpoint.mjs start workspace`；端口实时核验PID，代码由version接口证明 |
| 邮箱登录检查Web | http://127.0.0.1:32191/create | `node scripts/local-checkpoint.mjs start login`；独立cookie，代码由version接口证明 |
| mock Worker | http://127.0.0.1:32142/health/ready | `node scripts/local-checkpoint.mjs start worker`；mock-only |
| mock provider | http://127.0.0.1:32143/health/ready | `node scripts/local-checkpoint.mjs start provider`；mock-only |
| PostgreSQL | loopback54449/goodgood | goodgood-gg052-postgres-1，最新0043 |
| Valkey | loopback56449/db0 | goodgood-gg052-valkey-1 |
| RustFS | loopback58049/58050 | goodgood-gg052-object-storage-1，桶goodgood-gg052-local |

本次Docker清理删除37个确认废弃容器、9个旧GoodGood应用镜像、5个空网络和无引用的postgres:16-alpine/node:24.12.0-bookworm-slim，构建缓存回收21.92GB。保留goodgood-gg052三个依赖、gg044 Mailpit、new-api/redis/postgres及全部34个卷；清理后共7个容器，旧GoodGood端口3010/3030/32029/32133无监听。没有删除数据库或素材卷。

## 构建来源与启动保护

版本构建必须在运行时源码已提交时执行；文档、测试和`.codex`改动不阻挡来源检查：

~~~powershell
npm ci
npm run build:checkpoint
npm run verify:checkpoint
node scripts/local-checkpoint.mjs start workspace
~~~

`build:checkpoint`构建`dist/client`与`dist/server`，写入忽略的`dist/goodgood-build.json`，绑定当前Git revision、源码指纹、产物指纹和文件数。`verify:checkpoint`会拒绝缺失、过期、源码变化或产物篡改；`start`仅接受loopback PG54449/Valkey56449/RustFS58049、Mailpit和mock provider配置，并在启动前验证同一指纹。工作区/登录分别使用32131/32191；worker/provider使用32142/32143健康端口。

启动后检查：

~~~powershell
Invoke-RestMethod http://127.0.0.1:32131/api/health/version
Invoke-RestMethod http://127.0.0.1:32191/api/health/version
Invoke-RestMethod http://127.0.0.1:32142/health/ready
Invoke-RestMethod http://127.0.0.1:32143/health/ready
~~~

两个Web响应的`build.verified`必须为`true`且revision等于`git rev-parse HEAD`；仅有`/api/health/ready`返回200不能证明页面来自当前提交。构建产物`dist/`被忽略，不提交到Git；旧Docker `goodgood:gg027-local`已删除，不能再作为当前版本依据。

PID是交接时的记录，不是以后可直接kill的授权目标。先用Get-NetTCPConnection/Get-CimInstance核验端口、命令行、目录；不要停陌生进程或重载用户带未提交草稿的浏览器标签。原预览账户/作品/反馈保留，禁止fixture/reset/自动重新初始化。

当前32131保留local认证与原用户数据。32191是本次新启的email_otp登录检查Web，共享原本地goodgood，但独立cookie/issuer；未写fixtures或注册模拟用户，用户可手验。邮件仅进入现有本地Mailpit（SMTP58046，查看http://127.0.0.1:58045），不向外发信。此前GG091命名独立UI测试资源已清理；本次32191不是恢复旧测试数据库。

## 启动与恢复

Node >=22.13.0，npm；本机记录v24.12.0/npm11.6.2。切换版本后用npm ci恢复锁定依赖，忽略旧node_modules/dist。普通UI开发用npm run dev:local，按Vite实际打印的URL访问；它不能替代有数据的32131原预览。

根目录已有忽略的.env.local-review，仅本机localhost mock/local配置。未提交、不打印、不复制到报告；没有生产凭据。它为当前命名Compose读取现有本地配置，不能替代其他机器的独立环境安装。若文件或容器缺失，按DEPLOYMENT的独立本地栈步骤配置，不运行旧数据转换，也不从生产导入。

当前工作区入口为32131。完成提交后使用上方`build:checkpoint`与`start`命令；若端口占用，先核验命令行和工作目录，只停止已识别的GoodGood进程，保留Worker/provider/容器。

Web readiness为/api/health/ready；Worker/provider用表内/health/ready。仅Web替换无需迁移；不要运行db:migrate去重播已记录的迁移，新增迁移须按新任务范围保护原历史。若mock provider或Worker确实已停止，先核验没有重复实例，再用`node scripts/local-checkpoint.mjs start provider|worker`恢复；不借此启动真实provider。

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

线上仍65ceb168/迁移0019/原blue镜像，当前本地累计功能没有部署。2026-09-14已按授权删全部10测试账户（含站长）及29对象，用户/文件0；事前/事后加密备份和服务器审计保留。不要再执行清理或自动恢复测试站长；新站长初始化/生产登录发布必须另列明确范围。

当前GG094从GG093标签基线修正登录/注册邀请码显示：普通登录不展示邀请码，服务端确认新用户或待开通账户时才进入注册态。新窗口从GG094提交继续，先执行`verify:checkpoint`和version/端口核验，保持原数据；上线、真实发信、生图/视频付费调用均非本次交接授权。

GG094完成构建后须重新记录工作区/登录Web的version接口`build.verified=true`、Worker/provider readiness及Mailpit 200；登录初始态可自动只读检查，新用户注册态仍由用户自行检查，尚未记录页面验收通过。登录入口为 `http://127.0.0.1:32191/create`，邮件查看入口为 `http://127.0.0.1:58045`。忽略.env.login-review保存本机Mailpit模式，不能将其配置用于生产。

## 提交正确但打开旧页面的排查

- f68ba81源码包含视频；Git提交不等于Docker镜像或dist构建产物。GOODGOOD_REVISION是启动时填入的字符串，单看它不能证明页面构建来源。
- 清理前只读核验发现goodgood-gg025-web-1使用goodgood:gg027-local，在127.0.0.1:3030；本任务已按授权移除该容器及同组历史Web/镜像。3000另有new-api，不能猜默认端口属于GoodGood；new-api及其他无关项目仍保留。
- Node入口server/runtime/web.mjs从process.cwd()/dist加载页面，startProdServer只检查产物是否存在，不核验它对应Git提交；切换版本须从正确目录重建，再重启已识别的Web。旧进程也不会随git checkout更新页面模块。
- Docker服务须检查实际容器镜像ID、构建revision标签及端口映射；仅checkout或compose up启动现有容器不会自动把旧镜像换成当前源码。不得把旧gg027-local标签当本检查点，也不得重建会触碰用户数据的陌生栈。
- 新窗口打开页面前核对五项：Git提交/目录、version接口实际构建来源、监听进程/镜像、浏览器精确URL、页面关键功能（图片/视频及问题反馈等）。健康200只证明服务可用；`start:checkpoint`现在会先拒绝缺失或不匹配的构建来源。
- 本次缺少另一窗口的URL/启动记录，旧镜像/旧dist/旧端口是有实现依据的候选原因，不把候选写成该事件已证实的根因。
