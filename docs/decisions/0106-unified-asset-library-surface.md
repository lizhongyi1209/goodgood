# ADR 0106: Unified asset surface and file selection

- Status: Accepted for GG-121 local implementation; selection actions and tag controls superseded by ADR 0107
- Date: 2026-09-26
- Task: GG-121
- Supersedes: ADR 0102's separate history/library presentation and visible media counts; object ownership, upload and folder rules remain in force.

## Context

The operator supplied four visual references for a calmer asset browser. The
current `/assets` surface separates generated history from the personal library,
repeats media filters with counts, and presents uploaded files as metadata cards.
The operator confirmed that the reference's `项目` section means asset files,
not GoodGood's resumable creative projects.

## Decision

- Name the page and navigation entry `资产`. Show one combined owner-scoped view
  of generated and uploaded assets, sorted newest first. `全部 / 图片 / 视频 / 音频`
  are text-only filters without counts. Source buttons for `已上传` and `已生成`
  sit beside the grid/list controls as icon-only toggles with Chinese tooltips.
- Show folders as large, quiet folder tiles above a `项目` section containing
  asset files. Opening a folder narrows the same file collection. Creative
  projects remain separate resumable sessions and are not turned into folders
  or duplicated as file cards. Document formats are outside this slice.
- An opened folder uses a clickable `资产 / 文件夹名` breadcrumb, folder-scoped
  search and the same grid/list controls. Media categories are hidden inside
  the folder. When no file matches an unfiltered empty folder, show a large
  upload target; in list mode, keep the table headings above it. Choosing or
  dropping files uploads directly to that folder and reports per-file outcomes
  in a dismissible progress tray. Do not invent byte percentages when the
  upload boundary does not expose them. Existing ownership and 20 MiB/media
  constraints remain in force.
- The upper-right `新建 → 上传文件` action opens the native file picker directly.
  Selected files begin uploading immediately and use the same progress tray as
  the empty-folder upload target. Files chosen inside a folder are assigned to
  that folder; files chosen at the root remain unclassified. No in-page upload
  dialog or extra save step is shown.
- In list mode, show root folders first and files below them in one table under
  the same `名称 / 修改日期 / 大小` headings; omit the grid-only section headings and
  empty-folder placeholder. A folder row opens that folder and exposes rename
  and delete in its row menu. File rows show a selection box outside the left
  row edge and a right hover/focus menu; the `名称` heading and thumbnail column
  align with the first media category above. The top selection box selects
  visible files only because folder download and folder movement are not
  supported. This refines the
  grid/list presentation after the operator supplied full-page list references.
- The image grid preserves each image's aspect ratio in a compact masonry
  arrangement. Hover or keyboard focus reveals file actions and a distinct
  bottom-right selection control; opening the image still enters its existing
  detail/preview. A floating toolbar appears for selected files, with actions
  backed by current capabilities. Grid and list are alternate views of the same
  filtered files.
- The initial selection toolbar only exposed deletion for generated images;
  ADR 0107 supersedes that scope after the operator explicitly confirmed
  permanent deletion for uploaded images, videos, and audio too.
- Keep GoodGood's achromatic design and accessible focus, keyboard, touch,
  loading, empty and error behavior. Reference screenshots guide layout and
  interaction, not a literal copy of the source product.

## Consequences

The source filter now provides the generated-only history view without a
separate page tab. This is a browser/UI change; no schema migration, new media
type, production deployment or new project semantics are required.
