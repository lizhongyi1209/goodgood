# Product definition

## One sentence

GoodGood is an image-first AI visual creation workspace for people who need to
generate quickly, compare many visual directions, keep useful assets, and
resume a coherent body of work later.

## Positioning

- Category: global premium visual AI platform.
- Initial experience: Chinese-first creation workflow, globally legible brand.
- Primary users: photographers, visual creators, fashion/e-commerce teams, and
  small creative teams producing repeated image batches.
- Core promise: reduce the distance between an idea and a usable visual asset
  while preserving the creative trail.

GoodGood is not positioned as a technical model console. Model parameters are
necessary controls, but generated images remain the visual center of gravity.

## Core mental model

The product has four distinct concepts:

1. **创作 / Creation** — the active, fast, continuously accumulating session.
2. **批次 / Batch** — one submission plus its prompt, references, parameters,
   results, status, and time.
3. **资产 / Asset** — an individual generated image that can be inspected,
   selected, downloaded, and reused.
4. **项目 / Project** — a saved creative context containing multiple related
   batches and enough state to resume work.

Do not collapse these terms. In particular, an asset library is not a job log,
and a project is not simply a folder of images.

## Primary journey

1. A new user sees a restrained empty creation state.
2. They enter a prompt, optionally add up to 10 references, and optionally open
   the attached settings drawer.
3. They select model, aspect ratio, resolution, and generation count.
4. The latest batch begins at the top of the creation stream.
5. Completed images enter the asset library automatically.
6. The user continues generating around the same goal without leaving creation.
7. When the body of work becomes meaningful, they save the session as a project.
8. Later they open the project, restore its state, and continue; they can always
   start a clean creation from the project surface.

## Current prototype scope

Implemented in the interactive frontend:

- Prompt and reference composer.
- Expandable parameter settings.
- Three visible model choices; the M3 durable local path currently accepts the
  Nano Banana 2 / 1:1 / 1K / one-image default through the HTTP mock provider.
- Polled loading, completion, inline failure, and retry for that M3 path.
- The M4 backend boundary now authenticates a provider-neutral external
  identity and scopes generation and generated-asset reads to its internal
  GoodGood owner. The production-shaped adapter uses standard OIDC for an
  Authing-hosted Google / email verification-code login and then issues a
  revocable GoodGood session; local Compose retains explicit test identities.
- Reference thumbnails now use an owner-scoped signed direct-upload lifecycle;
  the local backend validates the decoded JPEG/PNG/WebP before allowing up to
  10 ready references into the durable generation snapshot. A manual, bounded
  cleanup role protects every project/generation snapshot and records
  object-deletion or retry evidence without deleting database history.
- Projects now persist in the local PostgreSQL slice with owner-scoped,
  idempotent save; restore returns the latest prompt, ordered ready references,
  parameters, and batches, and project continuation automatically associates
  new batches.
- The authenticated root creation surface now restores and debounces one
  owner-scoped prompt/reference/settings draft. It expires after 30 days,
  detects stale-tab writes, and never overwrites a saved project.
- Creation, project, and asset navigation now use stable, refreshable URLs;
  `/create` and the compatible `/` entry share one creation state, while image
  detail preserves its creation or asset-library source scope through browser
  back/forward navigation.
- Continuous creation stream, assets, gallery, projects, and image detail.
- Responsive layout and keyboard/wheel detail navigation.
- M6 prices Nano Banana 2 at 10 credits per image for 1K, 2K, and 4K and grants
  each owner 100 non-expiring welcome credits once. New generation jobs reserve
  credit transactionally, accepted Assets settle it, and no-Asset failures
  release it. The authenticated workspace now presents exact available credit,
  reserved work, the launch quote, and approximate remaining images without
  exposing provider channels. The accepted CNY 10 / 500-credit product,
  idempotent owner orders, and exactly-once fake-sandbox fulfillment now work
  locally. Before the ICP-filed domestic Alipay checkout exists, a trusted
  server operator can record an already received payment against that same
  immutable product/order/ledger path; there is no customer checkout or public
  balance-mutation endpoint yet.

Not production-ready yet:

- Secure public-HTTPS callback/logout verification, explicitly deferred by the
  operator to the M7 staging gate, and the separately deferred reverse
  association order. All requested real-Authing loopback edge cases now pass.
  Password and phone recovery are intentionally absent because those sign-in
  methods are not offered.
- Real model API calls and provider failover.
- A fuller creation-session policy covering project edits, active jobs, and
  cross-device session history beyond the minimal root draft.
- Customer checkout UI, the selected domestic Alipay sandbox and fulfillment
  adapter after ICP filing, quotas, moderation, and abuse controls.
- Production object-storage lifecycle alignment, moderation, approved retention
  periods, cleanup scheduling/alerting, and staging capacity evidence beyond the
  locally verified manual cleanup path.
- Search, Explore, Moodboards, collaboration, and sharing.

## Product principles

- Images first; records and parameters second.
- Fast iteration before configuration depth.
- Continuity without trapping the user in a project.
- Explicit recovery over vague toast errors.
- Preserve creative context; never make a retry re-enter known information.
- Simulated data must behave like real data: ordering, ratios, timestamps,
  states, and restored parameters must remain coherent.
