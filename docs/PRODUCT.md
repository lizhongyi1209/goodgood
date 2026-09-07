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

## Implemented scope and active launch boundary

The product has real authenticated, durable production behavior, not just a
frontend simulation. Exact deployed identity and verification live in
`docs/CURRENT_STATE.md`; this section defines capability scope rather than
duplicating a release log.

- Prompt/reference composer, attached settings, responsive creation stream,
  polled pending/success/inline failure, retry, gallery and focused image detail.
- Nano Banana 2 through the real server-side O1Key route across 14 product
  ratios, plus GPT IMAGE 2 through `gpt-image-2-c-sd` across its seven exact-size
  ratios. Both use `1K / 2K / 4K`, one output, and model-owned capability maps.
  Other visible model names are not a promise of availability.
- Authing Google/email-code login and revocable GoodGood sessions, with
  owner-scoped jobs, private assets, uploads, projects and drafts. Local Compose
  uses explicitly isolated test identities/mock/RustFS, not production data.
- Up to 10 decoded JPEG/PNG/WebP references; durable project save/restore and
  continuing batches; a 30-day root draft with stale-tab conflict handling.
- Stable `/create`, project and asset URLs, with root compatibility and
  source-preserving detail navigation. Route contracts live in `ROUTES.md`.
- One 100-credit welcome grant; one-image generation costs 10 credits, with
  transactional reserve/settle/release semantics and private credit summaries.
- Registration is open but creative use requires site-owner approval.
  `pending / active / suspended`, system role and product tier are distinct.
  `/admin/users` provides audited review and free test-credit grants. The site
  owner is bootstrapped deliberately, never selected by registration order.

ADR 0024 permits the owner-reviewed controlled alpha with non-sensitive test
content, direct operator contact and manual response. It does not claim the
full seed or paid gate. Its accepted deferrals remain in `docs/BACKLOG.md`:

- Customer checkout/domestic Alipay, Nano Banana Pro and further models, and
  multi-output.
- Full automatic account/external-identity deletion, content reporting and
  broader moderation, provider-erasure terms, and complex monitoring.
- Search, Explore, Moodboards, collaboration, sharing, and richer cross-device
  session policy beyond existing drafts/projects are not shipped features.

The accepted CNY 10 / 500-credit payment product and fake sandbox/operator
recording infrastructure are not permission to collect payments during alpha.
Password/phone recovery is not offered because those sign-in methods are absent.
Historical implementation/verification stages are retained in `docs/history/`.

## Product principles

- Images first; records and parameters second.
- Fast iteration before configuration depth.
- Continuity without trapping the user in a project.
- Explicit recovery over vague toast errors.
- Preserve creative context; never make a retry re-enter known information.
- Simulated data must behave like real data: ordering, ratios, timestamps,
  states, and restored parameters must remain coherent.
