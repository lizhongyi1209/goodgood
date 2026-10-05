# GG-366 · 电脑重启后恢复本地项目

- 日期：2026-10-05（用户时区Asia/Shanghai）；用户明确要求重启当前本地项目。
- 基线：GG-116 / fix/GG-275-text-editor-layout，干净HEAD35cc24e；应用源码c90545528347ecb729b19a5a9e3cacabc25e089c，GG-365/364及已有功能保持。
- 范围：复用原Docker数据卷/开发凭据/依赖，恢复PostgreSQL54449、本地Web32131、唯一Worker32142及Vite5173；必要当前checkpoint构建，启动前只读队列/任务核对及运行HTTP/版本检查。
- 初始事实：三个应用端口无监听。Valkey56549/对象存储58049/Mailpit健康；PostgreSQL容器健康、原卷存在，但NetworkSettings.Ports的5432映射为空。HostConfig仍指向127.0.0.1:54449，Windows保留54385–54484覆盖此端口；沿GG-241恢复，不换生产连接或重置数据。
- 决策：仅运行恢复，无产品决定/应用源码变更或新ADR。沿GG-357/358，必要构建及运行检查属于本次重启授权；不做lint/typecheck/代码检查/测试/浏览器交互验收。
- 数据边界：不迁移/重置/写fixture、发起或重放Provider生成、扣费或生产操作。恢复唯一Worker前核对现存任务/队列，保留原数据与外部配置。
- 生命周期：复用现有运行/集成目录，创建0/退役0，无子agent/新依赖副本。
- 状态：本地恢复完成，首页及原画布HTTP200；用户刷新继续手验，未部署生产。
- 下一步：用户刷新原画布继续使用；下次恢复按届时HEAD构建。Windows重启若再次占用54449，先核对保留范围及原容器/卷，再按本卡恢复。

## 已完成恢复步骤

- Windows管理员授权后运行仓库外gg366-restore-postgres-port.ps1，停止原PG、重连原goodgood-gg052_goodgood-local网络并保持postgres/容器别名，短暂停止WinNAT后启动同一PG，再finally恢复WinNAT。结果success=true、WinNAT Running、原5432→127.0.0.1:54449映射及healthy恢复；原named volume不变。
- 启动前通过原PG容器BEGIN READ ONLY确认database=goodgood：活动图片/文本任务、未派发outbox、个人/工作区预留余额均0，迁移仍66；Valkey ready/processing均0。未迁移/重置/写fixture或发起生成。
- 必要构建完成，绑定注册HEAD1dde20e6c08346d26c3d3d4dd97431605d057fe8；当前适配器和角色日志备份至仓库外%TEMP%/goodgood-local-services/gg366-startup-backup。准备独立隐藏CIM启动器，避免命令会话结束时停止角色。

## 恢复结果

- GG-366电脑重启恢复完成：原PG54449落入Windows54385–54484保留范围、发布映射缺失；经Windows管理员授权短停WinNAT、重连原网络/别名并启动同一PG，原卷及54449映射恢复、WinNAT Running。必要构建verified 1dde20e6c08346d26c3d3d4dd97431605d057fe8；Web34716/32131、唯一Worker32420/32142、Vite30460/5173（启动器8232）通过独立隐藏launcher恢复。首页/原画布200、API代理同revision/verified，两角色readiness五项ok、cloud-development/local-mailpit保持。启动前活动图片/文本任务、未派发outbox、个人/工作区预留及两队列均0，原66迁移保留。未迁移/重置/写fixture/发真实生成/扣费或生产操作；仅必要构建和运行核对，未lint/typecheck/代码检查/测试/浏览器验收。GG-365/364源码保持，创建0/退役0，无子agent/新依赖副本。
- 构建sourceHash48898a70c353b3cd4f8e9be2377d9411965a9ac52e95b80c22b1457f88c6c5f0，artifactHash4d30601e6069233e526474bcb8e17420ac05e5d0786d5b11f551325c1b5cc801，308产物，builtAt2026-10-05T01:16:49.781Z。复用已锁定依赖，只运行必要build:checkpoint；插件耗时/大chunk等警告不阻塞构建。未改应用源码。
- 独立隐藏CIM launcher Web31820/Worker32224/Vite31296父进程WmiPrvSE4944；跨命令核对角色仍运行，唯一真实Worker。Win32_ProcessStartup.ShowWindow使用uint16，未设自启/计划任务或自动重启。运行receipt不随本交接文档提交改写。
- 启动banner Web/Worker均为同revision/artifactHash、referenceStorage=cloud-development、emailDelivery=local-mailpit。Vite首次初始化27.8秒，首探未监听；启动后代理版本200/verified、首页及原画布均200。只核对HTTP可用性，不声称交互验收。
- 当前启动器在%TEMP%/goodgood-local-services/gg366-detached-launch.ps1，恢复脚本/结果/退出日志同在仓库外；current角色日志复用，旧适配器/日志备份保留。恢复PG原named volume goodgood-gg052_postgres-data，原Valkey/对象存储/Mailpit健康；未操作其他项目容器。
