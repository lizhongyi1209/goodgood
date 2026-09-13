# GG-066 — Restore adaptive model page width

- 状态：本地实现、验证及原页面更新完成；未部署。
- 分支 / worktree：`fix/GG-066-responsive-model-width` / `F:/goodgood-worktrees/GG-066`。
- Baseline: verified main ancestor plus GG-065 `96bb606` as the current local page dependency.
- 范围与验收：恢复嵌入页面自适应可用宽度及独立页面原有 1500px 上限；保留专线明细隐藏、紧凑间距和全部保存价格。
- Decision: updated [ADR 0069](../decisions/0069-gpt-quality-pricing.md), reversing only the GG-065 width cap at owner request.
- 实现与证据：仅移除嵌入内容区 960px 上限，并恢复独立页面原宽度。
- 下一步：用户在已恢复自适应宽度的 32141 页面继续本地定价测试。

## Verification / runtime

- Existing targeted tests 18/18 passed. npm run check:local passed lint/types/build; 448 passed / 17 opt-in skipped / zero failures.
- Chrome: embedded content/list 1526px, max-width none; retained 16px gaps and hidden quality details. Original page preserved.
- Local Web session 41801 from GG-066; GG-063 Worker 79489 and mock 67415 unchanged. Three readiness endpoints 200 ready.
- Read-only snapshots: all model records and ten historical count/checksums unchanged, including owner-adjusted GPT prices and model/line flags. No database writes, migrations, paid requests, push/main merge or production deployment.
- Page: http://127.0.0.1:32141/admin/models.
