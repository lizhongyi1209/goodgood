# Testing strategy

## Current baseline

The starter tests validate the production build, rendered metadata, and shared
UI primitive behavior. They do not yet prove GoodGood's product flows.

Use:

```bash
npm ci
npm run check:local
```

`check:local` is the cross-platform gate intended for local computers and
GitHub Actions. The existing Sites lifecycle scripts remain available for the
current hosted prototype.

## Required test layers

### Unit

- Model capability/label mapping.
- Ratio mode, official output dimensions, and resolution mapping.
- Eight-line textarea height calculation.
- Reference maximum, ordering, and validation.
- Job-state transition rules and normalized errors.
- Newest-first batch ordering.

### Component

- Empty creation state.
- Composer open/closed drawer without value loss.
- Reference tray from 0, 1, 9, 10, and over-limit inputs.
- Generation skeleton count and ratio.
- Inline failed batch preserves prompt/settings and retries.
- Project restore and `新建创作` behavior.
- Asset batch/gallery ratio rendering.
- Detail wheel, arrow keys, focus, and close restoration.

### API/integration

- Auth and ownership on every write/read.
- Signed upload lifecycle and invalid-file rejection.
- Idempotent generation creation.
- Provider timeout/rejection normalization.
- Callback verification and duplicate callback handling.
- Database transaction creates batch/job/assets consistently.

### End to end

1. New user -> prompt -> one successful asset -> asset library.
2. Ten references -> submit -> success; eleventh is blocked.
3. Provider timeout -> inline error -> retry -> success.
4. Generate multiple ratios -> batch and gallery preserve geometry.
5. Save project -> clean start -> restore -> continue.
6. Open detail from creation and assets -> navigate -> download.

## Release gate

- Dependency install is locked and reproducible.
- Lint, build, and automated tests pass.
- No secrets or real user assets in the diff.
- Database migrations are reviewed and have rollback/forward-fix notes.
- Staging checks use test accounts and test buckets.
- A smoke test passes after deployment before traffic switch.
