# GG-342 · 去除AI价格提示及公告/清理本地后台启用

- 日期：2026-10-03；用户要求移除按钮旁积分文字、点击直接生成，改完后更新后台，同时启用公告。
- 基线：干净31c2215，含3579444清理与GG-340铃铛。managed隔离codex/GG-342-cleanup-activation；源码精确接入GG-116，不启用子agent。
- 决策：扩展ADR0138，按钮只显示「去除AI」，悬停提示/无障碍名称包含每次10积分和清理范围；点击即时开始，不新增弹框、不改变10积分/失败不收费/重试幂等。
- 运行授权：本次明确授权本地后台更新所需构建、迁移0064/0065与仅Web重启及健康/版本检查；沿GG-276不扩大为lint/typecheck/测试或浏览器验收，不真实生成/扣费、发布公告、写统计fixture或部署生产。
- 已核对：原Web9448/32131、唯一Worker23800/32142、Vite33440/5173运行；本地54449/goodgood、63段迁移内容匹配，待执行仅0064_gg340_announcements.sql和0065_gg341_image_cleanup.sql，无新表。原登录/云开发存储配置保持；直接迁移模块不启用fixture。
- 范围：移除积分span并补title，必要文档，精确集成当前源码后构建；保留忽略启动适配器，迁移后更新Web，Worker/Vite保持。运行日志/适配器/配置不进入Git。
- 状态：实现并完成本地启用，必要构建与服务可用性核对通过；功能/收费/实时效果待用户手验，未部署生产。

- 集成：隔离ffe0ab3精确cherry-pick到67ffde7161f51ec3c4f73ae9dedabe210156a138，保留全部此前公告/清理与其他窗口源码。按钮移除积分span，title/aria-label保留10积分；即时执行onClick不加确认弹框。
- 构建：2026-10-03T09:55:46.555Z，local-checkpoint build成功（必要构建一次，未扩大测试）；sourceHash c903e10d103baf9844746323fceaeb7352310fb80ce021c6c511973aa282b18e；artifactHash f9f51f5d97736cab1bd67c013d5756606c1db8ecd72c02742b13e573f911f99b；artifactCount306。receipt绑定67ffde7，后续交接文档提交不改实际进程身份。
- 迁移：原63段checksum匹配，直接applyMigrations模块仅应用0064_gg340_announcements.sql、0065_gg341_image_cleanup.sql；65段全部就位，announcements/image_cleanup_operations及credit_ledger_entries.related_image_cleanup_id已具备；账户、资产与积分流水总数迁移前后一致，不启用fixture、不重置数据。
- 服务：更新前text_generation_jobs running为0，仅停止旧Web9448；原外部cloud-upload.env与登录配置保持，原ignored dist/local-checkpoint-portfix.mjs、local-live-dev-portfix.mjs在构建后恢复。新Web34460监听127.0.0.1:32131；唯一Worker23800/32142仍GG-330 verified94bee535，Vite33440/5173及其29228启动器保持。启动使用隐藏进程，日志与旧manifest/适配器备份在%TEMP%/goodgood-local-services，未进入Git。
- 可用性：Web /api/health/version200且verified67ffde7/PID34460/上述hash；Web /api/health/ready及Worker /health/ready200，database/objectStorage/provider/queue/runtime均ok；Vite /200与/api/health/version200且同Web身份。Vite代理/api/image-cleanup、/api/announcements、/api/admin/announcements未登录GET均401 SESSION_EXPIRED；未读取用户会话或进行处理/发布POST，未扣费或请求Provider。Web错误日志为空。
- 生命周期：创建1/退役1；隔离状态干净、无依赖/缓存/进程，managed辅助工作区已由工具确认归档，保留可恢复源码记录。
- 下一步：用户刷新5173，手验点击立即处理、10积分成功结算/失败回滚/原键恢复、副本相邻/资产库及下载清理效果；站长手验公告生命周期与两账户实时阅读通知。测试、浏览器验收和生产发布未获本次范围授权，不以健康检查冒充功能验收。
