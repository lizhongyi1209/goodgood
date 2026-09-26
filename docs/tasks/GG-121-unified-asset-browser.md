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
- Operator follow-up: replace the browser-native new-folder prompt with the
  centered in-page dialog shown in the supplied screenshot.
- Operator follow-up: six screenshots define the opened-folder surface: root
  breadcrumb and folder name, no root media tabs, folder-scoped search, empty
  upload target in grid/list, native file picker, bottom-right upload status,
  then the newly uploaded file in grid/list.
- Operator follow-up: on the `测试` folder page, the upper-right `上传文件`
  action should open the system file picker directly, with no upload dialog.
- Operator follow-up: folder tiles need the same bottom-right selection control
  as file cards. The shared bottom toolbar should show only Delete for folders,
  omitting Move and Start Chat. The folder's top-right menu should offer Delete
  and Rename, with Rename using the New Folder dialog layout.
- Operator follow-up invoking `$impeccable`: add a light hover veil to folders
  and media; keep unselected circles empty and menu triggers visible while open;
  match the Move submenu frame to the parent; remove grid video titles, show
  videos at source ratio with automatic previews; cap responsive grid at six
  columns.
- Operator follow-up invoking `$impeccable`: folder and media covers and names
  should keep the default arrow cursor on hover instead of the hand cursor.
- Operator follow-up invoking `$impeccable`: the asset grid currently places
  files in four of six available columns. Six populated columns should span
  the content width, with the right edge aligned below `新建`.

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
  gutter offers per-file and visible-file selection; folder rows open, select,
  and expose rename/delete. Folder and file selections remain separate; folder
  download, movement and nesting are unsupported.
- Grid folder tiles reveal menu and selection controls on hover/focus. Folder
  selection reuses the floating toolbar with count, red Delete and close only.
  Delete confirms that the contained assets return to the root. Rename uses
  the in-page New Folder dialog pattern, with the existing name prefilled.
- Folder and media hover uses a faint achromatic veil. Unselected grid controls
  remain empty; open menus retain their trigger. The Move submenu matches its
  parent frame. The grid shows up to six columns; video tiles keep their native
  ratio, hide titles and preview silently only while visible, honoring reduced
  motion.
- Folder and media covers and names use the default arrow cursor. Their menu
  and selection controls remain separately actionable.
- On wide screens, the first six files occupy all six columns across the asset
  content width. Additional files continue in close masonry below them while
  preserving each image and video ratio; narrower screens reduce columns.
- In an opened folder, provide a breadcrumb back to assets, folder search and
  the existing view switch. An empty folder offers direct picker/drop upload;
  show real row outcomes and failed-file retry in a compact progress tray.
- The upper-right upload action uses the same direct picker and progress tray.
  At the root, new files remain unclassified; inside a folder, they are placed
  in that folder. Canceling the picker leaves the page unchanged.
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
- The new-folder control now opens a Radix dialog with a labelled 64-character
  input, disabled empty submit, Enter and dismissal behavior. The dialog stays
  open with its value and a local error when the create API fails. The folder
  API and persistence rules are unchanged. Latest `npm run check:local` passed:
  **583 tests / 560 pass / 23 skip / 0 fail**, build/typecheck pass, lint 0
  errors / 109 existing warnings. Manual visual review is pending.
- Folder interior now hides root media tabs, retains grid/list controls and
  shows the empty upload target under list headings or directly under the
  breadcrumb in grid mode. Direct uploads reuse the existing media APIs and
  owner-scoped folder assignment. The progress tray reports row states/counts
  without fabricated byte percentages; failures keep their message and can be
  retried. API/persistence rules remain unchanged. Latest `npm run check:local`:
  **583 tests / 560 pass / 23 skip / 0 fail**, build/typecheck pass, lint 0
  errors / 109 existing warnings. Manual 5173 review pending.
- The upper-right upload menu now opens the native picker directly and starts
  the shared tray upload flow on selection. The old upload dialog, duplicate
  upload state and its CSS were removed. Root uploads remain unclassified;
  folder uploads capture the current folder. Failed rows can be retried for
  either destination. `npm run check:local` passed: **583 tests / 560 pass /
  23 skip / 0 fail**, build/typecheck pass, lint 0 errors / 109 existing
  warnings. The operator will check the picker and actual upload manually.
- Folder tiles now share file-card hover/focus menu and selection controls;
  list folder rows have an outside selection box. Folder and file selections
  cannot mix. The shared selection bar offers only count, Delete and close for
  folders; deletion confirms that their assets return to the root. Rename and
  New Folder use the same in-page dialog, including pending/error states.
  `npm run check:local` passed: **583 tests / 560 pass / 23 skip / 0 fail**;
  build/typecheck pass, lint 0 errors / 109 existing warnings. No real folder
  was renamed or deleted; operator browser review is pending.
- The hover refinement adds a restrained veil and leaves selection circles
  empty until selected. Open menus keep their trigger visible; the Move submenu
  now uses the parent menu frame. Video grid cards have no caption or forced
  4:3 crop; intrinsic dimensions control their height. A muted loop plays only
  while the grid preview is visible and motion is allowed. Both root and folder
  masonry cap at six responsive columns. `npm run check:local` passed: **583
  tests / 560 pass / 23 skip / 0 fail**; build/typecheck pass, lint 0 errors /
  109 existing warnings. Browser hover/video review remains with the operator.
- Folder and media cover buttons and their name buttons now use the default
  arrow cursor, including grid and list views; menu and selection controls
  retain their pointer cursor. `npm run check:local` passed: **583 tests / 560
  pass / 23 skip / 0 fail**; build/typecheck pass, lint 0 errors / 109 existing
  warnings. The operator will inspect the cursor behavior in 5173.
- The prior CSS multi-column layout balanced eight files into four occupied
  columns. The grid now establishes six columns across the full content width
  on wide screens and measures each tile for close masonry placement. Its
  ResizeObserver updates spans when an image, video or viewport changes size;
  the grid falls back to ordinary rows without that API. The right edge now
  shares the asset header's content edge below `新建`. Impeccable's layout
  detector returned no findings. `npm run check:local` passed: **583 tests /
  560 pass / 23 skip / 0 fail**; build/typecheck pass, lint 0 errors / 109
  existing warnings. The operator will review the rendered alignment in 5173.
- The existing 32131 Web was replaced with a verified local checkpoint after
  build/verify passed. `/api/health/version` reported `build.verified=true`;
  32131 readiness and 5173 `/assets` returned HTTP 200. 5173 and local Docker
  were not restarted. These are runtime checks, not browser acceptance.
- Browser layout and interaction have not been accepted by the agent; the
  operator will inspect 5173 manually. No real-provider generation, destructive
  test delete or production change was performed for this list refinement.

## 下一步

The operator checks 5173 for the folder interior, direct empty-state upload,
upper-right direct upload from the root and `测试` folder, upload tray,
new-folder/rename dialog, folder tile menu and selection bar, list folder
checkboxes, default arrow cursor/hover veil/empty selector/open menu, submenu frame, portrait and
landscape video previews, six columns filled to the header's right edge, combined folder/file rows, heading alignment,
row hover/menu/selection, the tag-free upload/menu, toolbar order and red
Delete, uploaded-file deletion, masonry, source filters, grid/list switch and
narrow screens. Address that feedback before any release decision; production
deployment remains a separate task.
