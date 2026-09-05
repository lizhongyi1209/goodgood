# ADR 0017: Nginx and Compose blue/green production adapter

- Status: Accepted
- Date: 2026-09-05

## Context

ADR 0015 requires an exact-digest candidate to start away from customer
traffic, a compatible prior release to remain recoverable, one forward
migration, health and state-invariant checks, a controlled traffic switch, and
a rollback rehearsal without schema downgrade. The current production planner
deliberately exposes only abstract, non-executable phases. M8 must select a
concrete runtime adapter before any production execution path can be reviewed.

The M7 single-stack staging release replaces Web and Worker together. That is
valid staging evidence but cannot isolate a production Web candidate or retain
an immediately selectable prior Web process. Running two production Workers at
once is also unsafe: both would consume the durable queue and could perform
billable provider work before the candidate is promoted.

The production host region, instance size, production-domain placement, and
managed PostgreSQL/Valkey products still depend on the ICP and capacity work.
The runtime-switch decision must therefore avoid binding GoodGood to an
unselected infrastructure SKU while remaining concrete enough to review and
test.

## Decision

Use runtime adapter `nginx-compose-blue-green-v1` for initial paid production:

- one supported Linux application origin runs host Nginx and two independently
  named Compose application slots, `goodgood-production-blue` and
  `goodgood-production-green`;
- blue binds Web/Worker health to loopback ports `3100/3101`; green uses
  `3200/3201`; only Nginx accepts origin ingress;
- Alibaba Cloud ESA remains the edge. This ADR does not change the documented
  Hong Kong control-plane direction or approve a host purchase; the exact
  production host and its ICP/domain fit remain a separate capacity decision;
- PostgreSQL, Valkey, and private R2 are outside both application slots. Slot
  replacement never creates, deletes, or rolls back durable state;
- an exclusive root-owned host lock serializes releases. Root-owned release
  state retains the active slot, exact digest, revision, migration, runtime
  checksum, and prior Nginx upstream bytes;
- the inactive candidate starts Web only. Its Worker remains stopped until the
  candidate passes isolated liveness/readiness and state-invariant checks;
- after the reviewed additive migration runs once, Worker handoff stops the
  active Worker with bounded grace and starts the candidate Worker. A failed
  candidate Worker immediately restores the prior Worker. Durable PostgreSQL,
  outbox, and Valkey state absorb the bounded pause;
- traffic switches by same-filesystem atomic replacement of the root-owned
  Nginx upstream include, followed by `nginx -t` and reload. A failed
  configuration test restores the retained bytes before any reload;
- rollback restores the retained Nginx upstream and prior Worker, then repeats
  public and state-invariant checks. It never downgrades the database schema;
  an incompatible prior image requires a forward fix instead;
- the candidate slot remains available for bounded observation and diagnosis
  until the release record is finalized. Cleanup is not part of traffic
  promotion.

The repository may describe and validate this adapter and its evidence now,
but it must not expose an execution flag or shell/process path. Executable
Compose, Nginx, locking, state-file, and rollback tooling require a later
reviewed infrastructure change after the production host/state choices are
known. A future prelaunch rehearsal may operate only on the inactive slots and
synthetic/no-customer workload to produce candidate and rollback evidence. Any
customer traffic deployment remains unavailable until the full production gate
passes.

Passing `candidate-health-invariants` evidence must identify this adapter and
prove isolated candidate startup, exactly one migration, live/ready, public
synthetic, queue, database, and credit checks. Passing `rollback-rehearsal`
evidence must identify a distinct retained prior revision, Web and Worker
recovery, queue recovery, unchanged database and credit fingerprints, and no
schema downgrade attempt.

## Consequences

- The production planner now has reviewable slots, ports, ownership boundaries,
  Worker semantics, and switch order without gaining mutation capability.
- Web traffic can switch with an Nginx reload while the durable queue tolerates
  a short single-Worker handoff pause.
- A single application origin is not multi-host high availability. The first
  paid-production decision accepts this narrower application availability
  boundary; durable state and encrypted recovery remain external and must meet
  ADR 0015 before launch.
- In-place staging-style replacement, simultaneous blue/green production
  Workers, and Kubernetes are rejected for the initial adapter.
- Choosing the production region, capacity, state-service products, or a
  multi-host topology later requires a separate decision when it changes these
  boundaries.
