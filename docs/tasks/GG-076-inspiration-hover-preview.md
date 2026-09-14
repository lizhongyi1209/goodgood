# GG-076: 灵感卡片滑动预览与详情默认效果图

- Status: Implemented and verified locally; not deployed
- Branch: fix/GG-076-inspiration-hover-preview
- Worktree: F:/goodgood-worktrees/GG-076
- Baseline: verified main bab17fd plus fast-forward accepted GG07564c2a10
- Decision: ADR0077 refined before implementation; no backend/privacy changes.

## Scope

Hover-mode cases preview the selected before/after wipe directly on board cards.
Default/resting detail displays the full processed output, enters wipe at pointer
position and restores processed output on leave. Reuse one frame across board,
detail/editor; preserve ratio, opening/like actions and accessible detail controls.
No new data/schema, no provider calls/publication/deployment.

## Current checkpoint and 下一步

Inspected comparison/frame and board. Existing wipe starts/resets50% and cards
render only output. Board cover is a button: embedded wipe must omit range input
to avoid nested interactive controls, while detail retains range access.

Shared CaseWipe now initializes/resets0% before exposure, reveals on pointer
enter/move, and supports detail focus/keyboard/touch range. Compact board mode
omits controls and preserves contained images in the original ratio cover.
Board activates wipe only for selected hover mode with an available before;
normal/side-by-side covers remain output images. Targeted14/14, docs/release15/15.
Named goodgood_gg076_inspiration_ui_test_20260914 setup without Worker/outbox;
original zero active jobs and preservation baseline captured. Full gate passed:517 total,496 pass,21 opt-in skips,0 failures.

## Verified handoff

Mock/no-Worker UI proved board wipe at pointer≈81%, leaving reset0%/no seam;
case-opening works and detail starts0% with full processed image. Detail pointer
move≈75%, leaving0%, keyboard adjusts0→1;390px viewport has no page overflow.
Temporary32144 Web34809 stopped, exact fixture DB and four synthetic objects
removed; no editor publications/outbox/private jobs. Original models/events,
38 historical tables, profiles and cases/likes/events snapshots unchanged.

Original local Web76141 now runs GG076 at32141; backend unchanged so Worker56339
(GG074) and mock-provider91616 at32143 retained. No schema migrations, paid calls
or original case modifications. JONY site owner retained.
Original user's existing hover case now visibly has the board wipe badge, opens
detail at range0 with no comparison seam, and is kept open for owner review.
Ignored .gg052-local.mjs and server/runtime/.gg052-web.mjs in GG076 restore local Web; loopback54449/goodgood,
Redis56449 DB0 and RustFS58049/58050 unchanged. Root/real-provider32140 untouched.
Local gate lint/typecheck/build and517 tests passed; targeted14/14,
docs/release15/15. Normalized staged diff checked before local commit.

下一步：owner checks their hover-case cover and detail resting/moving/leave states
on original32141. Local commit only; not pushed/merged/deployed.
