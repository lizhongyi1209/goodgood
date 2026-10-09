# GG-391 · 电脑重启后恢复当前本地项目

- 日期：2026-10-06，Asia/Shanghai；用户明确要求重启项目。
- 基线：GG-116，干净HEAD70e7e77，应用源码a61c381360501f1a38f1ac5627a2005aaef8d5ad；新分支codex/gg-391-local-restart-after-reboot，已核验源码祖先。
- 范围：保留原Docker数据卷、云开发凭据、视频临时价格和Mailpit；恢复PG54449、Web32131、唯一Worker32142、Vite5173。必要当前checkpoint构建与只读运行核对属于本次重启授权，包含GG-389/390当前源码启用，不继续等待旧Web启用问题。
- 初始事实：三个应用端口无监听；原PG健康、原卷goodgood-gg052_postgres-data保持，HostConfig54449但实际映射为空。Windows保留范围54411–54510覆盖54449；沿GG-366恢复，不改数据库地址或数据。
- 决策：运行恢复，不改变产品决定，无新ADR；保留现存任务/账户/画布/资产和积分。未执行迁移、重置、fixture、生成/重放或生产操作。
- 生命周期：复用当前干净集成/运行目录，创建0/退役0，无子agent或新依赖副本。
- 验证边界：只做启动必要构建、端口/HTTP健康及只读本地状态核对；不做lint/typecheck/代码检查/测试/浏览器交互验收。
- 状态：本地恢复完成，当前源码已启用；只核对运行可用性，功能验收由用户执行，未部署。
- 下一步：服务可用后用户刷新5173手验，记录准确receipt；不新增自启或计划任务。

## 恢复结果

- [GG-391](GG-391-local-restart-after-reboot.md) 电脑重启恢复完成：原PG54449被Windows54411–54510保留范围覆盖；系统管理员授权后沿GG-366短停WinNAT并重连原网络，原容器/卷/54449映射恢复、WinNAT Running。必要当前checkpoint构建4ecd1db987725dda0ad238648453a776e8f73ae6；Web30256/32131、唯一Worker24668/32142、Vite26448/5173（入口31156；隐藏启动器29680/32256/31188）恢复。Web/Worker readiness五项ok，5173 API代理同revision/verified，首页及原画布HTTP200。最新GG-389数量与GG-390智能分镜源码已随本次重启启用；原68迁移、数据、cloud-development/local-mailpit和外部临时视频价格保持。启动前图片/文本任务仅终态，视频任务0、未派发outbox/预留/两队列均0。未迁移/重置/写fixture/发真实生成或生产操作，未代码检查/测试/浏览器交互验收。创建0/退役0，无子agent/新依赖副本；用户刷新5173手验。
- 构建sourceHash fa920ef8a644612f2222147a3836ec5cf6e103e27d9e3a5080dc5d1d83fbffcd；artifactHash 3bbeffed3a226640b05ab19c5a3464c2e58b55fd49b834861b2da804725754e6，310产物，builtAt 2026-10-06T02:56:50.327Z。verified仅表示提交/源与产物指纹一致，不代表功能验收。只运行必要build:checkpoint，既有插件耗时/大chunk警告不阻塞构建。
- 仓库外TEMP/goodgood-local-services/gg391-startup-backup保存旧适配器/manifest/角色日志；gg391-restore-postgres-port.ps1及结果记录端口恢复；gg391-detached-launch.ps1为独立隐藏CIM启动器，gg391-runtime.json记录HTTP运行核对。恢复忽略适配器导入与Valkey56549，不修改应用源代码、外部凭据或价格配置。未操作其他项目容器，未新增自启/计划任务。
- 原22成功/6失败/1取消图片任务及7成功/1失败/1取消文本任务保持；视频任务0，迁移68。数据库核对使用BEGIN READ ONLY，不创建登录/生成任务，不读取用户素材或prompt。
- 后续纯文档提交不改变实际运行revision；下次启动先按届时HEAD构建，仍使用原云开发和外部视频价格文件。
