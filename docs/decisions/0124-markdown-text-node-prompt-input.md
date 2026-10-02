# ADR 0124: Visual Markdown text nodes and generator text inputs

- Status: Accepted for GG-268 local implementation; GG-273 and GG-275 revisions accepted
- Date: 2026-10-01
- Task: GG-268

## Decision

Add a `textEditor` canvas node with a visual Markdown editor. Store Markdown and its rendered plain-text output in the existing versioned project graph, together with position and size. Use Tiptap's open-source React/StarterKit/Markdown extensions for native selection, IME, history and structured content; no raw HTML injection. Selected nodes show a compact achromatic toolbar above them: headings, bold, italic and lists plus editor undo/redo. GG-275 removes strike, quotation and code-block controls while preserving existing Markdown for recovery. Editor gestures own selection/clipboard/keyboard behavior; canvas dragging uses the surrounding node geometry. Node resize reflows content without changing the fixed 14px body typography or relative heading sizes; canvas zoom continues to scale the whole node.

GG-273 replaces the initial separate text input: an image generator always has one `reference` input accepting image `reference` and text `text` outputs. Source type determines routing; text edges do not consume image-reference slots. Old text-target edges remain accepted and normalize to the single input during save/restore. Multiple text inputs follow stable edge order, ignore whitespace-only content and are followed by the generator's own additional prompt, separated by blank lines. Received text shares the same compact file attachment card with images and existing video-composer attachments, using consistent document/image/video icons and a preview action. Videos remain in their existing video workflow. Editing/selection/deletion/connection changes update the preview; submitting freezes the combined plain prompt into the existing immutable generation snapshot. The existing 4000-character prompt limit applies to the combination and must be reported without truncation; no provider call occurs before an explicit generation action.

GG-273 editor presentation uses a visible document header, padded writing surface and restrained status footer, based on the Tiptap Simple Editor pattern and existing project primitives. The selected toolbar includes H1/H2/H3. Text output dots reuse the exact existing image output handle class, including hit area, breathing/hover/focus/reduced-motion behavior.

[GG-275](../tasks/GG-275-text-editor-layout.md) supersedes the document chrome and resize presentation: use the image generator's external metadata row, a quiet rounded writing surface and a visible lower-right double-diagonal resize grip, with no internal header/status footer. The grip freely resizes width and height, supports keyboard and touch, and never changes text sizes or prompt content. The screenshot supplies layout and grip geometry; GoodGood retains its white achromatic palette. Existing text ports, prompt composition, persisted Markdown and bounds remain.

[GG-290](../tasks/GG-290-canvas-text-editor-order.md) adds consecutive text-editor numbers to the external title and accessible editing label. Numbers follow text-node order within the current page, starting at 1; new/copied nodes append and deletion closes gaps. Existing persisted node order preserves the display on reopen, including legacy projects, without adding a stored field or changing prompt order.

[GG-301](../tasks/GG-301-text-divider.md) adds a horizontal-rule insertion button immediately after ordered lists and before the undo/redo group. Use the existing StarterKit `setHorizontalRule` command, a neutral horizontal-line icon and a thin gray rule in the editor; preserve native Markdown, selection/history and current editing/streaming locks. This is an additive toolbar entry with no new dependency or persistence contract.

[ADR 0131 / GG-303](0131-canvas-concurrent-prompt-batches.md) makes a native
horizontal rule output a standalone `---` line and splits composed canvas image
prompts into concurrent jobs. It supersedes the combined-source 4000-character
gate above with the existing per-segment API limit and ordered batch recovery.

Project snapshots, cloud validation, local recovery, pages and canvas copy/paste preserve text nodes and edges. Existing schemaVersion1/2 and JSON storage remain; no database migration is required. Unknown node types and inappropriate fields remain rejected, and legacy documents retain their current behavior. Local Web must be rebuilt to accept the additive node fields; the generation Worker/provider contract does not change. No production deployment is authorized.

Reference: [Tiptap Markdown basic usage](https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage) and [React installation](https://tiptap.dev/docs/editor/getting-started/install/react).
GG-308/ADR0133补充：选中未编辑时仅显示设置模板快捷栏，双击/键盘进入编辑才显示格式栏；设置模板将当前完整内容冻结为私有文本资产，1:1文字预览与资产复用不改变节点原Markdown/纯文本、端口和项目保存。见[ADR0133](0133-canvas-text-template-assets.md)。
