# GG-074: 案例编辑页与隐藏预设

- Status: Implemented and verified locally; not deployed
- Branch: feature/GG-074-inspiration-editor
- Worktree: F:/goodgood-worktrees/GG-074
- Baseline: verified main bab17fd + fast-forward GG073 0a80849
- Decision: [ADR0077](../decisions/0077-inspiration-editor-private-presets.md)

## Scope

Dedicated author editing page; editable reusable prompt and public/hidden choice;
side-by-side or pointer-wipe comparison; public normal-composer reuse and hidden
optional supplement reproduction with server-only final prompt, durable jobs,
current pricing, permissions, failure and retry behavior. Preserve original local
prices/profile/works/ledgers. No paid generation, deployment or main merge.

## Current checkpoint and 下一步

Implemented dedicated editing/reproduction views and privacy-safe case DTOs,
atomic private prompt/job/billing/outbox persistence, Worker and frozen retry.
GG074 named no-Worker SQL passed 1/1; GG073 and GG072 SQL regressions each 1/1.
Isolated UI DB goodgood_gg074_inspiration_ui_test_20260914, Redis 15,
Web 32144 and mock-only Worker 32145: empty supplement and nonempty supplement
both succeeded with own material and 200 → 180 → 160 fixture credits. SQL verified
private final prompts and sanitized normal records; public case published with
edited prompt and reused in editable composer. Both comparison modes, pointer
drag 50 → 80, keyboard 50 → 51 and 390px editor without overflow verified.
Full gate npm run check:local passed: 512 total, 491 pass, 21 opt-in skips,
0 failures. Earlier source assertions were updated for sanitized preset storage
(GG040) and the dedicated return callback (GG050); targeted regressions passed.
Only actual migration0037 applied to original local database; existing migration
checksums were preserved, without replaying old pricing conversions. All 38 other
historical table hashes, all models and model events, profiles and original case/
like/event rows unchanged. Original case tables remain empty; private rows zero.
JONY name/avatar and site-owner login restored at 32141; original image detail
opened the dedicated editor and cancelled safely back to board. No original publications.
Temporary Web/Worker stopped; exact UI DB and six synthetic objects removed.
Final documentation continuity 8/8 and normalized staged diff checks passed.

## Runtime handoff

- Original local Web session 37007, Worker session 56339, cwd GG074.
- http://127.0.0.1:32141/inspiration; mock Worker health 32142.
- Mock provider session91616 at32143 retained; loopback DB54449/goodgood,
  Redis56449 DB0 and RustFS58049/58050 remain original local stack.
- Ignored .gg052-local.mjs and server/runtime/.gg052-web.mjs restore local runtime.
- Root fix/GG024 worktree and unrelated real-provider32140 remain untouched.

下一步：owner tries the dedicated editor from a generated image, visibility choices
and comparison previews. Hidden preset generation uses normal backend billing;
no paid-provider validation, production deployment, push or main merge performed.
