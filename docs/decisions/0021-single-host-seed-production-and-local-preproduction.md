# ADR 0021: Single-host seed production with local preproduction

- Status: Accepted
- Date: 2026-09-05
- Amended: 2026-09-05 to align session invalidation with the implemented
  opaque-token/hash boundary
- Supersedes in part: ADR 0018 as the immediate unpaid seed-production
  topology; its managed ECS/RDS/Tair profile becomes a future scale-out target
- Supersedes in part: ADR 0019's requirement to keep the purchased M7 host
  separate from production and to migrate staging to a persistent remote host
- Refines: ADR 0011 by converting the purchased Hong Kong host only after a
  clean-data, no-customer rehearsal

## Context

The previously selected production baseline added a new ECS host, managed RDS,
and managed Tair before admitting seed users. The operator instead wants to
start with the already purchased Alibaba Cloud Hong Kong Simple Application
Server, observe its real limits, and scale only when measured pressure requires
it. The host has 2 vCPUs, 4 GiB memory, a 50 GiB ESSD system disk, and a 200
Mbps peak public-bandwidth specification. Existing M7 evidence has already
proved its public Cloudflare/ESA, Authing, O1Key, private R2, rollback, and
encrypted off-host backup paths with isolated test data.

The operator also prefers the development workstation to own normal development
and test work instead of paying for a permanent remote staging environment.
That saves infrastructure cost, but local success cannot by itself prove the
Linux host, production credentials, public callback, resource-pressure, backup,
or release behavior. The production host therefore still needs a bounded
no-customer conversion rehearsal and an isolated candidate check for every
release.

The existing host contains disposable test accounts, credits, projects,
generation records, queue state, and objects. The operator has chosen a clean
production start rather than treating any of those records as production data.

## Decision

Use the purchased Hong Kong Simple Application Server as GoodGood's initial
unpaid seed-production control plane. The server temporarily runs host Nginx,
the Web and Worker application processes, PostgreSQL, and Valkey. Private
Cloudflare R2 remains authoritative for user image bytes, and the existing US
O1Key route remains the generation plane. `goodgood.o1key.com` remains the
canonical application hostname.

Do not maintain a permanent remote staging environment during this phase.
Reserve `staging-goodgood.o1key.com` without activating it. The operator's
workstation owns feature development, mock-backed tests, production-shaped
local containers, and browser review with local/test-only data and credentials.
Production data, production database copies, and production secrets must never
be copied into that local environment. CI builds and verifies the immutable
candidate; the server pulls the exact digest. Source checkout state is not the
deployment unit.

Reuse the current Authing application and identity directory for production.
Keep its issuer, client ID, hosted Google connection, and passwordless email
method, but rotate the OIDC client secret during the controlled conversion.
The login callback allowlist must contain the exact production callback
`https://goodgood.o1key.com/api/auth/callback`, and the logout allowlist must
contain `https://goodgood.o1key.com/`. Remove loopback and obsolete staging
callbacks before seed admission; future local real-Authing work requires a
separate test application rather than production credentials.

Do not delete Authing identity-directory records merely because the GoodGood
test database is reset. Fresh GoodGood PostgreSQL state contains no prior
owner, identity binding, session, role, credit, or content. When an existing
Authing identity next logs in, normal provisioning creates a new pending
GoodGood account with the standard welcome grant and no inherited authority.
The intended operator follows the same login path before the audited
site-owner bootstrap. GoodGood sessions are random opaque bearer tokens whose
hashes are stored in PostgreSQL; there is no shared signing secret to rotate.
Creating fresh PostgreSQL state without importing `auth_sessions` invalidates
every pre-conversion application session independently of the hosted Authing
session. Adding a session signing/pepper secret later would require its own
review rather than inventing an unused production setting here.

Keep ADR 0017's two application-slot model as the preferred release mechanism,
but revalidate it against the 2-vCPU / 4-GiB host before enabling an executable
adapter. Only the inactive Web candidate may overlap the active application;
there is still exactly one active Worker. Resource limits and headroom checks
must fail closed before the Nginx switch. If the host cannot safely hold that
bounded overlap, select and rehearse a short maintenance-window adapter in a
new ADR rather than improvising during deployment.

Convert test infrastructure to production through a clean boundary:

1. freeze writes and record the exact staging revision, migration, configuration
   version, object inventory, and account/credit counts;
2. create and verify a final encrypted off-host staging archive before any
   destructive action, retain it for seven days after the clean conversion
   passes, then delete it through an exact-target approved cleanup;
3. create fresh production PostgreSQL and Valkey state and run all migrations;
   no staging owner, session, credit, project, job, or audit row is imported;
4. reuse the existing private Cloudflare R2 `goodgood` bucket only after an
   exact inventory, separately approved deletion of every test object, and an
   empty-bucket verification; issue rotated production-only credentials before
   the first production write;
5. rotate the reused Authing application's OIDC client secret, fix its callback
   and logout allowlists to the production URLs, prove the fresh database
   invalidates every old GoodGood session, rotate R2 credentials, and review
   provider, backup, and operational secrets for the production role;
6. let the intended operator complete normal Authing login, then use the
   dry-run-first audited bootstrap to establish the sole initial site owner;
7. verify pending-user isolation, approval, credit, upload, generation, private
   read, backup/restore, candidate health, and rollback before admitting a seed
   user;
8. remove the old test database, queue, and objects only with explicit
   destructive approval; remove the verified final archive after its confirmed
   seven-day safety window through a separate exact-target approval.

This topology deliberately accepts one application/state failure domain while
checkout is disabled. It does not relax production-data classification,
off-host encrypted recovery, access review, auditability, disk/log bounds, or
rollback evidence. Production PostgreSQL must have
recovery points no more than one hour apart, target restoration within four
hours, and retain at least 14 daily, 8 weekly, and 12 monthly encrypted
off-host recovery points. Registration can remain open because every new
account is pending and cannot consume generation resources until the site
owner approves it.

Do not impose a fixed per-user pending-job limit, global queue-depth ceiling,
or configured generation-concurrency cap during the initial observation phase.
The durable PostgreSQL/Valkey queue remains required for crash recovery,
idempotency, and momentary backpressure; it is not a product promise that every
job starts instantly. The current Worker awaits each job serially, so concurrent
draining is an explicit implementation gap and must not be reported as ready.
Before seed launch, make the active Worker start accepted jobs concurrently
without a fixed count ceiling, while preserving leases, at-most-once provider
submission, credit settlement, graceful shutdown, and exactly one active Worker
process during release handoff.

Resource pressure is the only initial automatic generation-admission boundary.
When host `MemAvailable` falls below 500 MiB or the root filesystem reaches 80%
usage, stop accepting new generation submissions and expose the existing inline
recoverable error shape. Do not cancel, resubmit, or double-charge in-flight
provider work. Keep login, account review, and existing-asset reads available
when their dependencies remain healthy. Recovery from the protection state is
an explicit operator action after the pressure is understood; there is no
automatic scale-up. CPU pressure is observed but does not initially reject
generation.

Record active job count, submission rate, transient queue depth and oldest age,
job/provider latency, success/failure, HTTP latency/error rate, PostgreSQL and
Valkey pressure, container restarts, `MemAvailable`, root-disk usage, and backup
freshness. Use those observations to discover the practical boundary and make
the later vertical-growth or managed-state decision; do not invent a capacity
number before evidence exists.

Run the initial clean conversion inside a visible maintenance window with a
four-hour execution limit. During the window, normal application, login, and
generation traffic is unavailable; private health and operator paths remain
available only as required by the reviewed runbook. Do not open production
until fresh database migrations, empty-and-rotated R2, Authing callbacks and
secret rotation, site-owner bootstrap, pending-account isolation, backup and
restore, one real generation, private asset read, candidate health, and rollback
checks all pass.

If any required check is still incomplete at four hours, stop the conversion
attempt and keep the public site in maintenance mode. The former staging stack
may be restored only on a private operator path for diagnosis; it must not be
published as production or import its data into the clean production state.
Fix the cause and schedule another reviewed window. The four-hour window is a
stop condition, not permission to skip evidence or rush destructive cleanup.

ADR 0018's `alibaba-managed-state-v1` design remains the documented scale-out
direction, not a seed-launch prerequisite. Capacity observations should drive
whether the first change is vertical host growth or migration to separate ECS,
RDS PostgreSQL HA, and Tair. No threshold automatically authorizes a purchase.

This ADR grants no live connection, data deletion, DNS change, secret rotation,
or production deployment authority. The conversion runbook must still resolve
the concurrent-Worker implementation, monitoring handoff, and operator
approvals before it can execute.

## Consequences

- Seed launch avoids a second application host and managed-state purchase while
  preserving a clear future scale-out path.
- Loss or exhaustion of the single server can stop the entire application and
  database until restore. This accepted availability risk must remain visible
  to users and operators.
- Local development is not a substitute for exact-candidate rehearsal. Public
  callbacks, private storage, backup recovery, resource headroom, and rollback
  still require production-shaped evidence.
- The old staging data never silently becomes production data. A fresh database
  and queue, an emptied and credential-rotated `goodgood` R2 bucket, and an
  audited site-owner bootstrap define the boundary.
- `staging-goodgood.o1key.com` stays reserved for a later need; no hostname
  migration or ongoing remote staging bill is required now.
