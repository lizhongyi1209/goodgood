# ADR 0102: Asset history, personal library, and 20 MiB uploads

- Status: Accepted for GG-115 local implementation
- Date: 2026-09-25
- Supersedes: ADR 0096's 200 MiB limit for new private image and video uploads
- Task: GG-115

## Context

The operator supplied a three-part reference: a media-filtered generation
history, a folder-based personal library, and a focused upload dialog. The
existing GoodGood asset page mixes generated batch/gallery controls and uploaded
materials; uploads start from the composer, and folders do not exist. The
operator explicitly retained automatic admission of successful generated
assets and chose one 20 MiB file limit across upload entry points.

## Decision

- `/assets` opens generation history. Group outputs by local calendar date and
  show `全部 / 图片 / 视频 / 音频` counts and filters. Only durable generated media
  appears; the current video preview is transient and must not be presented as
  saved history.
- A second `个人资产库` view contains every generated output and accepted upload
  automatically. History and library are views over the same object identities;
  neither copies bytes. Folder membership is optional, with `未分类` as the
  default. Projects remain resumable creative sessions rather than folders.
- Library uploads use the existing private image/video pipelines. Add a private
  MP3 material pipeline for durable audio reuse. Upload completion and folder
  assignment are separate recoverable operations; a completed upload remains
  in `未分类` if organization fails.
- New uploads have a 20 MiB per-file ceiling across upload entry points and
  accept only JPEG/JPG, PNG, MP4, and MP3. Preserve old, larger WebP/MOV/WAV
  private objects and their read access; new upload validation does not delete
  or rewrite history. The image editor exports PNG so its result can be saved.
  Model input budgets, accepted image dimensions, and short-lived signed
  transfer remain separate.
- Folder and tag metadata are owner/workspace scoped and never used as an
  authorization substitute. Preview routes continue to check ownership and
  use the fixed private WebP card preset.

## Consequences

The asset page uses GoodGood's light visual system, not the source site's dark
chrome. This adds an additive migration for folder metadata and audio records.
No production data is rewritten or moved; a production release needs its own
reviewed migration and release authority. Existing 200 MiB records can still be
read and selected, while new upload intents reject files over 20 MiB.
