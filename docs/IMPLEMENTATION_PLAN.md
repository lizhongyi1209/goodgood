# Production implementation plan

- Last synchronized: 2026-09-24
- Current phase: GG-114 把已验证的 GG-113 私有缩略图处理与 URL 收拢为共用接口；本地代码/门禁及 5173/32131 HTTP 通过。生产应用仍为 GG-098。
- Current objective: 为后续自由画布复用既有私有预览与原图入口；资源接口先检查所有者与可见性，再调用共用缩略图方法。
- Previous objective: GG-107 创作发送箭头与模型 SVG 预览修复，待浏览器复核；GG-105 大文件上传仍待人工验收。

## Current checkpoint

- Task [GG-098](tasks/GG-098-manual-grant-ceiling.md)：**已部署**。
  生产身份 `7888554` / 镜像 `sha256:7deeab8c…3270` / 迁移 `0044`。
  完整记录见 [发布记录](releases/2026-09-21-gg098-manual-grant-ceiling.md)。
- 这是**首次带迁移的热修发布**，属于旧 blue/green 流程的历史记录；切换后的公网 200、
  session 401、队列/活动任务/冻结均 0。未来发布不再复用该流程。
- 真实生图冒烟（站长 2026-09-21 单独授权）：真实邮箱验证码登录 →Nano Banana 2 / 1K /
  1:1 / 1 张成功，reserve→settle 各 1 次、冻结归零，私有读取自有 200 / 未认证 401。
  **跨账户拒绝未实测**（站长指示不再测试），该项不得写成 `pass`；本次未跑完整 alpha 门禁。
- **发布中发现的主机隐患已修复**：主机 `compose.production.yaml` 是旧版本（web 只绑 4 个
  secret，缺 email OTP/SMTP），导致旧发布候选首次启动崩溃。已用本次 revision 覆盖，
  旧版留 `.pre-gg098-backup`。未来原地替换前必须核对主机 Compose 与候选 revision 一致。
- GG-097 [任务卡](tasks/GG-097-production-release-0019-to-0043.md)：累计功能发布，已被本次取代；
  其门禁为五项 `pass` + `controlled-alpha-operations` `fail`（站长授权带缺口开站）。
- Task [GG-099](tasks/GG-099-single-slot-compose-release.md)：**本地已完成**。
  ADR 0091 已接受；仓库已从 blue/green 发布切换到固定 `goodgood-production` Compose
  项目；独立 active-upstream、槽位 env 和双上游示例已删除。定向测试 35/35，
  `npm run check:local` 537 通过/26 隔离跳过/0 失败。未执行生产主机迁移。
- Task [GG-100](tasks/GG-100-production-single-slot-host-cleanup.md)：**生产执行完成**。
  恢复点 `71e758c4`；固定项目 Web/Worker healthy、restarts 0，公网 200/session 401；
  旧 4 容器、2 网络、槽位/动态 upstream 与 14 个无引用旧镜像已清理，生产数据卷完整。
- Task [GG-101](tasks/GG-101-real-online-local-development.md)：**本地实现完成，未部署**。
  ADR 0092 已接受；默认 Compose 与 checkpoint Web/Worker 强制真实 O1Key，专用开发密钥
  存于仓库外且缺失失败；mock 只保留给 `mock-tests` 隔离自动化测试，不连接真实 Worker。
  Compose 双配置解析通过；门禁 566 项、540 通过/26 隔离跳过/0 失败；未执行真实生成。
- Task [GG-102](tasks/GG-102-real-video-development.md)：**本地实现与验证完成，未部署**。
  ADR 0093 已接受；本地 checkpoint/Compose 默认为视频使用同一仓库外 O1Key 开发凭据，
  Vite serve 只在本地运行时注入。视频仍为临时文生视频预览；正式任务/计费/资产未接。
  `check:local` 542 通过/26 隔离跳过/0 失败；checkpoint 来源验证、32131/32142
  就绪、视频默认可用和真实单张图片生成成功；未提交付费视频任务。
- Task [GG-103](tasks/GG-103-reference-input-optimization.md)：**本地实现与验证完成；未部署**。
  ADR 0094 已接受；本地 blob 立即预览、两张并发直传、可重试与完成状态查询；
  Worker 保留原图并生成单张不超过 10,000,000 字节、总量不超过 32,000,000
  字节的输入副本。完整门禁 575 项：549 通过/26 隔离跳过/0 失败；
  未发起真实付费生图。检查点构建/来源验证、32131 Web 版本和
  32142 真实 O1Key Worker 健康检查通过；本地活动生成任务为 0。
- Task [GG-104](tasks/GG-104-media-dropzone-layout.md)：**本地实现/门禁/运行预览完成；未部署**。
  ADR 0095 已接受；图片/视频拖入即时预览、上传前 20/200 MiB 校验、可见失败原因、托盘与模式位置对调；0045 新增私有视频素材库并供视频选择器复用。
  `check:local` 581 项：555 通过/26 隔离跳过/0 失败；视频上传/校验/复用/所有者隔离单元路径通过。本地数据库仅前进 0044/0045 至 45 条，32131 Web 检查点来源/页面和 32142 Worker 健康通过；浏览器检查两种布局。未发起付费生成，未做真实文件上传端到端测试。
- Task [GG-105](tasks/GG-105-media-upload-200mb.md)：**本地代码已运行；用户手动验收待执行，未部署**。
  ADR 0096 已接受：私有参考原图与视频素材上限 200 MiB，签名上传 30 分钟；模型输入单张 10 MB、总量 32 MB 保持。用户要求不执行自动测试；检查点构建/来源及 Web/Worker 健康已核对，真实大文件上传未测。GG-104 门禁结果不得算作 GG-105 验证。
- Task [GG-107](tasks/GG-107-composer-send-arrow.md)：**按钮比例已获用户确认；模型图标 SVG 预览 400 已修复并构建，待刷新复核，未部署**。ADR 0098 接受向上箭头替换飞鸿发送符号；图片和视频创作按钮共享外观。GG-106 OSS 决策与文档在另一独立工作树继续，未并入本分支。
- Task [GG-110](tasks/GG-110-functional-reference-upload-preview.md)：**本地代码、门禁、检查点运行与真实 JPEG 上传通过，未部署**。5173 旧 React 依赖请求已兼容；登录后 API 改接本地 Node Web，避免 Vite Worker PostgreSQL 跨请求复用；模型 SVG 使用稳定公共路径。`check:local` 555 通过/26 隔离跳过/0 失败。32131 已运行已验证 `35b1f12` 检查点；真实 JPEG 登记 201、完成校验 200、数据库 `ready / accepted`。
- Task [GG-111](tasks/GG-111-cloud-reference-upload-development.md)：基于 GG-110 `65fa299`，独立工作树 `F:/goodgood-worktrees/GG-111`。站长明确选择复用生产 OSS 桶与现有 RAM 密钥；ADR 0099 将本地写入限制到 `local-dev/references/`，旧本地素材走 RustFS。最终 `check:local` 558 通过/26 隔离跳过/0 失败。5173 与线上 OSS 来源的 CORS 预检均 200；临时前缀对象签名 PUT/GET/DELETE 为 200/200/204。32131 运行从当前工作树 HEAD 构建的已验证检查点；真实 PNG 上传 `ready / accepted`、OSS HEAD 200。5173 Vite 也来自 GG-111，站长切换后再次刷新确认图片仍在、页面正常；未部署应用代码。
- Task [GG-112](tasks/GG-112-real-email-local-login.md)：基于 GG-111 `6067cda`，独立工作树 `F:/goodgood-worktrees/GG-112`。站长选择现有发信账号给本地真实验证码投递；ADR 0100 记录对 ADR 0092 凭据隔离的限域例外。新工作区启动选项只加载仓库外 SMTP 配置和独立密码文件，远程 SMTP 需 TLS/账号预检；本地身份与数据库保持隔离。`check:local` 559 通过/26 隔离跳过/0 失败，真实 SMTP 认证预检 5/5 通过。32131 已运行 GG-112 已验证 Web，5173 Vite 也来自 GG-112；站长确认真实收信、登录及刷新会话正常。生产应用未变。
- Task [GG-113](tasks/GG-113-private-image-previews.md)：基于 GG-112 `85eea1a` 的隔离分支。站长选定资产库所有卡片与选择器；ADR 0101 确定 OSS 签名实时处理及 RustFS 流式 WebP 缩略图，详情/下载继续原图，列表不签发原图地址。`check:local` 563/26/0；真实 OSS 对象只读转换 2,380,052 → 30,556 字节、RustFS 生成图 684,367 → 27,844 字节。首次 GG-113 检查点 `ea8445f` 的 5173/32131 页面/就绪 200、未登录私有图片 401、代理来源核对通过，未部署。
- Task [GG-114](tasks/GG-114-reusable-image-delivery.md)：基于 GG-113 `1ecbc1c`；共用 `privateImageUrls` 与 `readPrivateImagePreview`，资产/参考图继续分别先做权限检查，固定 512 px WebP 规格与详情原图语义不变。`check:local` 590 项：564 通过/26 隔离跳过/0 失败；首个检查点 `4e55a36` 的 5173/32131 页面/就绪/版本 200、未登录私有预览 401，未部署。
- 线上入口为 `goodgood.o1key.com`；`staging-goodgood.o1key.com` 仅保留名称，不是测试入口。
- 生产数据（2026-09-21 核对）：users 28、assets 166、references 141 ready、
  generation_jobs 201（151 成功 / 50 失败）；运营手动登记充值 4 笔共 15100 积分。
- **2026-09-17 首次生产恢复演练通过**：快照 `ce191630`、59 表 / 2403 行 / 43 迁移；
  维护窗口约 66 秒。「备份 timer disabled、无自动备份」的旧结论**已更正为错误**。
- 独立缺口（已记录未处理）：**仅剩无告警通道**。
- Next action: 保持 GG-114 的 5173/32131 开启，供站长复核卡片网络大小和选择/详情交互；后续自由画布直接复用共用图片入口。GG-106 生产 OSS 应用切换仍独立，GG-105 的 200 MiB 大文件验收仍待办；浏览器自动控制按用户要求暂不处理。
- Blockers: 无阻塞执行项；`operations` 缺口为已知并已授权接受。
- 参考图校验最长近 6 分钟、超过 nginx 70s 读超时的服务端性能根因仍待排查；
  GG-103 前端通过 owner-scoped 状态查询避免把已入库素材误报为失败。

## Verification sequence

1. 先按DEVELOPMENT_HANDOFF核验当前检查点、Git祖先与实际端口；文档整理只跑文档/链接契约与diff检查。
2. SQL恢复命令只创建命名空库且无Worker，原goodgood与生产不写fixtures；新功能按对应任务做最小定向验证。
3. 代码稳定后一次npm run check:local，更新任务/文档；生产事实以CURRENT_STATE.md为准。

## Milestones

| 阶段 | 状态 | 当前含义 |
| --- | --- | --- |
| M0—M8 | 已完成基线 / controlled alpha 已开放 | 生产事实以 CURRENT_STATE 和发布收据为准 |
| GG-090 | 本地实现/验证完成 | 双码active注册、站长单人邀请码；525/26、隔离SQL/邮件UI通过，32141已更新；历史M6价格断言见任务；未部署 |
| GG-089 | 本地实现/验证完成 | 指定8项站长导航顺序/用户反馈标签；522/25、桌面/390px通过，32141已更新，未部署 |
| GG-088 | 本地实现/验证完成 | 问题类型首次及改选后向下、桌面/390px和门禁522/25通过，32141已更新，未部署 |
| GG-087 | 本地实现/验证完成 | 私有反馈5图/类型/状态/回复，522通过/25跳过、SQL/UI通过，原32141更新；未部署 |
| GG-086 | 本地实现/验证完成 | 发行进度与15秒只读刷新、桌面/390px通过，原32141已更新；门禁详情见任务，未部署 |
| GG-085 | 本地实现/验证完成 | 按期卡片、门禁515/24及桌面/390px通过，原32141已更新，未部署 |
| GG-084 | 本地实现/验证完成 | 个人仅自己统计/记录，站长计划/一期生命周期；门禁515/24、SQL1/1、UI通过，未部署 |
| GG-083 | 结构/首批参数规划完成 | 第一批100万枚/系数2、正常50万元有效消费、无期限/仅累计；GG084接续一期运行时 |
| GG-082 | 历史最小发行讨论 | GG083接续；原兑换/服务面值建议否决，首期数值未确认，未实现/发币 |
| GG-080 | 补充规划完成待澄清 | 消费驱动/9.18/分类方向已定，条件试算/文档通过，20%待澄清，未实施 |
| GG-081 | 本地实现/验证完成 | 积分类型、真实充值登记与默认运营/现金/并发；门禁508/23、隔离SQL2/2及模拟页面通过，未部署 |
| GG-023 | 本地安全候选已 CI 通过 | 尚未切生产，见任务卡 |
| GG-024—GG-032 | 本地完整基础组合已验证 | 账户、积分、直属关系、来源划拨、OTP、企业及成员额度 |
| GG-033 | 本地完成并真实验证 | 三个 GPT 图片模型，生产未发布 |
| GG-034—GG-039 | 本地图片/视频工作区已验证 | Seedance 参数、线路、预览、混排/详情、数量并发；正式视频结算待接 |
| GG-040—GG-043 | 本地完成并获页面检查 | 批量提示词、简化说明、抽屉与素材预览，未发布 |
| GG-044—GG-049 | 本地完成，验收记录见任务卡 | 企业/分销独立管理、划拨归位、概览；GG-046 模拟未获认可，原真实本地企业页保留 |
| GG-050 | 本地完成并获用户验收 | 删除五类常驻返回入口，不新增替代导航，未发布 |
| GG-051 | 研究方向获认可 | Runway 人民币按规格计价，等值分析与 ADR 0062 |
| GG-052 | 本地完成并验证 | 1 元/100 积分与站长模型面板；完整门禁、SQL/browser mock 验证通过，定价页已保留，未发布 |
| GG-053 | 本地完成并验证 | 模型名称一次、规格价格对齐、自动内部编号与折叠接入详情；完整门禁与桌面/窄屏验收通过，原页面已更新保留，未发布 |
| GG-054 | Pro 与通用功能本地完成并验证 | 原线路/定价候选完整验证；后续用户补齐 Banana 2 ID 接续 GG-056，未发布 |
| GG-055 | 官方调研与文档验证完成 | 六规格输出成本、整单公式与五参考图/长文本敏感性；文档测试 15/15、diff 检查通过；未改价/发布 |
| GG-056 | 本地完成并验证 | Banana 2 三线路、用户价格/历史保留、试价目录归档；门禁 427/16、SQL/运行/Chrome 通过，未发布 |
| GG-057 | 本地完成并验证 | 站长导航与 local 登录恢复；门禁 432/16、运行/Chrome 检查与配置/历史保留通过，未发布 |
| GG-058 | 本地调整与验证完成 | 站长字体/无页头退出；门禁 432/16、运行/Chrome 与历史保留通过，原 Windows 文字待用户复看，未发布 |
| GG-059 | 本地完成并验证 | 大厅统一站长管理/右侧切换/窄屏返回；最终门禁 437/16、浏览器与历史保留通过，未发布 |
| GG-060 | 本地完成并验证 | 顶部功能切换/唯一页面主标题；门禁 437/16、桌面窄屏与历史保留检查通过，未发布 |
| GG-061 | 本地完成并验证 | 独立审计/四功能；门禁 439/16、原浏览器/窄屏与历史保留通过，未发布 |
| GG-062 | 本地完成并验证 | GPT 图片三线路；门禁 445/16、隔离 SQL、原页面/窄屏与历史保留通过，未发布 |
| 完整 C6 / M9 | 搁置 | 删除、举报、商业支付等，见 GG-900—GG-902 |

## New-session recovery

1. 打开F:/goodgood；读AGENTS/CURRENT_STATE/WORKFLOW/本页/BACKLOG与DEVELOPMENT_HANDOFF。核验bb782c0/a73835f及GG-100 `de699e1`祖先；GG-101分支为chore/GG-101-real-online-local-development，提交身份以任务卡最新记录为准。
2. GG091 worktree及旧GG024/C6分支均保留；新窗口不bulk merge/reset旧版本，不覆盖.codex/未提交用户内容。
3. 当前开发契约只允许真实O1Key Web/Worker；历史32143 mock只可属于显式测试栈。依赖54449/56449/58049见交接；PID只是记录，先核验再停；根目录.env文件和仓库外开发密钥均不打印。
4. 使用交接中的启动/定向SQL命令；不fixture原用户数据、不进入真实provider32140栈、不重放线上清理。

## History and update policy

- 历史追溯：[2026-09-07 implementation log](history/2026-09-07-implementation-log.md)。
- 细节写任务卡，生产事实写 CURRENT_STATE；本页仅维护一个当前检查点、验证顺序和下一步。
