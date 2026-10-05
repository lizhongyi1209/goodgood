# GG-385 · 临时定价并启用本地画布视频节点

- 日期：2026-10-05，Asia/Shanghai。用户明确委托任意临时价格并启用更新，用于自行检查画布UI。
- 基线：GG-116/fix/GG-275-text-editor-layout，b05a21e；视频源码6181bdf306cc85a2c59313e41b34d4d760fbf941。
- 范围：保护现有数据，核对本地127.0.0.1:54449/goodgood；仅应用0067/0068，必要checkpoint构建，更新Web32131及唯一Worker32142，保留Vite5173。
- 临时价格（每秒积分）：Omni720p=10、1080p=20、4k=40；动作模仿720p=10、1080p=20。默认Omni720p/5秒=50积分。价格不代表供应商货币成本。
- 决策：遵循ADR0143计价结构；本次用户授权代理选择临时数值及本地激活。运行需要的构建和就绪核对已授权；不运行测试/lint/typecheck/check:local或浏览器验收，不发生成/重放请求或扣费，不操作生产。
- 初始事实：Web29548/32131、唯一Worker28916/32142、Vite17388/5173在线；旧运行revision d183b918ea139c429630a7177905fd2c60cbee93。历史66迁移校验和全部匹配，待应用仅0067/0068。
- 配置：仓库外LOCALAPPDATA/GoodGood/local-video-generation/video-pricing.env；只含GOODGOOD_VIDEO_CREDIT_RATES_JSON。沿原云凭据及本地Mailpit配置。
- 生命周期：运行及纯文档任务复用现有干净集成目录，创建0/退役0，无子agent/新依赖缓存。
- 状态：本地临时定价/增量迁移/构建及后台启用完成，未做自动功能验收、未部署生产。
- 下一步：用户刷新5173画布，右键→视频生成，手验chat三块及条件参数；真实生成效果及后续正式价格待用户评定。

## 启用结果

- GG-385已本地启用：用户授权临时定价及更新；Omni720p/1080p/4k每秒10/20/40积分，动作模仿720p/1080p每秒10/20积分，默认Omni720p五秒50积分。配置在仓库外LOCALAPPDATA/GoodGood/local-video-generation/video-pricing.env，以Node --env-file传给Web/唯一Worker。0067/0068已顺序应用到127.0.0.1:54449/goodgood，历史校验和匹配、总68迁移、原用户/画布/资产/任务/流水及余额聚合保持，视频任务0。必要checkpoint构建5fd584da7c1dad3ed5154fad05bdd94cf32c10a1；Web20564/32131、唯一Worker16116/32142，隐藏启动器35248/26392，Vite17388/5173保持。两角色readiness五项ok、API代理同构建身份、画布HTTP200；未登录探测新视频能力接口401符合保护规则，不创建登录或任务。默认报价读取50积分，真实生成、扣费、代码检查/测试及浏览器交互验收未执行，生产未操作；UI由用户刷新手验。创建0/退役0，无子agent/新依赖缓存。
- sourceHash 2b9fa9fc7ef5e23c6a662c859f60542cefbff77d921dd8007f10fb7e5022b260；artifactHash e2b4665f8089c54dd2d0b309e75334f68e5303e6ba9dcda4967dd69dfce2655a，310产物，builtAt2026-10-05T15:36:06.066Z。build.verified仅表示源/产物指纹匹配，不代表测试或功能验收。
- 启动前图片/文本/视频活动任务均0；既有22成功/6失败/1取消图片及7成功/1失败/1取消文本任务保留。只调用直接applyMigrations，未运行带本地fixture的旧migrate包装器。
- Web旧29548及Worker旧28916确认端口身份后停止，避免并行Worker；原云参考存储cloud-development/邮件local-mailpit保留，不重复安装依赖。
- 仓库外TEMP/goodgood-local-services：gg385-startup-backup备份原入口/manifest/角色日志；gg385-detached-launch.ps1隐藏CIM独立启动器；gg385-migrations.json与gg385-runtime.json保存本次运行记录；角色日志复用current-{web,worker}.{out,err}.log。无自启/计划任务/自动重启。
- 后续纯文档提交不改变本次运行revision；再次启动时按届时HEAD构建，恢复忽略本机Valkey适配器，并继续传入外部视频价格文件。
