# ADR 0098: Emergency R2 writes with dual-store reads

- Status: Accepted
- Date: 2026-09-24
- Amends: ADR 0097 for incident recovery only

## Context

ADR 0097 moves new application objects to private OSS while retaining old R2
objects. After the first OSS write, the GG-098 application cannot be restored
as a complete rollback because it cannot read `oss/` keys. The normal OSS
release must therefore retain a recovery path that understands both stores.

## Decision

The GG-106 application defaults to OSS writes and reads both `oss/` and legacy
unprefixed keys. Its explicit `OBJECT_STORAGE_EMERGENCY_R2_WRITES=true` mode
temporarily creates unprefixed keys in R2, signs browser uploads with the R2
client, and verifies the R2 bucket at startup. Reads remain routed by key to
both stores. The mode does not activate automatically.

The normal production runtime sets the value to `false`, and the normal
production preflight rejects `true`. Incident operators may enable it only on
the same dual-read-capable application revision after reconciling active jobs
and uploads. They must not roll back to GG-098 after OSS records exist. Returning
to OSS requires resetting the flag to `false`, verifying the OSS path, and
restarting the single Web/Worker pair together.

## Consequences

- R2 write credentials remain available for historical cleanup and emergency
  writes; the separate Restic R2 bucket and timer remain unchanged.
- An emergency creates new R2 records until the mode is turned off. Object keys
  continue to identify their store, so existing OSS records remain readable.
- This recovery mode does not repair an OSS read outage for objects already in
  OSS. The incident procedure must report that limitation.
