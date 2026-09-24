# GG-111 — local browser uploads to OSS

- Baseline: GG-110 `65fa299`; branch `feature/GG-111-cloud-development-upload`;
  worktree `F:/goodgood-worktrees/GG-111`.
- Decision: [ADR 0099](../decisions/0099-local-upload-probes-in-production-oss-bucket.md).
- Scope: opt-in 5173 reference uploads to `o1key-goodgood/local-dev/references/`,
  preserving local database/session and previous RustFS references.

## Acceptance

1. Default local mode continues to write to RustFS.
2. Cloud mode signs a browser PUT and private read URL for the exact OSS upload
   hostname; completing the upload validates bytes through OSS and marks the
   local reference ready.
3. Existing RustFS references remain readable; missing or unsafe cloud config
   fails closed, and no cloud Worker is started by upload setup.
4. A browser refresh restores the new reference from the local database and OSS.

## Current verification

- Networkless configuration, key routing, and signed URL tests: 3 passed.
- Existing targeted generation/UI tests: 25 passed.
- The operator added `http://127.0.0.1:5173` to OSS CORS; PUT preflight now returns
  200 with the expected origin, method and request header.
- With the explicitly selected existing RAM identity, OSS HeadBucket returned 200.
  A disposable key under `local-dev/references/` passed signed PUT 200 and private
  GET 200 with byte comparison, then exact-key DELETE 204.
- `npm run check:local`: 584 tests, 558 passed, 26 isolated skips, 0 failed;
  lint had 16 pre-existing warnings and 0 errors.
- Application API and browser upload: pending verified GG-111 checkpoint startup.

## 下一步

Start the verified GG-111 Web checkpoint with external credential paths,
then perform one disposable local-prefix browser upload and inspect the local
ready record and refresh recovery. Do not use a production user object for
the probe.
