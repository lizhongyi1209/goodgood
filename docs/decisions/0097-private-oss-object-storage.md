# ADR 0097: Private Alibaba Cloud OSS for application objects

- Status: Accepted for implementation; deployment and signed transport verification pending
- Date: 2026-09-23
- Supersedes: ADR 0012 for application assets only after a verified cutover

## Context

ADR 0012 selected private Cloudflare R2 for application assets. The operator
created private OSS bucket `o1key-goodgood` in `cn-guangzhou` and wants all new
uploads and generations written there, while retaining existing R2 objects.
Production contains
real user objects in R2. A separate R2 bucket holds the encrypted PostgreSQL
Restic repository, with an active half-hour backup timer. Local development uses
isolated RustFS. Model-input image copies are deferred.

The current S3 client assumes R2 region `auto` and path-style requests. OSS's S3
compatibility requires virtual-hosted requests and a concrete region. The app
also needs private signed reads that render images inline; Alibaba Cloud says
its default OSS domain can force browser downloads, so a mapped HTTPS domain is
part of the application delivery decision. For newer OSS accounts, Alibaba Cloud
also restricts data API calls against mainland buckets through the default
public endpoint. A custom domain bound to a mainland bucket requires ICP filing.
The operator supplied filed ESA hostname `oss-goodgood.o1key.cn`, currently
CNAMEd to `oss-goodgood.o1key.cn.a1.initqq.com`. It is an ESA edge hostname,
not a direct OSS CNAME. On 2026-09-24 its initially presented certificate had
CN `oss.o1key.cn`, so standard HTTPS validation failed. The operator later
reported fixing the certificate and configuring ESA reads. A subsequent normal
HTTPS HEAD to the root completed TLS validation and returned 403. A later
anonymous GET/HEAD of a real private object returned 403 through both ESA and
the direct OSS CNAME. The exact ESA origin setting is not independently verified.
The operator wants to retain ESA for its OSS-origin traffic classification.
ESA's native private-bucket origin authorization is read-only and can make all
objects readable through the edge. An OSS query-presigned URL also conflicts
with ESA's origin Authorization header. The edge must therefore enforce its own
application-issued, short-lived read token on every object path before cache or
origin access. ESA's bypass edge-function mode can check that token without
proxying large object response bodies through the function. Its native OSS
origin type, rather than S3-compatible origin type, is required for the
discounted OSS CDN-origin egress classification. This is a proposed application
design; the current deny-all function protects the live ESA host until token
validation replaces it.

## Decision

Keep the application bucket private and use a bucket-scoped server-only RAM
identity. Configure the regional OSS endpoint and virtual-hosted addressing.
The operator chose a separate filed HTTPS CNAME bound directly to OSS for
browser presigned PUT. This avoids dependence on default public endpoint
eligibility: OSS accounts opened after 2025-03-20 cannot use that endpoint for
mainland PutObject (`PublicEndpointForbidden`). Server object data operations
also use the bound CNAME. The regional S3-compatible endpoint is reserved for
Bucket existence checks. ESA's private origin cannot write.
Restrict bucket
CORS to the application origin. Keep `oss-goodgood.o1key.cn` on ESA for GET/HEAD
only, with native OSS private-bucket origin authorization and a bypass edge
function that rejects missing, forged and expired application-issued read
tokens across the whole hostname. GoodGood checks object ownership before
issuing a token. The token uses HMAC-SHA256 over the encoded object path and
Unix expiry, a separate shared server/ESA secret, and a maximum 15-minute
life. No OSS presigned GET passes through ESA. Cache is disabled
for private objects until this order and rejection behavior is proven; later
cache rules must preserve authorization before any hit. The browser sees a
temporary ESA URL, not an OSS credential. Object keys may still be visible.

Keep old R2 objects without moving or deleting them. Preserve their existing
library and project visibility by routing keys with the new `oss/` prefix to
OSS and unprefixed historical keys to R2. The current single global bucket
cannot address both stores. Keep the independent Restic backup repository on
R2. New object writes to R2 are rejected after cutover; historical reads and
existing cleanup behavior remain active. Credentials stay outside source control.

## Decisions still required

- `upload-goodgood.o1key.cn` is bound to the OSS bucket, its certificate is
  installed, and independent DNS/TLS/CORS preflight verification passed.
- An actual private object returned anonymous 403 through ESA and direct OSS.
  Signed access through the replacement edge guard is still unverified.
- Evidence that the ESA origin is native OSS private STS remains to be recorded
  from the operator's configuration or a signed read probe after deployment.
- Cutover and rollback boundary for active jobs and incomplete uploads.

## Consequences

- Production and staging preflight, Compose secret paths, runtime examples,
  release checks and operational documentation must match OSS before release.
- Existing records still refer to object keys, so object bytes must be present
  and readable from the chosen store before the old store is retired.
- The backup timer must keep writing valid recoverable snapshots throughout any
  application asset migration.
- OSS-to-ESA origin traffic and ESA-to-client traffic are separate charges;
  the native OSS-origin discount does not itself establish lower total cost.
