# UX flows and state contracts

## Creation surface

### Empty

Show only a small GoodGood mark, `描述你想创作的画面`, and a quieter secondary
sentence. Do not insert sample images, tutorials, or parameter descriptions to
fill space.

### Composer

- Empty prompt submission: short toast, keep focus available.
- Prompt: autosize from one to eight lines; scroll after eight.
- References: accept multiple images, append in upload order, maximum 10.
- Settings: attached downward drawer; closing it must not reset values.
- Model list: opens within the parameter drawer and collapses after selection.
- Send: Feihong mark; controls disable or communicate progress while generating.

Reference ordinal is stored in data for prompt interpretation even though the
tray does not add visually heavy number badges. The accessible name and future
detail metadata should still expose `参考图 1…10` semantics.

## Generation lifecycle

Canonical states:

```text
idle -> queued -> rendering -> refining -> complete
                    |             |
                    +-----------> failed
failed -> queued (retry)
```

- Create an immutable input snapshot at submission.
- Insert the pending batch at the top of the current creation stream.
- Use ratio-correct skeletons for the requested image count.
- On success, replace skeletons with assets and prepend the completed batch to
  the asset library.
- Do not reorder an older completed batch above a newer submission merely
  because the provider completed out of order; sort by submission time.
- On failure, keep the failed batch location and all input state.

## Continuous creation and projects

- A creation session accumulates batches newest-first.
- `保存为项目` names and persists the whole current context.
- Once saved, new batches are automatically associated with that project.
- Restoring a project restores the latest prompt/model/ratio/resolution/count,
  all batches and their order, and its reference links when persistence exists.
- `新建创作` starts a clean session. If there are unsaved meaningful changes,
  production behavior must confirm or autosave before clearing.

## Asset library

All successfully generated images enter the asset library automatically.

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
- Left: largest possible complete image on a neutral stage.
- Middle: prompt, parameters, save/download actions.
- Right: vertically scrollable rail of all images in current scope.
- Wheel down/up and arrow keys select next/previous image; metadata changes with
  the image. The page beneath must remain fixed and restore its scroll position
  after close.

## Notifications

- Toast: brief confirmation or local validation (`已添加`, `已下载`, missing
  prompt). Never the only record of a generation failure.
- Inline status: ongoing generation within the creation stream.
- Inline error panel: durable job failure with recovery actions.
- Asset navigation cue: completed assets arrived; clear when assets is opened.
