# GG-065 — Compact model management

- 状态：本地实现、验证及原页面更新完成；未部署。
- 分支 / worktree：`fix/GG-065-compact-model-management` / `F:/goodgood-worktrees/GG-065`。
- Baseline: verified main ancestor, fast-forward GG-064 `f87dff5` for existing local page dependencies.
- 范围与验收：隐藏专线具体质量价格，列表保留按分辨率的范围，点击定价查看完整档位；960px 内容区与收紧的名称/价格/操作列，桌面和窄屏均方便查看。
- Decision: updated [ADR 0069](../decisions/0069-gpt-quality-pricing.md), superseding GG-064 at owner request.
- 实现与证据：移除列表质量矩阵，复用完整价格编辑器；不修改价格、启禁、账单和数据库。
- 下一步：用户在已保留的 32141 紧凑列表检查布局，通过定价弹窗继续本地试价。

## Verification and runtime

- Targeted SSR/documentation/release tests: 18/18 passed. npm run check:local passed lint/types/build; 448 passed / 17 opt-in skipped / zero failures.
- Chrome list width changed from 1526px to 960px; desktop columns 200/616/112px and gaps 16px (previous name/price/action 442.7/885.3/150px, gaps 24px). Quality-list sections zero, ranges retained.
- Click pricing then dedicated line: fifteen saved Sunburst tier values visible (low through max, 1K/2K/4K). Cancelled without saving; narrow viewport checked with no horizontal overflow, restored normal viewport and kept original list open.
- Local Web session 83314 from GG-065; Worker 79489 and mock 67415 from GG-063 unchanged. Three readiness endpoints 200 ready. No migration or database writes.
- Read-only before/after snapshots: all managed-model records and ten historical count/checksums identical. User prices, switches, names, Banana and archival state preserved.
- No paid calls, push/main merge or production deployment. Original page http://127.0.0.1:32141/admin/models updated.
