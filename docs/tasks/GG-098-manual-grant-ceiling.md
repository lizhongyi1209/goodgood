# GG-098 — 单次充值上限提升到 1 万元，改为手动输入

- 状态：本地实现与验证完成；**未部署**
- 用户需求：站长当前单次充值最多 50 元（5000 积分）。改为单次最高 1 万元
  （1,000,000 积分）；删掉快捷积分选项，改为总是手动输入。
- 最后更新：2026-09-17
- 分支 / worktree：`feature/GG-098-manual-grant-ceiling` / F:/goodgood
- 基线：`d5741a0`（生产仍为 `5b65601` / 迁移 `0043`，见 CURRENT_STATE）

## 范围与验收

- 要做：单次手动发放上限 5000 → **1,000,000** 积分（100 积分 / 元，故 = ¥10,000）；
  移除账号管理对话框里的 `100 / 500 / 1000` 快捷按钮；输入框与提示文案改用共享常量。
- 不做：不改单价、不改充值业务规则（收款凭证、确认收款、幂等保持不变）；不开启支付/支付宝；
  不部署；不动生产数据；不改 JCOIN 或分发划拨的上限。
- 验收点：1,000,000 可提交并落库；1,000,001 被拒；快捷选项不再存在；服务端与数据库约束一致。
- 决策影响：不改变已确认的产品决定，属既有数值参数调整，不新建 ADR。

## 实现

上限原本写在**三处**，只改代码会让大额插入在数据库层失败，必须同时放宽约束：

| 位置 | 改动 |
| --- | --- |
| `shared/contracts/admin-credit-types.mjs` | 新增共享常量 `ADMIN_CREDIT_AMOUNT_MAX = 1_000_000`（单一来源） |
| `server/admin/api.mjs` | 两条校验（测试积分、分类积分）改用共享常量，报错文案带出上限 |
| `server/admin/repository.mjs` | `grantClassifiedCredits` 校验改用共享常量 |
| `features/admin/account-management-page.tsx` | 删除 `.admin-action-presets` 快捷按钮块；`max` 与提示文案改用常量并标注 ¥10,000 |
| `migrations/0044_gg098_raise_manual_grant_ceiling.sql` | 重建 `administrative_actions_status_check`，`credit_amount BETWEEN 1 AND 1000000` |

**迁移安全性**：`0044` 的两条约束整段照抄 `0039_gg081_classified_credit_grants.sql`，
只改一个数字。已用逐行 `diff` 核对，除该数字外与原文**完全一致**（status 块 46 行、
grant-type 块逐字相同），没有放宽任何其他条件，不修改/删除任何既有行。
`0011` 的同名约束早已被 `0039` 取代，无需再动。

## 验证

- 定向：`m8-account-admission`、`ci-workflow`、`gg081-classified-credit-grants` 共 **23/23 通过**。
- 完整 `npm run check:local`：**563 项（537 通过 / 26 隔离跳过 / 0 失败）**。
- **隔离 PostgreSQL 实测**（一次性命名库 `goodgood_gg098_ceiling_test`，无 Worker，用后删除；
  走真实 `grantClassifiedCredits`）：

  ```text
  latest migration: 0044_gg098_raise_manual_grant_ceiling.sql
  ADMIN_CREDIT_AMOUNT_MAX = 1000000
  ACCEPTED 5000 (old ceiling): 5000
  ACCEPTED 1000000 (RMB 10000): 1005000
  REJECTED 1000001: ADMIN_REQUEST_INVALID
  latest persisted credit_amount: 1000000
  ```

- 测试同时改为从共享常量与 migrations 目录派生，不再把 `5000` 和「最后一个迁移文件名」
  写死，避免以后每次调参/加迁移都要改测试：`ci-workflow`、`gg084-jcoin-postgres`、
  `gg091-account-invitations-postgres`、`gg081-classified-credit-grants`。
- 未做：真实浏览器点击提交（需本地栈与账户）；未部署。

## 本地站长身份（2026-09-19 调整）

验收时发现登录后是「个人」而非站长。原因：**本地与线上是两套独立数据库**，
`951565127@qq.com` 在本地只是 09-15 注册的普通 `active` 账户；本地站长是种子固定账户
`m3-local@goodgood.invalid`（`00000000-0000-4000-8000-000000000001`，`seed` 来源）。

- `accounts:bootstrap-site-owner` 是一次性的（已有站长即拒绝），UI 也只改企业/分销身份，
  没有转移站长的入口。
- `system_role_assignments` 有 **append-only 触发器**
  （`goodgood_reject_immutable_mutation`），删除被数据库拒绝——追加是该表唯一合法写入方式，
  也是生产库的实际形态（生产同样只有追加记录）。
- 处理：**追加**一条站长授权给 `0803ec37-9383-4c0c-8625-554c95811bf9`（`951565127@qq.com`），
  沿用原 `operation_hash`，`assigned_by_operator_id='local-operator-transfer'`，
  `idempotency_key='local-owner-grant-951565127-20260919'`。原种子行保留，未修改任何既有行。
- 用户已确认「保留现有数据」，未重置本地库。登录后需**重新登录**使会话带上新角色。
- `assertSiteOwner` 只校验调用者自身是否有 `site_owner` 行，不要求唯一，故本地存在两个站长
  不影响功能；这是本地测试便利，**不是生产形态**。

## 恢复工作

- 本地：`npm run build:checkpoint` + `verify:checkpoint` 后 `node scripts/local-checkpoint.mjs
  start workspace`，入口 `http://127.0.0.1:32131/login`。
- 数据边界：保留本地数据库、Worker 与素材；不自动创建或登录账户。
- 下一步：用户验收 UI（快捷选项已消失、上限文案为 ¥10,000）；如要上线，走
  `docs/DEPLOYMENT.md` 的「生产热修清单」，**注意本次带迁移 `0044`，属加列/改约束的
  向后兼容迁移，需按单 Worker 交接步骤执行**。
