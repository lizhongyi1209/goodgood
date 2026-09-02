# UX flows and state contracts

## Authentication

- On first load, confirm the GoodGood session before enabling owner-scoped
  work; keep the loading state quiet and blocking.
- Signed-out and expired sessions use one global recovery surface. Its only
  primary action is `Google / 邮箱验证码登录`; first use also registers.
- The hosted login page must show only Google and email verification code. Do
  not add password, phone, or unapproved social-login shortcuts in GoodGood.
- A failed or cancelled callback returns to the same recovery surface with
  stable copy. Never display provider payloads or tokens.
- Session expiry preserves the in-browser prompt, references, parameters, and
  completed local view state, then allows the user to sign in again.
- The account card shows the authenticated email and exposes explicit logout.
  Logout revokes the GoodGood session and expires its cookie before navigating
  the top-level browser through Authing's hosted logout and back to GoodGood.
- The authenticated workspace shows available credit in the desktop account
  area and as a compact mobile balance. Initial loading stays quiet; a read
  failure keeps the workspace usable and offers a local retry. Zero is a valid
  balance, never an empty or error state.

## Creation surface

### Empty

Show only a small GoodGood mark, `描述你想创作的画面`, and a quieter secondary
sentence. Do not insert sample images, tutorials, or parameter descriptions to
fill space.

### Composer

- Empty prompt submission: short toast, keep focus available.
- Prompt: autosize from one to eight lines; scroll after eight.
- References: accept multiple images, append in upload order, maximum 10.
- A selected reference appears immediately with a restrained uploading overlay.
  It becomes ready only after direct upload and server-side decoded validation;
  failure remains on that tray item with removal/replacement recovery.
- Send is blocked while any retained reference is uploading or failed. Ready
  references preserve their tray order in the submitted batch snapshot.
- Settings: attached downward drawer; closing it must not reset values.
- Model list: opens within the parameter drawer and collapses after selection.
- Keep the active server quote next to the composer actions as plain metadata,
  for example `10 积分/张`; do not turn it into a purchase call-to-action.
- Send: Feihong mark; controls disable or communicate progress while generating.

Reference ordinal is stored in data for prompt interpretation even though the
tray does not add visually heavy number badges. The accessible name and future
detail metadata should still expose `参考图 1…10` semantics.

### Authenticated root draft

- `/create` is the canonical creation URL. `/` remains a compatible direct
  entry, and choosing `创作` or confirming `新建创作` moves history to
  `/create` without mounting a second workspace instance.
- After the authenticated session resolves, the root creation surface restores
  the owner's unexpired draft before autosave starts. A direct project route
  restores only that project and never applies the root draft over it.
- Meaningful root changes to prompt, ordered ready references, model, ratio,
  resolution, or count save after a short debounce. Uploading/failed references
  pause saving until the retained set is ready.
- The draft expires 30 days after its last successful write. Empty root state
  removes it; saving the root context as a project or confirming
  `新建创作` also clears it.
- A load/save failure preserves the current page state and offers retry. If
  another tab has advanced the draft version, autosave pauses and presents
  `保留当前内容` and `恢复云端草稿`; no tab wins silently.
- Draft persistence does not include project edits, generation batches, or
  active job state. Existing explicit-discard confirmation remains authoritative
  for destructive in-app transitions.

## Generation lifecycle

Canonical states:

```text
idle -> queued -> rendering -> refining -> complete
                    |             |
                    +-----------> failed
failed -> queued (retry)
```

- Create an immutable input snapshot at submission containing the prompt,
  ordered reference identities, stable model ID, ratio, resolution, and count.
- Insert the pending batch at the top of the current creation stream.
- Use ratio-correct skeletons for the requested image count.
- Render the active task skeletons separately from the completed-image masonry;
  loading or failure must not redistribute previously generated images.
- On success, replace skeletons with assets and prepend the completed batch to
  the asset library.
- Refresh the account summary after a job is accepted into the queue and after
  every terminal outcome so reserved and available credit converge without a
  full page reload.
- On full-batch failure, replace the active task area with one compact inline
  status strip that summarizes the requested count. Do not repeat the same
  error once per requested image.
- If a provider returns partial results, add successful images normally, keep
  failed outputs out of the asset library, and summarize the completed and
  failed counts in the task strip.
- Do not reorder an older completed batch above a newer submission merely
  because the provider completed out of order; sort by submission time.
- On failure, keep the failed batch location and all input state.
- `重新生成` always submits the failed immutable snapshot, even if the composer
  has since changed. `修改设置` restores a mutable copy of that snapshot into
  the composer before opening the parameter drawer.

## Continuous creation and projects

- A creation session accumulates batches newest-first.
- `保存为项目` names and persists the whole current context.
- Once saved, new batches are automatically associated with that project.
- Restoring a project restores the latest prompt/model/ratio/resolution/count,
  all batches and their order, and its ordered ready reference links. Private
  image and reference URLs are freshly signed on each read.
- Project index and detail use `/projects` and `/projects/:projectId`. Direct
  access, refresh, and browser back/forward re-enter the same owner-scoped
  restore flow; a failed detail read offers retry, return, and `新建创作`.
- Project list loading, empty, and read failure states stay in place; save
  failure remains in the drawer and keeps all current creation state for retry.
- `新建创作` starts a clean session. A changed prompt, reference set/order,
  generation setting, or unprojected generation is meaningful work. New-session
  clearing or restoring another project requires an explicit discard dialog;
  `继续编辑` preserves the full state, while an active generation blocks the
  destructive action until it reaches a terminal state.
- Saving an unprojected root context as a project transfers continuity to the
  project and clears the separate root draft. Project edits remain governed by
  project save/restore rather than root-draft autosave.

## Asset library

All successfully generated images enter the asset library automatically.
The library uses `/assets`; direct access, refresh, and browser back/forward
reload the current owner's durable assets without resetting the in-memory
batch/gallery mode during an in-app detail round trip.

### Batch mode

- Group by calendar date; newest date and batch first.
- One row per batch.
- Images dominate the row. Prompt and compact parameter tags are secondary.
- Preserve ratio and count; do not use mock layout that contradicts selected
  generation parameters.

### Gallery mode

- Suppress prompt/parameter weight so visual selection dominates.
- Mixed ratios share a coherent row height while widths follow ratio.
- Use the same tight gap and outer-corner treatment as creation.
- Selection is separate from opening detail.

## Image detail

- Available from generated images and both asset views.
- Uses `/assets/:assetId`; direct access and refresh resolve the stable asset ID
  from the authenticated owner's asset list.
- Left: largest possible complete image on a neutral stage.
- Middle: prompt, parameters, save/download actions.
- Right: vertically scrollable rail of all images in current scope.
- Wheel down/up and arrow keys select next/previous image; metadata changes with
  the image and the URL is replaced with that asset's stable ID. The page beneath
  must remain fixed and restore its source scope, selected asset mode, and scroll
  position after close or browser Back.
- A missing, inaccessible, or temporarily unreadable asset keeps its detail URL
  and offers retry plus return to the asset library.

## Notifications

- Toast: brief confirmation or local validation (`已添加`, `已下载`, missing
  prompt). Never the only record of a generation failure.
- Inline status: ongoing generation within the creation stream.
- Inline error panel: durable job failure with recovery actions.
- Asset navigation cue: completed assets arrived; clear when assets is opened.
