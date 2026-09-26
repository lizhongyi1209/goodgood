# GG-121 — Unified asset browser

- Status: Local implementation and gate complete; operator browser acceptance pending; not deployed.
- Baseline: GG-116 worktree `feature/GG-116-asset-history-actions` at `c1e740b`.
- Decision: [ADR 0106](../decisions/0106-unified-asset-library-surface.md).
- Request: 2026-09-26 operator supplied four ChatGPT library screenshots and
  invoked `$impeccable` for GoodGood's asset page. The operator confirmed that
  the `项目` section should contain asset files rather than saved creative sessions.

## Scope and acceptance

- Rename asset navigation/page to `资产`; replace history/library tabs with
  text-only `全部 / 图片 / 视频 / 音频` filtering and icon-only uploaded/generated
  source filters with Chinese hover/focus labels.
- Present folders above files in the referenced section structure. Do not add
  document formats; preserve the separate creative-project route.
- Use compact, aspect-preserving image masonry. Hover/focus shows actions and
  bottom-right selection; clicking the image still opens existing detail or
  private preview. Selection shows a floating multi-file toolbar.
- Provide working grid/list modes, search, folder organization, upload, and
  capability-correct toolbar actions. Preserve all owner/workspace checks and
  the confirmed generated-image hard-delete flow.
- No browser acceptance by the agent; the operator will check the running 5173
  page manually. No production action.

## Verification and handoff

- `features/assets/asset-workspace.tsx` now combines generated and uploaded
  files, keeps newest-first ordering, filters by media/source/folder/search,
  renders folder tiles and masonry/list views, and provides card menu,
  selection and the floating toolbar. Generated images use their existing
  detail and hard-delete paths; uploaded image/video/audio files open private
  previews. Upload and folder/tag organization remain available.
- Sidebar, composer and preview copy use the `资产` name. Existing creative
  projects remain on `/projects`; no document file type or backend migration.
- Targeted tests: 21/21 for creation copy, asset header, upload boundary and
  new filter/header behavior; documentation + asset route + new UI tests
  17/17. Typecheck and targeted lint pass.
- `npm run check:local`: **579 tests / 556 pass / 23 skip / 0 fail**;
  build and typecheck pass, lint 0 errors / 109 warnings (pre-existing
  application and bundled Impeccable scripts). `git diff --check` passes.
- Browser layout and interaction have not been accepted by the agent; the
  operator will inspect 5173 manually. No real-provider generation, destructive
  test delete, production change or runtime restart was performed.

## 下一步

The operator checks 5173 for masonry proportions, hover menu and selection
circle, image detail, floating toolbar, source filters, grid/list switch and
narrow-screen behavior. Address that feedback before any release decision;
production deployment remains a separate task.
