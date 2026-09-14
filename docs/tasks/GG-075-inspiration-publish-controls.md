# GG-075: 灵感发布图标、效果对比与确认反馈

- Status: Implemented and verified locally; not deployed
- Branch: fix/GG-075-inspiration-publish-controls
- Worktree: F:/goodgood-worktrees/GG-075
- Baseline: verified main bab17fd, fast-forward accepted GG074 fa5a080
- Decision: Refines ADR0077; no product/persistence/privacy decision changes.

## Scope and acceptance

Publish icon matches inspiration navigation on desktop/mobile. Always show an
effect comparison section: choose the work's available reference thumbnail as
before, generated output as effect; choose side-by-side or pointer wipe. No
references shows an explanation, not vanished settings. Unchecked publish consent
shows an explicit accessible inline reminder without sending a request; checking
clears it. Preserve prices, works, profile and financial history.

## Current checkpoint and 下一步

Inspected real editor/source SQL. Options correctly come only from the original
batch's available owned personal references. Empty batch currently hides both
reference and mode controls. Consent disables submit and yields no feedback.
No backend/schema change needed; no paid provider calls or production actions.

Implemented always-visible comparison section with owned-reference thumbnails,
effect-only choice, persistent modes and explained no-reference state. Publish
validates consent/title/preset before request, announces and focuses missing
consent, and clears it on checking. LayoutGrid is shared across publish/sidebar/
mobile inspiration actions. Targeted GG075/GG074 checks passed 9/9.
Named temporary UI DB goodgood_gg075_inspiration_ui_test_20260914 initialized
without a Worker/outbox; no real provider attached. Stable full gate in progress.
Original zero active jobs and data preservation baseline captured.

Browser QA: own reference thumbnail selected by default; switching effect-only
removes before image and disables visible modes; selecting reference and hover
restores comparison. Unchecked publish gives explicit alert and checkbox focus,
checking clears it; mouse and keyboard submission verified. 390px viewport has
no horizontal overflow. Temporary Web35941 stopped and fixture DB/four exact
synthetic objects removed; confirmed zero editor publications/outbox/private jobs.
Preservation checks passed for all38 historical tables, model prices/events,
profiles and original cases/likes/events. Original user editor contains no batch
references, explaining the prior missing settings. No original data writes.
Initial gate found BACKLOG101-line limit and required production/historical host
identity in current checkpoint; documentation repaired, docs/release15/15 passed.
Stable full gate now running. No functional test failure; lint warnings cleared
by reusing PrivateObjectImage and removing an unused icon import.

## Final verification and runtime

- npm run check:local passed: 515 total, 494 pass, 21 opt-in skips, 0 failures;
  lint/typecheck/build passed. Targeted GG075/GG0749/9 and docs/release15/15.
- Original local Web73491 now runs GG075 at32141, original Worker56339 remains
  GG074 because backend is unchanged; mock-provider91616 at32143 retained.
- No schema migration or original publication/generation/price edits performed.
  All model/event and38 historical table hashes, profiles/cases/likes/events
  preserved. JONY owner login/avatar restored in original editor.
- Original no-reference editor visibly shows effect-only explanation and disabled
  modes; unchecked publish produced the expected alert. Browser kept in editor.
- Ignored .gg052-local.mjs and server/runtime/.gg052-web.mjs in GG075 restore
  local Web; loopback54449/goodgood, Redis56449 DB0, RustFS58049/58050 unchanged.
- Temporary32144 Web and exact fixture DB/four objects removed. No fixture
  Worker, generation outbox or editor publication. Unrelated32140/root untouched.

下一步：owner checks comparison thumbnails on a work generated with references,
or the explained effect-only state on the existing no-reference trial work;
checks missing-consent reminder. Local commit only; not pushed/merged/deployed.
