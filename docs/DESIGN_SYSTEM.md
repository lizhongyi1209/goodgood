# Design system

## Visual thesis

GoodGood is a bright, premium visual workspace: continuous white/light space,
quiet interface chrome, compact rounded controls, and vivid imagery. Palace Red
adds authorship and cultural character without turning the interface into a red
surface.

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

- Prefer whitespace and grouping over lines.
- Sidebar and content share the same canvas; no vertical divider.
- Buttons are transparent at rest unless selection or hierarchy requires fill.
- Default icon hover: `--soft`; active selection: `--accent-soft` or a subtle
  light-to-deep Palace Red gradient.
- Avoid persistent navigation shadows. Composer may use a very shallow neutral
  elevation to remain legible while sticky.
- Authentication recovery is a compact white card over a softened canvas, not
  a marketing hero. It uses one neutral dark primary action for the combined
  Google / email-code hosted flow; authentication errors use restrained Palace
  Red copy and fill.

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

## Composer

- One visual component: prompt row plus optional reference tray and parameter
  drawer; drawers must not appear detached.
- Prompt is the flexible column. Left and right controls remain top-aligned and
  fixed while the textarea grows.
- Reference thumbnails use a horizontal tray, centered 1:1 crops at `64 × 64 px`
  on desktop and `56 × 56 px` on mobile, with a compact upper-right removal
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
- Parameter group order: aspect ratio; model; output group with resolution above
  generation count. Aspect ratio leads from the left on desktop and remains first
  when the drawer reflows or stacks.
- Nano Banana 2 places only its Google Search segmented control under the model
  selector. Use quiet labels and the existing Palace Red selected/on treatment;
  hiding the control must not leave an empty panel for other models.
- GPT IMAGE 2 uses the same attached, quiet segmented-control treatment directly
  under the model selector for `质量`, `背景`, and `输出格式`. Keep the groups in
  that order. Disabled JPEG under a transparent background remains legible but
  subdued, with a concise compatibility explanation.
- The credit quote is quiet 11px metadata beside the settings/send actions. It
  shows the per-image rate and, for 2/4 outputs, the selected batch total. It has
  no filled chip, border, icon, or payment emphasis.

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

## Enterprise and distributor allocation

- `积分分配` is a restrained utility surface visible only to an eligible
  business account. Reuse the light account-table/list language and Palace Red
  only for the selected state or final confirmed allocation; do not introduce a
  sales dashboard, wallet hero, earnings chart, or commerce illustration.
- Show total credit and `可分配积分` as concise account facts. Explain the latter
  as payment-funded credit (`充值来源积分`) in supporting copy; do not use color alone to distinguish it
  from non-transferable welcome/test/promotion credit.
- Direct-child rows prioritize identity, cumulative allocated credit, latest
  transfer time, and the allocation action. They never expose that child's
  balance or creative content. Narrow layouts stack the row and make the action
  full-width without hiding relationship context.
- The allocation dialog mirrors the compact site-owner credit dialog: explicit
  target, transferable balance, integer amount, optional remark, and one final
  Palace Red action. Completion shows the public transfer reference. There is
  no price, currency, payment, order, commission, revenue, or reclaim control.
- Loading, empty, first-read failure, stale-relationship conflict, insufficient
  transferable balance, and mutation progress preserve layout and keyboard/
  focus behavior. A disabled action must have a text explanation in addition to
  its visual state.

## Image presentation

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
