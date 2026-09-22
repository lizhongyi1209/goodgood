# ADR 0091: Single-slot Compose production release

- Status: Accepted
- Date: 2026-09-22
- Task: GG-099
- Supersedes: ADR 0017 for future production releases

## Context

GoodGood's initial production adapter described two application Compose slots
and an Nginx traffic switch. That arrangement is no longer the approved release
direction. The production host is resource-bounded, the slots share PostgreSQL,
Valkey, and R2, and keeping a second application slot creates operational
ambiguity without providing an isolated test database.

Historical GG-097/GG-098 release records accurately describe what happened at
the time. They must not remain usable as instructions for a new release.

## Decision

Future GoodGood production releases use one fixed Docker Compose project:

- project name: `goodgood-production`;
- Web loopback port: `3100`;
- Worker health loopback port: `3101`;
- host Nginx keeps one fixed upstream; releases do not switch upstreams;
- a reviewed maintenance window protects the in-place Web/Worker replacement;
- the immutable CI image is pulled by Compose; the host does not build from
  source;
- at most one production Worker runs at a time;
- an additive migration runs once before the new application is opened;
- a failed release restores the prior application image and Worker in the same
  Compose project; database schema downgrade is forbidden.

Blue/green slots, slot-specific environment files, dual application Compose
projects, and atomic Nginx upstream switching are forbidden for future
releases. The production readiness contract uses a new runtime-adapter and
evidence schema version so old blue/green evidence cannot be reused.

## Operational boundary

This decision changes the repository's future release contract. It does not
claim that the already-running production host has been renamed or restarted;
that requires a separately authorized maintenance operation and fresh host
verification. Until then, the existing production identity remains a
historical deployment fact, not a reason to restore the retired strategy.

## Consequences

- Releases are simpler and use less overlap capacity.
- A release may require a short maintenance interruption while the fixed slot
  is replaced.
- Rollback is application-only and cannot undo a forward database migration.
- The old ADR and release receipts remain auditable history, but current
  workflow, scripts, and checklists must reject their blue/green procedure.
