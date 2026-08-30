# GoodGood

GoodGood is an image-first AI visual creation workspace. This repository
contains the current interactive frontend prototype and the product memory
needed to evolve it consistently into a production application.

![GoodGood](public/goodgood-mark.svg)

## Current status

The prototype demonstrates:

- Prompt input with eight-line auto-growth and multi-reference upload.
- Attached model, aspect-ratio, resolution, and output-count settings.
- Nano Banana 2, Nano Banana Pro, and GPT IMAGE 2 selection.
- Simulated asynchronous generation, loading, failure, retry, and asset arrival.
- Continuous creation sessions, resumable projects, asset batch/gallery modes,
  and a focused image-detail viewer.

It does **not** yet include real generation APIs, authentication, billing,
database persistence, or production uploads. See [Product definition](docs/PRODUCT.md).

## Start locally

Requirements: Node.js `>=22.13.0` and npm.

```bash
git clone https://github.com/lizhongyi1209/goodgood.git
cd goodgood
npm ci
npm run dev:local
```

The current prototype requires no environment variables. When integrations are
added, copy `.env.example` to `.env.local` and fill values locally; never commit
that file.

## Verify

```bash
npm run check:local
```

This runs lint, a production build, and the automated tests. Linux-only lifecycle
scripts used by the existing hosted prototype remain available as `npm run
build` and `npm test`.

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
secret.

To exercise only the application image, build it once and start the web and
worker roles with different commands:

```bash
docker build --build-arg GOODGOOD_REVISION=local -t goodgood:local .
docker run --rm --name goodgood-web -p 3000:3000 goodgood:local
docker run --rm --name goodgood-worker -e GOODGOOD_PROCESS=worker -p 3001:3001 goodgood:local node server/runtime/worker.mjs
```

The web process exposes `/api/health/live` and `/api/health/ready` on port
`3000`. The worker exposes `/health/live` and `/health/ready` on port `3001`.
The worker is currently an idle M2 runtime shell; durable queue consumption is
introduced with the asynchronous generation slice rather than simulated here.

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
