# ADR 0049 — Connect Seedance through explicit provider lines

- Status: Accepted
- Date: 2026-09-12
- Task: GG-035

## Context

GG-034 established the video creation UI and deliberately kept its Feihong
action away from the existing billable image endpoint. O1Key now exposes
Seedance material creation at `POST /v1/seedance/assets`, material polling at
`GET /v1/seedance/assets/{asset_id}?type={type}`, video creation at
`POST /v1/video/generations`, and video polling at
`GET /v1/video/generations/{task_id}`. Pricing and the durable GoodGood video
job boundary are not yet decided.

The creator also needs an explicit line choice. The two lines support the same
product parameters and capabilities; the supplied provider document is not the
source of truth for Seedance 2.5 limits.

## Decision

- Add a video-only `线路` parameter with product values `standard` and `backup`,
  displayed as `标准` and `备用`; default to `standard`.
- Map `standard` to O1Key `doubao` routes and `backup` to O1Key `hc` routes.
  Keep product model IDs and provider model IDs separate and resolve the mapping
  only on the server.
- Keep the existing Seedance 2.5 product capabilities unchanged. Both lines
  accept the same GoodGood parameters and references.
- Never switch lines automatically. A selected line is immutable request
  identity; a retry on another line is a new explicit request.
- Implement and verify the O1Key transport and payload adapter before exposing
  a product submission route. This slice does not invent video prices, bypass
  GoodGood billing, or reuse the image `/api/generations` endpoint.
- Material creation remains explicit and concurrent. Provider-created material
  identity is line-bound: Doubao materials use `type=doubao`, HC materials use
  `type=hc`, and historical material status must be checked with the same type.
- Use the current UI modes without adding new mode controls: multimodal with no
  references is text-to-video; multimodal with references uses `reference_*`;
  one first/last-frame image is `first_frame`; two are `first_frame` plus
  `last_frame`.

## Consequences

- The frontend can collect the final provider-routing choice without changing
  existing video parameters or any image behavior.
- Contract tests can prove endpoint paths, methods, model mapping, roles, and
  payload keys without a real credential or billable request.
- Enabling the creator-facing video submission still requires the separately
  reviewed durable job, ownership, result storage, and pricing boundary.

