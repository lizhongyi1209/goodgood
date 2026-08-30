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
  Nano Banana 2 / 4:5 / 2K / one-image default through the HTTP mock provider.
- Polled loading, completion, inline failure, and retry for that M3 path.
- Continuous creation stream, assets, gallery, projects, and image detail.
- Responsive layout and keyboard/wheel detail navigation.

Not production-ready yet:

- User authentication and authorization.
- Real model API calls and provider failover.
- Production identity-bound database/object-storage persistence beyond the
  narrow server-owned local M3 generation records.
- Billing, points, quotas, moderation, and abuse controls.
- Real file upload validation and processing.
- Search, Explore, Moodboards, collaboration, and sharing.

## Product principles

- Images first; records and parameters second.
- Fast iteration before configuration depth.
- Continuity without trapping the user in a project.
- Explicit recovery over vague toast errors.
- Preserve creative context; never make a retry re-enter known information.
- Simulated data must behave like real data: ordering, ratios, timestamps,
  states, and restored parameters must remain coherent.
