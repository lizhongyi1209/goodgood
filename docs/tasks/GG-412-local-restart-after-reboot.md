# GG-412 · 电脑重启后恢复本地项目

- 日期：2026-10-07，Asia/Shanghai；用户明确要求重启项目。
- 基线：GG-116干净HEADae9eebe，应用源码f4ebfc71f1efbcfab0f59ba275cab0cc4bdbc94a祖先已核验；分支codex/gg-412-local-restart-after-reboot。
- 初始事实：5173/32131/32142无监听；原Valkey56549、RustFS58049及Mailpit58045/58046健康。原PostgreSQL容器健康但54449映射缺失，Windows54358–54457保留范围覆盖该端口。
- 范围：沿GG-391保留原容器/卷、外部云开发与视频价格配置；恢复数据库端口、必要当前checkpoint构建、Web/唯一Worker/Vite。原在途任务只由正常恢复生命周期继续，不创建任务、fixture或主动付费请求。
- 决策：运行恢复，不改变产品决定，不新增ADR；不迁移/重置或操作生产。
- 验证边界：用户重启授权包含必要启动构建/运行身份及端口、只读本地状态和HTTP健康核对；不运行lint/typecheck/代码检查/测试/浏览器交互验收。
- 状态：本地恢复完成；启动必需构建及运行核对完成，浏览器/功能验收由用户进行，未部署。
- 下一步：用户打开5173原画布继续测试；后续纯文档提交不改写运行revision，下次重启按届时HEAD构建。
- 生命周期：复用集成运行目录，创建0/退役0，无子agent或新增依赖副本；不新增系统自启。

## 实际恢复回执

- [GG-412](tasks/GG-412-local-restart-after-reboot.md) 2026-10-07电脑重启恢复完成：原PG54449被Windows54358–54457保留范围覆盖，经管理员执行原方法重连同一容器网络，原卷/54449映射恢复、WinNAT Running。必要当前checkpoint构建verified e6fa39fa648c3991edb71a845b8b2f5e0a50cf63；Web33512/32131、唯一Worker37036/32142、Vite14404/5173（入口35068；隐藏启动器40168/40720/14832）恢复并跨命令保持。Web与Worker readiness五项ok，5173版本代理同revision/verified，首页及原画布HTTP200。最新GG-411及既有源码启用，原68迁移、云开发/Mailpit与外部视频临时价格保持；启动前图片/文本活动、未派发outbox、两队列均0，原视频1成功/0活动。无迁移/重置/fixture、主动生成/扣费或生产操作，仅必要启动构建/运行核对，无lint/typecheck/测试/浏览器验收。创建0/退役0，无子agent/依赖副本或自启；用户打开5173手验。
- 构建sourceHash a824237a468690a17c3f4cd22f8f356f04f040db34c313c068ee3e67209f98b2；artifactHash 480c11f945cc788a39401c1f5354a213bca51452e97383fa1c9b7bd1a20f54cb，311产物，builtAt 2026-10-07T02:31:03.824Z。仅必要build:checkpoint，无测试/检查；既有插件耗时及大chunk提示不阻止构建。verified表示Git/源与产物一致，不代表产品验收。
- 原容器goodgood-gg052-postgres-1/卷goodgood-gg052_postgres-data保留；先核验固定本地数据库127.0.0.1:54449/goodgood，再以BEGIN READ ONLY读取68迁移/活动计数。Worker前image/text活动0，video仅1 succeeded，未派发outbox及两条Valkey队列0。无SQL迁移/重置或写fixture。
- 系统管理员同意后的临时修复脚本位于仓库外TEMP/goodgood-local-services/gg412-restore-postgres-port.ps1，结果success true/WinNAT Running。原其他项目容器保持；旧日志/适配器/manifest备份于gg412-startup-backup。
- 构建后仅重建两个忽略启动适配器：导入指向scripts，允许旧56449配置但有效REDIS_URL仍56549。外部cloud-upload.env和video-pricing.env复用，无内容输出或改动；角色banner cloud-development/local-mailpit。独立隐藏CIM启动器gg412-detached-launch.ps1，运行回执gg412-runtime.json，日志仍固定current-{web,worker,vite}.{out,err}.log。
- Web正式健康路径/api/health/ready返回200（初步/health/ready探测404为路径不同），Worker/health/ready返回200；两个角色全部五项ok。5173/api/health/version同verified revision，首页及canvas/03aa7cf9-a763-4c7b-8756-21ddd9dc183b为200。Worker进程核对只有1个，Web33512/Worker37036/Vite14404跨命令保持监听。无浏览器交互、登录/生成请求或生产操作。
