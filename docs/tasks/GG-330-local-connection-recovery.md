# GG-330 · 本地连接拒绝恢复

- 日期：2026-10-03；用户报告127.0.0.1拒绝连接，当前页面5173/canvas。
- 基线：当前a254a01，保留GG-329上下文修复及全部既有源码；运行恢复/必要交接文档在活动GG-116完成，不创建源码分支或子agent。
- 事实：5173/32131/32142及原状态端口无监听，原GG-116 Node角色不在；Docker Desktop/engine未运行，docker API管道不存在。电脑上次启动10:29，Vite日志最后13:48，日志没有明确的进程退出原因，不推断为画布代码导致。
- 范围：恢复原E盘Docker数据/现有隔离依赖、当前来源Web及唯一Worker、5173；严格启动器要求源码/构建一致，必要时仅构建当前检查点。读取启动身份/队列与服务可用性，不自动功能检查。
- 决策影响：仅本地运行恢复，无新产品决定/ADR。用户报告开发环境无法访问，恢复所需本地启动属于本次处理；不扩大到生产、测试或真实生成。
- 数据边界：原数据盘/卷及仓库外开发凭据保留；不迁移、清空或写fixture，不输出秘密，不启动旧GG-226 Worker。Worker恢复前只读确认队列/任务。
- 状态：必要构建94bee5354e5b1a77516235ee894a19a42767610e完成；sourceHash877596caf4e2f7449f3565193bb7fdda8c7a4f26855b9f0fdab555b6d8d2a161，artifactHash7d12805a1bdf466f47fb03b8f7b54f13f2f50485e4b2ad1ef020c64757517c54，300产物，builtAt2026-10-03T06:07:50.606Z。两份忽略启动器已保留/恢复，Web/Worker/Vite待启。
- Docker恢复：启动前设置为原E盘目录，但Desktop启动后设置回到C盘默认空目录，docker容器/卷列表为空。正常desktop stop后备份设置到%TEMP%/goodgood-local-services/gg330-docker-settings-before.json，仅将CustomWslDistroDir恢复原E盘目录再启动；原34,414,264,320字节VHD及goodgood-gg052 PostgreSQL/Valkey/RustFS、gg044 Mailpit全部healthy，端口54449/56549/58049/58046恢复。没有新建、移动或删除数据盘/卷，其他已有Docker服务自动恢复未改。
- 验证边界：不运行lint/typecheck/代码或diff检查、测试、浏览器验收、真实Provider探针。仅启动必要构建和HTTP/端口/readiness可用性核对。
- 生命周期：创建0/退役0，复用当前目录、现有依赖及忽略启动适配器；正常运行日志仍在仓库外。

## 恢复交接

- 本地BEGIN READ ONLY聚合：activeImages/activeText/pendingOutbox/个人reserved/企业reserved均0；Valkey ready/processing队列各0。只有启动必要只读核对，无fixture、迁移或真实Provider请求。
- 当前Web9448/32131、唯一Worker23800/32142均verified94bee5354e5b1a77516235ee894a19a42767610e；Vite启动器29228、监听33440/5173，皆来自GG-116。原0b5744d/419b097及旧PID已停止，是历史运行身份。
- HTTP启动可用性：5173首页200，5173 API代理verified94bee5354e5b1a77516235ee894a19a42767610e；Web/api/health/ready与Worker/health/ready五项runtime/database/objectStorage/provider/queue均ok。首次误查Web/health/ready仅404路由，正确端点正常。没有浏览器功能验收或真实生成。
- 两角色referenceStorage=cloud-development、emailDelivery=local-mailpit，仓库外开发配置保持。两份忽略适配器构建后恢复，临时launcher备份已正常清理；此前六份current日志保存为gg330-before-current-*，设置备份保留恢复用途。
- 当前来源包含GG-329上下文修复、GG-328文本UI及GG-323/326/327源码；分组云校验已随当前Web启用，无新增SQL需求，功能效果仍由用户手验。
- 结论：本地运行恢复完成，未部署；没有明确的原进程退出日志，不能断言是某项代码引起停机。下一步用户刷新原画布继续测试；下次启动核对Docker原E盘路径、唯一Worker和严格构建身份，当前receipt绑定94bee5354e5b1a77516235ee894a19a42767610e，后继文档不改写运行版本。
