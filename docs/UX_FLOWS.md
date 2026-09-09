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
- On wide screens, a normal `积分记录` navigation row sits immediately below
  `帮助` in the lower sidebar; the available balance sits below the username
  in Palace Red. On narrow screens, the compact balance
  remains the entry. Selecting either opens `/credits` without discarding the
  current composer, project, or active generation. The view shows settled spend
  for today, the current Monday-based week, and the current month plus
  `全部 / 消费 / 获得 / 退回` filters and stable load-more pagination; it always
  offers a quick return to creation.
- A generation reservation is one user-facing record. While open it reads as
  processing, settlement changes it to consumed, and release changes it to
  not charged with the reserved amount returned. A later refund is a separate
  positive record. Raw reserve/settle rows and internal reasons never appear.
- Each record identifies `图片生成 / 视频生成 / 其他变动`. Generation rows use
  the same batch reference shown by the asset library; they do not repeat model,
  resolution, count, prompt, or result-detail controls.
- Credit-record loading, empty, first-page failure, retry, and load-more failure
  preserve the page silhouette and any already loaded records. A successful
  generation is traced in the asset library by its batch reference. Records
  before credit metering are not invented or backfilled.
- Open Authing login provisions a new GoodGood owner in `pending` access state.
  The authenticated pending surface replaces the creation workspace with one
  compact review message, shows that the 100 welcome credits are waiting, and
  offers status refresh plus logout. It does not render usable upload, project,
  asset, or generation controls.
- Approval moves the user into the normal workspace without another identity
  registration. If access is later removed, current in-browser creative state
  is preserved locally where safe, but new owner-scoped reads and mutations
  fail closed and the global account-state surface replaces the workspace.
- The only access states are `pending`, `active`, and `suspended`; there is no
  rejected state. The normal approved workspace corresponds to `active`.

### Site-owner account management

- Only a persisted site-owner role sees the account-management navigation and
  route. Direct URL or API access by every other account is rejected by the
  backend, regardless of hidden controls.
- The first useful view prioritizes pending accounts, with restrained loading,
  empty, read-failure, and retry states. Search and filters must not place email
  addresses or other personal data in the URL.
- Review actions show the target account and resulting state explicitly.
  Repeated submission is idempotent. A failed action keeps the current row and
  filters intact and shows the support ID.
- Each row shows email, registration and last-login times, role, `seed` /
  `内测用户` tier, access state, and available/reserved credit. Valid actions
  are approve, suspend, restore, and test-credit grant.
- Test-credit grant is a compact dialog showing the selected account, current
  balance, validated grant amount, required reason, and final confirmation. It
  appends ledger/audit evidence and never looks like a customer payment.
- The dialog provides 100/500/1000 presets and a positive-integer custom field;
  one grant may not exceed 5000 credits.
- Routine review and grants happen in this surface. The one-time site-owner
  bootstrap remains an out-of-band security operation, not a public signup
  shortcut.

## Creation surface

### Empty

Show only a small GoodGood mark, `描述你想创作的画面`, and a quieter secondary
sentence. Do not insert sample images, tutorials, or parameter descriptions to
fill space.

### Composer

- Empty prompt submission: short toast, keep focus available.
- Prompt: autosize from one to eight lines; scroll after eight.
- References: the add control offers local upload or selection from the owner's
  uploaded materials. Append in upload/selection order, deduplicate by stable
  reference ID, and enforce the shared maximum of 10.
- A selected reference appears immediately with a restrained uploading overlay.
  It becomes ready only after direct upload and server-side decoded validation;
  failure remains on that tray item with removal/replacement recovery.
- The tray uses moderately enlarged responsive 1:1 centered crops and scrolls
  horizontally without wrapping, so adding references does not destabilize the composer.
- Every tray item shows `图 1…图 10` at the lower left. Dragging one item onto
  another moves it to that position and immediately renumbers the tray. Focused
  items support `Alt + ← / →` for the same operation.
- Clicking a ready tray item opens a viewport-contained quick editor in its
  neutral view tool, with the complete uncropped source available for detail
  inspection. Enter/Space opens the focused item; Escape closes the editor.
  Uploading/failed items and completed drag gestures do not open it. The smaller
  upper-right remove control deletes without opening the editor.
- Crop, brush, sticker, and arrow edits affect the exported pixels. Stickers may
  come from a local file or the owner's reusable materials and can be moved,
  scaled, rotated, or removed. Box selection reports pixel and normalized
  coordinates relative to the current cropped output; copy and prompt insertion
  do not burn the box into the exported pixels.
- Undo, redo, and reset operate inside the current editor session. Closing with
  pixel-affecting unsaved edits asks for confirmation. Completing an edit uploads
  a new reusable material and only then replaces the current `图 N` in the tray;
  a project-backed session persists that replacement before reporting success.
  The original material remains reusable, and export/upload failure preserves
  the editor state for retry.
- Send is blocked while any retained reference is uploading or failed. Ready
  references preserve their tray order in the submitted batch snapshot.
- Settings: attached downward drawer; closing it must not reset values.
- Settings read from aspect ratio to model to output; aspect ratio is the leftmost
  wide-screen group and stays first through responsive reflow.
- Model list: opens within the parameter drawer and collapses after selection.
- Nano Banana 2 accepts its 14 displayed ratios; GPT IMAGE 2 accepts `9:16`,
  `2:3`, `3:4`, `1:1`, `4:3`, `3:2`, and `16:9`. Both use the existing
  `1K / 2K / 4K` resolution domain and support `1 / 2 / 4` outputs.
  The pixel readout follows the selected model's exact size table. A model
  change keeps a compatible ratio or visibly moves to the nearest supported
  ratio in the same orientation, and normalizes an unsupported count to one.
- Selecting Nano Banana 2 reveals only the `谷歌搜索` (`关闭 / 开启`, default
  `关闭`) segmented control in the attached drawer. New Nano requests use the
  internal high-thinking mode without exposing a creator control or detail row.
  Changing to another model hides and resets Google Search. Historical
  low/high values remain in frozen records for exact retries but are not shown.
- Selecting GPT IMAGE 2 reveals `质量` (`自动 / 低 / 中 / 高`, default `自动`),
  `背景` (`自动 / 透明`, default `自动`), and `输出格式`
  (`PNG / JPEG / WebP`, default `JPEG`). Choosing transparent while JPEG is
  selected immediately moves output format to PNG; JPEG remains disabled until
  background returns to automatic. Leaving GPT hides and resets all three.
  Draft/project restore, retry, and image detail use the frozen values.
- Unsupported model/count/domain combinations fail before submission without
  replacing values inside an immutable generation snapshot.
- Keep the active server quote next to the composer actions as plain metadata,
  for example `10 积分/张 · 共 40`; do not turn it into a purchase call-to-action.
- Send: Feihong mark. It remains available while earlier jobs generate; each
  click freezes the current composer values and submits one independent job.
  Active styling and the creation stream communicate progress without blocking
  another click. There is no product-side concurrent-job count ceiling.

Reference ordinal is the current tray index and is stored in data for prompt
interpretation. The visible `图 1…10`, accessible name, draft/project order,
generation snapshot, and provider reference order must all describe that same
array; there is no separate display-only ordinal.

### Authenticated root draft

- `/create` is the canonical creation URL. `/` remains a compatible direct
  entry, and choosing `创作` or confirming `新建创作` moves history to
  `/create` without mounting a second workspace instance.
- After the authenticated session resolves, the root creation surface restores
  the owner's unexpired draft before autosave starts. A direct project route
  restores only that project and never applies the root draft over it.
- Meaningful root changes to prompt, ordered ready references, model, ratio,
  resolution, count, or model-owned generation options save after a short
  debounce. Uploading/failed references pause saving until the retained set is
  ready.
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
- Give every click a stable client run identity and insert it at the top of the
  current creation stream. Replacing its temporary `pending_*` ID with the
  durable server job ID must not create or erase another run.
- Use ratio-correct skeletons for the requested image count.
- Render active task skeletons and completed images in one creation masonry.
  Submission creates the final ratio-correct slots immediately; success replaces
  those slots in place without moving another run or redistributing previously
  generated images.
- On success, replace skeletons with assets in place and prepend the completed
  batch to the asset library without rendering the batch twice.
- Asset metadata shows the requested resolution together with that Asset's
  decoded pixel dimensions, for example `4K · 3584 × 4800`. It never derives
  actual dimensions from the nominal tier or another Asset in the batch.
- Refresh the account summary after a job is accepted into the queue and after
  every terminal outcome so reserved and available credit converge without a
  full page reload.
- On full-batch failure, replace that run's active task area with one compact
  inline status strip that summarizes the requested count. Concurrent failures
  retain separate strips; do not repeat one run's error per requested image.
- A GPT or Nano Banana multi-output batch succeeds only after every requested image
  is decoded, stored, and committed. A missing or invalid output fails the whole
  batch and exposes no partial Assets; partial-result settlement requires a
  later explicit provider and billing policy.
- Do not reorder an older completed batch above a newer submission merely
  because the provider completed out of order; sort by submission time.
- On failure, keep the failed batch location and all input state.
- `重新生成` always submits the failed immutable snapshot, even if the composer
  has since changed. `修改设置` restores a mutable copy of that snapshot into
  the composer before opening the parameter drawer.
- A retry updates only the selected run. Guard the retry action against a rapid
  duplicate activation because it may create another billable upstream task.

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

All successfully generated images and accepted reference uploads enter the
asset library automatically. `生成图片` and `上传素材` are separate sections:
generated images keep their batch/gallery modes, while materials list the
owner's reusable uploads newest first with filename, dimensions, size, and a
direct `用于创作` action. A material already in the current tray is visibly
disabled rather than duplicated.
The library uses `/assets`; direct access, refresh, and browser back/forward
reload the current owner's durable assets without resetting the in-memory
batch/gallery mode during an in-app detail round trip.

From the composer, `从资产库选择` opens a focused multi-select dialog using 1:1
centered thumbnails. Loading, empty, and failed reads keep the dialog silhouette
and expose retry. Confirming adds the chosen stable IDs in selection order and
does not transfer object bytes again.

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
