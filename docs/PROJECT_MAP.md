# Project map

## GG-411 · 共用结果播放器

features/canvas/canvas-video-result-player.tsx/module.css负责画布/详情的手动播放、时间轴/静音及控制区域；canvas-video-preview-playback.mjs/d.mts提供可选manualOnly生命周期，默认参考预览不变。生成节点保留唯一查看/下载、受权源刷新与尺寸回调，组件无ReactFlow Hook或持久化字段。

## GG-409 · 视频进度反馈

features/canvas/canvas-video-generation-feedback.tsx负责任务局部UI、可见性/减少动态和时钟清理；canvas-video-generation-progress.mjs/d.mts仅计算隔离且有界的展示帧。视频生成节点传递既有状态与真实进度，沿原请求/轮询；估算帧不进入节点数据或持久化。

GG-407在canvas-video-material-modes.mjs/d.mts负责所选模型内适配与显式切换保留/移除计划；canvas-video-generator-node.tsx接自由模型Select/草稿与报价清除，context提供一次移除多个输入边，canvas-page沿现有历史/快照流程实施。无新server/API/持久字段；不逐条用旧闭包删除边。

GG-354将原图直接框选放在`canvas-image-region.tsx/module.css`与`canvas-image-region-model.mjs/d.mts`：浮层定位/指针/复制及纯坐标模型；PlacementProvider按mode分流，context提供当前框选key供快捷栏隐藏。贴图仍在原placement编辑器，canvas-page/workspace及服务端不扩展。

GG-352将图片框选/贴图放在`features/canvas/canvas-image-placement-*`与`canvas-image-placement.tsx/module.css`：纯几何/绘制模型、独立context、受权/本地图片加载及PNG导出、资产选择与编辑状态。`canvas-image-crop.tsx`仅新增快捷按钮，`canvas-workspace.tsx`仅挂载provider；沿现有副本提交上传，不扩展canvas-page业务或新增服务器。

GG-126 keeps local file intake in `features/canvas/canvas-local-images.mjs` and `canvas-page.tsx`; `canvas-source-node.tsx` renders a temporary React Flow image node. The existing reference uploader is called only after the user explicitly selects “用作参考”, and existing result nodes retain their positions and behavior. No server-side canvas feature is added.

GG-125 makes `app/canvas/page.tsx` a standalone route backed by
`features/canvas/canvas-page.tsx`. `canvas-workspace.tsx` owns React Flow and
temporary result nodes; `canvas-result-node.tsx` renders job states, while
`components/ui/zoom-select.tsx` adapts React Flow UI's Zoom Select. The page
reuses existing auth, billing, reference upload and generation boundaries;
there is no canvas server boundary or persistence yet.

GG-115 moves the asset page presentation into
`features/assets/asset-workspace.tsx` and its CSS module. The feature's
`http-asset-organization.ts` and `http-audio-materials.ts` call owner-scoped
Node/Next routes. `server/assets/organization.mjs` persists folder/tag
metadata; `server/audio-materials/` owns private MP3 upload lifecycle;
`server/assets/cleanup-unfinished-upload.mjs` is shared by audio and video.
`shared/contracts/upload-limits.mjs` is the common new-upload limit/type
contract. `app/page.tsx` remains the source-list orchestration and image-detail
entry until a later feature boundary migration.

GG-091账户码分配在0043，邮箱验证及邀请关系在server/auth；AccountInvitation是账户菜单复用展示/复制边界。移除旧后台额外发码feature/API，保留历史0042模型；不扩展根page的业务持久化逻辑。

GG-090邀请码后端为server/auth/invitations.mjs/invitation-http.mjs/invitation-route.ts，邮箱完成事务继续server/auth/email-repository.mjs；管理UI为features/admin/invitation-management.tsx嵌入账户管理，注册/开通在features/auth，不扩展app/page.tsx。

GG-087问题反馈领域放在features/feedback和server/feedback，shared/contracts/feedback区分领域值和中文标签；app/page仅接导航/页面，反馈图片保持独立私有存储。

## Current implementation

Use `docs/CURRENT_STATE.md` for the deployed subset and parked work. This map
describes ownership in the clean integration baseline, not live-release proof.

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Shared workspace orchestration plus authenticated root-draft, durable project, and asset-library UI states |
| Historical platform-coin schema | GG-217删除专属UI/server/contracts及Worker接线；0040与六张历史表保留，旧API仅410 |
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
| `shared/private-image-urls.mjs` | Stable owner-checked asset/reference preview and content URL helper for browser and server, including future canvas callers |
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
| `server/images/private-preview.mjs` | Shared fixed 512 px WebP preview delivery after each resource API checks owner and visibility; OSS processed redirect or streamed private WebP |
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
| `scripts/production-runtime-adapter.mjs` | ADR 0091's non-executable single-slot Compose release, maintenance window, and single-Worker handoff contract |
| `scripts/run-production-release.mjs` | Full-gate production release planner with ordered ADR 0091 single-slot phases and no mutation or command-execution path |
| `scripts/production-conversion-contract.mjs` / `scripts/run-production-conversion.mjs` | Exact-target, fail-closed initial-conversion manifest validation and dry-run planning with no execution path |
| `scripts/production-work-package-contract.mjs` / `scripts/run-production-work-package.mjs` | Deterministic local inspection of the complete single-host package; validates state, one Compose project, maintenance, backup, R2 preview, checklists, rollback, and release binding without live execution |
| `server/generation/r2-inventory-contract.mjs` / `server/runtime/r2-inventory.mjs` | Exact current-object metadata inventory/fingerprint and read-only R2 listing role; deletion remains an unavailable separately approved operation |
| `scripts/run-local-stack.mjs` / `scripts/local-provider-secret.mjs` | Default real-O1Key local Compose lifecycle and fail-closed external development-key validation |
| `scripts/run-o1key-local.mjs` | Interactive isolated O1Key smoke launcher with a temporary secret mounted into Web and Worker |
| `Dockerfile` / `.dockerignore` | One non-root Linux application image and its build-context boundary |
| `compose.yaml` | Pinned Web/Worker plus PostgreSQL, Valkey, RustFS, one-shot migration, opt-in maintenance, and test-profile-only mock topology |
| `compose.staging.yaml` / `compose.staging.dependencies.yaml` / `infra/staging/` | Digest-only app roles, a separately operated resource-bounded test-data dependency stack, host bootstrap/install helpers, and non-secret staging templates; real secrets remain outside the checkout |
| `compose.o1key-local.yaml` | Required local-development Web/Worker override for the real O1Key route and mounted development key file |
| `compose.production*.yaml` / `infra/production/` | Resource-bounded production state and single-slot app topology, maintenance/Nginx boundary, backup automation, systemd templates, and non-secret manifests; credentials, approvals, and operational evidence stay outside Git |
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
