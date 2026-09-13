# GG-063 — GPT quality pricing and fal estimates

- Status: Implemented, verified and filled on local preview; not deployed.
- Date: 2026-09-14
- Branch: `feature/GG-063-gpt-quality-pricing`
- Worktree: `F:/goodgood-worktrees/GG-063`
- Baseline: verified main ancestor; fast-forward GG-062 `dd27aff` as local page dependency.
- Decision: [ADR 0069](../decisions/0069-gpt-quality-pricing.md)

## Scope and acceptance

Save and quote GPT IMAGE 2 low/medium/high and GPT IMAGE 2.5 Sunburst/Flare low/medium/high/xhigh/max independently by line and resolution. Preserve flat prices, request IDs, names, switches, Banana settings and accepted-job prices. No production deployment or paid requests.

Prefill dedicated lines only: USD 1 = CNY 7, CNY 1 = 100 integer credits, rounded upward from original USD values. Special and quality lines retain user prices. Auto on quality-priced lines uses the highest configured price. Fal reference dimensions 1024x1024 / 2560x1440 / 3840x2160 do not change GoodGood request dimensions. These output estimates exclude inputs and retail margin.

Credits by 1K / 2K / 4K:

| Model | low | medium | high | xhigh | max |
| --- | --- | --- | --- | --- | --- |
| GPT IMAGE 2 | 5 / 5 / 9 | 38 / 40 / 71 | 148 / 156 / 281 | — | — |
| GPT IMAGE 2.5 both | 5 / 5 / 8 | 10 / 11 / 19 | 37 / 39 / 71 | 66 / 69 / 125 | 148 / 155 / 281 |

Sources: [GPT IMAGE 2](https://fal.ai/models/openai/gpt-image-2), [Sunburst](https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image), [Flare](https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image).

## Verification and handoff / 下一步

Disposable no-Worker database `goodgood_gg063_quality_test_v4` passed quality quotes/admission, project restore, failure release, stale prices, disable, pinned settlement and duplicate completion. The final gate, preview backup/migration, runtime restart, owner UI fill and preservation checks are complete, as recorded below. Real-provider 32140 remains untouched.

- Final gate: npm run check:local passed lint, types and build; 448 passed / 17 opt-in skipped / 0 failed. Previous gate documentation omissions and helper lint issue corrected. Targeted documentation tests 8/8 passed.
- Preview backup .gg063-before.dump (ignored), migration 0034 only, runtime from GG-063: Web 93625 / Worker 79489 / mock 67415. All three ready endpoints returned 200 ready.
- Owner UI saved 39 dedicated prices. Database verification passed all expected matrices, three model events, 144 added versions, unchanged names/switches/other line prices/Banana/archival state and eight historical checksums.
- Chrome reload/matrix screenshot and low vs auto calculator verified. Saved Sunburst editor left open. Source and local prices are separate; no production data or prices changed.
- 下一步：用户检查专线成本预估，加上利润与输入成本余量，再按需要开启模型和线路进行本地测试。
