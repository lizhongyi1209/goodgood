# Project map

## Current implementation

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Prototype view orchestration plus in-memory project and asset state |
| `app/globals.css` | Product tokens, layout, components, responsive styles |
| `app/layout.tsx` | Metadata, language, favicon |
| `features/creation/` | Composer, generation contracts, M1 mock boundary, and M3 HTTP polling client |
| `features/models/` | Stable GoodGood model catalog and presentation mapping |
| `shared/contracts/` | Provider-independent generation domain values and records |
| `types/` | Project-level declarations for imported static assets |
| `public/goodgood-*` | Canonical GoodGood mark and wordmark |
| `public/feihong-send.png` | Send-action silhouette |
| `public/nano-fashion.png` | Prototype-only representative generated image |
| `components/ui/` | Vendored Shadcn/Radix primitives |
| `tests/` | Build/render, documentation, domain/mock, M3 runtime, and opt-in Compose integration coverage |
| `db/` | PostgreSQL Drizzle schema and process-local database helper |
| `migrations/` | Versioned, checksum-tracked, rerunnable PostgreSQL migrations |
| `worker/` | Vinext/Cloudflare worker entry for the current prototype |
| `worker-configuration.d.ts` | Typed optional bindings for the current Cloudflare prototype |
| `server/generation/` | Node API, persistence transactions, outbox/Valkey queue, worker orchestration, provider mock, and object storage |
| `server/persistence/` | Versioned migration runner |
| `server/runtime/` | Production web, worker, migration, and mock-provider process entry points plus runtime health state |
| `infra/container/` | Image health check plus host-side Compose dependency probes |
| `scripts/build-runtime.mjs` | Locked Node runtime bundling for the production image |
| `Dockerfile` / `.dockerignore` | One non-root Linux application image and its build-context boundary |
| `compose.yaml` | Pinned web/worker/mock plus PostgreSQL, Valkey, RustFS, and one-shot migration topology |
| `.openai/hosting.json` | Current prototype hosting identity; not an app secret |

The remaining project, asset, detail, and view orchestration in `app/page.tsx`
and the broad `app/globals.css` stylesheet are documented prototype debt. Do
not perform a broad rewrite merely to make the tree look cleaner.

## Target feature boundaries

When a feature receives real data behavior, extract it toward this shape:

```text
app/
  create/
  projects/
  assets/
features/
  creation/      composer, settings, stream, job states
  references/    upload queue, ordering, validation
  projects/      save, restore, autosave, clean start
  assets/        batch view, gallery, selection, detail
  models/        catalog, capability mapping, UI copy
server/
  api/            authenticated route handlers
  auth/           identity binding, authorization, ownership context
  generation/     jobs, provider adapters, routing, reconciliation
  billing/        price versions, entitlements, credit ledger, payments
  persistence/    repositories and transactions
  storage/        signed upload/download operations
shared/
  contracts/      schemas and domain enums
  design/         tokens and shared product primitives
infra/
  container/      image, Compose, health checks, deployment helpers
```

Extraction order for the first backend milestone:

1. Move constants, types, and pure ratio/model helpers out of `app/page.tsx`.
2. Extract composer and parameter drawer without changing behavior.
3. Introduce domain contracts and a mocked repository boundary.
4. Replace simulations behind that boundary with real APIs.
5. Add addressable routes only after persistence IDs exist.

Current milestone status and the next slice live only in
`docs/IMPLEMENTATION_PLAN.md`; do not duplicate changing delivery status here.

## Ownership rules

- Feature modules own domain behavior and feature-specific components.
- `components/ui/` owns generic primitives only; do not put GoodGood business
  decisions there.
- API handlers validate and authorize; provider adapters never receive browser
  sessions directly.
- Database code returns domain records, not UI-ready Chinese labels.
