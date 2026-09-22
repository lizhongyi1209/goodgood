# ADR 0024: Controlled alpha before full seed-production readiness

- Status: Accepted
- Date: 2026-09-07
- Refines: ADR 0019 by adding a narrower controlled-alpha gate before the full
  seed-production gate
- Refines: ADR 0023 by deferring its in-product reporting workflow from the
  controlled-alpha gate, without treating the moderation decision as complete
- Preserves: ADR 0021's pending-by-default admission, unrestricted observed
  generation concurrency, private production data, and host pressure controls

## Context

The Hong Kong production host is clean, maintenance-closed, and running the
exact corrected candidate from revision `30c7a73` with migration 0012. Its
private site-owner account surface, production dependencies, backup schedule,
Authing login, O1Key credential, and private R2 boundary have passed the
recorded conversion checks. Later local work implements account deletion and a
report-driven content-safety workflow through migration 0020, but that source
has not been built, deployed, migrated, or rehearsed against production.

The full unpaid seed-production gate remains blocked by provider erasure terms,
a least-privilege Authing management credential, live deletion/recovery
evidence, the content-report rehearsal, and the originally selected monitoring
and incident model. Those controls are appropriate before broad or ordinary
production use, but they are not all necessary to learn from a small set of
people personally admitted and supported by the site owner. Waiting for every
full gate item would also force deployment of a larger unproven candidate when
the current candidate already contains the core account, credit, upload,
generation, private-read, and resource-protection paths.

The operator has therefore chosen the shortest responsible path to a small
real-user test. This is a risk-accepted product-validation phase, not a claim
that GoodGood has completed its full privacy, deletion, moderation, support, or
production-readiness program.

## Decision

Add a distinct launch mode named `controlled-alpha-v1`. It may use the current
immutable production candidate without deploying the later local C6-2 code,
provided its own fail-closed readiness gate passes. The existing full
seed-production and paid-production gates remain separate and blocked until
their original requirements pass.

Controlled alpha has these fixed boundaries:

- Registration may remain public and numerically uncapped, but every new
  GoodGood account starts pending. The site owner activates only a person they
  have deliberately selected and briefed for this test; possession of an
  Authing identity alone grants no creative access.
- Each new account receives the normal 100 welcome credits. The existing
  audited site-owner page may grant additional free test credit. Customer
  checkout and payment collection remain disabled.
- Testers must use only non-sensitive, non-confidential material that they are
  entitled to upload and transform. Before activation they must be told that
  prompts, references, and results are processed through O1Key, that GoodGood
  keeps production account and creative data, and that written provider-side
  erasure terms are not yet available.
- Product reporting and automated account deletion are not required for this
  mode. The site owner must provide one out-of-band contact route, handle abuse
  or removal requests manually, and may immediately suspend an account through
  the existing account page. An account or content removal must be treated as
  an exact-target operator procedure; it must not be described as completed
  provider or backup erasure when that cannot be proved.
- There is no new per-user job cap, global queue cap, or configured generation
  concurrency ceiling. Existing finite credits and the accepted 500 MiB
  available-memory / 80% root-disk admission stops remain in force.
- Production data and secrets never move to the local development workstation.
  Assets remain private, and failure of owner isolation is an immediate stop
  condition.

The `controlled-alpha-v1` readiness gate is objective, bound to one immutable
release, and divided into four C6 tasks:

1. **C6-3A — decision, contract, and baseline.** Record this decision; verify
   artifact security and production preflight for the exact deployed release;
   confirm maintenance is still public, Web and the single Worker are healthy,
   checkout is disabled, accounts remain pending by default, site-owner-only
   approval is available, private R2 is enforced, and the operator has accepted
   the controlled-alpha disclosures and manual fallback.

For this narrow gate, immutable artifact evidence is current for seven days and
production preflight evidence for 72 hours only when the deployed image,
revision, migration, and runtime-config checksum still match and a fresh
read-only baseline proves maintenance, health, and resource state. A release or
configuration identity change invalidates both immediately. The complete seed
and paid gates keep their existing shorter evidence lifetimes.
2. **C6-3B — one disposable member journey.** Prove a non-owner registration
   starts pending, cannot create before approval, receives exactly 100 welcome
   credits, can be approved and optionally receive an audited test-credit
   grant, can upload a reference, complete one real generation, read only its
   private result, sign out and sign back in, and cannot read another owner's
   asset. Evidence contains no prompt, image, email address, object key, signed
   URL, cookie, or credential.
3. **C6-3C — minimum recovery and maintenance fallback.** Prove private R2,
   create a fresh encrypted database recovery point no more than 60 minutes
   old, restore it in isolation within four hours, preserve the accepted
   retention schedule, and prove the public site can be returned immediately to
   the reviewed maintenance response without copying production data locally.
4. **C6-3D — minimum monitoring and owner handoff.** Name one responsible
   operator; observe public availability, Web/Worker health and restarts,
   available memory, root-disk use, backup freshness, and generation/provider
   failures; prove one alert or notification reaches that operator; and record
   the manual contact, suspension, and exact-target removal paths. A dashboard,
   Grafana Cloud, dual operators, formal acknowledgement objectives, and an
   automated deletion timer are not prerequisites for controlled alpha.

After all four C6 tasks pass for the exact candidate, C7 still requires a
separate explicit approval to remove maintenance. Opening is followed by a
public root/login/creation smoke check and direct observation. Maintenance is
restored immediately for any private-data boundary failure, cross-owner read,
credit inconsistency, unhealthy dependency, unavailable/stale backup, resource
stop, repeated provider failure, or unavailable operator notification.

The following work is deliberately deferred from controlled alpha and must not
be reported as complete: production deployment of migration 0020 and the
content-report UI; automated account deletion, its Authing management
credential, and deletion-register recovery; written O1Key erasure terms;
Grafana/complex dashboards; the formal
primary/secondary incident model; customer checkout; domestic Alipay; and the
applicable ICP/domain review.

This decision grants no deployment, database migration, provider generation,
test-user creation, production-data mutation, or public-traffic authority. Each
live task retains its normal exact scope and approval boundary. In particular,
passing C6 never opens traffic automatically.

## Consequences

- GoodGood can validate the core production journey with a deliberately known
  group before solving every broad-production control.
- The operator accepts more manual work and narrower privacy/deletion claims
  during this phase. The briefing, non-sensitive-content rule, and prompt
  maintenance fallback are mandatory compensating controls.
- The local C6-2A through C6-2P implementation is preserved for a later
  immutable candidate; it is neither discarded nor silently mixed into the
  currently deployed release.
- A controlled-alpha pass cannot satisfy the existing full seed-production or
  paid-production gate. Expansion beyond personally reviewed testers requires
  a new decision or completion of the full gate.
