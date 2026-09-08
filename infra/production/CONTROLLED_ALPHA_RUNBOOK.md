# GoodGood controlled-alpha runbook

The initial C6-3 and C7 opening completed on 2026-09-07. For the current release
identity and each later feature release, read `docs/CURRENT_STATE.md` and
`docs/WORKFLOW.md` first. Do not repeat the initial data conversion, bucket
cleanup, credential rotation, or identity bootstrap.

GG-003 restored the standalone `production:alpha-gate` CLI to the clean release
line without the deferred C6 deletion/reporting runtime. The checked-in example
uses evidence schema v2 and is intentionally blocked. Copy its shape only into
the root-only production evidence directory and replace every item with fresh,
non-sensitive evidence bound to the exact candidate SHA. A prior schema or SHA
must not be edited into a new pass.

Status: runnable release-safety procedure. This file does not by itself
authorize deployment, migration, provider generation, or public traffic; each
release still needs explicit scope and production authority.

This runbook implements ADR 0024 for the Hong Kong production candidate while
public maintenance is enabled for the bounded rollout. Store live evidence only
under a root-only production directory. Never copy production data, credentials,
customer content, signed URLs, or raw command output into Git or the operator
workstation.

## Fixed launch boundary

- Mode: `controlled-alpha-v1`.
- Registration: public and uncapped, but every new account starts `pending`.
- Admission: the site owner activates only a personally selected and briefed
  tester.
- Credit: 100 welcome credits plus the existing audited manual test-credit
  grant. Checkout remains disabled.
- Content: non-sensitive, non-confidential test material only; disclose O1Key
  processing and the absence of written provider-erasure terms before approval.
- Capacity: no new job or concurrency limit; retain the 500 MiB available-
  memory and 80% root-disk admission stops.
- Response: one documented out-of-band contact, site-owner suspension, and an
  exact-target manual removal procedure.

## C6-3A - decision, contract, and read-only baseline

1. Confirm the candidate immutable image digest, full Git revision, latest
   migration, and runtime-config checksum from protected release state.
2. Reuse artifact-security evidence for at most seven days and production
   preflight evidence for at most 72 hours only when both are bound to that
   exact release and the protected release/runtime identities are unchanged.
   Otherwise rerun the corresponding verification without printing secrets.
3. Confirm public root/login/generation requests return the reviewed maintenance
   503 response during the rollout. On the private path confirm the candidate
   Web and exactly one candidate Worker are healthy, the prior Worker is stopped,
   dependencies are healthy, checkout is disabled, and no resource stop is active.
4. Confirm new registration still maps to `pending`, site-owner-only approval
   remains available, and R2 stays private. Do not create a user, generation, or
   object in this step.
5. Record the controlled-alpha briefing, provider disclosure, non-sensitive-
   content rule, manual fallback, and explicit automated-deletion/reporting
   deferrals. Leave C6-3B through C6-3D evidence pending.

Checkpoint: C6-3A can pass without a deployment. Any identity mismatch,
unexpected migration, public application response, unhealthy runtime, enabled
checkout, non-private asset path, or missing manual fallback keeps maintenance
enabled.

## C6-3B - one controlled non-owner journey

Use one intentionally selected non-owner account and non-sensitive disposable
test media. Capture aggregate results only.

1. Register and prove `pending`, exactly 100 welcome credits, generation denial,
   refresh, logout, and login behavior before approval.
2. From `/admin/users`, approve the account and perform one small audited manual
   test-credit grant; verify no payment record is created.
3. Upload one reference, submit one real generation, verify reserve/settle,
   private generated-asset read, and relogin.
4. Prove a different owner cannot read the generated asset. Suspend the test
   account when the controlled exercise is over unless it is the first admitted
   tester.

Checkpoint: never auto-resubmit a billable provider request. Any cross-owner
read, duplicate welcome grant, ledger mismatch, or private-read failure restores
or retains maintenance and opens an incident.

## C6-3C - minimum recovery and maintenance fallback

1. Create a fresh encrypted off-host PostgreSQL recovery point and prove it is
   no more than 60 minutes old with the accepted 14 daily / 8 weekly / 12
   monthly retention policy.
2. Restore that exact point into the isolated no-traffic recovery environment.
   Verify migration and aggregate row-count/fingerprint integrity within four
   hours. Do not restore over production.
3. Prove the public maintenance marker can be re-entered and returns the
   reviewed 503 response, then leave the site in its pre-step maintenance state.
4. Reconfirm R2 private access and record no object key or user content.

## C6-3D - minimum monitoring and manual owner handoff

1. Name one responsible operator and one reachable notification destination.
2. Observe public availability, Web/Worker health and restart state,
   `MemAvailable`, root-disk use, backup freshness, and generation/provider
   failure events.
3. Trigger or inject one non-billable, non-content test signal and prove the
   notification reaches the operator. Do not retry a billable generation to
   test alerting.
4. Record the tester contact route, account-suspension path, and exact-target
   content/account removal procedure, including provider and backup limitations.
5. Populate the exact release evidence file and run:

   ```bash
   npm run production:alpha-gate -- --evidence-file \
     /var/lib/goodgood-production/controlled-alpha/readiness.json
   ```

   A nonzero result keeps maintenance enabled and blocks slot promotion.

### Controlled-alpha owner handoff

Use the stable operator alias `operator:site-owner`. The actual direct contact
address shared with each admitted tester stays outside Git and release evidence;
the evidence records only the alias for that agreed channel. The controlled-
alpha notification destination may be that current direct operator channel.
This does not claim that the deferred external monitoring platform or the full
seed incident model is complete.

For an account incident, retain or enable public maintenance first when a data
boundary may be involved. In `/admin/users`, select the exact account, choose
`暂停账户`, give a bounded reason, and verify its status is `已暂停`. The product
capability guard must then deny creative actions even if an old browser cookie
still exists. Keep the account suspended until the incident is resolved; a
restore is another explicit, audited site-owner action.

For a content-removal request against the deployed migration-0012 candidate:

1. Suspend the exact account and retain maintenance when exposure is possible.
2. Keep the internal owner/asset identifiers and object key only in a root-only
   incident record. Never copy the image, prompt, signed URL, or object key into
   chat, source control, monitoring, or general logs.
3. Create a fresh encrypted off-host PostgreSQL recovery point. Obtain separate
   approval naming the exact target before deletion.
4. From the production host, delete only that approved object with the scoped
   production R2 credential. Verify the object is no longer readable, then mark
   only the matching asset `rejected`; preserve the credit ledger and
   administrative evidence.
5. Record only aggregate completion evidence. Do not claim immediate backup
   erasure or provider-side erasure; backups expire under the accepted retention
   policy and written O1Key erasure terms remain unavailable.

The migration-0012 candidate has no automated account-deletion lifecycle. For
a complete account-removal request, suspend the account and revoke its sessions,
inventory only that owner's objects and creative graph root-only, and keep it
suspended until the reviewed deletion candidate is deployed or a separately
approved manual procedure removes exact private objects before dependent
creative rows while retaining required financial/administrative evidence. Do
not claim external-identity, provider, backup, or complete erasure without
corresponding evidence.

## C7 - separately approved public opening

The initial `publicTrafficOpen` approval was recorded on 2026-09-07. For a later
approved feature release, restore public traffic only after C6-3A through C6-3D
pass for that exact release. Removing maintenance is not a capability of the
readiness verifier and must use the reviewed ingress procedure. Immediately
check public root, login, pending admission, and creation behavior while watching
the minimum signals.

Restore maintenance immediately on private-data exposure, cross-owner access,
credit inconsistency, unhealthy dependencies, unavailable or stale recovery,
the memory/disk stop, repeated provider failure, missing notification delivery,
or any unexpected release/migration identity. Do not reset PostgreSQL, Valkey,
R2, identities, or credit state after real-user traffic exists.
