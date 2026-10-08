# GG-419 · 本地启用 Seedance 并恢复项目

- 日期：2026-10-08；状态：本地更新/启动进行中，浏览器和实际生成由用户验收。
- 用户授权：「你更新一下。然后帮我启动项目」包含仅本地0070迁移、必要checkpoint构建、Web/唯一Worker/Vite启动。
- 基线：GG-116干净7812fd953a4b8d0eaf3b29586424cbbf409a0f64，GG-418源码90a46ea19b31b9b341883616b9f67f5f7c9df5d1祖先已核验；分支chore/gg-419-local-seedance-activation。
- 范围：复用127.0.0.1:54449/goodgood、Valkey56549、原对象存储及卷；保持外部开发云上传、O1Key、Mailpit及Kling价格配置，Seedance采用用户接受的源码临时价。
- 初始事实：5173/32131/32142均未监听；原Docker依赖已健康，PG54449映射正常。本次不需要系统端口恢复或重建容器。
- 决策：启用已接受的ADR0143/GG-418，不改变产品决定，无新ADR。
- 验证边界：只做启动必需构建、具名本地数据库历史/迁移/聚合/活动队列及服务身份/readiness/页面HTTP核对；不运行lint/typecheck/check:local/测试或浏览器验收，不创建Provider任务、fixture或主动付费请求，不触碰生产/GitHub。
- 生命周期：根agent，无子agent；创建/退役worktree均0，复用既有依赖；不新增系统自启。
- 下一步：必要构建；确认历史69迁移与仅待0070、记录数据和队列聚合后增量应用；隐藏启动Web、唯一Worker、Vite，记录实际运行回执。
