# GG-106 — 应用对象存储从 R2 切换到阿里云 OSS

- 状态：云端域名、证书、CORS、RAM 与私有探针签名读取已核对；有效签名 GET/HEAD 返回 OSS 200，匿名、伪造、过期等拒绝边界为 ESA 403。本地已移除临时诊断代码，待完整门禁和干净 ESA 版本发布；真实签名 PUT 与应用生产发布尚未开始，独立 R2 备份不动。
- 基线：GG-105 `60beb04`；分支 `codex/GG-106-oss-storage`。
- 决策：[ADR 0097](../decisions/0097-private-oss-object-storage.md) 已接受用于实现；采用 ESA 私有签名读、直连 OSS 签名上传，并保留旧 R2 对象。
- 范围：私有参考图、生成图片、视频素材及其他应用对象的直传、签名读取、校验、清理；模型收到的图片副本留待后续任务。

## 验收目标

1. OSS 私有 bucket 保持浏览器直传、图片页内预览、短时签名读取和所有者隔离。
2. 本地 RustFS 开发与隔离测试路径保持独立；生产和 staging 配置及预检明确选择 OSS。旧 R2 bucket 和素材保留；若旧素材继续可见，旧 R2 需继续提供受限读取。
3. 新上传和新生成写入 OSS；现有 R2 对象原件不迁移、不删除。新旧对象的读取路由必须可判定，不能只把单一全局 bucket 改成 OSS。
4. 如备份也纳入本次范围，独立迁移 Restic 仓库并验证恢复；不能因为应用素材切换而停掉生产备份 timer。

## 待用户提供或确认

- 已确认：私有 bucket `o1key-goodgood`、地域 `cn-guangzhou`（华南3广州）、默认 bucket 域名 `o1key-goodgood.oss-cn-guangzhou.aliyuncs.com`；新内容写 OSS，已有 R2 对象保留。
- 按最小范围暂定：旧素材继续在资产库/项目中可见，旧 R2 只承担历史对象读取与到期清理；独立数据库备份 R2 保持原状。
- 用户提供备案好的 ESA 域名 `oss-goodgood.o1key.cn`，DNS CNAME 指向 `oss-goodgood.o1key.cn.a1.initqq.com`，并希望保留其 OSS 回源流量计费方式。2026-09-24 用户报告证书和素材读取回源已配置；正常 HTTPS 请求现在可通过证书校验，根路径返回 OSS 403。根路径 403 不能证明真实对象的私有性。阿里云公告：2025-03-20 前已开通 OSS 服务的账号不受中国内地默认公网域名数据 API 限制；之后新开通账号的默认域名 PutObject 会返回 `PublicEndpointForbidden`。用户确认无论该账号资格如何，都选择独立直连 OSS 上传域名。ESA 原生 OSS 私有回源负责 GET/HEAD，须在全域路径上部署先于缓存的边缘鉴权，不能复用 OSS 预签名 GET。
- 浏览器网络请求中仍可见短时 ESA URL 和对象 key；不暴露 OSS AccessKey。旧 R2 对象继续按原方式签名读取。
- 仓库外的专用 RAM 凭据文件由谁放到部署主机；绝不在聊天、仓库或提交中提供 AccessKey 值。

## 已核对

- 应用使用 AWS S3 SDK 的 `HeadBucket`、`PutObject`、`GetObject`、`HeadObject`、`DeleteObject` 与浏览器签名 URL。当前 R2 `auto` 地域、路径式寻址和生产预检不适用于 OSS。
- 线上应用素材与 Restic 数据库备份是两套独立 R2 bucket/凭据；生产有真实用户对象和持续运行的备份 timer。
- 阿里云文档要求 OSS 的 S3 兼容请求使用虚拟主机式地址；默认 OSS 域名可能让图片强制下载，页内预览需绑定自定义域名。
- 阿里云说明 2025-03-20 起的新 OSS 用户访问中国内地 bucket 的数据 API，默认公网域名可能返回 `PublicEndpointForbidden`；绑定广州 bucket 的自定义域名需 ICP 备案。当前账号是否受限、域名是否已备案均未核实。
- 当前 API 把短时签名 R2 URL 返回浏览器；用户可在网络请求中看到对象域名和 key，但无法看到持久凭据。若需要完全隐藏对象地址，需改为服务端转发并评估 200 MiB 上传/下载流量。
- 2026-09-24 初次 DNS/HTTPS 核对：`oss-goodgood.o1key.cn` 解析到 ESA，当时 TLS 证书 CN 为 `oss.o1key.cn`，不匹配。用户随后报告已修复；再次正常 HTTPS HEAD 根路径成功完成 TLS 握手，返回 ESA/OSS 403。未用真实对象证明匿名访问边界。阿里云 ESA 私有 Bucket 回源只读，并会在回源请求添加 Authorization；OSS URL 签名不能再叠加。ESA 旁路边缘函数可先鉴权再查缓存、回源。OSS 原生回源流量按 CDN 回源类别计费；S3 兼容回源会失去这类优惠。
- 2026-09-24 用户在 ESA 控制台创建 `goodgood-asset-read-guard`，以 `async bypass()` 返回 `ResponseBypass(false, { status: 403 })`，并把版本 `179022159712771609` 以 100% 发布到函数生产环境。后续正式令牌校验需替换该临时拒绝逻辑并部署相应 GoodGood 后端签名。
- 随后用户在 ESA 控制台创建并启用 `goodgood-asset-read-guard-route`，简单路由匹配 `oss-goodgood.o1key.cn/*`、旁路模式开启。控制台表单和列表均不显示 `Fallback`；用户调用 ESA `ListRoutineRoutes` 只读接口返回 `Bypass=on`、`Fallback=off`、`RouteEnable=on`，规则为素材域名所有路径。用户尚未报告真实素材是否已入 OSS；未核对实际对象访问。
- OSS 控制台截图显示 `upload-goodgood.o1key.cn` 在 `o1key-goodgood` 的域名管理中已绑定、域名状态“已生效”、阿里云 CDN 加速“未配置”、HTTPS 证书“未上传”。下一步在 OSS 证书托管中选择匹配该域名的证书；尚未独立核对 DNS CNAME 或签名上传。
- 用户随后在数字证书管理服务签发覆盖 `upload-goodgood.o1key.cn` 的 DV 单域名证书，初次证书列表中“已部署”为 `--`；证书已签发时 HTTPS 尚未就绪。
- 用户后续截图显示 OSS 域名管理的 HTTPS 证书变为“证书详情”，证书 `cert-d1p90` 的匹配域名包含 `upload-goodgood.o1key.cn`，域名状态为“已生效”。尚未独立核对公网 TLS 握手和 DNS CNAME。
- 2026-09-24 用户在 OSS 控制台保存跨域规则：来源 `https://goodgood.o1key.com`，方法仅 `PUT`，允许请求头 `content-type`，暴露 `ETag`，缓存 600 秒；创建表单中已勾选 `Vary: Origin`。OSS 控制台提示规则最多约 15 分钟生效。此规则匹配当前浏览器直传代码的 PUT 与 Content-Type；尚未用真实预检请求验证。
- 2026-09-24 用户在 RAM 控制台创建自定义策略 `GoodGoodOssObjects`，截图显示版本 `v1`、策略类型为自定义策略、OSS 服务权限摘要。尚未从截图核对 JSON 源代码或授权对象。拟授予的动作是 bucket 的 `oss:HeadBucket`，以及 `o1key-goodgood/*` 的 `oss:PutObject`、`oss:GetObject`、`oss:DeleteObject`。
- 2026-09-24 用户创建 RAM 程序用户 `goodgood-oss-app`，创建结果显示 AccessKey 已生成、控制台访问未设置。截图仅显示密钥掩码；用户是否已点击“保存结果”未确认。随后授权结果显示 `GoodGoodOssObjects` 已附加；重复授权返回 `EntityAlreadyExists.User.Policy` 警告，无需再次添加。
- 2026-09-24 独立只读探测：`upload-goodgood.o1key.cn` DNS CNAME 指向 `o1key-goodgood.cn-guangzhou.taihangztn.cn`；普通 `curl -I` 完成 HTTPS 证书校验，OSS 对匿名 Bucket HEAD 返回 403。以 `Origin: https://goodgood.o1key.com`、预检方法 `PUT`、请求头 `content-type` 发起 OPTIONS，OSS 返回 200、`Access-Control-Allow-Origin` 为该页面来源、允许 PUT 与 content-type、暴露 ETag、Max-Age 600。尚未发起带签名的真实 PUT，也未用真实对象验证 ESA 匿名拦截。
- 2026-09-24 用户报告已点击 RAM 创建结果页的“保存结果”。用户通过 OSS 控制台上传对象 `o1key_00054_.png`（文件 ACL 显示“私有”）；这是用户提供的图片，只用于授权边界探测，不读取内容、不删除。对该真实对象路径的匿名 `GET` 和 `HEAD`：ESA 域名 `oss-goodgood.o1key.cn` 均返回 403（`Server: ESA`），直连 OSS 上传域名 `upload-goodgood.o1key.cn` 均返回 403（`Server: AliyunOSS`）。临时 ESA 全拒绝生效；正式签名放行仍未实现。
- `npm run check:local`：560 通过、26 隔离跳过、0 失败；OSS 签名与双存储定向测试 5/5、生产预检 8/8、文档 8/8。`git diff --check` 通过。正式云端签名 PUT/GET、ESA 正向读取、单槽发布尚未验证。详见 [切换清单](../operations/gg106-oss-cutover.md)。凭据不进入聊天或仓库；旧 R2 对象不迁移。
- 用户在私有 bucket 新建受控探测对象 `oss/gg106-probe/Probe.txt`；2026-09-24 匿名 GET 经 ESA 与直连 OSS 上传域名均为 403。共享读取密钥已在本机仓库外生成并限定文件 ACL；用户报告已在 ESA 函数**生产环境**添加加密变量 `GOODGOOD_ASSET_READ_SECRET`，尚未随新版本发布；生产主机密钥文件也未配置。下一步替换函数代码并生成绑定生产环境变量的版本，发布前复核版本和路由。
- 2026-09-24 截图显示新函数版本 `1790236138649074035` 已生成，但尚未发布；生产环境仍为全拒绝版本 `179022159712771609` 100%，测试环境仍为更早版本。版本详情的开头和结尾 `export default guard;` 与仓库签名守卫源码一致；下一步发布新版本至生产环境并立即验证匿名拒绝和受控对象签名读取。
- 2026-09-24 16:02 截图确认版本 `1790236138649074035` 已在 ESA 函数生产环境发布 100%；应用生产仍为 GG-098。以仓库 `signOssAssetRead` 和本机仓库外共享密钥对 `oss/gg106-probe/Probe.txt` 生成有效短时 URL，匿名、正确签名和伪造签名 GET 都返回 403。响应由 ESA 返回，未见 `x-oss-request-id`；模拟浏览器 User-Agent 仍为 403。尚无法确认函数实际执行、加密变量是否绑定到该版本、WAF 是否拦截，或原生 OSS 私有回源是否拒绝。站长已开启函数即时日志；下一步检查这三次探测的函数版本、执行错误和状态。未将密钥或完整签名 URL 打印、入库或发给站长。
- 随后站长提供正确签名请求的 ESA 函数即时日志：`CodeVersion=1790236138649074035`、`ErrorCode=0`、`ResponseStatus=403`、无子请求。可确定函数正常运行但在回源前拒绝，原因仍可能是版本未绑定变量、签名值不一致或 WebCrypto 异常。`infra/esa/goodgood-asset-read-guard.mjs` 已添加仅对精确探测路径生效的临时 `console.alert()` 固定原因代号；不会记录密钥、签名或 URL。定向测试 5/5、`npm run check:local` 560 通过/26 隔离跳过/0 失败。下一步把诊断版生成绑定生产变量快照的新 ESA 版本并发布，再读取 `ConsoleLog`/`Logs`；定位后移除诊断代码并发布干净版本。
- 站长报告已发布诊断版并开启即时日志；一条提供的记录显示 `CodeVersion=1790238050203405225`、`ErrorCode=0`、`ResponseStatus=403`、`Logs=[]`，但没有提供该行的请求路径，不能确认是正确签名行。2026-09-24 16:22:16 +08:00 本机仅重发一条正确签名 GET，外部仍为 ESA 403；下一步请站长在该时间定位单条函数日志，核对 `ClientRequestHost`、代码版本、`Logs`/`ConsoleLog` 和响应状态，避免复制签名查询串。
- 站长重新开启监测后，本机于 16:24:55 +08:00 单独重发正确签名 GET；站长回传相同时间戳的日志：`CodeVersion=1790238050203405225`、`ErrorCode=0`、`ResponseStatus=403`、`Logs=[]`，没有 `ConsoleLog` 字段。诊断函数可能在精确探测路径记录前就返回（如实际 request URL host/path 不符合预期），也可能已发布版本缺少诊断代码或日志接口未写出。下一步先检查**已发布版本**代码详情是否含 `PROBE_PATH` 和 `console.alert`，再决定是否需要更靠前的安全诊断。
- 站长核对已发布版本源码，`PROBE_PATH` 与 `console.alert` 均存在。为区分入口提前拒绝与日志接口问题，本地源码在 `try` 外加固定 `GG106_READ_ENTRY`，解析 URL 后只记录 host、`/oss/` 前缀和精确探测路径的布尔匹配值；不记录任何实际 URL、查询参数、签名或密钥。若入口 `console.alert` 不可用，执行错误将显现而不会错误放行。定向 5/5、完整 `npm run check:local` 560 通过/26 隔离跳过/0 失败。待生成并发布新 ESA 版本，探测后移除临时诊断。
- 站长随后发布入口诊断版 `1790238696829208371`。16:32:03 +08:00 的即时日志显示该版本执行无错误、返回 403，`Logs=[]`，固定入口 `console.alert` 仍未出现。用本机存储密钥的原值、追加 LF/CRLF/空格和前置 BOM 生成的受控签名均为 403；不能仅凭此认定变量值匹配。新的本地候选仅对带 `x-gg106-diag` 请求头的受控探测返回分支状态码：`ping` 在入口返回 401；`stage` 签名不匹配返回 409、变量缺失返回 424、异常返回 428，其他校验失败也各有固定 4xx。正常失败请求仍返回 403，所有失败分支仍拒绝。定向测试 5/5、`npm run check:local` 560 通过/26 隔离跳过/0 失败，`git diff --check` 通过；待发布后以一条 ping、一条正确签名 stage 请求定位，再移除临时诊断代码。应用生产仍 GG-098，OSS 正向读取未通过。
- 站长发布状态码诊断版并开启监测后，本机发一条 `ping` 和一条以原始本机密钥正确签名的 `stage` GET；ESA 分别返回 `401`、`424`。新版本确实生效，且代码在读取 `env.GOODGOOD_ASSET_READ_SECRET` 时判定它并非长度至少 32 的字符串；尚未执行 HMAC 比较或 OSS 回源。下一步核查 ESA 函数「基本信息→函数变量→生产环境」中的精确键名、加密变量值和新版本绑定的生产变量快照，然后重新生成/发布版本并重发受控探测。不能由 424 判断变量不存在还是值为空/过短；不在聊天或日志展示密钥。
- 站长截图确认在函数「基本信息→函数变量→生产环境」中存在精确键 `GOODGOOD_ASSET_READ_SECRET` 且标为加密；编辑对话框不回显原值，单凭空输入框不能证明值未设置。站长报告重新输入并生成、发布新版本后，本机再发 `ping` 和有效签名 `stage` GET，仍分别得到 ESA 401/424。下一步用这两条请求的 `CodeVersion` 核对是否命中新版本，再核对该版本是否绑定生产变量快照；不要继续盲目重发或更改密钥。
- 站长提供这两条即时日志：入口 401 和有效签名 424 均命中 `CodeVersion=1790239765872852233`。因此新版已经接流量；问题缩小到该版本读取的生产变量值不可用（版本未绑定生产变量快照、值为空/过短，或运行时读取方式与文档不符）。下一步检查此版本的变量快照绑定信息或生成版本对话框，不要求再改密钥；必要时添加只返回变量类型/长度分类状态码的诊断，绝不回传值。
- 站长打开「生成版本」对话框截图，证实「函数变量」下拉框当前为 `不使用`，选项另有 `生产环境` 和 `测试环境`。这解释了新版本的 424：先前生成时未绑定变量快照。下一步在此下拉框选 `生产环境`，生成新版本并发布至函数生产环境 100%，然后重发受控 `ping`/有效签名 `stage` 探测。无需修改代码或再次更换本机/ESA 密钥；发布前截图和提交中不得包含密钥。
- 站长选 `生产环境` 生成并发布新版本后，本机受控 `ping` 返回 401，有效签名 `stage` 返回 404；用常规匿名/有效签名/伪造签名 GET 复核，分别为 ESA 403、OSS 404、ESA 403。有效签名响应含 `x-oss-request-id`、`x-oss-cdn-auth`，XML 明确是 bucket `o1key-goodgood` 对精确 key `oss/gg106-probe/Probe.txt` 的 `NoSuchKey`。这证明加密变量已被函数读取、HMAC 校验放行、请求到达原生 OSS 私有回源；但还没有读到对象内容，不能把本次当作正向读取成功。下一步在 OSS 控制台确认对象实际位于该 bucket 且大小写完全一致，或在该精确 key 上传一个可丢弃文本探针，然后重测。现有用户素材不读取、不删除。
- 站长确认探针文件名首字母误用小写 `p`，已修正为精确 `Probe.txt`。2026-09-24 本机重发匿名/有效签名/伪造签名 GET：ESA 403、OSS 200（`text/plain`，3 字节，内容 `123`）、ESA 403。有效签名 HEAD 200，过期令牌、附加未知查询参数和非 `oss/` 路径均为 ESA 403。正向读取和上述拒绝边界已在云端验证。随后本地移除临时 `console.alert` 与 `x-gg106-diag` 分支状态码，恢复失败统一 403；干净守卫源码位于 `infra/esa/goodgood-asset-read-guard.mjs`。定向测试 5/5、完整 `npm run check:local` 560 通过/26 隔离跳过/0 失败。下一步把干净版生成**绑定生产环境函数变量**的新 ESA 版本并发布，再重复云端正反向探测。应用生产仍 GG-098；带签名的真实 OSS PUT 和应用切换尚未执行。
- 站长报告已把干净守卫源码生成绑定生产变量的新版本并发布。重新探测：有效签名 GET 200 且内容 `123`、有效 HEAD 200；匿名、伪造签名、过期、额外查询参数、非 `oss/` 路径均为 ESA 403。此前的 `x-gg106-diag: ping` 携带有效签名会得到 401，干净版现在得到 200，证明临时诊断分支已退出线上。下一步以专用 RAM 凭据对全新可丢弃 `oss/gg106-probe/` key 生成直连 CNAME 的签名 PUT，验证写入、私有 ESA 读取和精确对象清理；凭据值不能进入聊天、日志或仓库。应用生产仍 GG-098。
- 本机仓库外准备 `C:\Users\Admin\AppData\Local\GoodGood\probe-oss-signed-put.mjs`，从同目录 `secrets/oss-access-key-id`、`secrets/oss-secret-access-key` 读取专用 RAM 凭据（当前两个文件尚不存在），沿应用 `signReferenceUpload` 路径签名全新随机 `oss/gg106-probe/write-*.txt` 的 PUT，并核对私有 ESA 读回与匿名 403；只输出状态、OSS 请求 ID 和随机探针 key，不输出签名 URL 或密钥。已通过 `node --check`，尚未执行真实 PUT。站长保存凭据的位置待回复，不能猜测或重新生成 AccessKey。
- 站长提供声称的 AccessKey CSV 路径 `C:\Users\Admin\Downloads\goodgood-oss-app.csv`；本机 `Get-Item` 明确返回不存在，Downloads 无 CSV，同名文件也未在常见 Desktop/Documents/OneDrive 路径找到。未读取任何 AccessKey、未发起 PUT。已请站长用资源管理器「复制文件地址」提供实际绝对路径，或把文件放到上述精确路径；不要通过聊天上传 CSV 或密钥值。
- 站长要求重试后，本机已可读取该 CSV：一条 `goodgood-oss-app` 记录，AccessKey ID/Secret 字段非空；未输出字段值。仓库外探针改为直接在内存中解析 CSV，无需复制额外密钥文件。以专用 RAM 凭据和应用 `signReferenceUpload` 对随机新键 `oss/gg106-probe/write-e33944a1-3915-453b-b374-ce45394ca99f.txt` 经 `upload-goodgood.o1key.cn` 发起真实签名 PUT：200。随后 ESA 有效签名 GET 200 且内容完全一致；ESA 匿名 GET 403；直连上传域名匿名 HEAD 403（OSS `AccessDenied`）。随机探针已按精确键删除，OSS 204，随后签名 ESA GET 404；现有素材均未修改。生产主机密钥文件与应用切换仍未完成。原开发分支含 GG-101—105 未发布应用变更，发布前须核对并隔离范围。
- 独立候选工作树 `F:\goodgood-gg106-release` 建于 GG-100 单槽基线 `de699e1`，仅移植 GG-106 的应用、配置、ESA 和验证文件；GG-104 才有的视频素材模块未带入。OSS/预检定向测试 13/13、文档连续性 8/8、`npm run check:local` 542 通过/26 隔离跳过/0 失败。候选尚未安装生产密钥、构建发布镜像或部署；不得把当前累积的 GG-101—105 应用代码一并发布。
