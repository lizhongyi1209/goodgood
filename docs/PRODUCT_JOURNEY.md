# Product journey and decision history

This document preserves the reasoning that produced the current prototype. It
prevents a future redesign from restarting the same debates without context.

## 1. Start with the real task

The first brief was intentionally narrow: a fast online AI image-generation
page centered on Nano Banana 2, with a creation area and an image display area.
Functionality was deferred so the interaction model and visual hierarchy could
be established first.

## 2. Find the visual posture by rejection

Early directions mixed premium editorial design and Neo-Tech language. They
were rejected for concrete reasons:

- Neo-Tech felt unlike the desired personality.
- Editorial structure introduced magazine-like rules and linework, making the
  product look like content publishing rather than a visual creation tool.
- Warm white and limestone gray felt low-energy.
- Strong separators made the working surface feel fragmented.
- A flat vermilion accent did not have enough material depth.
- Blue was explicitly excluded as the primary accent.

The chosen direction became a clean white, image-first workspace with rounded
geometry, very light structural borders, little shadow, and bright but
controlled Palace Red emphasis.

## 3. Use Midjourney as a layout lesson, not a skin

Midjourney's web layout was useful because the left navigation and main working
area read as one continuous surface. GoodGood adopted that spatial principle:
two columns without a hard dividing line, dense imagery, and low-chrome tools.
It did not adopt Midjourney's identity, dark theme, copy, or icon system.

## 4. Give the action a cultural story

Generic send arrows lacked narrative. A paper-plane concept evolved into the
red **Feihong** flying-bird mark: movement, delivery, and a restrained Chinese
cultural cue. It is reserved for sending/generating. Creation navigation uses a
brush icon so navigation and submission do not repeat the same symbol.

## 5. Build a real brand, not a typed name

The product was named **GoodGood**. The selected identity is a connected,
rounded Double G mark plus a custom GoodGood wordmark with linked `oo` forms.
A normal system-font label was rejected because it did not behave like a brand
asset. The mark must work independently as favicon, mobile mark, and compact
navigation identity.

## 6. Make the composer quiet by default

The default composer intentionally exposes only reference upload, prompt,
settings, and Feihong send. Settings unfold downward as an attached drawer so
configuration remains available without dominating creation.

Reference and send controls use the same 40px control system. Icon buttons are
transparent at rest and receive a light gray hover surface. Reference images
move into a dedicated tray so multiple uploads never steal prompt-writing area.
The prompt grows to eight lines and then shows a scrollbar.

## 7. Turn parameters into visual controls

Aspect ratio is shown as geometry, not only text. A dashed inverse-orientation
guide explains how portrait and landscape relate; the active black outline was
made thin and the active frame remains visually dominant. The ratio text appears
inside the preview and is not repeated below the control.

Resolution uses human-facing `标准 / 高清 / 超清` while preserving domain values
`1K / 2K / 4K`. Resolution and quantity share a component group; count defaults
to 1. Selected controls use a soft Palace Red fill, unselected segmented options
use white, and the surrounding group uses neutral gray.

## 8. Support different creation intents

Model choice became a collapsible selector rather than permanently visible
cards. Provider icons are transparent, icon-only marks from the peer-free
`@lobehub/icons-static-svg` distribution.

- Nano Banana 2: 快速，批量
- Nano Banana Pro: 高质量资产，视觉优先
- GPT IMAGE 2: 高真实感，提示词遵循

## 9. Design the whole loop, not only generation

Generation uses queued, rendering, refining, complete, and failed states. New
results appear above older results. Completed output automatically enters the
asset library, which receives a restrained arrival animation and count cue.
There is no redundant success text below generated images.

The asset library was corrected from a parameter-heavy history view into an
image-led space. Batch mode groups prompt and parameters as secondary metadata;
gallery mode removes that cognitive weight so selection can dominate.

## 10. Preserve a creative body of work

A creation page is a temporary stream. Users often generate many related assets
around one goal, so GoodGood adds a project concept: save the accumulated stream,
restore its prompt/parameters/assets later, and continue. Project mode includes
`新建创作` so saving continuity never turns into navigation lock-in.

## 11. Inspect without losing context

Clicking a generated or saved image opens a focused detail experience: large
image at left, prompt and parameters at right, and all images in a vertical rail.
Wheel and arrow-key navigation change the active image and its information.

## 12. Treat failure as part of creation

An error belongs where the expected results would be, not as a detached bottom
toast. It explains the recoverable cause, keeps all inputs, and provides direct
retry and settings actions. Toasts remain appropriate for short confirmations,
not durable task failure.

## 13. Keep initial authentication passwordless and narrow

The first production authentication choice is Authing-hosted OIDC with only
Google and email verification-code login/registration. Auth0 Japan and a
self-hosted identity service were rejected for this slice. Password, phone, and
extra social methods add recovery, abuse, compliance, and interface work that
the initial product does not need. GoodGood keeps its own opaque sessions and
internal owner IDs so the provider can be changed without rewriting creative
data. Until a filed custom domain exists, the hosted flow uses Authing's default
application domain.

## Confirmed exclusions

Do not reintroduce these without a new approved decision:

- Blue primary accent or neon technology styling.
- Magazine/editorial linework as the dominant structure.
- Warm ivory/limestone canvas.
- Strong panel borders, hard sidebar dividers, or heavy shadows.
- A normal system-font GoodGood wordmark.
- Filled icon buttons at rest in the prompt composer.
- Reference thumbnails inside the prompt text area.
- A bottom generation-success message.
- A project surface without a quick clean-start action.
- An asset library where parameter records visually outweigh images.
