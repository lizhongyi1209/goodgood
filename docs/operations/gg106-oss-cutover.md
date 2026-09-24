# GG-106 OSS cutover checklist

This is a pending application production change. ESA production now runs a
variable-bound diagnostic guard, while GoodGood production still writes
application objects to R2. The signed-read probe has passed; do not switch
application writes until the clean guard and signed upload are verified.
Keep the separate R2 Restic backup bucket and its timer running.

## Prepared cloud resources

- Private OSS bucket `o1key-goodgood` in `cn-guangzhou`.
- Direct OSS upload CNAME `upload-goodgood.o1key.cn` with its own HTTPS
  certificate and the PUT CORS rule for `https://goodgood.o1key.com`.
- ESA read hostname `oss-goodgood.o1key.cn` with the full-hostname bypass
  route to `goodgood-asset-read-guard`. The signed-read guard is published to
  ESA production, but has not passed a positive read probe.
- RAM program user `goodgood-oss-app` with the bucket-scoped
  `GoodGoodOssObjects` policy. Its AccessKey was saved by the operator; never
  copy the value into the repository or this document.

An existing private, unprefixed console-uploaded image returned anonymous
403 through both ESA and direct OSS. That object is retained unchanged. It
does not prove that the new signed `oss/` read path works.

On 2026-09-24, the operator published ESA version `1790236138649074035`
at 100% in production. The private probe key is
`oss/gg106-probe/Probe.txt`. Independent GET requests through ESA returned
403 for anonymous, locally signed, and deliberately forged URLs. The signed
URL was generated with the repository's `signOssAssetRead` and the local
secret corresponding to the encrypted ESA production variable. All responses
had `Server: ESA` and no OSS request ID. This does not identify whether the
request failed in the function, a WAF rule, or private OSS origin access.
Check ESA function instant logs for invocation, code version, error code,
and response status while repeating the probe. If there is no function log,
inspect ESA security events and route matching. If the function permits the
request, inspect native OSS private-origin authorization and the exact object
key. Never include the signed query string or secret in screenshots.

The 2026-09-24 function instant log for the locally signed request showed
`CodeVersion=1790236138649074035`, `ErrorCode=0`, and
`ResponseStatus=403`, so the deployed guard rejected the request before
origin access. A temporary probe-only diagnostic has been added to
`infra/esa/goodgood-asset-read-guard.mjs`; it logs only fixed
`GG106_READ_*` reason codes through `console.alert()` when the exact probe
path is requested. Deploy a new version bound to the production variable
snapshot, repeat the controlled signed probe with instant logs active, and
inspect `ConsoleLog`/`Logs`. Remove the temporary diagnostic and publish a
clean guard version after identifying the cause. Do not proceed to the
application release before a positive signed read succeeds.

The operator subsequently published diagnostic version
`1790238050203405225`. One function log had `ResponseStatus=403` and
`Logs=[]` without a request-path field in the shared excerpt. A single
locally signed GET at 2026-09-24 16:22:16 +08:00 again received ESA 403.
Correlate that exact request to its instant log before inferring whether
the fixed diagnostic was reached.

At 16:24:55 +08:00, a new monitoring window captured exactly one signed
GET. The corresponding function log reported diagnostic version
`1790238050203405225`, `ErrorCode=0`, `ResponseStatus=403`, `Logs=[]`, and no
`ConsoleLog`. First inspect that deployed version's source for `PROBE_PATH`
and `console.alert`. If present, investigate an early host/path rejection or
the logging API before changing the read policy. Preserve fail-closed 403.

The operator confirmed that deployed source contains both `PROBE_PATH` and
`console.alert`. The next local candidate places a fixed `GG106_READ_ENTRY`
alert before request parsing and a route match marker afterward. It reports
only three booleans, not the actual host, path, query, signature, or secret.
Publish a new production version and repeat a single signed probe while
instant logging is active. If the entry marker is absent and `ErrorCode` is
nonzero, inspect console API support; if it is present, use the route marker
to identify the early rejection. Remove all temporary alerts once resolved.

The operator's correlated 16:32:03 +08:00 instant log shows the entry
diagnostic version `1790238696829208371`, `ErrorCode=0`, `ResponseStatus=403`,
and `Logs=[]`. The fixed `console.alert` outside `try` still does not appear.
Local requests signed with variants of the stored secret (exact, LF, CRLF,
trailing space, leading BOM) also all returned 403. The next candidate adds
temporary branch-specific 4xx statuses only when `x-gg106-diag: stage` is
present; ordinary denials stay 403. An independent `x-gg106-diag: ping`
request returns 401 at function entry. After publishing this candidate, issue
one ping and one signed stage request with instant logs active. Ping 401 proves
custom response statuses reach the client. A stage response of 409 means the
signature did not match; 424 means the encrypted variable is unavailable;
428 means an exception; 400/406/410 indicate query, format, or expiry;
421/422 indicate host or path. A signed 200 means the guard allowed origin
access; inspect the response and OSS request ID before calling it a successful
read. If ping remains 403, inspect the correlated function `CodeVersion` and
`ResponseStatus` before interpreting stage. Never share the complete signed
URL. Remove the temporary diagnostic statuses and alerts after locating the
cause, then publish and check the clean version.

The operator published the status-coded diagnostic and opened instant logs.
The controlled `ping` request returned `401` from ESA, proving the new code
and custom statuses are active. The correctly signed `stage` request returned
`424` from ESA. In this guard, 424 is emitted only when
`env.GOODGOOD_ASSET_READ_SECRET` is not a string of at least 32 characters.
This is a production function variable/version binding or value problem;
HMAC comparison and OSS origin access were not reached. Check the function's
Basic information > Function variables > Production environment for the
exact encrypted key, provide the same local secret value, then generate and
publish a new version bound to the production variable snapshot. Re-run the
two controlled requests before assessing the signature or origin. Do not
reveal the secret in logs, screenshots, or chat.

After the operator re-entered the encrypted production variable and reported
publishing a fresh version, a second ping/stage pair still returned ESA
401/424. The encrypted variable's edit form intentionally does not reveal its
stored value, so the blank input alone does not prove the old value was empty.
Before changing code or the secret again, correlate these two requests to
their instant-log `CodeVersion` and `ResponseStatus` fields. If they reached
the new version, inspect its production-variable snapshot binding. Keep the
signed URL query and secret out of shared logs and screenshots.

The operator then correlated both requests to new production code version
`1790239765872852233` (401 and 424 respectively). Propagation to an old
version is ruled out. Inspect this version's bound production-variable
snapshot or the generation dialog before changing code or the secret again.

The generation dialog screenshot revealed the exact cause: the Function
variables selector was `Not used` (`不使用`), with `Production environment`
(`生产环境`) available. Generate the next version with `生产环境` selected, then
publish that version to production at 100%. Keep the source and secret value
unchanged. Re-run the controlled ping/signed-stage pair afterward.

After a version bound to the production variables was published, the
controlled ping returned 401 and the correctly signed request returned 404.
The normal anonymous/signed/forged GET sequence returned ESA 403, OSS 404,
ESA 403. The signed response included `x-oss-request-id` and
`x-oss-cdn-auth`; its OSS XML was `NoSuchKey` for bucket `o1key-goodgood` and
the exact key `oss/gg106-probe/Probe.txt`. ESA secret binding, HMAC
authorization, and native private OSS origin reachability now work. This is
not yet a positive object read. Inspect the precise key and case in the OSS
console, or upload a disposable text probe to that exact key, then repeat the
three GET checks. Do not inspect or delete existing user assets.

The operator corrected the disposable probe filename from lowercase `p` to
`Probe.txt`. A new anonymous/signed/forged GET sequence returned ESA 403,
OSS 200 with `text/plain` body `123`, and ESA 403. A valid signed HEAD returned
200. Expired token, extra query parameter, and path outside `oss/` returned
ESA 403. The local source has since removed all temporary `console.alert`
and `x-gg106-diag` status branches; every rejection again returns 403.
Publish this clean source as a new version **with Production environment
function variables selected**, then repeat positive and negative probes
before preparing any application write cutover.

The operator published the clean guard bound to production variables. A new
probe returned 200 with body `123` for signed GET and 200 for signed HEAD;
anonymous, forged, expired, extra-query, and wrong-path requests returned ESA
403. The former `x-gg106-diag: ping` header no longer causes a 401 when paired
with a valid signed URL: it now receives 200, confirming the diagnostic branch
is gone. The next gate is a real presigned PUT through the direct OSS CNAME
using the dedicated RAM principal and a fresh disposable `oss/gg106-probe/`
key, followed by signed ESA readback. Keep credentials outside the repository.

The credential CSV became available on the operator workstation after a
retry. A local probe parsed its single `goodgood-oss-app` record in memory,
presigned a PUT through the application signing function, and wrote a fresh
random text key under `oss/gg106-probe/`. PUT returned 200; signed ESA GET
returned 200 with byte-for-byte matching content. Anonymous ESA GET and
anonymous direct-OSS HEAD returned 403. The exact disposable key was then
deleted: OSS returned 204 and signed ESA GET returned 404. No historical asset
was touched. At that probe checkpoint, production host secret installation and
application deployment remained pending. The original development branch also carries unreleased GG-101--105 changes;
isolate the reviewed release scope before deploying the application.

An isolated candidate was created from the GG-100 single-slot baseline and
passed the full local gate (542 passed, 26 isolated skips, no failures). It was
pushed to its own remote branch. The three new secret files were installed on
the production host through SSH; metadata confirms root ownership, production
secret group 986, and mode 0640. Running containers and protected runtime
configuration were not changed. An immutable CI image and preflight remain
pending.

## Prepare a disposable positive probe

1. Create a tiny non-personal image or text object with a unique key such as
   `oss/gg106-probe/<random-id>.txt`. Never reuse an existing asset key.
2. Confirm unauthenticated GET and HEAD return 403 on both hostnames. Do not
   turn off the bucket's private ACL or publish a bucket policy.
3. Generate one cryptographically random secret of at least 32 characters in a
   trusted operator environment. Store the **same value** in the encrypted
   ESA production function variable `GOODGOOD_ASSET_READ_SECRET` and the host
   file `/etc/goodgood/production/secrets/asset-read-secret`. Do not send it in
   chat, paste it into source control, or put it in a URL. Keep a controlled
   recovery copy outside the repository. The ESA variable is version-bound:
   adding it alone does not change the published deny-all version.
4. In the ESA production branch, replace the deny-all source with
   `infra/esa/goodgood-asset-read-guard.mjs`, generate a new version, and
   publish it to production. Keep the existing full-hostname route in bypass
   mode with fallback off. Immediately verify that missing, malformed, expired,
   forged, wrong-path, and extra-query tokens return 403. The current
   application cannot issue a positive token before its new image is deployed;
   a controlled probe can use the signing logic in
   `server/generation/object-storage-routing.mjs` without exposing the secret.
5. Verify a matching short-lived URL reads only the disposable `oss/` object,
   and that an expired URL stops reading it. Check GET and HEAD. Keep ESA
   private-bucket origin authorization enabled and disable caching of these
   private paths until authorization before cache is proven. Confirm in ESA
   configuration that the origin type is native OSS private bucket, not generic
   S3-compatible origin.

## Application candidate

1. Install the three new production secret files shown in
   `infra/production/release.env.example`: OSS AccessKey ID, OSS secret key,
   and the matching asset-read secret. Keep both existing R2 credential files
   for historical objects. Use the repository's ownership, permissions, and
   preflight rules. Do not replace the independent R2 inventory or Restic
   configuration.
2. Populate `infra/production/runtime.env.example` on the host. The OSS S3
   regional endpoint is used for bucket verification; the direct bound CNAME
   is used for object data calls and presigned PUT; ESA serves signed reads.
3. Run the production preflight against the exact immutable image and its
   reviewed revision. Reconcile active jobs and incomplete uploads before
   replacing the one production Web and Worker under ADR 0091's single-slot
   release procedure. Do not let an old Worker write R2 alongside the new one.
4. After release, verify a real browser upload to `oss/`, completion, inline
   preview, owner-only access, new generation storage, and representative
   historical R2 library/project reads. Inspect one new object in OSS, with
   no new application object in R2. Keep provider-billable generation probes
   within separately approved release scope.
5. Check the existing Restic timer and a fresh backup/restore evidence record.
   Preserve the temporary test object until the probe record is complete; then
   remove only that exact disposable key.

The prior GG-098 application does not understand `oss/` keys. Once new OSS
objects are written, a rollback to GG-098 alone will make those records
unreadable. Prepare a dual-read compatible rollback image or a forward fix
before admitting new writes. Do not move or delete historical R2 objects.
