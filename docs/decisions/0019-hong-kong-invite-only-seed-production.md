# ADR 0019: Hong Kong invite-only seed production before paid commercialization

- Status: Accepted
- Date: 2026-09-05
- Supersedes: ADR 0018 only for the previously unset `productionRegion`
- Refines: ADR 0015 only by separating the seed-production launch gate from
  the later paid-production and customer-checkout gate
- Also refines: ADR 0012 by assigning the clean application hostname to
  production after a controlled staging-hostname migration
- Refined by: ADR 0020 for open registration, pending-by-default admission,
  site-owner review, and production-data treatment
- Refined by: ADR 0021 for clean conversion of the existing Hong Kong host,
  local preproduction, and reservation rather than activation of a staging host

## Context

M7 has proved the public Hong Kong staging path with isolated test data, real
Authing login, real O1Key generation, private R2 assets, application rollback,
and an encrypted off-host PostgreSQL restore. M8 has also selected a managed
production-state baseline and a non-executable blue/green release adapter, but
ADR 0018 left the production region unset while ICP filing and domestic Alipay
were considered part of one paid-production decision.

The operator has now selected the existing Hong Kong control-plane direction
for production and wants to prepare a small seed-user launch before payment is
available. Customer checkout, domestic Alipay, and its ICP/merchant
prerequisites remain planned for later. Treating those deferred commercial
features as blockers for all real-user production traffic would prevent useful
seed validation; treating the current test-data staging host as production
would weaken the already accepted data, recovery, monitoring, and release
boundaries.

## Decision

Set `productionRegion` to Alibaba Cloud Hong Kong for the initial GoodGood
production control plane. Keep ADR 0018's x86 ECS, RDS PostgreSQL HA, Tair
master-replica, same-region private VPC, and external private R2 boundaries.
The existing M7 staging host and its colocated test-data services do not become
production by renaming them.

Use `goodgood.o1key.com` as the canonical production application hostname.
Move the existing staging application to `staging-goodgood.o1key.com` through a
controlled migration before production claims the clean hostname. The hostname
decision does not itself change DNS, Cloudflare TLS/origin configuration,
Nginx, R2 CORS, Authing callback/logout allowlists, or the running staging
contract. Stage and verify the new staging hostname across those boundaries,
then remove staging's dependency on `goodgood.o1key.com`; do not repoint the
clean hostname while the accepted staging path still depends on it.

The staging R2 bucket remains test-data infrastructure. The production object
boundary must use separate credentials and a separately reviewed bucket or
prefix. `assets-goodgood.o1key.com` remains reserved and disabled for direct
private-object delivery unless another ADR selects an authenticated delivery
layer.

Split the delivery sequence into two explicit gates:

1. **Invite-only seed production.** A bounded, operator-approved cohort may use
   the real production service without customer checkout or payment
   collection. Before any seed user is admitted, the exact candidate must pass
   artifact security and production preflight; production secrets and access
   review; privacy data mapping and retention/deletion policy; moderation,
   abuse, quota, and admission controls; production backup and isolated restore;
   external monitoring handoff and incident ownership; candidate health/state
   invariants; and the compatible rollback rehearsal. HTTPS on
   `goodgood.o1key.com` and its tested production Authing callbacks are required.
   ICP and Alipay evidence are not seed-gate substitutes because no checkout is
   enabled.
2. **Paid commercialization.** Public customer checkout remains disabled until
   ADR 0015's full paid-production gate passes, including the applicable
   production-domain/ICP review, privacy/security review, support ownership,
   and domestic Alipay merchant sandbox and production approval. This later
   gate remains fail-closed and is not weakened by the seed launch.

Seed access must be enforced server-side and auditable; merely hiding a link is
not an invitation boundary. The initial cohort cap, admission workflow, and
credit allowance must be confirmed by the operator before implementation.
Provisioning an Authing identity alone must not authorize generation if the
selected admission policy says the owner is pending.

Free seed credit must remain distinguishable from money received. The existing
manual-payment command from ADR 0010 may only record an independently confirmed
and invoiced receipt. It must not be used to disguise promotional credit as a
payment. If the accepted seed policy needs credit beyond the existing one-time
welcome grant, add a separate dry-run-first, idempotent, operator-authored,
auditable promotional-grant path with no browser administrator endpoint.

This ADR grants no cloud purchase or live deployment authority. Exact Hong Kong
SKUs, zones, price, quota, VPC identifiers, credentials, and capacity budget
remain operator-time inputs. Provisioning stays pay-as-you-go through the
no-customer rehearsal and requires explicit approval.

## Consequences

- M8 can target a real but controlled seed-production release without waiting
  for payment implementation.
- Paid commercialization remains a later milestone; it is not reported as
  complete when seed production launches.
- The Hong Kong staging environment remains isolated test infrastructure.
  Production uses separate managed state, secrets, buckets or prefixes, backup
  evidence, and release records.
- The staging hostname migration is an explicit prerequisite for production
  DNS activation. Until it passes, `goodgood.o1key.com` still describes the
  accepted M7 staging state rather than a production deployment.
- Security, privacy, abuse controls, monitoring, recovery, and rollback remain
  launch requirements even when users are not paying.
- Mainland regulatory and business compliance still require an external review;
  selecting Hong Kong and disabling checkout is not itself legal approval.
