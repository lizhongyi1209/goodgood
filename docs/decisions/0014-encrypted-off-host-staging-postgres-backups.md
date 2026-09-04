# ADR 0014: Encrypted off-host staging PostgreSQL backups

- Status: Accepted (amended 2026-09-04)
- Date: 2026-09-04

## Context

M7 has proved that a root-only custom-format PostgreSQL archive can restore in
an isolated container without changing the source database. That same-host
archive does not survive loss of the Alibaba Cloud staging host and has no
automated retention.

The existing application R2 bucket and its credentials are scoped to user
objects. Reusing either for database backups would couple two recovery domains
and would give the application access to database archives. R2 server-side
encryption alone also does not provide a separately held backup-encryption key.

## Decision

Use a separate private Cloudflare R2 bucket named
`goodgood-postgres-backups` as the M7 PostgreSQL backup destination. Give only
the root-run backup service a bucket-scoped read/write credential. The
application roles and application object credential receive no access.

Restic encrypts every archive client-side with an independently generated
password before R2 receives it. The password and R2 access-key pair remain in
separate root-only host files outside the checkout. A daily systemd
timer creates and validates a PostgreSQL custom archive, uploads it, applies
`14 daily / 8 weekly / 3 monthly` snapshot retention, prunes unreferenced data,
and verifies all repository data. The transient same-host archive is removed
after success or failure.

The timer uses a persistent randomized schedule so a missed run executes after
the host returns without synchronizing exactly with other maintenance. A failed
service stays failed in systemd and retains root-journal evidence; M7 does not
send an outbound notification or automatically retry or restore. Active alert
routing belongs to the unified M8 production-observability decision instead of
a staging-only mailbox. QQ Mail is explicitly not under consideration for that
future routing decision. Logs contain no repository password, R2 credential,
database content, or public host address.

Activation requires an initialized private repository, one successful
timer-shaped backup, an isolated restore drill from the latest off-host
snapshot, and a visible next timer execution. This policy is for M7 staging
test data only. Production alerting, retention, residency, access review, and
recovery objectives remain an M8 decision.

## Consequences

- Loss of the single Hong Kong disk no longer destroys the only PostgreSQL
  backup.
- Database archives and application assets have separate buckets,
  credentials, encryption keys, and lifecycle ownership.
- R2 bucket creation, least-privilege token creation, and secret entry remain
  explicit operator actions; repository code cannot perform them.
- Restic becomes a host maintenance dependency and must receive Ubuntu security
  updates with the rest of the staging host.
- Retention removes old backup snapshots; it does not define deletion policy
  for application records or R2 user assets.
