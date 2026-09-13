# UX flows and state contracts

## GG-057 site-owner navigation (local candidate)

- Account and model management share a `站长管理` header with `账户管理` and
  `模型管理` links. Exactly one link marks the current page. The same header
  remains during directory loading, empty, and read-failure states after access
  has been confirmed; signed-out and denied accounts keep their access gates.
- `返回创作` and the brand link go directly to `/create`; switching tabs uses
  `/admin/users` and `/admin/models`. Neither action begins login or replays
  browser history. Native Back/Forward remains available.
- GG-058 removes direct logout from the management header. Use `返回创作` and
  the creator account menu for sign-out; access gates retain their logout action.
- Revisiting `/api/auth/login` in explicitly configured local mode retains a
  valid current identity or signs in the configured default, then redirects to
  a validated local return path. Missing local defaults fail closed. Production
  OIDC/email OTP and site-owner permissions remain unchanged.

## GG-052 site-owner model pricing (local candidate)

- Enter `模型管理` from the site-owner navigation or account-management tab.
  Pending/suspended accounts retain their access gate; ordinary members see a
  no-permission state. Session expiry returns to authentication.
- Search/filter and use `添加模型` or `编辑 / 定价`. Adding uses an integrated
  adapter template; saved ID/template are stable. Names/descriptions may change.
  Disable stops new submissions; accepted jobs retain their adapter and price.
- Enter RMB output prices by resolution and reference-video-second prices
  (zero permitted). Display credits at 1 CNY = 100 credits. All resolutions need
  positive output prices before enabling; unpriced drafts may remain disabled.
  Trial quotes combine quantity and output/reference seconds, rounding the
  fractional total upward to one credit.
- `保存并生效` persists a new edit version and applicable immutable image prices.
  Failures keep input, conflicts require refresh/reopen, and loading/empty/retry
  states stay inline. Images consume published prices; video preview has no
  settlement. No actual-token surcharge follows an accepted creator quote.

GG-053 refines this panel: the list shows each model name once and groups image
and video models with aligned resolution prices. RMB is primary; credits show
the equivalent image/second unit. Video output/reference rates are separate,
and unpriced/supported specifications differ from unsupported ones. The editor
groups inputs by resolution. New catalog IDs are generated automatically;
existing IDs remain stable. `接入详情` reveals the ID's purpose, adapter name and
configuration version on demand. These technical fields do not repeat in the
list or normal price editor; conflicts and server-side version checks remain.

GG-054 keeps one Banana model name with three price rows (特价/优质/专线),
each aligned to 1K/2K/4K. In the editor, line buttons switch independent price
inputs and trial quotes; unsaved inputs survive switching and one save commits
all lines. Line enable and model enable are distinct. Enabled lines require
complete positive prices and a known provider mapping. Original prices remain
on special; other lines start unpriced/disabled. Pro trial quantity is 1.
The composer shows three line buttons below a Banana model, defaulting to
special on new creation/model change. Unavailable lines are disabled; restoring
an unavailable choice explains recovery instead of silently substituting it.
Changing lines changes the displayed quote. Drafts/projects/retry/details retain
the line; accepted tasks retain the choice and quote after disable/reprice.

## Authentication

- On first load, confirm the GoodGood session before enabling owner-scoped
  work; keep the loading state quiet and blocking.
- Signed-out and expired sessions use one global recovery surface. The selected
  email mode keeps the mailbox, `发送验证码`, six-digit code, and `登录` action
  visible in one form; first successful verification also registers. Password,
  phone, and social login are absent. OIDC rollback mode keeps its hosted button.
- Sending is user-initiated. Before a challenge exists the code control is
  disabled. After a successful send, the mailbox is locked to that challenge,
  the same send control shows a 60-second resend countdown, and `修改邮箱`
  explicitly resets the form. Focused mailbox/code inputs change border only,
  without a focus shadow. Refresh restores only a browser-bound active challenge;
  mailbox/code never enters a URL or localStorage.
- Invalid/replayed/expired/cross-browser codes use stable copy and keep the
  current creative state. Uncertain delivery asks the user to wait/check mail;
  it does not claim inbox delivery or automatically send a second message.
- Session expiry preserves the in-browser prompt, references, parameters, and
  completed local view state, then allows the user to sign in again.
- The account card shows the authenticated email and exposes explicit logout.
  Logout revokes the GoodGood session and expires its cookie. Only the deployed
  OIDC mode additionally navigates through Authing's hosted logout.
- The authenticated workspace shows available credit in the desktop account
  area and as a compact mobile balance. Initial loading stays quiet; a read
  failure keeps the workspace usable and offers a local retry. Zero is a valid
  balance, never an empty or error state.
- On wide screens, a normal `积分记录` navigation row sits immediately below
  `帮助` in the lower sidebar. The account trigger shows only the avatar,
  username, and overflow mark. Selecting it opens a right-side menu whose two
  informational rows show the resolved identity and available balance, followed
  by a separated logout action. `站长` wins over any business role; otherwise
  the effective business role is shown, falling back to `个人`. The numeric
  balance retains Palace Red emphasis and the accessible `积分余额 N` meaning;
  its CircleDot icon stays neutral like the other workspace function icons.
  On narrow screens, the compact balance
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
- First valid email verification (or deployed Authing login before cutover)
  provisions a new GoodGood owner in `pending` access state.
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
- The first useful view lists all accounts. One access-state select is the sole
  status filter; do not duplicate it as summary cards above the table. Loading,
  empty, read-failure, and retry states stay restrained. Search and filters must
  not place email addresses or other personal data in the URL.
- Review actions show the target account and resulting state explicitly.
  Repeated submission is idempotent. A failed action keeps the current row and
  filters intact and shows the support ID.
- Each row shows email, registration and last-login times, one resolved display
  identity, `seed` / `内测用户` tier, access state, and available/reserved
  credit. The display identity is `站长` for the site owner; every other account
  is exactly `个人`, `企业`, or `分销商`. Valid actions are approve, suspend,
  restore, and test-credit grant.
- Wide account tables give email, identity, and direct parent their own columns;
  the email cell does not carry secondary identity or hierarchy text. Narrow
  cards preserve those as two separately labelled fields and render a missing
  direct parent as `—`.
- Test-credit grant is a compact dialog showing the selected account, current
  balance, validated grant amount, required reason, and final confirmation. It
  appends ledger/audit evidence and never looks like a customer payment.
- The dialog provides 100/500/1000 presets and a positive-integer custom field;
  one grant may not exceed 5000 credits.
- Routine review and grants happen in this surface. The one-time site-owner
  bootstrap remains an out-of-band security operation, not a public signup
  shortcut.

### Distributor allocation (implemented locally, not deployed)

- The site-owner account surface keeps system role, access state, account tier,
  and business role separate in authorization and persistence, while resolving
  them to one row-level identity label. A site-owner row shows only `站长` and
  does not offer business-identity or direct-parent controls. Other rows may be
  set to `个人`, `企业`, or `分销商`, and may create/end/replace one direct
  parent, with target, prior/resulting state, reason, and explicit confirmation.
  It never presents those actions as payment.
- ADR 0060 permits one current business identity per account: personal, enterprise
  or distributor, never enterprise plus distributor. Users needing both use two
  independent accounts. Existing role replacement ends the old assignment before
  inserting the new one; it does not move money, relationships or company data.
- Only an active distributor can allocate through `分销管理 → 客户与下级`.
  Enterprise management has no direct-account/transfer-history tabs.
  There is no standalone allocation main-navigation item. Direct navigation by
  any other account stays denied even if it knows the URL. The first view shows
  total available credit, `可分配积分` (payment-funded available credit), and a
  direct-child list. It does not show exchange price, CNY, revenue, commission,
  order, prompts, generations, or assets.
- Selecting a direct child opens a compact allocation dialog with the child,
  current transferable balance, positive integer amount, optional non-secret
  remark, and final confirmation. The browser never decides provenance or
  submits a balance. A successful response updates both the summary and that
  child row and shows the public transfer reference. If post-acceptance reads
  fail, retain the confirmed account result and show the completed public ID
  with a read-only refresh action; never describe this as a failed allocation.
- Insufficient transferable credit is distinct from insufficient total credit:
  the UI explains that welcome/test/promotion credit cannot be allocated. A
  duplicate click returns the same completed transfer; a conflicting replay,
  ended relationship, suspended account, or concurrent balance change keeps the
  current view and offers a safe refresh using the support ID.
- Transfer history shows `上级分配` or `分配给下级`, signed credit amount, time,
  counterparty display identity, and public transfer reference. Completed rows
  are immutable and expose no parent reclaim action.
- `查看记录` on an account row opens `划拨记录` scoped to that counterparty.
  Filtering uses only loaded pages, not a new API query. When a cursor remains,
  explicitly disclose the partial range, preserve load-more even for an empty
  filtered page, and offer `全部记录`. The main history tab clears the filter.
  Filters are not persisted into creative drafts or URLs.
- A business child may reallocate received payment-funded credit only if the
  site owner independently granted it the distributor role and it has its
  own direct children. Relationship depth never broadens a user's visible list
  or permission.
### Enterprise workspace and member management (implemented locally; not deployed)

ADR 0057 removes the desktop/mobile global Workspace switcher for every account,
including site owners. Creation and the main account navigation stay personal.
ADR 0060 keeps enterprise and distributor management as main-sidebar entries,
with personal-credit allocation and history only inside distributor tabs;
commercial identity exposes features but never grants company data access.
Managers enter their organization directly (a management-only directory is used
for multiple organizations); overview/members/usage/Assets are horizontal
content tabs inside the shared app shell. Legacy enterprise account URLs return
to enterprise management for an enterprise, or the corresponding distribution
tab for a distributor, without resetting creation. Only distributor identity
grants allocation; company membership/platform role does not. Employee
invitations never establish commercial direct-child relationships.
Personal composer state and polling
remain mounted while visiting management. Invitation acceptance refreshes this
directory without automatically entering enterprise creation.

Legacy scoped creation URLs retain membership checks and quiet company context;
returning to personal creation never transfers drafts, credit or Assets.

ADR 0059 replaces overview shortcut tiles with operational facts. Zero company
credit, missing/paused/exhausted active-member budgets and pending invitations
expiring within 48 hours lead to the existing budget dialog or member page;
opening overview never allocates credit. Members are ranked by cumulative
settled usage, not monthly activity. Monthly metrics remain explicitly pending
until complete aggregation exists. Recent successful company outputs use the
manager asset boundary, up to six previews; clicking opens a read-only dialog
with prompt, parameters, creator and time. Closing restores thumbnail focus.

The platform site owner creates an organization for a verified principal and
assigns its first `org_owner`. Organization owners/admins then use a separate
enterprise management view in the normal app shell to:

1. enter an employee email and role;
2. see the pending invitation without creating credentials;
3. let the employee log in normally and accept the matching invitation;
4. allocate or reclaim only unspent member budget with a reason;
5. suspend/restore membership without suspending the person's GoodGood account;
6. inspect settled/processing/released usage and generated company Assets by
   member.

Invitation loading, empty, failure, expired, already-accepted, and email-
mismatch states preserve the current dialog/page input. Budget confirmation
shows organization available/unallocated capacity, the member's current and new
limit, and the exact change. Failure keeps the selected member and reason.

Every creator, including an owner/admin, needs an allocation to generate in an
organization Workspace. The creation composer shows organization name, member
remaining allocation, and organization availability without exposing internal
account IDs. Insufficient member budget and insufficient company credit are
distinct recoverable states; neither falls back to personal credit.

Organization managers see a team Asset view filtered by creator. Opening an
Asset shows the output, prompt, parameters, creator, and generation time but
does not sign creator-only reusable raw references. Ordinary members see only
their own organization work. A removed member loses organization access
and new signed reads; company history remains visible to authorized managers.

## Creation surface

### Empty

Show only a small GoodGood mark, one primary sentence, and a quieter secondary
sentence. Image mode says `描述你想创作的画面`; video mode says
`描述你想创作的视频`. Do not insert sample images, tutorials, or parameter
descriptions to fill space.

### Composer

- Empty prompt submission: short toast, keep focus available.
- Settings opens an attached overlay below the prompt/reference tray in either
  mode; results stay in place. Toggle closes it without losing values. Closed
  controls are inert; long drawers scroll internally within available viewport
  space, including after prompt growth or page scrolling (ADR 0055).
- `图片 / 视频` is always visible as a quiet segmented control attached above
  the prompt row. Image remains the default. Switching affects only the active
  composer and preserves separate in-memory inputs; it never alters an active
  image job or sends a request.
- Prompt: autosize from one to eight lines; scroll after eight.
- A standalone `---` line (optional surrounding spaces/tabs) separates concurrent
  prompts in image and video modes. Inline hyphens/longer rules remain literal.
  Trim and ignore empty segments, keep duplicates and source order; all-empty
  input submits nothing. Do not add a separate batch summary in either composer;
  retain the multiplied image quote beside send. Parameters and ordered
  references are frozen and shared.
  Image mode submits one durable multi-output job per segment; local video mode
  submits one single-output request per segment/output. Failure/retry is isolated.
  Image quotes multiply the server's per-segment quote; reservations remain per
  job, so partial acceptance is possible on insufficient credit. Composer/draft/
  project retain full source; assets/models use their individual segment only.
  A retry of a segment still present in a batch project keeps that full prompt
  context, without re-submitting siblings. Image input total stays at 4000 chars.
- References: the add control offers local upload or selection from the owner's
  uploaded materials. Append in upload/selection order, deduplicate by stable
  reference ID, and enforce the shared maximum of 10.
- A selected reference appears immediately with a restrained uploading overlay.
  It becomes ready only after direct upload and server-side decoded validation;
  failure remains on that tray item with removal/replacement recovery.
- The tray uses moderately enlarged responsive 1:1 centered crops and scrolls
  horizontally without wrapping: 96px desktop / 80px mobile (ADR 0056).
- Every tray item shows `图 1…图 10` at the lower left. Dragging one item onto
  another moves it to that position and immediately renumbers the tray. Focused
  items support `Alt + ← / →` for the same operation.
- Clicking a ready tray item opens a viewport-contained quick editor in its
  neutral view tool, with the complete uncropped source available for detail
  inspection. Enter/Space opens the focused item; Escape closes the editor.
  Uploading/failed items and completed drag gestures do not open it. The smaller
  upper-right remove control deletes without opening the editor.
- Video-mode tray items support click/Enter/Space to open a read-only focused
  preview of the complete image or controlled video/audio. No autoplay, editing,
  new upload or material creation. Escape/close restores trigger focus; nested
  removal does not open preview. Loading/error/retry preserve composer materials.
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
- Video mode accepts local image, MP4/MOV, and WAV/MP3 references for frontend
  composition. It also offers `从资产库选择` as one media-aware picker for image,
  video, and audio assets, preserving stable asset IDs and private read URLs
  without transferring bytes again. Generated images and uploaded images feed
  the current frontend; video/audio filters remain truthful empty states until
  their durable API is connected. Images from either source may be marked
  `首帧 / 尾帧 / 参考图`; selected videos and audio become reference media.
  Selection respects the model's per-type and total-media limits, and IDs already
  present in the video tray are disabled. Video settings default to `多模态`, where
  images, videos, and audio use `参考图片 / 参考视频 / 参考音频` roles. `首尾帧`
  accepts only two images and derives `首帧 / 尾帧` from tray order; video/audio
  upload and asset filters are disabled. A model or mode change is blocked when
  retained media exceeds the target capability, without silently removing it.
  Each preview has one lower-left label only: multimodal displays `图片1 / 视频1 /
  音频1` ordinals, while first/last-frame displays only `首帧 / 尾帧`.
  The source menu has one `上传素材` action rather than separate media-type rows;
  its native picker accepts only image, video, and audio MIME types still allowed
  by the active mode. Uploading creates an ordinary session reference only.
  `创建素材` is a separate, opt-in selection dialog with nothing preselected and
  a concurrent-processing promise. Until the material API arrives, its commit action
  is visibly unavailable rather than simulating a returned material ID.
  Before final video submission, every historical created material is checked
  again. Valid items may proceed; expired, evicted, or indeterminate items keep
  the draft intact, block submission, and offer `重新创建`.
  Local object URLs remain session-only until
  backend upload and durable mixed-media contracts exist.
- Settings: attached downward overlay drawer above results; closing it must not reset values or move results.
- Settings read from aspect ratio to model to output; aspect ratio is the leftmost
  wide-screen group and stays first through responsive reflow.
- Model list: opens within the parameter drawer and collapses after selection.
- Video model order is Seedance 2.5, Seedance 2.0, Seedance 2.0 Fast, then
  Seedance 2.0 Mini. Video settings use aspect ratio, model, provider line, and
  generation mode, then output. Provider line defaults to `标准`; `标准` maps to
  Doubao and `备用` maps to HC without changing any other selected value;
  output contains resolution, integer-second duration, and `有声 / 静音` rather
  than image-only options. Video count supports 1/2/4 (default 1), independently
  of image count. Every click freezes current inputs and starts that many single-
  video requests concurrently; another batch may be submitted while earlier ones
  run. Each result/failure belongs to its own ordered slot. Poll interruption
  keeps its task ID and offers query-only recovery, never an automatic new POST.
  Seedance 2.5 exposes 480p/720p and 4–30 seconds; standard
  Seedance 2.0 exposes 480p/720p/1080p/4K and 4–15 seconds; Fast and Mini expose
  480p/720p and 4–15 seconds.
- Nano Banana 2 accepts its 14 displayed ratios; each of GPT IMAGE 2.5
  sunburst, GPT IMAGE 2, and GPT IMAGE 2.5 flare accepts `9:16`,
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
- Selecting any GPT image model reveals `质量` (`自动 / 低 / 中 / 高`, default `自动`),
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
  click freezes the current composer values and submits one independent job per
  nonempty prompt segment (one job when no separator is used).
  Active styling and the creation stream communicate progress without blocking
  another click. There is no product-side concurrent-job count ceiling.
- By default, video Feihong remains unavailable and must not call the image
  generation boundary or render a synthetic result. GG-036 may enable a
  loopback-only page-smoke route with an explicit file credential; that route
  supports text-to-video only, uses GG-039 independent concurrent 1/2/4 slots,
  polls each returned task ID, and labels the playable result as local and
  not persisted. Reference media stays in the draft and blocks this temporary
  submission until the durable upload/material boundary exists.
- The Seedance transport contract uses `POST /v1/seedance/assets` and its typed
  status query for explicit materials, plus `POST /v1/video/generations` and its
  task query for videos. Multimodal with no references is text-to-video; the
  existing reference roles map directly into the ordered provider `content`.

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

## Page-header navigation

ADR 0061 removes the persistent top-right return actions from Assets, credit
activity, distributor management, all four enterprise content tabs and site-owner
account management. Existing navigation and tabs stay unchanged. No replacement
entry is added to the standalone site-owner page. Error-body recovery, browser
history, dialog/detail close, logout and `新建创作` remain available as before;
this does not authorize creative-state clearing or route changes.

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
does not transfer object bytes again. Video mode extends the picker with
`全部 / 图片 / 视频 / 音频` filters. Selected assets join the video reference tray
with their real media type and consume the active Seedance model's matching
per-type and total reference capacity.

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

GG-037 provides an isolated preview-session `?media-preview=1` mock of unified
image/video creation and detail. Completed video covers open the same three-zone
layout; wheel over the stage, arrow keys, and the mixed rail navigate completed
works. Closing restores the grid and focus. Playback is explicitly a simulated
cover motion, not real generated media. No mock item enters drafts or projects.

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
