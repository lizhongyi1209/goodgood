# ADR 0070 — Seedance 实际 tokens 定价

- Status: Accepted
- Date: 2026-09-14
- Task: [GG-067](../tasks/GG-067-seedance-token-pricing.md)
- Supersedes: ADR 0062、0063 的视频按秒销售规则；图片规则不变。

用户确认视频最终按接口返回的 completion_tokens 结算，以人民币为锚，1 元 = 100 积分。后台按模型、分辨率、是否含参考视频配置每百万 tokens 人民币售价；实际用量已包含参考视频，不再追加参考秒费用。参考图、音频不独立加价。

配置存于现有规格 JSON：billing 为 tokens，output 为无参考视频的积分/百万 tokens，input 为含参考视频的积分/百万 tokens。这两项是互斥费率，不相加。旧秒价没有 billing 字段，保留历史语义，不自动解释为 token 价格。编辑旧视频规格需重新填写 token 售价。

金额 = completion_tokens × 所选人民币单价 ÷ 1,000,000；整单积分只向上取整一次。读取 metadata.usage.completion_tokens，并兼容顶层 usage.completion_tokens；不使用 total_tokens 推断可计费用量，缺失/非法用量不能当零结算。

GG-067 仅实现定价配置、试算和响应解析，填入本地 mock 预览的官方常规原价，不打折、不改变模型启禁，不部署。正式任务的预扣、价格快照、补退结算与用量缺失待核对属于后续实施。
