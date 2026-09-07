# Decision records

Use an ADR when a change affects product vocabulary, a confirmed UX invariant,
data ownership, provider boundaries, security, routes, or deployment topology.

Status values: `Proposed`, `Accepted`, `Superseded`, `Rejected`.

Each ADR contains context, decision, consequences, and the superseding ADR when
applicable. Never rewrite an accepted historical ADR to make a later choice look
inevitable; add a new ADR and link them.

Current records:

- `0001-image-first-creation-workspace.md`
- `0002-goodgood-visual-language.md`
- `0003-session-batch-asset-project-model.md`
- `0004-async-control-and-generation-planes.md`
- `0005-local-first-container-promotion.md`
- `0006-product-billing-and-provider-routing.md`
- `0007-authing-google-and-email-otp.md`
- `0008-o1key-at-most-once-submission.md`
- `0009-banana-2-flat-credit-price.md`
- `0010-domestic-alipay-after-icp-with-manual-credit-operations.md`
- `0011-alibaba-cloud-hong-kong-staging-host.md`
- `0012-private-cloudflare-r2-for-staging-assets.md`
- `0013-staging-secret-reader-group.md`
- `0014-encrypted-off-host-staging-postgres-backups.md`
- `0015-production-observability-and-release-gate.md`
- `0016-defer-monitoring-platform-implementation.md`
- `0017-nginx-compose-blue-green-production-adapter.md`
- `0018-alibaba-cloud-managed-production-state-baseline.md`
- `0019-hong-kong-invite-only-seed-production.md`
- `0020-owner-reviewed-accounts-and-site-owner-console.md`
- `0021-single-host-seed-production-and-local-preproduction.md`
- `0022-production-data-retention-and-account-deletion.md`
- `0023-seed-content-safety-and-manual-response.md`
- `0024-controlled-alpha-before-full-seed-readiness.md`
- `0025-open-banana-2-aspect-ratios-and-resolutions.md`
- `0026-repository-owned-session-continuity.md`
- `0028-enlarge-reference-previews-and-lead-with-aspect-ratio.md`
- `0029-enlarge-square-reference-previews-and-lead-with-aspect-ratio.md`

Accepted describes a decision, not proof of deployment. ADR 0022/0023's full
runtime rollout is deferred under ADR 0024. The current release and rollout
status live in `docs/CURRENT_STATE.md`; older ADR context is historical.
