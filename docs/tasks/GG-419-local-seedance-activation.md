# GG-419 · 本地启用 Seedance 并恢复项目

- 日期：2026-10-08；状态：本地更新/启动完成；必要构建和运行核对完成，浏览器及实际生成由用户验收。
- 用户授权：「你更新一下。然后帮我启动项目」包含仅本地0070迁移、必要checkpoint构建、Web/唯一Worker/Vite启动。
- 基线：GG-116干净7812fd953a4b8d0eaf3b29586424cbbf409a0f64，GG-418源码90a46ea19b31b9b341883616b9f67f5f7c9df5d1祖先已核验；分支chore/gg-419-local-seedance-activation。
- 范围：复用127.0.0.1:54449/goodgood、Valkey56549、原对象存储及卷；保持外部开发云上传、O1Key、Mailpit及Kling价格配置，Seedance采用用户接受的源码临时价。
- 初始事实：5173/32131/32142均未监听；原Docker依赖已健康，PG54449映射正常。本次不需要系统端口恢复或重建容器。
- 决策：启用已接受的ADR0143/GG-418，不改变产品决定，无新ADR。
- 验证边界：只做启动必需构建、具名本地数据库历史/迁移/聚合/活动队列及服务身份/readiness/页面HTTP核对；不运行lint/typecheck/check:local/测试或浏览器验收，不创建Provider任务、fixture或主动付费请求，不触碰生产/GitHub。
- 生命周期：根agent，无子agent；创建/退役worktree均0，复用既有依赖；不新增系统自启。
- 下一步：用户打开5173原画布手验Seedance UI与本人实际生成；功能回归未运行，后续纯文档提交不改写运行90e0605。

## 初次启动与密钥阻塞（已解决）

- [GG-419](tasks/GG-419-local-seedance-activation.md) 用户授权的本地更新已应用：必要构建009194d65fe32a9b35c0c5ef283c159e651291ee，0070增量迁移已应用、总70且历史69校验匹配，原用户/画布/资产/任务/账本聚合和余额保持。Web30012/32131及Vite30048/5173（入口23488）隐藏恢复并跨命令在线，版本代理同verified构建、首页及原画布HTTP200。生成尚未恢复：既有外部开发O1Key密钥在无任务readiness GET被拒401 Invalid token，Webready503、Worker14160退出且32142未监听；已请求用户更新外部密钥文件或提供有效开发文件路径，未绕过保护。启动前活动任务/预留/outbox/两队列均0，无生成/扣费或fixture/测试/浏览器/GitHub/生产操作；外部云上传/原Kling价格/Mailpit及容器卷保持。下一步收到有效密钥后更新Web/唯一Worker并确认readiness；不宣称实际生成已可用。
- build sourceHash 9428f46f842683670822c2a499a3086a12c0345d6346187b27210b03b0a58f8b；artifactHash c2eadefafab7cd915bf7ce912fc2887a63a24577703d3bfec2eae74f56007b09；311产物；builtAt 2026-10-08T02:58:17.730Z。verified仅表示启动源码/产物一致。
- 0070 checksum 27580180556f351710f4b831ae4fb3f082493451e974df4863dcd5d72dd4b722；只调用applyMigrations，无fixtures入口；两处新增约束validated、两审计列及模型/线路唯一索引生效。4用户/8画布/25资产/61参考/3视频素材/29图片任务/9文本任务/2视频任务/87个人流水保持，个人可用聚合999/预留0，工作区0/0。
- 启动文件仅ignored dist适配器与仓库外TEMP/goodgood-local-services/gg419-detached-launch.ps1；运行凭据未输出/修改，不增加自启。证据gg419-{before,migration,health,launchers}.json和固定current-*日志。Web隐藏启动器27552、Vite32000；Worker启动器14208，本次启动因上游401结束。
- 上游开发密钥默认路径C:/Users/Admin/.claude/goodgood-local-secrets/o1key-api-key.txt，最后修改2026-09-15；只读GET返回明确Invalid token。未写新密钥或降级mock，需用户提供有效专用开发凭据后完成生成服务恢复。

- 用户随后明确提供剪贴板中的新开发密钥；仅写外部专用开发文件、不输出值。无任务readiness GET返回404（认证通过，探测任务不存在），原401阻塞已解除；交接文档提交使HEAD变化，按checkpoint身份要求重新进行必要启动构建，再替换Web并恢复唯一Worker。

## 实际恢复回执

- [GG-419](tasks/GG-419-local-seedance-activation.md) Seedance已本地启用、项目启动完成：用户授权0070增量迁移/必要构建及恢复服务，最终verified构建90e0605fb620e2ee0a052efc5a125bcdf4273ac8（含GG-418源码90a46ea及GG-416进度），总70迁移，历史69校验和匹配，原用户/画布/资产/任务/账本计数和余额保持。Web32320/32131、唯一Worker35040/32142（隐藏启动器33768/19948）和Vite30048/5173（入口23488、启动器32000）跨命令在线；Web/Worker readiness五项ok，5173版本代理同revision/verified，原画布HTTP200。初次开发密钥401已在用户明确授权后从剪贴板仅更新外部专用开发文件解决，密钥无输出/入库/入Git；随后无任务readiness认证通过。原容器/卷/云开发上传/Mailpit/Kling价格保持，Seedance沿已接受的临时每秒默认价；启动前活动任务/预留/outbox/两队列均0。只做启动必需构建/迁移/运行核对，未生成/扣费、fixture、lint/typecheck/check:local/测试/浏览器验收、GitHub或生产操作。创建0/退役0，无子agent/新依赖/自启；用户打开5173手验UI及实际生成，后续纯文档提交不改写实际运行revision。
- 最终sourceHash 9428f46f842683670822c2a499a3086a12c0345d6346187b27210b03b0a58f8b；artifactHash acc114a83fe6a735b89ead5231d7b43f5705d394f3fecf5daf4f00820c52ccd8；311产物；builtAt 2026-10-08T03:03:28.045Z。初次构建009194d因交接文档HEAD变化重新进行必要checkpoint构建，源码hash保持；无应用代码或依赖变更。
- 外部最终证据gg419-{before,migration,health,runtime,launchers}.json；初次401回执保留为gg419-{health,runtime}-initial-token-rejected.json。唯一Worker35040事件与Web版本同90e0605/产物hash，运行身份与readiness通过；最初误探Worker /health/version返回404，已按其实际/health/ready与启动事件核对，无版本健康路由改动。
- 密钥值只在用户指定剪贴板与仓库外专用文件间读取/写入；未输出内容或复制到仓库/文档/log。初次阻塞已解除，不留下mock或放宽readiness保护。
