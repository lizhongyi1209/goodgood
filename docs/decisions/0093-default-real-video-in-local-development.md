# ADR 0093: Default real Seedance access in local development

- Status: Accepted
- Date: 2026-09-23
- Task: GG-102
- Supersedes: ADR 0050's manual local preview enablement

## Context

GG-101 makes the normal local image development path use a real O1Key development
credential. Video still needs a separate preview flag and credential even though
its Seedance transport and page result handling already exist. This leaves video
unavailable in the ordinary local workspace. The user requires image and video
interfaces to remain available without a manual video switch.

## Decision

- A configured local development runtime exposes the real Seedance page path by
  default, using the same external dedicated O1Key development credential as
  image generation. The browser never receives that credential.
- The checkpoint and standard Compose development launchers set the local video
  runtime configuration themselves. The Vite UI preview discovers the same
  external file during local serve, but does not put the credential into a build.
- Video submissions still require the user's explicit send action. Provider
  requests are billable; availability checks do not submit a generation.
- The route remains loopback-only, rejects cross-origin writes, and stays
  unavailable on the public production hostname. It does not use the image API.
- This changes local development availability only. Durable video jobs, billing,
  reference ingestion, private result storage, and production video enablement
  require a separate implementation and release decision.

## Consequences

- A local workspace with the validated development key offers both image and
  video provider paths without a per-session video flag.
- Missing or invalid development credentials fail closed in the durable local
  runtime. UI-only rendering may still start without credentials, with video
  accurately shown as unavailable.
- Local video results remain transient and are not represented as saved assets.
