# ADR 0048 — Add image and video creation modes

- Status: Accepted
- Date: 2026-09-12
- Task: GG-034

## Context

GoodGood's creation composer, model catalog, references, generation snapshots,
and result presentation currently assume image generation. The next product
capability is Seedance 2.0–2.5 video creation, but the provider API contract is
not yet available for implementation. Adding video models directly to the image
model picker would mix incompatible parameters and could accidentally submit a
video request through the existing billable image route.

## Decision

- Keep one creation surface with an always-visible `图片 / 视频` mode switch
  attached to the composer.
- Preserve independent in-memory image and video drafts when switching modes.
  Existing image draft, project, billing, provider, and generation behavior
  remains unchanged in this frontend slice.
- Give video its own model catalog and capability-derived controls. The initial
  catalog is Seedance 2.5, Seedance 2.0, Seedance 2.0 Fast, and Seedance 2.0
  Mini. UI labels remain separate from provider IDs.
- Expose only creator-facing video parameters now: aspect ratio, model,
  generation mode, resolution, duration, and audio generation. Generation mode
  lives in the attached parameter drawer and defaults to `多模态`. `多模态`
  accepts model-bounded image/video/audio references; `首尾帧` accepts at most
  two images and no video or audio. Switching to an incompatible mode is blocked
  until excess media is removed rather than silently deleting creator input.
  Provider-operational fields such as callbacks, expiry, last-frame return,
  watermark policy, and frame counts remain outside the UI.
- Accept local image, video, and audio references for frontend interaction and
  role assignment. Video mode uses one media-aware asset-library picker for
  reusable images, videos, and audio, preserving stable asset IDs and private
  read URLs without uploading object bytes again. The frontend keeps media type
  distinct from display labels and applies each model's per-type plus total
  reference capacity. Until the mixed-media asset API arrives, real generated
  and uploaded images populate the picker while video/audio filters truthfully
  show no available assets; no fixture may imply durable media that does not yet
  exist. New local video-mode material remains session-only until its
  authenticated backend contract exists.
- Keep video-reference labels inside the preview but mode-specific and singular:
  multimodal uses one lower-left media ordinal (`图片1 / 视频1 / 音频1`), while
  first/last-frame uses only `首帧 / 尾帧`. Do not add a second upper-left role
  label; the accessible description retains the full media name and role.
- Treat ordinary reference upload and provider material creation as separate
  user intents. One `上传素材` action accepts the media types still allowed by
  the active mode and never creates a provider material automatically. A
  separate `创建素材` flow starts with nothing selected, lets the creator choose
  only the references that require it, and submits the selected set concurrently
  once the backend contract exists; non-human references may stay ordinary.
- Provider-created materials are expiring references, not permanently valid
  assets. Every historical material must pass a fresh availability check before
  a video request is submitted. An unavailable or indeterminate material blocks
  submission without discarding the draft and offers an explicit recreate path.
  Provider material IDs and expiry mechanics remain internal implementation data.
- Do not submit video mode to `/api/generations`. The Feihong action reports
  that the video interface is awaiting connection while preserving all input.
- Video editing, extension, timestamp editing, and durable mixed-media assets
  are later backend-enabled slices, not implied by this frontend milestone.

## Consequences

- The established image-first visual language remains, while the creation tool
  becomes explicitly multi-mode.
- Model-specific constraints are represented as capabilities rather than UI
  label checks, preparing the provider integration without exposing secrets.
- Video drafts are intentionally session-only in this slice. Refresh, project
  persistence, generation, billing, assets, and detail routes remain image-only
  until the API and data migration are approved.
- The frontend must clearly distinguish the unavailable video submission state
  from a failed generation and must never fake a successful provider result.
