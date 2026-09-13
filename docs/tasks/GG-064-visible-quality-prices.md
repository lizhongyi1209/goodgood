# GG-064 — Always-visible image quality prices

- 状态：本地实现、验证及原页面更新完成；未部署。
- 分支 / worktree：`fix/GG-064-visible-quality-prices` / `F:/goodgood-worktrees/GG-064`。
- Baseline: verified main ancestor, fast-forward GG-063 `52ef01a` for existing local page dependencies.
- 范围与验收：图片模型列表常驻展示各质量对应的 1K/2K/4K 人民币和积分价格，无折叠；保留线路、固定价格、启禁和现有数据。
- Decision: updated [ADR 0069](../decisions/0069-gpt-quality-pricing.md), replacing the previous disclosure presentation at owner request.
- 实现与证据：复用现有质量矩阵，替换 details/summary 为具名 section，增加积分次要文字；针对现有 SSR 验证更新断言。
- 下一步：用户在已保留的 32141 页面速看各质量价格并继续本地定价测试。

## Verification / runtime

- Targeted SSR/docs: 11/11 passed. Full npm run check:local: lint/type/build passed, 447 passed / 17 opt-in skipped / one inherited documentation failure (missing domain context). Restored production and historical domain facts; documentation/release tests 15/15 passed. No subsequent code changes.
- Chrome: three named quality sections, zero article details/summary controls; saved RMB/credit values visible. Desktop and 375px narrow layout verified without horizontal overflow; temporary viewport reset.
- Local Web session 2875 from GG-064; existing Worker 79489 and mock 67415 from GG-063 unchanged. Readiness checks 200 ready. No migration, fixtures, provider requests or database writes.
- Read-only before/after snapshots: all managed models and ten historical count/checksums identical. Existing prices, names, switches and archived model preserved.
- Local only; no push/main merge/deployment. Page preserved at http://127.0.0.1:32141/admin/models.
