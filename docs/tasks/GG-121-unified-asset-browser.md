# GG-121 — Unified asset browser

- Status: Local implementation and gate complete after operator correction; operator browser acceptance pending; not deployed.
- Baseline: GG-116 worktree `feature/GG-116-asset-history-actions` at `c1e740b`.
- Decisions: [ADR 0106](../decisions/0106-unified-asset-library-surface.md),
  [ADR 0107](../decisions/0107-asset-selection-and-tag-retirement.md).
- Request: 2026-09-26 operator supplied four ChatGPT library screenshots and
  invoked `$impeccable` for GoodGood's asset page. The operator confirmed that
  the `项目` section should contain asset files rather than saved creative sessions.
- Follow-up: The operator removed the tag feature, requested a selection bar
  containing Download, Move, and Delete without More, and specified a red
  Delete button with white icon/text. On clarification, the operator confirmed
  permanent deletion of uploaded images, videos, and audio too.

## Scope and acceptance

- Rename asset navigation/page to `资产`; replace history/library tabs with
  text-only `全部 / 图片 / 视频 / 音频` filtering and icon-only uploaded/generated
  source filters with Chinese hover/focus labels.
- Present folders above files in the referenced section structure. Do not add
  document formats; preserve the separate creative-project route.
- Use compact, aspect-preserving image masonry. Hover/focus shows actions and
  bottom-right selection; clicking the image still opens existing detail or
  private preview. Selection shows a floating multi-file toolbar.
- Provide working grid/list modes, name search, folder organization and upload.
  Remove tag controls and search. The selected-file toolbar contains Download,
  Move, Delete and close; delete confirms permanent removal for all file kinds.
  Preserve owner/workspace checks and generated-image credit notice.
- No browser acceptance by the agent; the operator will check the running 5173
  page manually. No production action.

## Verification and handoff

- `features/assets/asset-workspace.tsx` now combines generated and uploaded
  files, keeps newest-first ordering, filters by media/source/folder/search,
  renders folder tiles and masonry/list views, and provides card menu,
  selection and the floating toolbar. Generated images use their existing
  detail and hard-delete paths; uploaded image/video/audio files open private
  previews. Upload and folder organization remain available. Follow-up removed
  tag editing, upload tag input, tag search and toolbar More. Existing tag data
  is retained without a user-facing editor.
- Follow-up adds `/api/asset-files/:kind/:assetId` in both server runtimes for
  owner-scoped hard deletion of uploaded image/video/audio files. Reference
  rows become inaccessible tombstones to preserve foreign keys; video/audio
  rows are removed. Metadata clears transactionally before object deletion.
- Sidebar, composer and preview copy use the `资产` name. Existing creative
  projects remain on `/projects`; no document file type or backend migration.
- Targeted tests: 21/21 for creation copy, asset header, upload boundary and
  new filter/header behavior; documentation + asset route + new UI tests
  17/17. Typecheck and targeted lint pass.
- `npm run check:local`: **579 tests / 556 pass / 23 skip / 0 fail**;
  build and typecheck pass, lint 0 errors / 109 warnings (pre-existing
  application and bundled Impeccable scripts). `git diff --check` passes.
- Correction targeted tests: 18/18; uploaded file deletion covers reference,
  video and audio row changes, private object removal, foreign owner and
  invalid kind denial, transaction rollback, storage failure, and local Node
  route scope forwarding.
- Correction `npm run check:local`: **583 tests / 560 pass / 23 skip / 0 fail**;
  build and typecheck pass, lint 0 errors / 109 warnings. No destructive real
  file test or provider request was made.
- Browser layout and interaction have not been accepted by the agent; the
  operator will inspect 5173 manually. No real-provider generation, destructive
  test delete, production change or runtime restart was performed.

## 下一步

Update the existing 32131 local Web checkpoint so 5173's proxied uploaded-file
DELETE endpoint matches this code. The operator then checks 5173 for the tag-free
upload/menu, toolbar order and red Delete, uploaded-file deletion, masonry,
hover/selection, source filters, grid/list switch and narrow screens. Address
that feedback before any release decision; production deployment remains a
separate task.
