# GG-255 Canvas clipboard image upload

- Date: 2026-10-01
- Baseline: verified integration `8973e0c`, including GG-251/GG-252.
- Branch/worktree: `feat/GG-255-canvas-paste-image`, `F:/goodgood-worktrees/GG-255-canvas-paste-image`.
- State: implemented and code-verified in the child worktree; parent integration pending. Browser acceptance belongs to the user; no production changes.

## Scope and acceptance

Paste actual externally copied images with Ctrl/Cmd+V on the canvas. Clipboard `files`/`items` enter existing `addCanvasMedia`, exactly as desktop drops: supported JPEG/PNG and 20 MiB validation, temporary node, original upload/persistence/retry and asset-library refresh. Place pasted files together in the currently visible canvas center, accounting for the asset sidebar. Do not ingest text URLs or HTML-only images.

Input fields, contentEditable, controls, menus and dialogs retain native paste. Internal node copy/paste uses a per-mounted-workspace clipboard marker so previously copied external images do not hijack node duplication. Unsupported formats retain existing drop errors. No new API, schema, provider request or confirmed product-decision change; this extends GG-161 upload gestures.

## Ownership and delivery

- Owned files: `features/canvas/canvas-workspace.tsx`, `canvas-page.tsx`, new `canvas-clipboard.mjs/.d.mts`, focused clipboard tests and this card.
- Parent owns image-viewer/image-preview and canvas asset-panel files; this task does not edit them.
- Created 1 registered child worktree (initial GG-254 path moved to GG-255 after a concurrent account task occupied GG-254); retired 0 pending parent integration. No dependencies/build/browser caches or running services created.
- Verification: `node --test tests/gg255-canvas-clipboard.test.mjs tests/gg126-canvas-local-images.test.mjs` passed 14/14. Covers files/items de-duplication, items-only screenshot, multiple files, empty/text/URL/HTML/non-image input, editing/control/dialog isolation, canvas focus, native copy marker and foreign-marker rejection, unavailable selections, and original format/empty/size errors. Diff check passed.
- Scoped lint passed with 0 errors, 9 pre-existing warnings. Linted all five source/type/test files through GG-116's sole ESLint installation with `lintText`, no cache. Comparison against baseline confirmed canvas-page 8→8 and canvas-workspace 1→1 warnings. The initial direct child CLI attempt could not resolve child config dependencies; no install was performed.
- Not executed: full gate/typecheck/build, browser acceptance, real upload/generation or database/queue writes. Parent can verify actual Vite source compilation after replay; this does not establish browser acceptance.
- Next: parent reviews/replays the scoped commit, checks the actual 5173 modules, synchronizes shared task/checkpoint documentation and retires this clean worktree with Git remove/prune. No child cache cleanup is needed.
