# GG-255 Canvas clipboard image upload

- Date: 2026-10-01
- Baseline: verified integration `8973e0c`, including GG-251/GG-252.
- Branch/worktree: `feat/GG-255-canvas-paste-image`, `F:/goodgood-worktrees/GG-255-canvas-paste-image`.
- State: implemented, code-verified and precisely integrated into actual 5173; child worktree retired. Browser acceptance belongs to the user; no production changes.

## Scope and acceptance

Paste actual externally copied images with Ctrl/Cmd+V on the canvas. Clipboard `files`/`items` enter existing `addCanvasMedia`, exactly as desktop drops: supported JPEG/PNG and 20 MiB validation, temporary node, original upload/persistence/retry and asset-library refresh. Place pasted files together in the currently visible canvas center, accounting for the asset sidebar. Do not ingest text URLs or HTML-only images.

Input fields, contentEditable, controls, menus and dialogs retain native paste. Internal node copy/paste uses a per-mounted-workspace clipboard marker so previously copied external images do not hijack node duplication. Unsupported formats retain existing drop errors. No new API, schema, provider request or confirmed product-decision change; this extends GG-161 upload gestures.

Parent review confirmed the route does not automatically focus the canvas. An additional native document paste bridge handles only body/documentElement targets while focus remains there and the canvas is connected and visible. Open dialogs/alerts/menus/popovers block this fallback; section-originated events cannot be consumed twice. The listener is removed on unmount. This allows direct paste after arriving on the route without a first canvas click.

## Ownership and delivery

- Owned files: `features/canvas/canvas-workspace.tsx`, `canvas-page.tsx`, new `canvas-clipboard.mjs/.d.mts`, focused clipboard tests and this card.
- Parent owns image-viewer/image-preview and canvas asset-panel files; this task does not edit them.
- Created 1 registered child worktree (initial GG-254 path moved to GG-255 after a concurrent account task occupied GG-254); integrated 1, retired 1. No dependencies/build/browser caches or running services created. Parent verified absolute owned path, clean status including ignored files, no reparse point or process, then used Git worktree remove/prune; path no longer exists. Other worktrees were preserved.
- Verification: initial clipboard/local-file checks passed 14/14; after parent review, `node --test tests/gg255-canvas-clipboard.test.mjs tests/gg126-canvas-local-images.test.mjs` passed 19/19. Covers files/items de-duplication, items-only screenshot, multiple files, empty/text/URL/HTML/non-image input, editing/control/dialog isolation, direct body-focus arrival, open-layer/hidden/disconnected exclusion, duplicate-event protection, native copy marker and foreign-marker rejection, unavailable selections, and original format/empty/size errors. Diff check passed.
- Scoped lint passed with 0 errors, 9 pre-existing warnings. Linted all five source/type/test files through GG-116's sole ESLint installation with `lintText`, no cache. Comparison against baseline confirmed canvas-page 8→8 and canvas-workspace 1→1 warnings. The initial direct child CLI attempt could not resolve child config dependencies; no install was performed.
- Body-focus follow-up lint covered the four modified source/type/test files through the same installation: 0 errors, the same existing workspace warning. No additional dependency or cache was created.
- Parent delivery: child `c7d878c`/`31f5290` replayed as `41df2dc`/`d4ea42c`; root clipboard/local-file checks passed 19/19. Related lint: 0 errors, 8 existing warnings in the current integration (page 7/workspace 1, other helper/type/test files zero). Four actual Vite modules (page, workspace, clipboard helper and workspace CSS) compiled HTTP 200; native body bridge wiring confirmed.
- Not executed: full gate/typecheck/build, browser acceptance, real upload/generation or database/queue writes. Module compilation establishes code integration, not browser acceptance.
- 下一步（Next）: user refreshes 5173 and verifies outside-image copy then direct Ctrl+V, editing/layer isolation and internal node copy. Development, integration and clean directory retirement are complete.
