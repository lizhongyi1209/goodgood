# ADR 0096: 200 MiB private media uploads

- Status: Accepted
- Date: 2026-09-23
- Task: GG-105

## Context

The owner tested 30 MB images on Lovart and LibTV and asked GoodGood to accept
images and videos up to 200 MB for manual local verification. ADR 0095 kept
private image originals at 20 MiB while video originals already allowed 200 MiB.
The browser, reference API, object read, and generation Worker each enforce the
old image ceiling. The image provider input budget is a separate contract.

## Decision

- Accept JPEG, PNG and WebP reference originals up to 200 MiB, matching the
  existing MP4/MOV private video material ceiling. Check the same byte limit in
  the composer, upload intent, stored-object validation, and Worker read.
- Preserve the original private object for owner reuse. The Worker continues to
  derive bounded model inputs: at most 10,000,000 bytes per image and
  32,000,000 bytes across references. Keep the existing 40 MP and dimension
  validation; file size alone does not make an image valid.
- Allow 30 minutes for a signed image or video PUT at the larger size. Signed
  URLs remain scoped to one private object and content type.
- Keep profile avatars and editor exports on their existing separate 20 MiB
  client limits in this slice. This decision supersedes the 20 MiB private
  reference-original limit in ADR 0095; it does not change model input limits.

## Consequences

Large originals use more transfer, storage, validation time, and server memory.
Avoid an extra full-size byte copy when loading private objects. Browser preview
starts from the local file immediately, but decoding a very large image and
finishing its upload may take longer. The owner requested manual verification;
automated tests and the full local gate are deferred for this task.
