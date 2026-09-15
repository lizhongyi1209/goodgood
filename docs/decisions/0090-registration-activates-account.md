# ADR 0090 — 开放注册即激活，门禁与之对齐

- 状态：Accepted；日期：2026-09-15；任务：GG-097；替代 ADR 0020 中「新账户一律 `pending`，须站长逐个批准」的准入模型，并修正 `production:alpha-gate` 中仍描述该模型的验证项。

## 背景

GG-097 在 2026-09-15 完成生产发布执行后，`controlled-alpha-boundary` 与
`controlled-alpha-member-journey` 两项如实未通过。追查发现失败原因不是执行缺陷，
而是**门禁契约仍在描述已被取代的准入模型**：

- 门禁硬要求 `registrationDefaultState === "pending"` 且
  `siteOwnerApprovalRequired === true`；实际 `createEmailOwner`
  （`server/auth/email-repository.mjs`）直接建 `status='active'`，
  生产库 `pending` 用户数为 0、审批审计行为 0。
- 门禁硬要求 `welcomeCredits === 100`；实际 `WELCOME_CREDIT_AMOUNT = 200n`
  （`server/billing/repository.mjs:22`），元数据记 `images: 10`，单张 20 积分。
- 门禁要求 `pendingBeforeApproval === true` 与 `generationBlockedWhilePending === true`；
  实测注册后立即可创作并消耗真实 provider 费用。

这些字段描述的是 ADR 0020 的 Authing OIDC 时代模型。ADR 0089（2026-09-15）
已把注册改为「邮箱验证码 + 可选邀请码」，并明确指出「新注册账户依既有实现直接为
active，因此**开放注册即等于可创作**」。门禁契约没有随 ADR 0089 更新。

## 决定

站长 2026-09-15 明确：

> 我接受任何人注册成功后就激活。

据此确认产品意图：

1. **注册即激活是目标行为**，不是待修复的缺陷。新账户经邮箱验证码验证后建立为
   `active`，可立即创作并消耗积分。
2. **准入收口唯一依赖 `GOODGOOD_EMAIL_REGISTRATION_ENABLED`**。该开关关闭时，
   任何未绑定邮箱都无法注册；打开时对公网完全开放且不设人数上限。
3. **`pending` 与站长逐人审批不再是本阶段的准入控制**。ADR 0020 中与此相关的准入
   描述被本 ADR 替代；其关于站点所有者角色、审计与管理员控制台的决定继续有效。
4. **欢迎积分为 200**，与 `WELCOME_CREDIT_AMOUNT` 及当前扣费单位一致（单张 20 积分，
   即 10 张）。任何把该值写回 100 的文档或证据均为过期。
5. `production:alpha-gate` 的验证项改为描述上述已确认行为：
   - `controlled-alpha-boundary`：`registrationDefaultState` 改为 `"active"`，
     `siteOwnerApprovalRequired` 改为 `false`；其余边界项（维护遏制、私有资产、
     已审阅运行时、结账关闭、非敏感内容、延期项）不变。
   - `controlled-alpha-member-journey`：`welcomeCredits` 改为 `200`；
     删除 `pendingBeforeApproval` 与 `generationBlockedWhilePending` 两项
     （它们描述的是已放弃的模型，不是可观察的当前行为）。
6. **本 ADR 不放宽任何其他门禁**：维护遏制、精确候选证据、恢复演练、通知送达、
   跨账户拒绝、私有限读等全部保持原样。

## 影响

- 门禁重新描述产品实际行为后，`controlled-alpha-boundary` 与 `member-journey`
  可以如实取得 `pass`，无需写入不实值。
- **成本敞口显式化**：注册开关打开即意味着任何访问者都能立得 200 积分并消费真实
  O1Key 费用。这是站长已知并接受的取舍；运维上必须在开放注册期间监控发信量与
  生成速率。
- 垃圾注册与滥用防护不再由 `pending` 门承担。当前依赖邮箱验证码、发信限流
  （每邮箱 每小时 5 / 每日 20，每 IP 每小时 20 / 每日 100，全站 每小时 100 / 每日 500）
  与邀请码可选校验。**没有常驻 CAPTCHA**；若出现滥用，收口手段是关闭注册开关。
- 本 ADR 不修改 `server/auth/email-repository.mjs` 的任何行为，只修正验证契约与文档。

## 被本 ADR 修正的文档

- `scripts/production-readiness-contract.mjs`（验证项）
- `tests/m8-controlled-alpha-readiness.test.mjs`（对应断言）
- `infra/production/controlled-alpha-readiness-evidence.example.json`（示例）
- `infra/production/CONTROLLED_ALPHA_RUNBOOK.md`（`pending` 准入描述）
- `docs/tasks/GG-097-production-release-0019-to-0043.md`（5.1 的「100」与 B5 时序）
