# GG-358 · 本地连接拒绝再恢复

- 日期：2026-10-04；用户报告127.0.0.1拒绝连接，要求再次检查并恢复。
- 基线：GG-116干净3b7393a，保留当前应用源码6ba2d0d及GG-357全部功能/数据。运行操作和文档复用集成目录，创建0/退役0，无子agent。
- 事实：GG-357网页/后台/Vite四个PID均已不存在，5173/32131/32142没有监听；原Docker依赖仍healthy。Vite日志曾响应首页/画布200，没有明确退出原因，不断言根因。
- 范围：恢复当前版本Web、唯一Worker及5173；必要checkpoint构建、只读队列/任务核对和HTTP/端口可用性检查。采用独立隐藏后台启动，避免依赖本次命令会话；不更改应用逻辑或产品决定，无新ADR。
- 数据边界：保留原E盘卷、66迁移、外部cloud-development/local-mailpit配置及真实资产积分，不迁移/重置/写fixture或触发Provider/扣费/生产操作。
- 验证边界：用户要求恢复连接，允许必要构建和运行核对；仍不执行lint/typecheck/代码检查/测试/浏览器验收。
- 状态：已恢复；首页/原画布200，后台readiness正常，用户刷新手验。前次进程退出根因未确定，不声称已根治。

## 恢复结果

- 构建verified 3b7393a16fc013d867c9be35904b1f61eb5bc0ee，sourceHash c11b2d002172ec16aaece586131c0d716efbbd99b18c3f066658940a94f7b6fc，artifactHash 2c0594e7077e8c20c805527806e3ca579b9a5a83176cdc3b135af3cc66c045ec，308产物，builtAt 2026-10-04T11:59:50.633Z。没有应用源码变更/重复依赖安装。
- 启动前BEGIN READ ONLY活动图片/文本任务、未派发outbox、个人/工作区预留余额均0，Valkey ready/processing均0，迁移仍66。未迁移/重置/写fixture/生成/扣费。
- 仓库外gg358-detached-launch.ps1通过Windows CIM独立进程启动隐藏PowerShell，再以Start-Process -WindowStyle Hidden运行角色并记录退出码。有效启动仅使用ShowWindow=0，首试CreateFlags=8的进程未持续运行，已改用正常创建标志。没有计划任务、自启或轮询自动重启，不修改系统长期设置。
- 当前Web7704/32131、唯一Worker15844/32142、Vite35552/5173（Node启动器23288）正常；隐藏角色launcher Web26488、Worker23588、Vite12908，均父进程5552。命令会话结束后跨多次独立调用均仍在，不依附本次命令进程。
- Web版本及5173代理200/verified同3b7393a，两角色启动banner同revision/artifactHash，referenceStorage=cloud-development、emailDelivery=local-mailpit。Web/api/health/ready及Worker/health/ready五项均ok，没有真实Provider请求或云图片内容抽查。
- Vite启动和首次编译超过短探测窗口，稍后首页及/canvas/48ad1462-cd7d-4a53-b07b-ebdceb915461均200。只核对HTTP可用性，没有浏览器视觉/交互验收。
- 日志/适配器备份在%TEMP%/goodgood-local-services/gg358-startup-backup；有效launcher及launcher错误/退出日志同在仓库外goodgood-local-services，current角色日志保留。适配器构建后恢复；无新源码分支/子agent/依赖副本，创建0/退役0。
- GG-350原因采集和GG-356修复保持当前启用；未跑lint/typecheck/代码检查/测试/生产操作。下一步用户刷新继续使用，如再退出优先读取本次退出日志定位原因。纯交接提交不改写运行receipt，未来重启按届时HEAD构建。
