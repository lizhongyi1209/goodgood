# GG-419 · 本地启用 Seedance 并恢复项目

- 日期：2026-10-08；状态：本地迁移/构建及页面服务完成；生成Worker待有效开发密钥恢复。
- 用户授权：「你更新一下。然后帮我启动项目」包含仅本地0070迁移、必要checkpoint构建、Web/唯一Worker/Vite启动。
- 基线：GG-116干净7812fd953a4b8d0eaf3b29586424cbbf409a0f64，GG-418源码90a46ea19b31b9b341883616b9f67f5f7c9df5d1祖先已核验；分支chore/gg-419-local-seedance-activation。
- 范围：复用127.0.0.1:54449/goodgood、Valkey56549、原对象存储及卷；保持外部开发云上传、O1Key、Mailpit及Kling价格配置，Seedance采用用户接受的源码临时价。
- 初始事实：5173/32131/32142均未监听；原Docker依赖已健康，PG54449映射正常。本次不需要系统端口恢复或重建容器。
- 决策：启用已接受的ADR0143/GG-418，不改变产品决定，无新ADR。
- 验证边界：只做启动必需构建、具名本地数据库历史/迁移/聚合/活动队列及服务身份/readiness/页面HTTP核对；不运行lint/typecheck/check:local/测试或浏览器验收，不创建Provider任务、fixture或主动付费请求，不触碰生产/GitHub。
- 生命周期：根agent，无子agent；创建/退役worktree均0，复用既有依赖；不新增系统自启。
- 下一步：必要构建；确认历史69迁移与仅待0070、记录数据和队列聚合后增量应用；隐藏启动Web、唯一Worker、Vite，记录实际运行回执。

## 运行回执（生成恢复待办）

- [GG-419](tasks/GG-419-local-seedance-activation.md) 用户授权的本地更新已应用：必要构建009194d65fe32a9b35c0c5ef283c159e651291ee，0070增量迁移已应用、总70且历史69校验匹配，原用户/画布/资产/任务/账本聚合和余额保持。Web30012/32131及Vite30048/5173（入口23488）隐藏恢复并跨命令在线，版本代理同verified构建、首页及原画布HTTP200。生成尚未恢复：既有外部开发O1Key密钥在无任务readiness GET被拒401 Invalid token，Webready503、Worker14160退出且32142未监听；已请求用户更新外部密钥文件或提供有效开发文件路径，未绕过保护。启动前活动任务/预留/outbox/两队列均0，无生成/扣费或fixture/测试/浏览器/GitHub/生产操作；外部云上传/原Kling价格/Mailpit及容器卷保持。下一步收到有效密钥后更新Web/唯一Worker并确认readiness；不宣称实际生成已可用。
- build sourceHash 9428f46f842683670822c2a499a3086a12c0345d6346187b27210b03b0a58f8b；artifactHash c2eadefafab7cd915bf7ce912fc2887a63a24577703d3bfec2eae74f56007b09；311产物；builtAt 2026-10-08T02:58:17.730Z。verified仅表示启动源码/产物一致。
- 0070 checksum 27580180556f351710f4b831ae4fb3f082493451e974df4863dcd5d72dd4b722；只调用applyMigrations，无fixtures入口；两处新增约束validated、两审计列及模型/线路唯一索引生效。4用户/8画布/25资产/61参考/3视频素材/29图片任务/9文本任务/2视频任务/87个人流水保持，个人可用聚合999/预留0，工作区0/0。
- 启动文件仅ignored dist适配器与仓库外TEMP/goodgood-local-services/gg419-detached-launch.ps1；运行凭据未输出/修改，不增加自启。证据gg419-{before,migration,health,launchers}.json和固定current-*日志。Web隐藏启动器27552、Vite32000；Worker启动器14208，本次启动因上游401结束。
- 上游开发密钥默认路径C:/Users/Admin/.claude/goodgood-local-secrets/o1key-api-key.txt，最后修改2026-09-15；只读GET返回明确Invalid token。未写新密钥或降级mock，需用户提供有效专用开发凭据后完成生成服务恢复。
