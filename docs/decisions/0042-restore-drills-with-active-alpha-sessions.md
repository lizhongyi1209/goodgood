# ADR 0042: Allow isolated restore drills with active alpha sessions

- Status: Accepted
- Date: 2026-09-09

## Context

The original production restore drill was written for the one-time empty-state
conversion. It rejects an archive whenever the source database contains an
unrevoked, unexpired login session, even when public maintenance is enabled and
there are no active generation jobs. GoodGood is now an open, owner-reviewed
controlled alpha, so retained user sessions are normal production state. The
old check makes every subsequent release fail before the archive is restored.

Revoking valid sessions merely to prove recoverability would mutate user state
and would not improve archive integrity. Skipping the isolated restore would
weaken the accepted controlled-alpha recovery boundary.

## Decision

For an ongoing controlled-alpha release, the repository-owned restore drill may
restore a backup that contains valid authentication sessions when all of the
following remain true:

- the reviewed production maintenance marker is present with exact ownership
  and mode;
- the source PostgreSQL container and archive pass the existing immutable-image,
  fixed-path, regular-file, ownership, mode, and checksum checks;
- active generation jobs are exactly zero before the drill starts;
- the restore target remains `--network none`, read-only, temporary, and backed
  only by tmpfs;
- the restored public table set and every table row count match the quiescent
  production source, and the migration count is reported;
- the output reports only aggregate session/job counts and contains no session,
  identity, prompt, object, or credential data.

The drill observes the count of valid sessions but does not require it to be
zero. It never exposes or reuses a restored session and still refuses to run
outside maintenance or while a generation job is active.

## Consequences

- Normal retained alpha sessions no longer block fresh recovery evidence.
- Public maintenance and zero active generation jobs become explicit restore
  preconditions for ongoing releases.
- Historical non-terminal attempt rows attached to terminal jobs do not count
  as active work; their consistency is handled as a separate exact data repair.
- This decision changes no backup retention, production data, schema, public
  traffic, provider request, or account lifecycle behavior.
