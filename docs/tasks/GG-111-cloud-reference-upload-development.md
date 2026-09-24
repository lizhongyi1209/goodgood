# GG-111 — local browser uploads to OSS

- Status: implemented and locally verified; application code not deployed.
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
- Verified checkpoint `2674c90` ran on 32131 with cloud mode, reported
  `build.verified=true` and readiness 200. Port 5173 `/create` and its API
  proxy returned 200 with that backend revision.
- The operator uploaded a real PNG through 5173 and confirmed it remained
  visible after refresh. Read-only local database inspection found the newest
  reference `ready / accepted`, `image/png`, 2,380,052 bytes, 940×1672 pixels,
  with a `local-dev/references/` key. OSS HEAD returned 200 and the same byte
  count. The previous RustFS reference belonged to the same local owner.
- The Windows cross-drive external-file guard was corrected in `2674c90`;
  `npm run check:local` was repeated afterward with the same 558 pass,
  26 isolated skips, 0 failures. Production application remains GG-098.
- The 5173 Vite process was moved from GG-110 to this GG-111 worktree. Its
  `/create` and API proxy returned 200, the proxy reported the verified GG-111
  backend revision, and the operator refreshed again: image present, page normal.

## 下一步

Keep the opt-in cloud mode only for requested local testing. Before a future
checkpoint restart, build from the then-current committed revision. Continue
new feature work in a new isolated branch; GG-106 production OSS application
cutover remains independent.
