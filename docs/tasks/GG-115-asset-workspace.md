# GG-115 — Asset history and personal library

- Status: local implementation, gate, and checkpoint HTTP smoke verified; authenticated browser acceptance pending; not deployed.
- Baseline: GG-114 `3665087`; branch `feature/GG-115-asset-workspace`;
  worktree `F:/goodgood-worktrees/GG-115`.
- Decision: [ADR 0102](../decisions/0102-asset-history-library-and-upload.md).

## Scope and acceptance

Default `/assets` to generation history grouped by date, with all/image/video/
audio counters and truthful empty states. Personal library includes generated
and accepted uploaded media automatically; create and open folders, move items,
search/filter, and edit optional tags without duplicating objects. Add a
GoodGood-styled asset upload dialog with folder/tag choice, supported format and
20 MiB validation, per-file progress/failure recovery, and upload-to-library
refresh. Reuse existing private image/video pipelines and introduce durable MP3
storage and playback. The composer and other upload entry points use the same
20 MiB ceiling for new files. Keep old files readable, projects independent,
owner/workspace isolation, private previews, original detail, and refresh/back
navigation.

## Implementation

- `features/assets/asset-workspace.tsx` provides history, filters, folders,
  search, tags, private media cards, and a Radix upload dialog. Generated
  outputs enter the library through the existing asset IDs.
- Migration `0046` adds organization and audio material tables. Authenticated
  Node and Next routes enforce owner/workspace checks. MP3 uses signed direct
  PUT, post-upload size/type/header validation, private reads, and dry-run-first
  cleanup shared with video.
- Shared new-upload contracts require at most 20 MiB and JPEG/PNG/MP4/MP3.
  Image editing exports PNG. Existing objects are not rewritten.

## Verification and handoff

- Targeted GG-115 and GG-104 tests: 8/8 pass.
- `npm run check:local`: 592 tests, 566 pass, 26 isolated skips, 0 fail;
  lint/typecheck/build pass (16 existing lint warnings).
- Local database confirmed on `127.0.0.1:54449/goodgood`, Worker 32142 off;
  migration `0046` applied transactionally and verified 45→46 entries.
- Commit `eb751eb` built and verified as the exact checkpoint. 5173 Vite and
  32131 Web now serve GG-115: `/assets`, readiness, and proxied version return
  200; unauthenticated organization/audio routes return 401. Worker 32142
  stays off. Production remains unchanged.

## 下一步

Inspect authenticated history, personal library, folder organization, a
disposable image upload, preview, and refresh on 5173. Record browser evidence
and any remaining limitation before closing the local acceptance.
