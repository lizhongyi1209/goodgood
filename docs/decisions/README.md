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
- `0027-expose-resolution-values-and-actual-asset-dimensions.md`
- `0028-enlarge-reference-previews-and-lead-with-aspect-ratio.md`
- `0029-enlarge-square-reference-previews-and-lead-with-aspect-ratio.md`
- `0030-open-gpt-image-2-sd-with-model-specific-sizes.md`
- `0031-allow-repeated-parallel-generation-submissions.md`
- `0032-open-gpt-image-2-multi-output.md`
- `0033-banana-thinking-and-google-search.md`
- `0034-stable-generation-grid-and-download.md`
- `0035-simplify-sidebar-credit-summary.md`
- `0036-gpt-image-quality-background-format.md`
- `0037-reusable-uploaded-reference-materials.md`
- `0038-user-ordered-reference-tray.md`
- `0039-reference-thumbnail-large-preview.md`
- `0040-reference-quick-editor.md`
- `0041-price-nano-banana-pro-at-fifteen-credits.md`
- `0042-restore-drills-with-active-alpha-sessions.md`
- `0043-direct-child-transfer-of-payment-funded-credits.md`
- `0045-goodgood-owned-email-otp.md`
- `0046-enterprise-workspaces-members-and-budgets.md`
- `0047-add-gpt-image-25-routes.md`
- `0048-add-image-video-creation-modes.md`
- `0049-connect-seedance-provider-lines.md`
- `0050-enable-local-seedance-page-smoke.md`
- `0051-mixed-media-style-preview.md`

ADR 0043 is allocated in the parallel GG-027 worktree. ADR 0044 belongs to
GG-028's unshipped Authing-domain branch and is superseded by ADR 0045. ADR 0046
belongs to GG-030 and is intentionally included in the GG-031 integration candidate.

Accepted describes a decision, not proof of deployment. ADR 0022/0023's full
runtime rollout is deferred under ADR 0024. The current release and rollout
status live in `docs/CURRENT_STATE.md`; older ADR context is historical.

ADR numbering 0043—0046 is occupied. GG-030 deliberately used 0046 so integration
would not renumber accepted decisions.

ADR 0047 adds the GG-033 GPT Image 2.5 product/provider routes.
ADR 0048 adds the frontend image/video creation mode boundary for GG-034.
ADR 0049 fixes the standard/backup Seedance provider mapping for GG-035.
ADR 0050 enables a fail-closed local-only Seedance page smoke route for GG-036.
