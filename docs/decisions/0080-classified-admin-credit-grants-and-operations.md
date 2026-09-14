# ADR 0080 — 结构化站长积分入账与运营口径

- Status: Accepted
- Date: 2026-09-14
- Task: [GG-081](../tasks/GG-081-credit-types-operations.md)
- Refines: ADR0010/0043的操作命令充值登记边界，ADR0074的提交量统计。

用户提出并同意用下拉定义积分类型，及默认运营看板/充值数据/并发统计。本地实现新增受限site-owner积分入账端点，复用active身份、CSRF、幂等与不可变支付/积分账本；不是客户支付、现金收取或JCOIN发币许可。

类型为paid_recharge/gift/promotion/test/service_compensation/other，中文标签分离；备注仅解释。默认测试，服务端拒绝未知类型。充值必须明确已确认收款与8—200字符稳定凭证，一期按当前100积分/CNY线性价格且1—5000积分，不允许客户端任意汇率/赠品。当笔充值金额由付费积分精确推导，固定价目采用服务端按数量创建的不可变内部商品快照；它不进入客户商品目录。充值通过正常PaymentOrder转paid及payment_funded入账，与manual操作命令共用凭证互斥检查。赠品以独立赠送入账。

管理员原始入账类型在审计中单独保存。类型/金额/凭证/原因进入操作指纹；同键重放不重复入账，同凭证另一请求拒绝。旧test-credit-grants仍只写测试赠送，旧备注/流水不改写。退款继续关联原结算，不由普通补偿入账冒充。生产权限和历史来源修正另属具体任务。

站长统一入口默认/admin/operations，指定管理深链接保持。现金充值只计manual真实已确认订单，排除fake；其他真实provider未来明确接入后才能扩展，不凭名称默认可信。金额来自订单currency/money_amount_minor，积分按已知单位归一，按paid_at北京时间账期统计。

生成任务当前并发为running/refining，queued单列；它不是上游请求并发。趋势与日表用started_at到completed_at/当前时刻的重叠峰值，同时间结束/开始合并避免虚假峰值。不能可靠还原的历史为暂无统计；任务提交数从看板移除，任务总日志保留。现有无正式任务/结算的视频预览排除。
