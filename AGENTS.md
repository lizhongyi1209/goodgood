# GoodGood Agent Contract

This file is the stable entry point for every coding agent. Keep it short. Put
changing detail in `docs/` and update the relevant document in the same change.
For a new window, resolve the current checkpoint in `docs/IMPLEMENTATION_PLAN.md`
and follow `docs/DEVELOPMENT_HANDOFF.md`; never assume main is the latest local code.

## Product identity

- Product: **GoodGood**, a premium, image-first AI visual creation workspace.
- Primary task: let creators generate repeatedly, inspect results, collect
  assets, and preserve a coherent creative session as a resumable project.
- Live stage: publicly open controlled alpha; deployed access rules are recorded below. Read
  `docs/CURRENT_STATE.md` for actual deployed capabilities and release identity;
  never infer production from a branch name or old chat.
- Primary language today: Simplified Chinese. Keep the information architecture
  ready for later internationalization; do not hard-code backend enums from UI
  labels.

## Read before changing code

1. Read this file.
2. Read `docs/CURRENT_STATE.md`, `docs/WORKFLOW.md`,
   `docs/IMPLEMENTATION_PLAN.md`, and `docs/BACKLOG.md`. Inspect Git status,
   branch/worktree and recent commits; match or create the task card in
   `docs/tasks/`. Do not load the full historical log unless needed.
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

## Session and delivery contract

- A concise natural-language request is enough. The agent restores context,
  records scope/acceptance, allocates a task ID, and maintains its task card.
  Do not require the user to repeat earlier decisions or write a handoff essay.
- New requests start isolated branches from the verified IMPLEMENTATION_PLAN
  checkpoint; use main only when it contains that baseline. Verify ancestry.
  Parallel windows/subagents use registered worktrees and WORKFLOW's
  create/own/integrate/retire gate. Never force-remove dirty worktrees or leave
  child caches behind. Never bulk-merge parked C6 without explicit scope.
- Save material decisions and resumable next steps during work, before waits,
  compaction, or handoff. Chat memory is not the project's source of truth.
- Local implementation, tests, CI, image publication, and production deployment
  are separate states. Existing real production data must not be reset by old
  conversion scripts. Production authority is specific to the approved task.
- Proceed through approved in-scope steps without repeated confirmations;
  ask when a missing choice changes product direction, data safety, cost, or
  external authority. Do not silently grow alpha work into full-seed readiness.
- Match effort to the requested outcome. Start with the smallest behaviorally
  complete change and targeted inspection; add refactors or hardening only when
  acceptance requires them or the current change exposes a concrete defect.
- Follow repository workflows, not personal/external business skills. Tool
  availability or legacy hosting metadata does not change the deployment target.

## Product invariants

- The creation surface is a working tool, never a marketing or editorial hero.
- The empty creation state stays quiet: small brand mark, one primary sentence,
  one secondary sentence; no fake examples or parameter explanation.
- The composer shows prompt, reference upload, settings, and upward-arrow send by
  default. Parameters expand downward as one attached drawer.
- Prompt textarea auto-grows to eight lines, then scrolls. Tool positions remain
  stable while it grows.
- Reference images live in a tray above the prompt, never inside its text area.
  Use moderately enlarged responsive 1:1 centered previews and horizontal
  overflow. Maximum: 10. At the limit, the add control is disabled.
- Parameter groups read as aspect ratio, model, then output; aspect ratio starts
  at the left on wide screens and remains first through responsive reflow.
- Models and copy are fixed until a product decision changes them:
  `Nano Banana 2 — 快速，批量`; `Nano Banana Pro — 高质量资产，视觉优先`;
  `GPT IMAGE 2.5 sunburst`; `GPT IMAGE 2`; `GPT IMAGE 2.5 flare`.
- Creation exposes attached `图片 / 视频` modes below the prompt. Configured local development
  exposes real Seedance by default; durable video jobs/billing/assets remain
  unconnected. Never send video through the image API or submit without a user
  action.
  ADR 0143/GG-384 separately adds durable canvas Kling video generation source;
  activation needs its migration, pricing and updated Web/Worker. Seedance remains transient.
- Resolution UI and domain values use `1K / 2K / 4K`. Asset metadata pairs the
  requested value with decoded pixel dimensions when available. Generation count defaults to 1.
- New generation batches appear first. Generated assets enter the asset library
  automatically and trigger a restrained navigation cue; do not add a bottom
  success banner.
- A creative session may be saved as a project and later restored with prompt,
  references, parameters, batches, and ordering. A project view must always
  offer `新建创作` to leave the project quickly.
- Image detail uses image/info/rail zones. Asset-page wheel/arrows browse images;
  canvas uses wheel zoom/drag pan and rail selection (ADR 0123/GG-253).
- Batch and gallery layouts preserve real aspect ratios. Keep image gaps tight;
  only the outer silhouette receives rounded corners where images form a group.
- Generation errors appear inline where results would appear. Preserve prompt,
  references, and parameters; offer retry and settings recovery.

## Visual invariants

- Light, white, image-first canvas inspired by Midjourney's spatial continuity,
  not a visual copy.
- Achromatic interface palette in `app/globals.css` and `DESIGN_SYSTEM.md`
  (ADR 0105): black type and icons, gray state fills, near-black primary action.
- Use rounded geometry, minimal borders, transparent/default icon buttons, and
  shallow hover fills. Avoid heavy shadows and navigation shadows.
- Do not introduce chromatic accents, neon/Neo-Tech styling, magazine rules,
  warm ivory/limestone palettes, large editorial type, or strong panels. ADR 0110
  permits blue on canvas media outlines, and ADR 0108/GG-200 permits bright blue
  on a connected edge while hovered and on a dragged connection preview (GG-304);
  media resize handles remain invisible.
  ADR 0141 / GG-359 permits red only for image-region annotations and their
  edit handles; ordinary interface controls remain achromatic.
  Text and selected group nodes use invisible four-corner resize targets
  (ADR 0124 / ADR 0135 / GG-334); image crop mode alone shows circular selection
  handles (ADR 0126 / GG-280).
- Brand icons use `public/goodgood-g-icon.svg`; lobby navigation uses only the Good Good wordmark (ADR 0116).
  Creation sends use an upward arrow in both image and video modes (ADR 0098).

## Engineering rules

- Never expose upstream model credentials to the browser. Browser calls the
  GoodGood backend; the backend calls generation providers.
- Keep provider models, UI labels, job states, and persisted records separated.
- Do not commit `.env*`, API keys, database data, user uploads, generated user
  assets, logs, build output, or SSH material.
- Prefer feature boundaries over extending `app/page.tsx`. The current monolith
  is prototype debt; follow the target map in `docs/PROJECT_MAP.md` when a
  feature receives real backend behavior.
- Reuse Radix/Shadcn primitives; add AI Elements per `docs/DESIGN_SYSTEM.md`.
  Keep keyboard, focus, labels, reduced motion, and responsive behavior intact.
- Do not add speculative routes or functionality while refactoring.
- Update docs, tests, and error behavior with code. Verify behavior at code level;
  browser interaction and product acceptance belong to the user unless delegated.
- Default to scoped verification: small UI/copy/interaction changes need source/diff
  review and relevant logic tests. Batch/release/full-gate triggers and documentation
  checks follow WORKFLOW; older per-task gate notes are history.
- User override (2026-10-02): implement and edit code only; the user manually checks
  changes. Do not automatically run compilation, lint, tests, code checks or browser
  acceptance unless the user delegates them again. This overrides default checks.
- Runnable local development uses real online interfaces with external development credentials; local state stays isolated, production state stays forbidden, and mocks are only for named test stacks.
- Treat every real-provider request as potentially billable. Never let fixtures
  or synthetic jobs share a database or queue with a real-provider Worker.
  Opt-in write tests require an explicitly named disposable database/stack with
  no attached real-provider Worker; verify the effective target before enabling.
- At each handoff, update the task card and BACKLOG, then synchronize the one
  current checkpoint in `docs/IMPLEMENTATION_PLAN.md`. Update CURRENT_STATE
  only when facts change. Record exact verification and the next action or
  blocker; do not invent progress if the plan did not change.
- Future production releases use the single-slot Compose policy in ADR 0091.
  Do not restore blue/green slots, dual application Compose projects, or Nginx
  upstream switching from historical ADR 0017/GG-097/GG-098 records.

## Local development

- Requires Node.js `>=22.13.0` and npm.
- On first setup or after changing checkpoints, install locked dependencies
  with `npm ci`. Existing node_modules/build output may belong to an old branch.
- Start the local development server from the repository root with
  `npm run dev:local`; use the local URL printed by Vite and press `Ctrl+C` to
  stop it.
- UI-only rendering needs no secrets. Durable local development uses local Compose state plus real O1Key; missing external development credentials fail closed. Production uses separate protected secrets.
  See `docs/DEVELOPMENT_HANDOFF.md` for the preserved local preview and named SQL
  tests, and `docs/DEPLOYMENT.md` for release work; never use production data locally.

## Definition of done

- Scope matches an accepted product decision.
- Required scoped checks pass; the full local gate is not a prerequisite for each small-change delivery.
- New logic has tests for success, empty, loading, and failure paths where applicable.
- No secret or real user asset enters the diff.
- Relevant docs and ADR status are current.
- Task card distinguishes implemented, verified, and deployed; no unreported
  deferred changes are included in the release candidate.
- `docs/IMPLEMENTATION_PLAN.md` accurately describes the handoff state and next smallest useful slice.
