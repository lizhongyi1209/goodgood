# GG-374 · 电脑重启后恢复当前开发项目

- 日期：2026-10-05，Asia/Shanghai；用户明确要求重启当前本地项目。
- 基线：干净37bf2c4a0bce1b4799004329624eec19a42cbd4f，应用源码0b5d1a8/GG-373，GG-372移动至/GG-371相册/GG-370批量节点保持；当前目录F:/goodgood-worktrees/GG-116。
- 范围：复用原Docker依赖、数据卷、外部开发凭据与端口，必要当前checkpoint构建，恢复Web32131、唯一Worker32142、Vite5173；只读启动前任务/队列核对及HTTP/版本/角色readiness。
- 初始事实：三个应用端口无监听；原PG54449/Valkey56549/对象存储58049/Mailpit健康，原goodgood-gg052_postgres-data卷保持；无需上次WinNAT恢复。
- 已只读确认：数据库goodgood，图片/文本任务仅终态，无活动任务；未派发outbox=0，迁移66；个人/工作区/成员预留以及ready/processing队列均0。
- 决策：仅运行恢复，不改变产品或应用源码，无新ADR。必要构建/运行健康读取属于本次重启授权；不做lint/typecheck/代码或diff检查/测试/浏览器交互验收。
- 数据边界：不迁移/重置、写fixtures、发送/重放真实生成、扣费或生产操作，不设置自启/自动重启。
- 生命周期：复用原运行/集成目录，创建0/退役0，无子agent或新依赖缓存。原忽略启动器及角色日志已备份到仓库外TEMP/goodgood-local-services/gg374-startup-backup。
- 状态：本地恢复完成；首页/原画布/API代理和角色readiness通过运行核对，浏览器交互由用户手验；未部署生产。
- 下一步：用户刷新原画布继续使用；下次重启按届时HEAD恢复，不复用本卡PID假定仍在线。

## 本次恢复结果

- GG-374按用户要求完成本地重启：原PG54449/Valkey56549/对象存储58049/Mailpit及原卷均健康，三个应用角色原本已停。必要构建verified d183b918ea139c429630a7177905fd2c60cbee93，复用原外部cloud-development/local-mailpit配置，独立隐藏CIM启动Web29548/32131、唯一Worker28916/32142、Vite17388/5173（启动器33100/27976/13896，父WMI7984）。跨命令仍监听；首页/原画布HTTP200，前端API代理同revision/verified，Web与Worker readiness五项均ok。启动前活动图片/文本任务、未派发outbox、个人/工作区/成员预留及两队列均0；原66迁移保持。未迁移/重置/写fixture、发起或重放真实生成/扣费或操作生产；仅必要启动构建与运行核对，未lint/typecheck/代码或diff检查/测试/浏览器交互验收。GG-373及既有应用源码保持，创建0/退役0，无子agent或新依赖副本。用户刷新原画布继续使用，下次重启按届时HEAD构建；纯交付文档提交不改写此运行receipt。
- 构建sourceHash cc6fbdee00c1c28535768f89ac93b7cacc03c2a93cf98f948f97ee6145940e86，artifactHash 68a3879877c147d83f2da04a730c4d0f3aa0e46c8a797f761ac0dd89bc01d830，308产物，builtAt 2026-10-05T08:20:43.970Z。复用锁定依赖，只执行必要build:checkpoint；插件耗时/大chunk等警告未阻塞启动。
- 构建后从当前scripts恢复两个忽略本机适配器，只调整local导入位置与有效Valkey56549映射；未提交适配器/日志/环境或密钥。
- 启动器TEMP/goodgood-local-services/gg374-detached-launch.ps1，角色日志固定current-{web,worker,vite}.{out,err}.log，退出日志gg374-detached-exit.log；旧日志/适配器备份gg374-startup-backup。角色独立于命令会话，无自启/计划任务/自动重启。
