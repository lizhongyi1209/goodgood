# GG-071: 站点运营看板与总日志

- Status: Implemented and locally verified; not deployed
- Branch: feature/GG-071-site-operations
- Worktree: F:/goodgood-worktrees/GG-071
- Baseline: verified main bab17fd + fast-forward GG-070 04fb519
- Decision: [ADR 0074](../decisions/0074-site-operations-and-global-log.md)

## Scope and acceptance

Owner-only same-shell daily dashboard and searchable task/credit log, including
personal and enterprise funds. Shanghai calendar boundaries; exact current-unit
credits; no double-counted reservation/settlement. Task detail shows immutable
parameters and financial timeline. Filter by mailbox/task/batch, time and state
or event; bounded pagination. Preserve existing account audit and creation state.
Read-only, no synthetic preview writes, no paid requests or production changes.

## Current checkpoint

Read-only repository/services, Node/framework routes and dashboard/log/detail UI
implemented. Shanghai boundaries use explicit timestamp casts; arbitrary-version
historical MD5 UUIDs remain valid for details/cursors. Personal/enterprise units
normalize exactly; exchange grants and duplicate member-budget accounting excluded.
No current-model repricing, prompts/private URLs/provider payloads in detail DTOs.

Existing dependency volumes retained. Reboot left Windows port reservations over
55449/59049/59050; only three named goodgood-gg052 dependency containers recreated
with PG54449/storage58049/58050, Valkey56449 unchanged. No reset/migration. Other
Docker auto-started stacks untouched; no real-provider32140 requests or fixtures.
Ignored .gg052-local.mjs uses those ports and mock provider only. Runtime:
Web39107 at32141, Worker46152 at32142, mock91616 at32143. Old Web45055 stopped.

## 实现与证据

- Targeted feature/navigation tests17/17. Isolated SQL1/1 in a named empty
  goodgood_gg071_operations_test_20260914 database with no peer/Worker connections;
  production projection queries ran under BEGIN READ ONLY. Fixture DB removed.
  Covers midnight/end exclusion, submitted versus completed dates, two funds,
  historical conversion, >2^53 exact amounts, immutable quotes, filtering/keysets.
- npm run check:local ran once: lint/types/production build and491 tests;
  470 passed,18 opt-in skipped,3 documentation-contract failures. Repaired only
  docs (BACKLOG100-line limit, resumable task 下一步, ADR index); documentation
  tests8/8 passed afterward. No runtime/test change after that gate.
- Browser original user tab1648145248: authenticated owner retained, same-shell
  links/direct refresh; yesterday1 creator/2 registrations/1 successful task and
  21 credits/¥0.21 agree with task quote and reserve/settle timeline.
- User-email and exact-task filters, settle filter and empty results verified.
  Historical welcome grant ID opens with200 credits/¥2.00. Esc restores trigger
  focus. Final detail uses Chinese close/quality labels and640px desktop width.
- 390px viewport: detail full-width390, table scroll confined to370px area;
  dashboard7/30-day bars scroll internally with no document overflow. Temporary
  viewport reset; desktop restored and dashboard left open for user.
- Before/after snapshots:39 non-model tables plus full managed_models and model
  event records/counts/hashes identical. No model save, preview ledger/queue or
  generation write; no paid requests, push, main merge or production changes.

## 下一步 / Verification and delivery

下一步：站长检查 http://127.0.0.1:32141/admin/operations 与 /admin/logs。
Local task-related changes committed at handoff; deployment remains unrequested.
Current video preview has no durable job/ledger and is explicitly excluded;
formal video persistence/billing integration requires its own implementation slice.
