# Decision records

- `0081-jcoin-batch-accumulation.md` — accepted finite batches without expiry, separately opened next batch, recharge-consumption-only accumulation and no redemption/value peg for GG-083; numerical parameters remain unapproved.

- `0080-classified-admin-credit-grants-and-operations.md` — structured owner credit types, receipt-backed payment-funded grants and recharge/concurrency dashboard for GG-081.

- `0079-jcoin-reward-planning.md` — proposed JCOIN consumption-reward design for GG-080; confirmed name/supply/user-pool separated from unapproved allocation rates, utility and issuance.

- `0077-inspiration-editor-private-presets.md` — dedicated case editor, prompt visibility, server-only preset reproduction and pointer-wipe comparison for GG-074.

- `0076-shareable-inspiration-cases.md` — explicit personal effect publication, immutable before/after and parameters, reuse, likes and owner withdrawal for GG-073.

- `0075-private-personal-profile.md` — private own profile, unique handle, validated avatar and personal image works for GG-072.

- `0074-site-operations-and-global-log.md` — owner daily operations and cross-user task/credit lookup for GG-071; read-only personal/enterprise ledgers, same-shell pages and right details.
- `0073-model-cards-and-pricing-sheet.md` — compact model cards, default-line summaries and same-page right pricing sheet for GG-070.

- `0072-pricing-discount.md` — current-route batch discount editing, exact rounding and save-only price persistence for GG-069.

- `0071-seedance-line-prices-and-1080p.md` — independent video route pricing, Seedance 2.5 first and 1080p support for GG-068.

- `0070-seedance-token-pricing.md` — actual completion-token video pricing and pricing-only scope for GG-067.

- `0069-gpt-quality-pricing.md` — GPT quality pricing and fal estimates for GG-063.

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
- `0052-video-count-and-concurrent-runs.md`
- `0053-delimited-concurrent-prompt-batches.md`
- `0054-remove-composer-batch-summary.md`

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

ADR 0053 adds standalone-delimited concurrent prompt batches for GG-040.

- `0055-parameter-drawer-overlay.md` — attached image/video settings overlay for GG-042.
- `0056-larger-reference-previews.md` — larger shared thumbnails and video-mode material inspection for GG-043.
- `0057-personal-account-main-navigation.md` — personal shell, no global Workspace selector, enterprise main navigation for GG-044.
- `0058-contextual-business-credit-management.md` — row-level allocation and history within enterprise/distributor management for GG-045.
- `0059-actionable-enterprise-overview.md` — administrator metrics, attention, member usage and recent outputs for GG-048; period aggregation deferred.
- `0060-exclusive-enterprise-distributor-identities.md` — single business identity per account; distributor-only transfers and separate enterprise tabs for GG-049.
- `0061-remove-persistent-page-return-actions.md` — remove the five audited page-header return entries without replacements for GG-050.
- `0062-rmb-anchored-specification-pricing.md` — accepted RMB-anchored per-image/output-second/reference-video-second pricing direction for GG-051; CNY 1/100 credits is still a unit proposal, with no runtime changes.
- `0063-model-management-and-cent-credits.md` — accepted 100 credits/CNY, preserved legacy records, dynamic template-backed model management and specification price publishing for GG-052.
- `0064-banana-lines-and-specification-prices.md` — Banana special/quality/dedicated selection, server-owned mappings and independent fixed specification prices for GG-054.
- `0065-remove-managed-model-preserving-history.md` — archive removed catalog entries while preserving immutable audit, prices, results and projects for GG-056.
- `0066-site-owner-management-navigation.md` — shared site-owner account/model navigation and explicit local sign-in recovery for GG-057; supersedes ADR 0061 only for the account-page header.
- `0067-site-owner-workspace-management.md` — one site-owner entry and embedded enterprise/model/account management in the existing workspace for GG-059; supersedes ADR 0066's standalone chrome.

- `0068-gpt-image-provider-lines.md` ? GPT image three-line routing, independent pricing and preserved legacy accepted routes for GG-062.

- `0078-inspiration-visibility-and-statistics.md` — three visibility modes, fixed private parameters and durable deduplicated case statistics for GG-077.
