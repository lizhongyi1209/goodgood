# ADR 0012: Private Cloudflare R2 for staging assets

- Status: Accepted
- Date: 2026-09-03
- Refined by: ADR 0019 for the controlled staging-hostname migration that must
  precede production use of `goodgood.o1key.com`
- Refined by: ADR 0021, which reserves the staging hostname and reuses this
  bucket only after approved test-object deletion, empty verification, and
  production credential rotation

## Context

M7 needs browser-direct upload and download for references and generated
assets without exposing storage credentials or making owner-scoped objects
public. The operator created the `goodgood` Cloudflare R2 bucket and selected
`goodgood.o1key.com` for the application plus `assets-goodgood.o1key.com` for
assets.

Cloudflare R2 custom domains are a public-bucket access mechanism. R2
presigned URLs work only with the account S3 API endpoint and not with a custom
domain. Enabling the asset custom domain directly on the bucket would therefore
conflict with GoodGood's private-object and short-lived signed-URL contract.

The Alibaba Cloud host also has a working single-node RustFS test-data stack,
but ADR 0011 does not approve its single-disk durability as paid-production
storage.

## Decision

Use the private Cloudflare R2 `goodgood` bucket as the authoritative M7 object
store. Both server-side S3 operations and browser-facing presigned PUT/GET URLs
use the account's HTTPS R2 S3 API endpoint, with region `auto` and path-style
addressing. Grant the application a bucket-scoped read/write R2 credential and
mount its access-key ID and secret-access key from distinct server-only files;
do not place either credential in the staging runtime environment file.
Use object-level read/write permission scoped only to `goodgood`. Because that
credential cannot edit bucket configuration, staging startup only verifies the
existing bucket and never creates it or changes CORS. Configure the reviewed
CORS rule separately in Cloudflare; local RustFS retains automatic provisioning.

Keep R2 public development URL access disabled. Disable the
`assets-goodgood.o1key.com` R2 custom-domain access and reserve that hostname
for a later authenticated Cloudflare Worker or another explicitly reviewed
private-delivery layer. Do not expose private GoodGood objects through an R2
public bucket merely to obtain a branded asset hostname.

Use `goodgood.o1key.com` as the canonical staging application origin behind
Cloudflare and the Alibaba Cloud Hong Kong Nginx origin. The existing RustFS
container and volume may remain temporarily as a non-authoritative rollback
aid until R2 upload, signed read, cleanup, and restore evidence passes; no new
staging user object should be written there after the R2 cutover.

This records the accepted M7 state, not the final hostname allocation. ADR 0019
later assigns `goodgood.o1key.com` to production and selects
`staging-goodgood.o1key.com` as the staging target. The running staging origin,
R2 CORS, Authing allowlists, certificates, Nginx configuration, and repository
contract remain unchanged until that controlled migration is executed and
verified. During cutover, both staging origins may be allowed only for the
short reviewed transition window; remove the old staging origin after the new
path passes.

## Consequences

- Browser image bytes bypass the 4-GiB application host and R2 bears the object
  transfer path.
- Signed URLs expose the Cloudflare R2 API hostname rather than the reserved
  branded asset hostname. This is intentional and temporary.
- In the accepted M7 state, R2 CORS allows only
  `https://goodgood.o1key.com` for the required browser methods and headers.
  Its later origin change follows ADR 0019's controlled cutover.
- Staging uses `OBJECT_STORAGE_PROVISIONING_MODE=verify`; the object credential
  never receives account-wide bucket-administration permission.
- The staging preflight must reject public/custom-domain endpoints, inline R2
  credentials, a non-`auto` region, or non-path-style addressing.
- R2 lifecycle, backup/export, credential rotation, signed transfer, and
  restore remain M7 evidence before production readiness.
