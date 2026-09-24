# ADR 0101: Private, resized image previews for asset cards

- Status: Accepted for GG-113 local development
- Date: 2026-09-24
- Extends: ADR 0094 (reference previews) and ADR 0099 (local OSS read routing)

## Context

Asset cards and pickers currently put the private original URL in every image
element. A 940 × 1672 reference transfers about 2.38 MB to render one card.
The operator selected all asset library cards and selectors for the first
preview pass, while retaining full image detail, editing, and explicit download.

## Decision

Card and picker images use owner-scoped 512 px longest-edge WebP previews at
quality 80, preserving aspect ratio and EXIF orientation. The GoodGood API
checks ownership before any preview read. For local-development references in
Alibaba OSS, it redirects to a short-lived signed GET with `x-oss-process`
included in the signature; no OSS style needs to be created. For older RustFS
references and generated assets, the Web streams the original through Sharp
and returns transformed WebP. It does not persist a second object or change
the original upload pipeline.

Large focused views and explicit downloads retain the owner-scoped original.
Library list responses no longer include signed original object URLs. They
contain stable owner-checked content routes; those routes request a fresh
private original only when the browser opens a detail, edits, or downloads.
An authorized user can still obtain their own original through those product
features; a thumbnail alone cannot prevent saving its visible pixels. The
purpose is to avoid loading originals for a grid, limit incidental exposure of
full pixels, and reduce card transfer size.

## Consequences

- OSS dynamic processing and traffic may incur charges. The read-only local
  probe transformed a 2,380,052-byte source to a 30,556-byte, 288 × 512 WebP.
- Preview responses use `private, no-store` because an account switch in one
  browser must not reuse another owner's cached bytes. RustFS previews consume
  Web CPU on each request; a persistent derivative/cache is a later scale
  decision if measurements warrant it.
- An unavailable transform leaves the image card in its existing failed-image
  state without silently serving the full original as fallback. The item and
  owner records remain intact; refreshing can retry.
- The GG-111 production-bucket exception remains confined to the local test
  prefix. This decision does not authorize production deployment or data moves.
