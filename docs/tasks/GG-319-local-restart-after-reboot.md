# GG-319 · 电脑重启后恢复本地项目

- 日期：2026-10-03；用户请求：电脑重启，恢复GoodGood项目。
- 基线：GG-116当前48750b9，包含GG-318失败诊断；根agent，仅运行恢复/文档，无子agent或新工作区，不改变既有决定。
- 范围：启动Docker Desktop和原goodgood-gg052依赖卷，严格来源要求下构建当前checkpoint并启动32131 Web、32142唯一Worker及5173 Vite。当前源码包含GG-318，本次Web/Worker同步启用；原cloud-development/local-mailpit配置与本地0063数据保持。
- 边界：仅恢复开发运行；不部署、不重置数据、不运行迁移/fixtures、测试/lint或浏览器验收、不主动发起生成/上传/真实provider探针。Worker启动前只读核对任务/队列/冻结，不新增第二Worker。
- 状态：本地运行恢复完成，已启用GG-318；未部署。页面5173首页200、API代理verified419b097，Web/Worker readiness五项均ok，云素材cloud-development及邮件local-mailpit保持；用户继续手验，历史HTTP详情仍不可回填。
- 生命周期：创建0/退役0，复用活动目录及现有依赖/忽略启动器，保留用户未跟踪目录。

## 恢复证据

- Docker原安装E:/Docker。初次启动使用C:/Users/Admin/AppData/Local/Docker/wsl新空数据盘，容器/卷为空；找到E:/docker/disk image/DockerDesktopWSL/disk/docker_data.vhdx，34,414,264,320bytes，最近修改2026-10-02 23:23。
- 正常docker desktop stop后备份settings-store.json到%TEMP%/goodgood-local-services/gg319-docker-settings-before.json，仅将CustomWslDistroDir恢复到原E盘DockerDesktopWSL，再启动Desktop；原goodgood-gg052 PostgreSQL/Valkey/RustFS及goodgood-gg044 Mailpit全部healthy且原端口恢复。没有移动、删除或初始化任何数据盘/卷。Docker自动恢复的其他既有服务未改。
- Worker启动前本地BEGIN READ ONLY：activeImages=0、activeText=0、pendingOutbox=0、个人/企业reserved=0，ready/processing队列各0；没有待恢复计费任务。未运行迁移/fixtures或provider请求。
- 必要npm run build:checkpoint成功；revision419b0970be6997957a5f47d2e1c7789c3adc3df6，sourceHash c3b8ac75a52e39627a9298e2999d140ba88bb28cd80776ad4048a7d1a58e865c，artifactHash1212f632435fc886ce033a3161321a4ada8340fe7853c402d1a266fa40c79299，295产物，builtAt2026-10-03T03:10:31.442Z。仅恢复所需构建，无源码修复或测试/lint/类型检查。
- GG-116当前版本同时运行Web PID28248/32131、唯一Worker PID28236/32142；Worker由旧GG-226角色更新到当前GG-116，未启动第二Worker。Vite启动器PID23268/监听PID33312/5173，保留原忽略启动器和仓库外云/开发密钥配置，未输出或提交凭据。
- HTTP仅启动可用性：5173首页200、API代理419b097/build.verified=true，32131及32142 readiness的runtime/database/objectStorage/provider/queue均ok；两个角色banner referenceStorage=cloud-development、emailDelivery=local-mailpit。未浏览器验收、读取真实素材或真实生成。
- 日志沿用%TEMP%/goodgood-local-services/current-{web,worker,vite}.{out,err}.log。Docker设置备份保留作恢复用途，临时启动器备份清理。PID为本轮证据，下次需重新查询。
- 下一步：用户打开http://127.0.0.1:5173/继续测试；新图片失败可在站长总日志详情查看诊断。下次启动使用GG-116 Web及唯一Worker当前来源，先确认Docker E盘数据目录/队列及严格构建身份，禁止另起旧GG-226 Worker。
