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
- Follow-up: In list mode, the `名称` heading was indented to the filename while
  the reference aligns it with the left edge of the thumbnail column. Align the
  heading left without moving date/size headings.
- Full-page list references clarify the remaining layout: folders and files
  share one table, file checkboxes live in a left gutter, row menus appear at
  the far right, and the top header stays on one row at desktop widths. Retain
  GoodGood's file types and the previously accepted selection toolbar actions.
- Operator follow-up: move the list selection boxes outside the row content so
  thumbnails and the `名称` heading align with the first media category above.

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
- In list mode, place root folders before files under one header. The selection
  gutter offers per-file and visible-file selection; folder rows open and expose
  rename/delete but do not pretend to support folder download or nesting.
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
- Full-page list refinement: root folders and files now share one list under
  aligned headings. File selection is in a left gutter, row menus sit at the
  right edge, and visible-file select all appears in the heading. The desktop
  title and controls stay on one line; narrow layouts reflow. Grid view keeps
  its folder tiles and aspect-preserving masonry. Touch devices always show
  list selection controls. Latest `npm run check:local`: **583 tests / 560 pass /
  23 skip / 0 fail** after the touch visibility adjustment; build and
  typecheck pass, lint 0 errors / 109 existing warnings.
- The list selection column is now positioned outside header/row content;
  thumbnail and `名称` start at the same inset as the first category label.
  Date/size columns retain their alignment, and narrow screens keep the
  external checkboxes within the viewport. The repeated `npm run check:local`
  passed: **583 tests / 560 pass / 23 skip / 0 fail**, typecheck/build pass,
  lint 0 errors / 109 existing warnings. Manual 5173 review is pending.
- The existing 32131 Web was replaced with a verified local checkpoint after
  build/verify passed. `/api/health/version` reported `build.verified=true`;
  32131 readiness and 5173 `/assets` returned HTTP 200. 5173 and local Docker
  were not restarted. These are runtime checks, not browser acceptance.
- Browser layout and interaction have not been accepted by the agent; the
  operator will inspect 5173 manually. No real-provider generation, destructive
  test delete or production change was performed for this list refinement.

## 下一步

The operator checks 5173 for combined folder/file rows, heading alignment,
row hover/menu/selection, the tag-free upload/menu, toolbar order and red
Delete, uploaded-file deletion, masonry, source filters, grid/list switch and
narrow screens. Address that feedback before any release decision; production
deployment remains a separate task.
