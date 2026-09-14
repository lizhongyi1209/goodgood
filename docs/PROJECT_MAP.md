# Project map

GG-087问题反馈领域放在features/feedback和server/feedback，shared/contracts/feedback区分领域值和中文标签；app/page仅接导航/页面，反馈图片保持独立私有存储。

## Current implementation

Use `docs/CURRENT_STATE.md` for the deployed subset and parked work. This map
describes ownership in the clean integration baseline, not live-release proof.

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Shared workspace orchestration plus authenticated root-draft, durable project, and asset-library UI states |
| `features/jcoin/`, `server/jcoin/`, `shared/contracts/jcoin.*` | 私有个人币统计/流水、站长固定一期计划与独立消费奖励处理；迁移0040、Worker周期接线 |
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
| `features/admin/` | Site-owner account-management working surface and browser HTTP boundary |
| `features/organizations/` | Workspace directory hook/legacy-scope validation, management directory, shared enterprise tabs, operational overview model/read-only asset hook, members, invitations, budgets, usage and team assets |
| `features/distribution/` | Distributor-only management shell, own-account/direct-child/transfer content, legacy business-route canonicalization, in-memory history filter, accepted-write/refresh separation, allocation HTTP boundary |
| `features/auth/` | Browser session boundary plus pending/suspended account gate |
| `tests/` | Build/render, documentation, domain/mock, M3/M4 runtime, and opt-in Compose integration coverage |
| `db/` | PostgreSQL Drizzle schema and process-local database helper |
| `migrations/` | Versioned, checksum-tracked, rerunnable PostgreSQL migrations |
| `worker/` | Retained legacy Vinext/Cloudflare hosting entry; not the Hong Kong production process |
| `worker-configuration.d.ts` | Optional bindings for the retained Cloudflare hosting path |
| `server/generation/` | Node API, persistence transactions, outbox/Valkey queue, unbounded concurrent job runner, worker orchestration, explicit mock/O1Key routing, provider adapters, and object storage |
| `server/auth/` | Authing-compatible OIDC/PKCE flow, hashed GoodGood sessions, provider-neutral identity mapping, local test adapter, and owner context |
| `server/admin/` | Site-owner authorization, account search/review, linked promotional-credit audit, and one-time owner bootstrap |
| `server/organizations/` | GG-030 Workspace authorization, organization/member/invitation lifecycle, member-budget transactions, audit, usage, and manager Asset reads |
| `server/references/` | Owner-scoped upload intent, signed storage transfer, decoded validation, lifecycle persistence, cleanup policy/leases, and Node API |
| `server/projects/` | Owner-scoped project validation, idempotent persistence, signed presentation, and Node API |
| `server/drafts/` | One-per-owner expiring root drafts, optimistic versioning, ready-reference validation, and Node API |
| `server/assets/` | Authenticated asset-library listing, normalized errors, and Node API |
| `features/billing/` | Browser HTTP boundary, exact billing-summary helpers, and the owner credit-activity view |
| `server/billing/` | Server-owned immutable generation/payment products, authenticated account/order/activity boundaries, period-spend and batch-trace projections, signed fake-payment callbacks, dry-run-first operator manual-payment recording, and transaction-composable credit grant/reserve/settle/release/refund persistence |
| `server/persistence/` | Versioned migration runner |
| `server/runtime/` | Production web, concurrent worker, migration, reference-cleanup, manual-payment, site-owner-bootstrap, and mock-provider process entry points plus runtime health and host memory/disk admission protection |
| `server/observability/` | Server-owned request/support IDs, approved correlation fields, normalized HTTP routes, and structured completion events |
| `infra/container/` | Image health check plus host-side Compose dependency probes |
| `scripts/build-runtime.mjs` | Locked Node runtime bundling for the production image |
| `scripts/release-metadata.mjs` | Cross-platform GHCR image name, migration version, and runtime-configuration checksum derivation for CI |
| `scripts/verify-authentication.mjs` | Secret-redacting Authing/OIDC staging preflight entry point |
| `scripts/staging-contract.mjs` / `scripts/verify-staging.mjs` | Fail-closed staging release/runtime/secret validation and secret-redacting CLI report |
| `scripts/run-staging-release.mjs` | Dry-run-first digest deploy/rollback runner with live Authing and OCI-label verification |
| `scripts/production-readiness-contract.mjs` / `scripts/verify-production-readiness.mjs` | Vendor-neutral, exact-candidate, fail-closed paid-production evidence gate and JSON report |
| `scripts/production-preflight-contract.mjs` / `scripts/verify-production-preflight.mjs` | Read-only Linux-host configuration, source/image identity, secret-file, and live OIDC preflight that emits revision-bound evidence only on success |
| `scripts/artifact-security-*.mjs` / `scripts/import-artifact-security-evidence.mjs` | Main-CI evidence creation plus GitHub run/job/artifact-digest verification that emits exact-candidate artifact evidence only on success |
| `scripts/production-infrastructure-profile.mjs` | ADR 0021's selected existing 2-vCPU / 4-GiB / 50-GiB Hong Kong seed-host contract plus ADR 0018's separately named, unauthorized managed scale-out option |
| `scripts/production-runtime-adapter.mjs` | ADR 0017's non-executable Nginx/Compose blue-green slot, single-Worker handoff, and traffic-switch contract |
| `scripts/run-production-release.mjs` | Full-gate production release planner with ordered ADR 0017 adapter phases and no mutation or command-execution path |
| `scripts/production-conversion-contract.mjs` / `scripts/run-production-conversion.mjs` | Exact-target, fail-closed initial-conversion manifest validation and dry-run planning with no execution path |
| `scripts/production-work-package-contract.mjs` / `scripts/run-production-work-package.mjs` | Deterministic local inspection of the complete single-host conversion package; validates state, slots, maintenance, backup, R2 preview, checklists, rollback, and release binding without live execution |
| `server/generation/r2-inventory-contract.mjs` / `server/runtime/r2-inventory.mjs` | Exact current-object metadata inventory/fingerprint and read-only R2 listing role; deletion remains an unavailable separately approved operation |
| `scripts/run-o1key-local.mjs` | Interactive isolated O1Key smoke launcher with a worker-only temporary secret file |
| `Dockerfile` / `.dockerignore` | One non-root Linux application image and its build-context boundary |
| `compose.yaml` | Pinned web/worker/mock plus PostgreSQL, Valkey, RustFS, one-shot migration, and opt-in maintenance topology |
| `compose.staging.yaml` / `compose.staging.dependencies.yaml` / `infra/staging/` | Digest-only app roles, a separately operated resource-bounded test-data dependency stack, host bootstrap/install helpers, and non-secret staging templates; real secrets remain outside the checkout |
| `compose.o1key-local.yaml` | Explicit local worker override for the O1Key route and mounted key file |
| `compose.production*.yaml` / `infra/production/` | Resource-bounded production state and blue/green app topology, exact four-hour conversion runbook, maintenance/Nginx boundary, backup automation, slot/systemd templates, and non-secret manifests; credentials, approvals, and operational evidence stay outside Git |
| `.openai/hosting.json` | Retained historical Sites identity; not the current production target or an app secret |
| `AGENTS.md` / `docs/CURRENT_STATE.md` / `docs/WORKFLOW.md` | Stable agent contract, actual snapshot, and repeatable development/release workflow |
| `docs/BACKLOG.md` / `docs/tasks/` | Task priorities, acceptance, exact progress and resumable next steps |
| `docs/releases/` / `docs/history/` | Release receipts and lazy-read historical development evidence |

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
  admin/users/    site-owner-only account management entry
  distribution/   eligible business account's direct-child allocation entry
  organizations/  enterprise overview, members, usage, and team assets
features/
  creation/      composer, settings, stream, job states
  references/    upload queue, ordering, validation
  projects/      save, restore, autosave, clean start
  assets/        batch view, gallery, selection, detail
  models/        catalog, capability mapping, UI copy
  admin/         account review, business role, relationship, and promotional-credit browser boundary
  distribution/  direct-child list, transferable balance, transfer history and mutation UI
  organizations/ account navigation, legacy-scope validation and enterprise management boundary
server/
  api/            authenticated route handlers
  admin/          site-owner authorization, account review, and audit writes
  organizations/  workspace membership, invitation, budget, usage, and audit
  auth/           identity binding, authorization, ownership context
  generation/     jobs, provider adapters, routing, reconciliation
  billing/        price versions, entitlements, credit ledger, payments
  distribution/   business roles, direct relationships, and atomic paired credit transfers
  persistence/    repositories and transactions
  storage/        signed upload/download operations
shared/
  contracts/      schemas and domain enums, including source-aware credit and distribution values
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

Current milestone status and the single next action live in
`docs/IMPLEMENTATION_PLAN.md`; actual deployment in `docs/CURRENT_STATE.md`;
task detail in `docs/tasks/`. Do not duplicate changing delivery status here.

## Ownership rules

- Feature modules own domain behavior and feature-specific components.
- `components/ui/` owns generic primitives only; do not put GoodGood business
  decisions there.
- API handlers validate and authorize; provider adapters never receive browser
  sessions directly.
- Enterprise APIs derive the human actor from the session and validate the
  selected Workspace; membership, business hierarchy, and platform role remain
  separate repository concerns.
- Database code returns domain records, not UI-ready Chinese labels.
