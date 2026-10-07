# GG-414 · 本地启用 Nano Banana 2.1

- 日期：2026-10-07；状态：执行中。
- 用户授权：接续 GG-413「更新一下」，包含必要 checkpoint 构建、0069 本地迁移和 Web/唯一 Worker 更新；用户自行实际生图与浏览器验收。
- 基线：GG-116 干净 dc488a7，包含 GG-413 源码 556ec9e89385f007fe3dd1d037774cc4100f0ed6，祖先已核验。分支 chore/gg-414-nano-banana-21-activation，根 agent，无子 agent；创建/退役 worktree 均 0。
- 范围：仅本地 127.0.0.1:54449/goodgood；新增 0069 的独立模型/继承价格及三处约束，保留旧模型、用户数据、余额、素材及外部云开发/邮件/视频价格配置。更新 Web32131 和 Worker32142，Vite5173 保持。
- 决策：启用既有 ADR0108/GG-413，不新增产品决定；不触碰生产/GitHub/旧迁移、fixtures、模型凭据或实际付费任务。
- 启动事实：原 Docker 依赖健康，Web33512、唯一 Worker37036、Vite14404/入口35068 在线；原构建 e6fa39f。运行文件及 manifest 仓库外备份于 TEMP/goodgood-local-services/gg414-startup-backup。
- 验证：仅启动必需构建、具名本地数据库历史校验和/活动任务/预留/队列及迁移前后聚合、新模型/36条报价/约束、运行身份/readiness/页面HTTP。不运行 lint/typecheck/测试/代码检查/浏览器交互，不发生成请求。
- 下一步：确认没有在途生成后构建；迁移只应用0069，替换两个应用角色并确认唯一Worker，记录真实启用状态交用户手验。
