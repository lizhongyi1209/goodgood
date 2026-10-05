# GG-374 · 电脑重启后恢复当前开发项目

- 日期：2026-10-05，Asia/Shanghai；用户明确要求重启当前本地项目。
- 基线：干净37bf2c4a0bce1b4799004329624eec19a42cbd4f，应用源码0b5d1a8/GG-373，GG-372移动至/GG-371相册/GG-370批量节点保持；当前目录F:/goodgood-worktrees/GG-116。
- 范围：复用原Docker依赖、数据卷、外部开发凭据与端口，必要当前checkpoint构建，恢复Web32131、唯一Worker32142、Vite5173；只读启动前任务/队列核对及HTTP/版本/角色readiness。
- 初始事实：三个应用端口无监听；原PG54449/Valkey56549/对象存储58049/Mailpit健康，原goodgood-gg052_postgres-data卷保持；无需上次WinNAT恢复。
- 已只读确认：数据库goodgood，图片/文本任务仅终态，无活动任务；未派发outbox=0，迁移66；个人/工作区/成员预留与ready/processing队列核对见后续结果。
- 决策：仅运行恢复，不改变产品或应用源码，无新ADR。必要构建/运行健康读取属于本次重启授权；不做lint/typecheck/代码或diff检查/测试/浏览器交互验收。
- 数据边界：不迁移/重置、写fixtures、发送/重放真实生成、扣费或生产操作，不设置自启/自动重启。
- 生命周期：复用原运行/集成目录，创建0/退役0，无子agent或新依赖缓存。原忽略启动器及角色日志已备份到仓库外TEMP/goodgood-local-services/gg374-startup-backup。
- 状态：恢复中，未部署生产。
- 下一步：必要checkpoint构建后重建两个本机端口适配器，独立隐藏启动原角色，确认原画布HTTP可用并记录运行receipt。
