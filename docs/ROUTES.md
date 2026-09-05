# Navigation and route contract

## Current implementation

The shared workspace mounts at `/`, `/create`, `/projects`,
`/projects/:projectId`, `/assets`, and `/assets/:assetId`. `/create` is the
canonical product URL for creation; `/` remains a compatible entry to the same
workspace state. Project and asset navigation use stable browser URLs and
native history.

| Visible navigation | Current status | Current behavior |
| --- | --- | --- |
| 创作 | Implemented | `/create`, with `/` as a compatible entry |
| 探索 | Placeholder | No view or route yet |
| 项目 | Implemented | `/projects` index and `/projects/:projectId` restore |
| 资产库 | Implemented | `/assets` batch/gallery library |
| 灵感板 | Placeholder | No view or route yet |
| 帮助 | Placeholder | No view or route yet |
| 图片详情 | Implemented | `/assets/:assetId` over its preserved source scope |
| 账户管理 | Implemented locally for M8 | `/admin/users`, visible and callable only by the site owner |

Do not describe placeholders as shipped features.

The current authenticated Node API also owns `POST /api/references` for upload
intents and `POST /api/references/:referenceId/complete` for post-upload
validation. These are data boundaries, not visible navigation routes. They use
stable reference IDs and the same owner context as `/api/generations`.

The authenticated Node API also owns `GET/POST /api/projects` and
`GET/PATCH /api/projects/:projectId`. They use stable project IDs, owner-scoped
creation idempotency, and fresh signed private-object reads. The visible project
index is addressable at `/projects`; opening a card pushes its stable ID URL and
restores through the same owner-scoped read. Direct access, refresh, and browser
back/forward use that route contract. A failed detail read stays on the URL and
offers retry, return to projects, and `新建创作`.

`GET /api/assets` returns only the authenticated owner's successful, accepted
generated assets, grouped by their immutable generation jobs newest-first. Each
read returns fresh short-lived private-object signatures. It has no cross-owner
lookup mode and returns an empty list when that owner has no assets.

`GET /api/billing` returns the authenticated owner's exact available and
reserved credit balances plus the active Banana 2 launch quotes for 1K, 2K, and
4K. It is a read-only, no-store data boundary rather than a visible route. The
response uses decimal strings for exact credit values and exposes no internal
account, owner, provider-channel, or ledger identifiers.

M6 also owns `GET /api/billing/products`, `POST /api/billing/orders`, and
`GET /api/billing/orders/:orderId`. Product reads expose the active immutable
`credits-500-cny` version; order creation accepts only that stable product ID
plus an owner-scoped idempotency header, never money or credit amounts. Order
reads are owner-scoped and return the public order ID and immutable snapshots.
These remain data boundaries; no wallet or checkout route is visible yet.

`POST /api/billing/webhooks/fake` is a local provider-callback boundary. It does
not use a browser session. It requires the enabled fake sandbox, a current HMAC
timestamp/signature over the exact raw body, and an exact order amount/currency.
It must remain disabled outside explicitly local test environments.

There is intentionally no browser route for recording payment. Before domestic
Alipay checkout is enabled, a trusted server operator may still record an
independently confirmed payment with the dry-run-first
`billing:manual-payment` command. It uses the same immutable payment order and
credit ledger. ADR 0020 separately accepts a site-owner-only test-credit action
under `/admin/users`; that action appends a promotional ledger grant and never
creates or mutates a payment order.

The visible asset library is addressable at `/assets`. Opening a generated
image from creation or either asset mode pushes `/assets/:assetId` while
retaining its source scope, selected asset mode, and scroll position in browser
history state. Wheel, arrow, and rail selection replace the detail URL rather
than creating one history entry per image. Closing or browser Back restores the
source; Forward and direct refresh resolve the stable asset ID from the
owner-scoped asset list. A missing or inaccessible ID remains on its URL with
retry and return-to-library recovery.

Authentication endpoints are backend boundaries rather than visible product
navigation:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/auth/login` | Persist OIDC state/PKCE and redirect to the hosted login page |
| `GET /api/auth/callback` | Consume state, expire the one-time browser binding on every outcome, exchange a valid code, and create a GoodGood session |
| `GET /api/auth/session` | Return the safe current-account summary; never provider tokens |
| `POST /api/auth/logout` | Revoke the GoodGood session, expire its cookie, and return the fixed Authing hosted-logout target in OIDC mode |

The browser follows an OIDC logout target as a top-level navigation. It never
uses `fetch` across origins, and the provider return is fixed to the GoodGood
origin root derived from the configured login callback rather than accepting a
caller-supplied URL. Local test mode has no provider session and keeps the `204`
response after expiring its local cookie.

## Accepted production routes

`/create`, `/projects`, `/projects/:projectId`, `/assets`, and
`/assets/:assetId` are implemented today. Adopt future routes only when their
persistence and navigation behavior exist:

| Route | Purpose |
| --- | --- |
| `/create` | Clean or active creation session |
| `/projects` | Project index |
| `/projects/:projectId` | Restore and continue a project |
| `/assets` | Batch/gallery asset library |
| `/assets/:assetId` | Addressable image detail |
| `/explore` | Future discovery experience |
| `/moodboards` | Future moodboards |
| `/help` | Product help and status guidance |
| `/admin/users` | M8 site-owner-only account review, suspension/restoration, audit history, and test-credit management |

The root route remains compatible for old links. Product navigation and clean
creation transitions use `/create`; both entries mount the same component and
do not create separate draft or history state.

## Navigation rules

- Navigating between Creation, Projects, and Assets must not silently lose an
  in-progress generation.
- Returning to the same loaded project preserves its current in-memory edits.
  Restoring a different project or starting a clean session confirms before
  discarding meaningful unsaved composer state.
- A project detail must expose `新建创作` near project actions.
- Opening image detail should preserve the source scope so its rail matches the
  images the user was browsing.
- Filters, selected mode, and scroll position should survive detail close and
  browser back navigation.
- Future URLs use stable IDs, never model names, prompts, or localized labels.
- Administrative navigation is emitted only for the site-owner role, but route
  and API authorization remain server-side. Search terms containing email or
  other personal data stay in request bodies or ephemeral client state rather
  than browser URLs or history.
