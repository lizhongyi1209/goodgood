# Project map

## Current implementation

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Shared workspace orchestration plus authenticated root-draft, durable project, and asset-library UI states |
| `app/create/` | Canonical creation page entry reusing the shared workspace |
| `app/projects/` | Addressable project index/detail page entries mounted into the shared workspace |
| `app/assets/` | Addressable asset-library and stable asset-detail page entries mounted into the shared workspace |
| `app/globals.css` | Product tokens, layout, components, responsive styles |
| `app/layout.tsx` | Metadata, language, favicon |
| `features/creation/` | Composer, generation contracts, M1 mock boundary, and M3 HTTP polling client |
| `features/references/` | Browser upload-intent, signed direct PUT, completion, and per-item status boundary |
| `features/projects/` | Browser project list, create/update, and restore HTTP boundary |
| `features/drafts/` | Browser authenticated root-draft read/save/delete and conflict boundary |
| `features/navigation/` | Stable workspace route parsing, URL generation, and browser-history notification |
| `features/assets/` | Browser owner-scoped durable asset-list HTTP boundary |
| `features/auth/` | Browser session read, login/logout redirect, and global expiry signal |
| `features/models/` | Stable GoodGood model catalog and presentation mapping |
| `shared/contracts/` | Provider-independent generation, draft, project, pricing, and credit domain values and records |
| `types/` | Project-level declarations for imported static assets |
| `public/goodgood-*` | Canonical GoodGood mark and wordmark |
| `public/feihong-send.png` | Send-action silhouette |
| `public/nano-fashion.png` | Prototype-only representative generated image |
| `components/ui/` | Vendored Shadcn/Radix primitives plus the browser-direct private-object image primitive |
| `tests/` | Build/render, documentation, domain/mock, M3/M4 runtime, and opt-in Compose integration coverage |
| `db/` | PostgreSQL Drizzle schema and process-local database helper |
| `migrations/` | Versioned, checksum-tracked, rerunnable PostgreSQL migrations |
| `worker/` | Vinext/Cloudflare worker entry for the current prototype |
| `worker-configuration.d.ts` | Typed optional bindings for the current Cloudflare prototype |
| `server/generation/` | Node API, persistence transactions, outbox/Valkey queue, worker orchestration, explicit mock/O1Key routing, provider adapters, and object storage |
| `server/auth/` | Authing-compatible OIDC/PKCE flow, hashed GoodGood sessions, provider-neutral identity mapping, local test adapter, and owner context |
| `server/references/` | Owner-scoped upload intent, signed storage transfer, decoded validation, lifecycle persistence, cleanup policy/leases, and Node API |
| `server/projects/` | Owner-scoped project validation, idempotent persistence, signed presentation, and Node API |
| `server/drafts/` | One-per-owner expiring root drafts, optimistic versioning, ready-reference validation, and Node API |
| `server/assets/` | Authenticated asset-library listing, normalized errors, and Node API |
| `features/billing/` | Browser HTTP boundary and exact public billing-summary helpers |
| `server/billing/` | Server-owned immutable generation/payment products, authenticated account and order boundaries, signed fake-payment callbacks, dry-run-first operator manual-payment recording, and transaction-composable credit grant/reserve/settle/release/refund persistence |
| `server/persistence/` | Versioned migration runner |
| `server/runtime/` | Production web, worker, migration, reference-cleanup, manual-payment, and mock-provider process entry points plus runtime health state |
| `infra/container/` | Image health check plus host-side Compose dependency probes |
| `scripts/build-runtime.mjs` | Locked Node runtime bundling for the production image |
| `scripts/verify-authentication.mjs` | Secret-redacting Authing/OIDC staging preflight entry point |
| `scripts/run-o1key-local.mjs` | Interactive isolated O1Key smoke launcher with a worker-only temporary secret file |
| `Dockerfile` / `.dockerignore` | One non-root Linux application image and its build-context boundary |
| `compose.yaml` | Pinned web/worker/mock plus PostgreSQL, Valkey, RustFS, one-shot migration, and opt-in maintenance topology |
| `compose.o1key-local.yaml` | Explicit local worker override for the O1Key route and mounted key file |
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
