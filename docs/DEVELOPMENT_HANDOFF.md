# 当前开发版本与跨窗口交接

- 日期：2026-09-14；任务GG-092；代码基线bb782c0（完整保留a73835f → GG081—091）。
- 当前项目入口：F:/goodgood；分支chore/GG-092-development-handoff。GG091 worktree也保留，当前运行的Web来自那里，不代表根目录仍是旧版本。
- 版本标记：goodgood-local-2026-09-14-gg092。此标记是本地检查点，不是线上发布，也未自动push/main合并。
- 新窗口先读AGENTS/CURRENT_STATE/WORKFLOW/IMPLEMENTATION_PLAN/BACKLOG，然后本页；新任务从GG-093分配。

## 先确认版本，避免退回历史

在F:/goodgood执行：

~~~powershell
git status --short --branch
git log -5 --oneline
git worktree list
git show --no-patch goodgood-local-2026-09-14-gg092
git merge-base --is-ancestor a73835f HEAD
git merge-base --is-ancestor bb782c0 HEAD
~~~

两个祖先检查必须退出0；HEAD必须包含上述检查点。main bab17fd不含当前累计功能，不从main新建本任务的后续分支，不bulk merge C6。若窗口显示GG024或旧任务，先检查工作目录和分支，保留未提交内容再进入本检查点。根目录旧GG024分支仍保留，未reset、未丢弃.codex用户设置。

新需求使用隔离分支/worktree，起点为本标记或已确认包含它的后续版本；不要在两个窗口同时编辑同一目录。

## 当前本地功能与确定的规则

- 保留原图片创作、模型/价格管理、企业/分销、档案、灵感等累计功能。Seedance有传输适配器及显式开启的本地preview，正式视频任务/积分结算/资产入库仍未接通，不能默认发真实请求。
- 积分后台用枚举下拉分类，充值登记须可信支付证据；站长默认运营看板，统计现金充值与并发，8项导航顺序见GG089。
- JCOIN总量1亿，用户回馈池50%；一期100万枚、每100有效充值消费积分2枚，正常约50万元消费分完；发完为止无期限。上海2026-09-18起算，初始未开启；不兑换、不锚定人民币、不向普通用户展示总池/批次额度。站长管理批次卡片/进度；创作池与后续批次另行实施。
- 私有问题反馈支持最多5张图、类型、文字、状态与回复；类型菜单始终向下。
- 每账户一个固定唯一随机6位数字邀请码，可无限邀请；新用户邮件码+活动邀请者邀请码均有效才开户，老active可只用邮件码登录。统一单一表单，邮箱可直接编辑，换邮箱作废旧挑战；新用户200欢迎积分仅一次。
- 邀请码在本人余额下方仅普通文本，没有整行点击或复制按钮。账户入口无焦点外框，键盘焦点用浅色背景。最后两处样式按用户要求未做自动/browser验证，不能宣称最新样式已全量验收。
- 精确规则/边界以GG081、GG083—091任务及ADR0087为准，专题文档中明确标号的旧规则属于历史，不优先于新决定。

## 正在运行的原预览（保留用户数据）

| 组件 | 当前入口 | 本次记录的进程/来源 |
| --- | --- | --- |
| Web | http://127.0.0.1:32141 | PID132，GG091/work/gg091-preview/start-review.mjs，代码de7d4a1 |
| mock Worker | http://127.0.0.1:32142/health/ready | PID30432，GG084/work/gg084-preview/start.mjs worker |
| mock provider | http://127.0.0.1:32143/health/ready | PID9048，GG084/work/gg084-preview/start.mjs mock-generation |
| PostgreSQL | loopback54449/goodgood | goodgood-gg052-postgres-1，最新0043 |
| Valkey | loopback56449/db0 | goodgood-gg052-valkey-1 |
| RustFS | loopback58049/58050 | goodgood-gg052-object-storage-1，桶goodgood-gg052-local |

PID是交接时的记录，不是以后可直接kill的授权目标。先用Get-NetTCPConnection/Get-CimInstance核验端口、命令行、目录；不要停陌生进程或重载用户带未提交草稿的浏览器标签。原预览账户/作品/反馈保留，禁止fixture/reset/自动重新初始化。

当前32141是local认证，供页面/已有账户检查；不是邮件注册测试入口。邮件双码通过独立Mailpit无Worker环境验收；GG091的32191专用UI/数据库/空桶/Redis12/Mailpit已清理，不把该地址当常驻服务。

## 启动与恢复

Node >=22.13.0，npm；本机记录v24.12.0/npm11.6.2。切换版本后用npm ci恢复锁定依赖，忽略旧node_modules/dist。普通UI开发用npm run dev:local，按Vite实际打印的URL访问；它不能替代有数据的32141原预览。

根目录已有忽略的.env.local-review，仅本机localhost mock/local配置。未提交、不打印、不复制到报告；没有生产凭据。它为当前命名Compose读取现有本地配置，不能替代其他机器的独立环境安装。若文件或容器缺失，按DEPLOYMENT的独立本地栈步骤配置，不运行旧数据转换，也不从生产导入。

原Web未运行或完成代码改动需要更新时，在F:/goodgood执行以下步骤；若32141占用，先核验并只停止已识别的原Web，保留Worker/provider/容器。构建是更新预览的准备，不代表验证通过：

~~~powershell
npm run build:local
New-Item -ItemType Directory -Force work | Out-Null
$env:GOODGOOD_REVISION = (git rev-parse HEAD).Trim()
Start-Process -FilePath node -ArgumentList '--env-file=.env.local-review','server/runtime/web.mjs' -WorkingDirectory 'F:/goodgood' -WindowStyle Hidden -RedirectStandardOutput 'F:/goodgood/work/local-review-out.log' -RedirectStandardError 'F:/goodgood/work/local-review-err.log' -PassThru
~~~

Web readiness为/api/health/ready；Worker/provider用表内/health/ready。仅Web替换无需Worker重启/迁移；不要运行db:migrate去重播已记录的迁移，新增迁移须按新任务范围保护原历史。若mock provider或Worker确实已停止，先核验没有重复实例，分别用同一.env.local-review启动server/runtime/mock-generation.mjs或worker.mjs，明确GOODGOOD_PROCESS对应角色；不借此启动真实provider。

## 验证与安全SQL测试

一般改代码先最小定向测试，稳定后一次npm run check:local；纯文档用：

~~~powershell
node --test tests/documentation-continuity.test.mjs tests/m8-production-release.test.mjs
git diff --check
~~~

最新完整check:local记录来自样式调整前a88bdc3：550项，524通过/26跳过。后续邀请码文本/焦点样式仅build成功，用户手验结果尚未记录。本次交接文档/发布证据一致性15/15、runner lint与三个SQL恢复命令各1/1通过，临时库已清理；不能扩写为整个最新版本已完整验收。旧M6 opt-in价格断言10/20问题见GG090，不作为本任务修复，不隐瞒也不向生产执行。

GG091、GG029、GG031数据库测试均可用以下仓库内命令；先确认容器是表内本地PG，勿改flags指向原goodgood或线上：

~~~powershell
node --env-file=.env.local-review scripts/run-checkpoint-sql.mjs gg091
node --env-file=.env.local-review scripts/run-checkpoint-sql.mjs gg029
node --env-file=.env.local-review scripts/run-checkpoint-sql.mjs gg031
~~~

runner只在loopback54449创建固定命名的新空库，拒绝已存在库，核验无peer，不启动Worker/Redis/S3/provider。tests使用捕获邮件和内存对象mock，自动跑最新0043全迁移，结束只删除刚创建且无peer的临时库。若被打断而遗留库，下次会拒绝重置，先人工检查目标/连接，不能改为原goodgood。其余opt-in测试按TESTING各自命名隔离契约；不能把26项跳过当26项已通过。

## 生产事实与下一步

线上仍65ceb168/迁移0019/原blue镜像，当前本地累计功能没有部署。2026-09-14已按授权删全部10测试账户（含站长）及29对象，用户/文件0；事前/事后加密备份和服务器审计保留。不要再执行清理或自动恢复测试站长；新站长初始化/生产登录发布必须另列明确范围。

下一步：新窗口从本检查点接新需求（GG-093起），先检查Git与端口，保持原数据；若要确认上次最后两处样式，询问用户手验结论或按新需求的验证范围处理。上线、真实发信、生图/视频付费调用均非本次交接授权。
