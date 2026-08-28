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

## Brand and icons

- `public/goodgood-mark.svg`: connected Double G brand mark.
- `public/goodgood-wordmark.svg`: custom wordmark; do not replace with text.
- `public/feihong-send.png`: mask source for the send/generate action.
- Creation navigation: Brush.
- Explore: Compass.
- Projects: Folder.
- Assets: Images.
- Moodboard: Layout grid.
- Model providers: transparent `@lobehub/icons` marks only.

## Composer

- One visual component: prompt row plus optional reference tray and parameter
  drawer; drawers must not appear detached.
- Prompt is the flexible column. Left and right controls remain top-aligned and
  fixed while the textarea grows.
- Reference thumbnails use a horizontal tray, 46px square crops, and individual
  removal. Do not show redundant `参考图` labels or totals.
- Parameter group order: model; aspect ratio; output group with resolution above
  generation count.

## Image presentation

- Preserve the actual output ratio in all data and detail views.
- Creation and asset gallery use tight 3px gaps and a single rounded outer frame;
  internal image corners remain square.
- Batch rows align image group, prompt, and metadata to the same top edge.
- The image group has a stable visual height within a batch; width follows ratio.
- Object cropping is acceptable only for a deliberately fixed thumbnail surface;
  full detail must show the complete asset.

## Motion

- Motion communicates state: drawer reveal, generation progress, new-asset cue,
  result reveal, and detail navigation.
- Typical duration: 160–300ms. Result reveal may use 480ms with small stagger.
- No decorative constant movement. Respect `prefers-reduced-motion` for every
  new animation.
