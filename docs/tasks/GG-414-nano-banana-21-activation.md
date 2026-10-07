# GG-414 · 本地启用 Nano Banana 2.1

- 日期：2026-10-07；状态：本地启用完成；运行核对完成，真实生图及浏览器验收由用户进行。
- 用户授权：接续 GG-413「更新一下」，包含必要 checkpoint 构建、0069 本地迁移和 Web/唯一 Worker 更新；用户自行实际生图与浏览器验收。
- 基线：GG-116 干净 dc488a7，包含 GG-413 源码 556ec9e89385f007fe3dd1d037774cc4100f0ed6，祖先已核验。分支 chore/gg-414-nano-banana-21-activation，根 agent，无子 agent；创建/退役 worktree 均 0。
- 范围：仅本地 127.0.0.1:54449/goodgood；新增 0069 的独立模型/继承价格及三处约束，保留旧模型、用户数据、余额、素材及外部云开发/邮件/视频价格配置。更新 Web32131 和 Worker32142，Vite5173 保持。
- 决策：启用既有 ADR0108/GG-413，不新增产品决定；不触碰生产/GitHub/旧迁移、fixtures、模型凭据或实际付费任务。
- 启动事实：原 Docker 依赖健康，Web33512、唯一 Worker37036、Vite14404/入口35068 在线；原构建 e6fa39f。运行文件及 manifest 仓库外备份于 TEMP/goodgood-local-services/gg414-startup-backup。
- 验证：仅启动必需构建、具名本地数据库历史校验和/活动任务/预留/队列及迁移前后聚合、新模型/36条报价/约束、运行身份/readiness/页面HTTP。不运行 lint/typecheck/测试/代码检查/浏览器交互，不发生成请求。
- 下一步：确认没有在途生成后构建；迁移只应用0069，替换两个应用角色并确认唯一Worker，记录真实启用状态交用户手验。

## 实际启用回执

- [GG-414](tasks/GG-414-nano-banana-21-activation.md) Nano Banana 2.1 已本地启用：用户明确授权更新，GG-413 源码556ec9e随必要checkpoint构建1dc37ee3a7a9d0ee839bf9ca78e004409d96f500启用；Web38980/32131、唯一Worker37240/32142（隐藏启动器34140/37308）替换，Vite14404/5173保持。仅0069应用到127.0.0.1:54449/goodgood，历史68迁移匹配，总69；新目录enabled、仅special线路，1K/2K/4K均20积分每张，1–12数量36条报价及6处约束validated。原用户/画布/资产/任务/流水计数、余额聚合、旧目录及旧报价指纹保持。两角色readiness五项ok，前端代理同verified新revision、原画布HTTP200；运行事件确认两角色一致。启动前活动生成/预留/outbox/两队列均0；原云开发/Mailpit/视频价格配置保持。未发生成/扣费、fixture、lint/typecheck/测试/浏览器验收、GitHub/生产操作。创建0/退役0，无子agent/新依赖副本；用户刷新5173手验新默认及本人实际生成。
- 构建sourceHash 8069b5354c1569aa83b718bc9dcfdd599c44ff3c517ab6b56e69412264c5233f；artifactHash a3a9bca040516ad9d7383a9bcfd6292ba41f68ae6a7e030a084104c894b8e287；311产物；builtAt 2026-10-07T02:49:23.510Z。启动校验verified为构建/源码一致，不代表实际模型效果验收。
- 0069 checksum 9c56a5bb9280a0495b4fa024d3849dc6224c9316bb10881209718d9fcecd1e95。直接调用applyMigrations，无fixture入口；历史68校验匹配、仅此一条新增，原数据/余额/旧配置指纹前后相同。初次只读聚合使用旧表名generated_assets失败且无写入，已按实际assets表重新读取；未影响迁移或用户数据。
- 外部证据：TEMP/goodgood-local-services/gg414-{before,after,migration,health,runtime}.json，旧启动适配器/manifest备份gg414-startup-backup，隐藏启动器gg414-detached-launch.ps1及固定current-*日志。未输出或修改凭据，无系统自启。
- 下一步：用户刷新原画布，新建图片节点默认为2.1；实际生成/参考图/保存和旧模型切换由用户验证。后续文档提交不改变实际运行1dc37ee；下一源码任务从届时HEAD核验556ec9e祖先后隔离。
