# Design system

GG-087反馈沿用侧栏普通MessageSquare图标与站长功能栏；安静标题、白色圆角反馈列表、右侧640px Sheet（手机全宽），字段复用Select/Textarea/Button。上传88px方形缩略图并带可访问移除，5张时禁用添加；原图复用Dialog，状态/时间/回复使用中性层级，不加重阴影。

GG-086站长批次卡片在已发/剩余下方增加Palace Red细进度条和百分比，复用Radix/Shadcn Progress、期号aria-label/value文本；减少动画时禁用过渡，手机保持全卡宽度。用户个人页不展示发行进度。

GG-084沿用轻量个人工作区与站长功能栏，Palace Red突出自己的币与奖励；三项统计、简洁时间流水，未加币价或发行进度营销。手机入口使用既有Radix账户菜单，保持顶部工具位置；站长窄屏总量独占一行，另两项并排，发行批次采用独立白色圆角卡片、轻边框无阴影；期号/状态在顶部，额度突出，已发/剩余并排，规则及操作在卡片内。卡片网格自适应，手机单列，数字不截断（GG-085）。开启确认复用Dialog与既有Button，加载/错误用status/alert，刷新有明确aria-label。功能样式限定features/jcoin/jcoin.css。

GG-081继续使用同一admin-action-dialog及Radix Select/Checkbox：积分类型有显式label，默认测试，充值动态展开凭证与收款确认；不增加独立支付页。看板延续operations-metrics/可横向滚动日表，趋势按钮支持键盘及aria-pressed。现金带¥，峰值缺失显示暂无统计及—，排队与当前并发分开。

GG-076 hover cases preview on board cards and details. Show full processed output at rest; enter/move reveals before with pointer-following seam, leave restores output. Detail/editor range supports keyboard/touch; board cover stays one case-opening button without nested inputs.

GG-075 uses the same LayoutGrid icon for inspiration navigation and image-detail publication. Effect comparison is a visible labelled section, with selectable original-reference thumbnails, an effect-only option and explicit empty state. Modes remain visible when unavailable.

GG-074 case editor uses the creator shell with a quiet heading, left editing
fields and right live image/settings preview; one column below900px. Public/hidden
and comparison radios have plain explanations. Pointer wipe preserves decoded
aspect ratio and contained images, with a visible seam and touch/keyboard range.
Hidden reproduction clearly separates preset badge from optional supplement.

GG-073: quiet inspiration heading/search, responsive image cards with original
ratio, author and like action. 720px right Sheet shows contained before/after,
prompt, original settings and one recipe-use action; mobile full width.
Publish preview and removal confirmation reuse Sheet/Checkbox/AlertDialog.

GG-072 uses a quiet profile identity row (circular centered avatar, name, muted
@handle, one edit button) above responsive image works preserving their ratios.
An accessible 480px right Sheet edits identity; mobile uses full width. Reuse
canvas/soft/ink/muted/line/Palace Red tokens and existing private image rendering.

GG-071 adds quiet responsive KPI cards, selectable Palace Red daily bars and
compact table rows in the existing owner shell. Logs have task/ledger buttons,
wrapping labelled search/date/filter controls and a right 640px detail Sheet
(mobile full width/internal scroll). Wide tables scroll within their area, never
expand the page. Existing single page title and wrapping management links remain.

GG-070 supersedes the pricing-row layouts below with compact responsive model
cards. Each card shows name/status, default-line price range and specs/line count;
video reference rates remain separate. A same-page right Sheet holds full pricing
controls, with internal content scrolling and a fixed save footer. Desktop width
is 760px, mobile full width; minimal borders and no panel shadow. Repeated pricing
and route explanations are removed; necessary units and discount rules remain.

GG-069 pricing dialogs add a compact overall-discount input, percent unit and
apply button after route controls. Quiet helper copy defines 98/80/100 and
non-compounding behavior; inline feedback stays beside the control. No new
list columns or navigation; responsive controls wrap with visible labels.

## Visual thesis

GG-068 adds two aligned standard/backup video price rows per model, each with a
quiet route label. Video groups omit the requested billing subtitle and use
元/百万token below specifications. The editor uses the existing compact route
buttons rather than duplicating its form; adaptive page width remains intact.

GG-067 video rows show two compact mutually exclusive rate rows (无参考视频 /
含参考视频), with an explicit 人民币/百万 tokens unit. The editor aligns supported
resolutions and both rates; calculation and optional JSON parsing share one
quiet surface. Adaptive width stays unchanged.

GoodGood is a bright, premium visual workspace: continuous white/light space,
quiet interface chrome, compact rounded controls, and vivid imagery. Palace Red
adds authorship and cultural character without turning the interface into a red
surface.

GG-054/GG-062 Banana and GPT line choice reuses the compact rounded segmented controls beneath
the model selector. Selection uses Palace Red; unavailable choices retain native
disabled and accessible pressed states. The pricing list keeps one model name
with three compact aligned line rows and RMB/credit units. Desktop shares the
resolution header; narrow screens repeat it once per model, not per line. The
editor switches line inputs without duplicating the full model form or exposing
provider IDs. Line enable/availability stays explicit.

GG-065 supersedes GG-064: quality-priced lines show ranges in the list; tier
details live only in the pricing editor. GG-066 restores adaptive embedded page
width and the original standalone 1500px maximum, retaining the 200px desktop model-name column and compact aligned price/action
columns. Narrow screens retain the stacked model/price layout and resolution labels.

## Foundations

Canonical CSS tokens currently live in `app/globals.css`.

| Token | Value | Role |
| --- | --- | --- |
| `--canvas` | `#f8f8fa` | Main application canvas |
| `--white` | `#ffffff` | Active surfaces and segmented controls |
| `--ink` | `#292933` | Primary neutral text |
| `--muted` | `#737381` | Secondary copy |
| `--quiet` | `#9999a7` | Metadata and helper copy |
| `--line` | `#e5e5e9` | Necessary structural edge only |
| `--soft` | `#f0f0f3` | Hover and neutral control fill |
| `--accent` | `#b52b30` | Palace Red action/selection |
| `--accent-deep` | `#8f2025` | Active text and pressed state |
| `--accent-light` | `#cf4548` | Highlight/material gradient |
| `--accent-soft` | `#f5e8e7` | Restrained selected surface |

Palace Red should gain depth through small tonal gradients, hover transitions,
and contrast—not large shadows or glossy decoration.

## Scale

- Spacing base: 4px; common steps: 4, 8, 12, 16, 24, 32.
- Control heights: 32px compact, 40px default, 48px large/form.
- Type: 11px metadata, 12px compact UI, 14px body/control, 20px section title.
- Radius: 8px compact, 12px control/group, 16px major surface.
- Icon size: normally 15–18px inside 40px controls. The Feihong silhouette is
  optically sized at roughly 22 × 20px.

Control size is determined by the global system, not by the visual mass of an
individual icon. Upload, settings, and send align to the same 40px box.

## Surfaces and separation

- GG-059 embeds site-owner enterprise/model/account content beside the retained
  lobby sidebar. GG-060 removes its duplicate visible context title: the upper
  row only exposes wrapping 40px function links using Palace Red selection;
  the current content page supplies the sole 20px primary title with a secondary
  description. Embedded admin content omits duplicate brand/header,
  outer viewport height and padding; Chinese font settings remain scoped there.
  GG-061 adds an independent audit function with the same sole primary title,
  quiet desktop columns and stacked mobile fields. Actor, target and reason stay
  readable without truncating audit evidence; no duplicate account-page log panel.

- The model-management list groups images and videos, shows each model name
  once, and aligns resolution prices in quiet desktop columns. On mobile each
  row retains its actions above a compact price grid. RMB values have modest
  emphasis with tabular digits; equivalent credits and units are secondary.
  Output/reference video prices remain distinct. The editor uses compact
  specification groups and a collapsed technical detail area, not repeated IDs
  or version badges in ordinary rows (GG-053).

- Prefer whitespace and grouping over lines.
- Sidebar and content share the same canvas; no vertical divider.
- Ordinary actions—including navigation, return, retry, search, row actions,
  and cancel—have no outer border and remain transparent with neutral text and
  icon color at rest. Their hover may use only the quiet `--soft` surface.
- An ordinary button must not use Palace Red or another status-colored fill in
  its default state. Accent fill is reserved for an explicit selected/pressed
  state or a final commit/confirmation action; text and icons on that fill are
  always white.
- Form fields and select triggers may retain a neutral structural border. Focus
  is communicated with a Palace Red outline or ring, not a persistent colored
  background.
- Default icon hover: `--soft`; active navigation may use `--accent-soft` or a
  subtle light-to-deep Palace Red gradient.
- Avoid persistent navigation shadows. Composer may use a very shallow neutral
  elevation to remain legible while sticky.
- Authentication recovery is a compact white card over a softened canvas, not
  a marketing hero. The email-only candidate keeps its normal email field,
  one six-digit code field, and the send-code action together in a compact
  single-column form: left-aligned stacked brand, a small underlined mode label,
  full-width email, code/send row, then one neutral dark login action. It fits a
  390px mobile viewport. Secondary send/modify states stay quiet. Email and code
  focus is a Palace Red border with no input shadow; authentication errors use
  restrained Palace Red copy and fill. OIDC rollback mode may retain its combined
  hosted-login label until cutover.

## Brand and icons

- `public/goodgood-mark.svg`: connected Double G brand mark.
- `public/goodgood-wordmark.svg`: custom wordmark; do not replace with text.
- `public/feihong-send.png`: mask source for the send/generate action.
- Creation navigation: Brush.
- Explore: Compass.
- Projects: Folder.
- Assets: Images.
- Moodboard: Layout grid.
- Model providers: transparent marks from the peer-free
  `@lobehub/icons-static-svg` distribution only.
- Seedance 2.0–2.5 uses `bytedance-color.svg` from the same distribution,
  displayed at 26px within the existing transparent 32px model-icon slot.

## Composer

- One visual component: prompt row plus optional reference tray and parameter
  drawer; drawers must not appear detached.
- Parameters open as an opaque attached downward overlay above results (ADR
  0055), not an in-flow expansion. Raise the open composer one stacking level;
  retain shallow elevation and joined edges. Opening must not move results.
  Long drawers scroll within the viewport space below the prompt/reference tray.
- A compact `图片 / 视频` segmented control is attached above the prompt row.
  It uses the same white/soft surfaces and restrained Palace Red selected state;
  it is a creation-mode choice, not another navigation bar.
- Prompt is the flexible column. Left and right controls remain top-aligned and
  fixed while the textarea grows.
- Do not add a batch-prompt summary row in either composer (ADR 0054).
  Image quote beside send uses the total across segments, not just one segment;
  retain video interface status without inventing pricing or replacement copy.
- Reference thumbnails use a horizontal tray, centered 1:1 crops at `96 × 96 px`
  on desktop and `80 × 80 px` on mobile (ADR 0056), with a compact upper-right removal
  control that minimizes image obstruction. Each thumbnail
  keeps a compact lower-left `图 1…图 10` badge so prompt references match the
  submitted order. Keep the sizes in shared responsive tokens and do not show a
  redundant tray heading or total.
- Reference drag feedback uses a restrained opacity change on the moving item
  and a Palace Red inset edge on the current destination; it must not resize or
  reflow the tray before the drop.
- Clicking a ready reference opens a focused, viewport-contained quick editor.
  The default view shows the complete source with `object-fit: contain` and keeps
  `图 N` plus the filename visible. A compact left rail exposes view, crop,
  brush, sticker, arrow, and box-selection tools; the active tool uses Palace
  Red while inactive tools remain transparent or neutral.
- Tool settings stay attached above the image stage and completion actions stay
  in one quiet footer. Do not split the editor into heavy inspector panels or
  let tool chrome cover the source detail being inspected.
- Uploading and failed references reuse the thumbnail silhouette with a quiet
  opacity treatment and centered status icon; do not introduce a detached
  upload panel or success banner.
- The reference icon opens a compact source menu for local upload or existing
  materials. Existing-material selection uses a focused responsive dialog with
  1:1 centered previews, visible selection, existing-tray disabled state, and a
  single confirmed add action.
- In video mode the source menu uses one unadorned `上传素材` row, followed by
  `从资产库选择` and a separated
  `创建素材` action. The creation action opens a focused checklist; no item is
  selected by default, and ordinary upload never implies material creation.
- Material creation status and concurrent progress belong in that focused flow,
  not as more badges over the tray previews. Expired or unavailable historical
  material uses one concise inline recovery message and `重新创建` action before
  submission.
- Video provider line is a compact two-option control inside the model group,
  after model capability copy and before generation mode. It reads `标准 / 备用`,
  defaults to `标准`, and never resets another video value when changed.
- Video output adds `生成数量` with `1 / 2 / 4`, default 1, below sound. Reuse
  the existing quiet segmented controls. Feihong remains available while earlier
  videos run; compact stream status, not a disabled send action, shows progress.
- Video mode keeps the same tray silhouette for local image, video, and audio
  references. It uses exactly one compact lower-left overlay: multimodal shows
  the media ordinal without a space (`图片1 / 视频1 / 音频1`), while first/last-
  frame shows only `首帧 / 尾帧`. Do not add an upper-left role label or expose a
  manual role selector. The accessible description retains the full media type,
  ordinal, filename, and role. Audio uses a quiet
  neutral placeholder rather than invented artwork. Video mode uses the same
  focused picker as image mode, adding quiet `全部 / 图片 / 视频 / 音频` filters,
  count badges, media labels, and type-specific empty states. Image cards retain
  centered crops, video cards use muted cover frames, and audio cards use a quiet
  neutral placeholder. Video-mode tray items open a focused read-only preview:
  complete contained image, video with controls, or audio with controls; never
  autoplay. Loading/error/retry remain inside it and do not alter references.
  Video mode does not expose the image quick editor in its
  frontend-only phase.
- Video generation mode is a quiet two-option segmented control inside the model
  parameter group. `多模态` is selected by default; `首尾帧` uses the same selected
  treatment. Unsupported upload and asset-filter entries remain visible but
  disabled with concise text, so the active limit is legible before selection.
- Parameter group order: aspect ratio; model; output group with resolution above
  generation count. Aspect ratio leads from the left on desktop and remains first
  when the drawer reflows or stacks.
- Both Banana models show the GG-054 three-line control under the model selector;
  Nano Banana 2 also places its Google Search control below the line choice.
  Use quiet labels and the existing Palace Red selected/on treatment;
  hiding the control must not leave an empty panel for other models.
- All three GPT image models use the same attached, quiet segmented-control treatment directly
  under the model selector for `质量`, `背景`, and `输出格式`. Keep the groups in
  that order. Disabled JPEG under a transparent background remains legible but
  subdued, with a concise compatibility explanation.
- The credit quote is quiet 11px metadata beside the settings/send actions. It
  shows the per-image rate and, for 2/4 outputs, the selected batch total. It has
  no filled chip, border, icon, or payment emphasis.
- Before video pricing exists, the same location reads `接口待接入` without a
  fake price. Video output controls use resolution, duration, and sound; they
  retain the existing quiet segmented and slider language.

## Page-header navigation

ADR 0061 removes persistent top-right return entries from Assets, credit
activity, distributor management, enterprise management and site-owner account
management. Do not add replacement buttons, breadcrumbs or logo navigation.
Existing content tabs, filters, logout, `新建创作`, detail/dialog close controls
and error-body recovery actions retain their current semantics and focus behavior.

## Account credit

- Desktop shows `积分记录` as a normal low-emphasis navigation row immediately
  below `帮助` in the lower sidebar. It has no secondary call-to-action copy.
  The account trigger itself stays to one quiet row: avatar, username, and a
  trailing overflow mark. It does not repeat identity, balance, or logout.
  Selecting it opens a compact menu to the right of the lower sidebar. The menu
  gives identity and current balance separate, non-interactive 13px rows, then
  separates the logout action below. Identity is one of `站长`, `个人`, `企业`,
  or `分销商`; site-owner identity takes precedence over any business-role value.
  The exact numeric balance retains Palace Red emphasis. Per-image price, batch
  total, and
  approximate remaining image count do not repeat there; generation pricing
  remains beside the composer actions.
- Mobile uses one small neutral balance pill in the existing top bar. It is
  context, not a primary action. The desktop entry and mobile pill may open
  the dedicated credit-record view while retaining their quiet visual weight.
- Loading and unavailable states keep the username subtitle footprint so account
  chrome does not jump. Do not add a wallet panel, pricing hero, or checkout treatment before
  a real payment provider and customer checkout flow are accepted.
- The credit-record view uses one compact `今日消耗 / 本周消耗 / 本月消耗`
  summary, a quiet segmented filter, and white list rows with shallow separators.
  Rows show only business category, batch reference when present, time, status,
  and credit change. Model, resolution, count, prompt, and image-result controls
  stay in the asset library; the record view must not resemble a checkout or
  marketing dashboard.

## Site-owner account management

- GG-057 shares the account/model header under `站长管理`: quiet white sticky
  chrome, one matching content width, two compact navigation links, Palace Red
  current-page fill/text plus `aria-current`, and the direct creation action.
  GG-058 removes header logout and sets an explicit Chinese sans-serif fallback
  stack with no synthesized font weights on these two page bodies.
  Narrow screens wrap the brand/action row and retain both text navigation
  labels below it. Match the two page headings and spacing; add no shadow or
  decorative management hero.

- Treat `/admin/users` as a compact working surface, not a marketing page. Use
  the existing light canvas, quiet chrome, rounded controls, and Palace Red only
  for selection or the primary confirmed action.
- Use no decorative imagery. Desktop favors a readable account table; narrow
  layouts use stacked account rows without hiding status, tier, or the primary
  review action.
- Resolve account identity to one user-facing label: `站长` takes precedence;
  every other account displays exactly one of `个人`, `企业`, or `分销商`.
  Keep access state and account tier visually distinct from that label. Status
  treatments remain restrained and must not rely on color alone.
- On wide screens, account email, identity, and direct parent occupy separate
  table columns. The account column contains only the account identifier; a
  missing direct parent displays an em dash. Card layouts use the same identity
  and direct-parent labels as separate fields rather than nesting them below the
  email.
- Use the access-state select as the only status filter. Do not repeat the same
  pending, active, and suspended choices as summary cards above the table; the
  initial view lists all accounts.
- Use existing table, dialog, select, input, and alert-dialog primitives where
  their semantics match. Granting credit requires an explicit confirmation and
  never uses checkout, wallet, or payment visual language.
- Account-management select lists open below and left-aligned to their trigger
  with a small gap; they do not flip upward over the field or preceding
  content. Long candidate lists keep a bounded height and scroll internally.
- Loading, empty, failure, retry, and mutation-in-progress states retain the
  page silhouette so rows and controls do not jump.

## Distributor allocation

- ADR 0060 puts allocation only in `分销管理 → 客户与下级`, with horizontal
  `划拨记录` tabs, not in enterprise management or standalone main navigation.
  Each account displays one identity; no enterprise/distributor toggle or combined
  badge. Enterprise management contains only its four company tabs.
  Reuse the light account-table/list language and Palace Red
  only for the selected state or final confirmed allocation; do not introduce a
  sales dashboard, wallet hero, earnings chart, or commerce illustration.
- Show personal total credit and `可分配积分` as a compact inline facts row,
  not prominent summary cards. Distributor allocation never implies company
  pool or employee budget ownership. Explain the transferable subset
  as payment-funded credit (`充值来源积分`) in supporting copy; do not use color alone to distinguish it
  from non-transferable welcome/test/promotion credit.
- Direct-child rows prioritize identity, cumulative allocated credit, latest
  transfer time, `查看记录`, and `分配积分`. They never expose that child's
  balance or creative content. Narrow layouts stack the row and keep both
  neutral actions together without hiding relationship context.
- Account-specific history is an ephemeral filter of fetched pages. Keep
  `全部记录`, range disclosure and load-more visible even when that filter
  yields no rows; do not label a partial empty result as empty full history.
- The allocation dialog mirrors the compact site-owner credit dialog: explicit
  target, transferable balance, integer amount, optional remark, and one final
  Palace Red action. Completion shows the public transfer reference. There is
  no price, currency, payment, order, commission, revenue, or reclaim control.
- Loading, empty, first-read failure, stale-relationship conflict, insufficient
  transferable balance, and mutation progress preserve layout and keyboard/
  focus behavior. A disabled action must have a text explanation in addition to
  its visual state.
## Enterprise workspace management

- ADR 0059 makes overview a compact operational page, not repeated navigation
  cards: four metrics, actionable credit/invitation attention, member usage and
  recent team outputs. Monthly aggregates show `— / 待接入统计` until connected;
  current member figures are explicitly cumulative. Use white rounded lists,
  neutral row actions, two columns that stack on narrow screens, and bounded
  image thumbnails opening a focused, complete-image read-only dialog.
- ADR 0057 removes all global Workspace selectors, including site owners.
  Enterprise management and eligible credit distribution use the normal main
  sidebar. Enterprise detail has compact horizontal content tabs, not a second
  sidebar. Only legacy scoped creation URLs display quiet company context.
- Enterprise headings use the 20px section scale; summaries are restrained
  white 16px-radius surfaces. Ordinary row/invite/navigation actions stay
  neutral. The invitation and budget dialogs reuse `admin-action-dialog`.
- Enterprise overview, members, usage, and Assets remain working surfaces on the
  white image-first canvas. Reuse the compact admin table/card rhythm without
  making organization managers look like GoodGood site owners.
- Member rows lead with email/name, then role, membership state, allocated,
  consumed, reserved, and remaining credit. Wide layouts use a readable table;
  narrow layouts use stacked labeled fields and retain the primary action.
- Invitation, role/status, and budget dialogs preserve their page context.
  Confirmed allocation uses Palace Red only for the final action; current/new
  amounts and company unallocated capacity are visually distinct without wallet
  or checkout styling.
- Team Assets keep the normal gallery-first presentation. Creator and usage
  metadata stay subordinate to images; employee oversight must not turn the
  gallery into a ledger table.
- Loading, empty, access-denied, expired-invite, stale-version, mutation, and
  retry states keep stable silhouettes and keyboard/focus behavior.

## Image presentation

- GG-037 opt-in style prototype mixes image and video output cards in the same
  four-column / narrow two-column masonry. Video cards use a compact play/time
  overlay, not an embedded full-width player; progress occupies the same slot.
  Shared detail keeps a complete preview, parameters, and mixed thumbnail rail.
  This prototype is labelled simulation; the owner accepted its layout on 2026-09-13.

- The asset library separates generated images from uploaded materials without
  making either look like a file-management table. Material cards preserve the
  image's real ratio and keep filename/dimensions subordinate to the image.

- Preserve the actual output ratio in all data and detail views.
- Creation and asset gallery use tight 3px gaps and a single rounded outer frame;
  internal image corners remain square.
- Creation skeletons occupy the same final masonry slots as their outputs; a
  completed image replaces its skeleton without a second layout pass.
- Creation-card hover metadata shows the concrete pixel dimensions. Successful
  outputs are already in the asset library, so creation cards and image detail
  expose only download rather than a duplicate bookmark action.
- Creation-card download controls provide visible hover, focus, and pressed
  feedback through the Palace Red accent and a shallow elevation change.
- Generated assets retain their original color in creation, project, asset, and
  detail views. Do not apply ordinal-based saturation, contrast, hue, brightness,
  or other presentation filters to make outputs appear artificially varied.
- Batch rows align image group, prompt, and metadata to the same top edge.
- The image group has a stable visual height within a batch; width follows ratio.
- Object cropping is acceptable only for a deliberately fixed thumbnail surface;
  full detail must show the complete asset.

## Destructive confirmation

- Use one compact modal only when an in-app action would clear meaningful
  unsaved creation state. The confirmation itself is an opaque white card over
  a restrained secondary veil; canvas or page content must never show through
  its text and actions. Keep `继续编辑` visually quiet and the explicit discard
  action Palace Red; do not use a generic browser confirmation.

## Motion

- Motion communicates state: drawer reveal, generation progress, new-asset cue,
  result reveal, and detail navigation.
- Typical duration: 160–300ms. Result reveal may use 480ms with small stagger.
- No decorative constant movement. Respect `prefers-reduced-motion` for every
  new animation.

GG-077：参数可见性使用同一单选组的三档选项。大厅卡片署名右侧用轻量 Eye/Sparkles 图标与数字并排显示查看/使用数（GG-078），不显示中文统计解释；GG-079恢复点赞图标数字到相同行，保持效果图为主体；隐藏参数详情用一句预设说明代替参数列表。

GG-079：灵感详情图片/划过比较框使用水平居中；左右比较的每一张图在各自列内居中，保持contain和比例，不影响大厅卡片。
