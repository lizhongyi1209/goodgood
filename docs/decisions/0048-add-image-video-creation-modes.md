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
  resolution, duration, and audio generation. Provider-operational fields such
  as callbacks, expiry, last-frame return, watermark policy, and frame counts
  remain outside the UI.
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
