# GoodGood Agent Contract

This file is the stable entry point for every coding agent. Keep it short. Put
changing detail in `docs/` and update the relevant document in the same change.

## Product identity

- Product: **GoodGood**, a premium, image-first AI visual creation workspace.
- Primary task: let creators generate repeatedly, inspect results, collect
  assets, and preserve a coherent creative session as a resumable project.
- Current state: an interactive frontend prototype with mock data and simulated
  generation. Authentication, billing, persistence, uploads, and model APIs are
  not production implementations.
- Primary language today: Simplified Chinese. Keep the information architecture
  ready for later internationalization; do not hard-code backend enums from UI
  labels.

## Read before changing code

1. Read this file.
2. Read `docs/IMPLEMENTATION_PLAN.md` for the current milestone, verified
   checkpoint, next slice, and blockers.
3. Read the task-specific source of truth:
   - Product scope and terms: `docs/PRODUCT.md`
   - Historical rationale and rejected directions: `docs/PRODUCT_JOURNEY.md`
   - Visual/UI work: `docs/DESIGN_SYSTEM.md`
   - Interaction/state work: `docs/UX_FLOWS.md`
   - Navigation and URLs: `docs/ROUTES.md`
   - Boundaries/integrations: `docs/ARCHITECTURE.md`
   - Persistence: `docs/DATA_MODEL.md`
   - Failures and recovery: `docs/ERROR_HANDLING.md`
   - Verification: `docs/TESTING.md`
   - Runtime/release work: `docs/DEPLOYMENT.md`
4. Inspect the existing implementation and tests. Do not infer behavior from a
   screenshot when the code is available.
5. State whether the request changes a confirmed decision. If it does, create
   or update an ADR under `docs/decisions/` before implementation.

## Product invariants

- The creation surface is a working tool, never a marketing or editorial hero.
- The empty creation state stays quiet: small brand mark, one primary sentence,
  one secondary sentence; no fake examples or parameter explanation.
- The composer shows prompt, reference upload, settings, and Feihong send by
  default. Parameters expand downward as one attached drawer.
- Prompt textarea auto-grows to eight lines, then scrolls. Tool positions remain
  stable while it grows.
- Reference images live in a tray below the prompt, never inside its text area.
  Maximum: 10. At the limit, the add control is disabled.
- Models and copy are fixed until a product decision changes them:
  `Nano Banana 2 — 快速，批量`; `Nano Banana Pro — 高质量资产，视觉优先`;
  `GPT IMAGE 2 — 高真实感，提示词遵循`.
- Resolution UI uses `标准 / 高清 / 超清`; domain values use `1K / 2K / 4K`.
  Generation count defaults to 1.
- New generation batches appear first. Generated assets enter the asset library
  automatically and trigger a restrained navigation cue; do not add a bottom
  success banner.
- A creative session may be saved as a project and later restored with prompt,
  references, parameters, batches, and ordering. A project view must always
  offer `新建创作` to leave the project quickly.
- Image detail is a focused three-zone view: large image, prompt/parameters,
  vertical image rail. Wheel and arrow keys move through images.
- Batch and gallery layouts preserve real aspect ratios. Keep image gaps tight;
  only the outer silhouette receives rounded corners where images form a group.
- Generation errors appear inline where results would appear. Preserve prompt,
  references, and parameters; offer retry and settings recovery.

## Visual invariants

- Light, white, image-first canvas inspired by Midjourney's spatial continuity,
  not a visual copy.
- Brand accent: Palace Red family defined in `app/globals.css` and
  `docs/DESIGN_SYSTEM.md`.
- Use rounded geometry, minimal borders, transparent/default icon buttons, and
  shallow hover fills. Avoid heavy shadows and navigation shadows.
- Do not introduce blue as the primary accent, neon/Neo-Tech styling, magazine
  rules, warm ivory/limestone palettes, large editorial typography, or strong
  panel separation.
- Use the Double G mark and custom GoodGood wordmark. The Feihong mark is the
  send action, not the creation-navigation icon.

## Engineering rules

- Never expose upstream model credentials to the browser. Browser calls the
  GoodGood backend; the backend calls generation providers.
- Keep provider models, UI labels, job states, and persisted records separated.
- Do not commit `.env*`, API keys, database data, user uploads, generated user
  assets, logs, build output, or SSH material.
- Prefer feature boundaries over extending `app/page.tsx`. The current monolith
  is prototype debt; follow the target map in `docs/PROJECT_MAP.md` when a
  feature receives real backend behavior.
- Reuse existing Radix/Shadcn primitives. Keep keyboard behavior, focus states,
  labels, reduced motion, and responsive behavior intact.
- Do not add speculative routes or functionality while refactoring.
- Update documentation, tests, and error behavior in the same change as code.
- At the end of every code or infrastructure task, synchronize the current
  checkpoint in `docs/IMPLEMENTATION_PLAN.md`: milestone status, completed
  slice, verification, and next action or blocker. If the plan did not change,
  explicitly confirm that after inspecting it rather than inventing progress.

## Local development

- Requires Node.js `>=22.13.0` and npm.
- On first setup, install locked dependencies with `npm ci`.
- Start the local development server from the repository root with
  `npm run dev:local`; use the local URL printed by Vite and press `Ctrl+C` to
  stop it.
- The current prototype requires no environment variables. See
  `docs/DEPLOYMENT.md` for environment and release details.

## Definition of done

- Scope matches an accepted product decision.
- `npm run check:local` passes on the supported local environment.
- New logic has tests for success, empty, loading, and failure paths where
  applicable.
- No secret or real user asset enters the diff.
- Relevant docs and ADR status are current.
- `docs/IMPLEMENTATION_PLAN.md` accurately describes the handoff state and next
  smallest useful slice.
