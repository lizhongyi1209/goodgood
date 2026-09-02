# GoodGood

GoodGood is an image-first AI visual creation workspace. This repository
contains an interactive frontend plus the first production-shaped durable
generation slice and the product memory needed to evolve it consistently.

![GoodGood](public/goodgood-mark.svg)

## Current status

The prototype demonstrates:

- Prompt input with eight-line auto-growth and multi-reference upload.
- Attached model, aspect-ratio, resolution, and output-count settings.
- Nano Banana 2, Nano Banana Pro, and GPT IMAGE 2 selection.
- A durable local async path for Nano Banana 2, 4:5, 2K, and one image through
  PostgreSQL, Valkey, a worker, the mock provider, RustFS, and browser polling.
- A provider-neutral owner boundary with a production-shaped Authing OIDC/PKCE
  adapter for Google or email-code login, hashed GoodGood sessions, and two
  local-only test identities.
- Owner-scoped reference upload intents, short-lived direct RustFS PUTs,
  decoded JPEG/PNG/WebP validation, and up to 10 ordered references in the
  durable generation snapshot, plus a dry-run-first bounded cleanup role that
  protects persisted project and generation references.
- Continuous creation sessions, resumable projects with addressable index/detail
  routes, and an owner-scoped durable asset library with batch/gallery modes and
  a focused image-detail viewer.
- A canonical `/create` route sharing the same workspace and history state as
  the compatible root entry.
- One authenticated root creation draft per owner, with debounced
  prompt/reference/settings persistence, 30-day expiry, and explicit stale-tab
  conflict recovery without overwriting projects.

It does **not** yet include the complete real Authing callback/account-association
evidence matrix, billing, production storage/scheduled-retention policy, the
future Explore/Moodboards/Help experiences, or the real US generation gateway. See
[Product definition](docs/PRODUCT.md).

## Start locally

Requirements: Node.js `>=22.13.0` and npm.

```bash
git clone https://github.com/lizhongyi1209/goodgood.git
cd goodgood
npm ci
npm run dev:local
```

The UI can still be inspected without environment variables. Durable generation
uses the Compose stack below; direct process runs use the names in
`.env.example`. Never commit a populated `.env*` file.

## Verify

```bash
npm run check:local
```

This runs lint, a production build, and the automated tests. Linux-only lifecycle
scripts used by the existing hosted prototype remain available as `npm run
build` and `npm test`.

Once an isolated Authing staging application and server-side secrets exist,
`npm run auth:preflight` validates its public OIDC metadata, callback, PKCE,
signing, and cookie contract without printing client credentials. The required
hosted-page and interactive evidence is listed in
[Development and deployment](docs/DEPLOYMENT.md#authentication-staging-preflight).

For a real-tenant loopback smoke test without putting the application secret in
the repository, shell history, Compose environment, or logs, register these
temporary URLs in the isolated Authing application:

- Login callback: `http://127.0.0.1:3000/api/auth/callback`
- Logout callback: `http://127.0.0.1:3000/`

Then run the following command with the public issuer and application ID:

```bash
npm run stack:authing-local -- --issuer https://tenant.authing.cn/oidc --client-id application-id
```

The command requests the application secret with invisible terminal input,
stores it in a permission-restricted temporary file mounted as a Docker secret,
runs the loopback preflight, and starts the stack. Press Enter in that terminal
after browser testing to stop the containers, preserve the named data volumes,
and remove the temporary secret. This proves a local callback only; public
HTTPS staging remains a separate release gate.

If port 3000 is already in use, choose a free port such as 3100, register the
same two callback URLs with `3100`, and append `--web-port 3100` to the command.

## Run the production-shaped application image

The complete local stack includes the shared GoodGood image in web, worker, and
mock-provider roles plus PostgreSQL, Valkey, and RustFS:

```bash
npm run stack:config
npm run stack:up
npm run stack:verify
npm run stack:down
```

All published ports bind to `127.0.0.1`. Defaults are web `3000`, worker health
`3001`, mock health `3002`, PostgreSQL `5432`, Valkey `6379`, and RustFS
`9000`/`9001`. Override the corresponding `GOODGOOD_*_PORT` environment name
when a local port is occupied. `stack:down` preserves the three named data
volumes; `docker compose down --volumes` is the explicit destructive reset.
The local defaults are development-only credentials and require no production
secret. The web role issues an HttpOnly local session for the default test
owner; API tests may use the two configured local Bearer identities directly.

To exercise only the application image, build it once and start the web and
worker roles with different commands:

```bash
docker build --build-arg GOODGOOD_REVISION=local -t goodgood:local .
docker run --rm --name goodgood-web -p 3000:3000 goodgood:local
docker run --rm --name goodgood-worker -e GOODGOOD_PROCESS=worker -p 3001:3001 goodgood:local node server/runtime/worker.mjs
```

The web process exposes `/api/health/live` and `/api/health/ready` on port
`3000`. The worker exposes `/health/live` and `/health/ready` on port `3001`.
Readiness now verifies PostgreSQL, Valkey, RustFS, and mock-provider access. A
one-shot `migrate` service applies the checksum-protected PostgreSQL migration
before web and worker start. The worker consumes the durable queue and restores
expired jobs from PostgreSQL after restart.

Reference cleanup is opt-in and defaults to a read-only preview. After reviewing
its counts, explicit execution is available through the maintenance profile:

```bash
docker compose --profile maintenance run --rm reference-cleanup
docker compose --profile maintenance run --rm reference-cleanup --execute
```

The second command deletes eligible private bytes; normal stack startup never
runs it automatically. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for policy and
failure semantics.

## AI-Native development

Every coding agent must begin with [AGENTS.md](AGENTS.md). Claude also receives
the thin entry adapter in [CLAUDE.md](CLAUDE.md), and GitHub Copilot receives the
same contract through `.github/copilot-instructions.md`.

Detailed product memory is organized under [docs/](docs/README.md):

- Product and historical reasoning.
- Design system and interaction contracts.
- Routes, project map, architecture, and data model.
- Error handling, testing, deployment, and decision records.

The rule is simple: keep stable principles in `AGENTS.md`, details in the
relevant document, and changes to confirmed decisions in an ADR.

## Important implementation note

The current UI is concentrated in `app/page.tsx` and `app/globals.css`. That is
known prototype debt, not the desired final architecture. Follow
[PROJECT_MAP.md](docs/PROJECT_MAP.md) for incremental extraction; do not perform
a speculative rewrite that changes working behavior.

## Brand

- Product name: GoodGood.
- Identity: connected Double G mark and custom GoodGood wordmark.
- Accent: Palace Red.
- Send action: Feihong flying-bird mark.

Brand assets live in `public/` and should not be replaced with system-font text
or unrelated icons.
