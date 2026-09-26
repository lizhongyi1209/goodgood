# GG-122 — Standalone Hero page

- Status: Local implementation and gate complete; operator browser review
  pending; not deployed.
- Baseline: GG-116 worktree `feature/GG-116-asset-history-actions` at `9a7616e`.
- Request: Integrate the supplied `Hero10` React component into the existing
  shadcn/Tailwind/TypeScript project and create a separate Hero page.
- Operator choice: Use an independent page. Keep `/` and `/create` as the
  creation workspace. This does not revise the existing workspace decision,
  so no ADR is needed.

## Scope and acceptance

- Put the reusable component in `components/ui/hero-10.tsx` and its CTA helper
  under `components/ui/hero-10-utils/`. Reuse the installed shadcn Button and
  `lib/utils.ts` rather than replacing either file.
- Add the required `motion` and `react-wrap-balancer` dependencies. The
  existing Tailwind, TypeScript and shadcn setup needs no initialization.
- Add `/hero` as an isolated local page. Keep the established GoodGood creation
  routes and navigation unchanged. Use truthful GoodGood copy and the three
  supplied demo image URLs; avoid the demo's unverified customer-count claim.
- CTA links lead to existing routes. Motion respects reduced-motion preference.
  No provider request, real user asset, backend change or production action.

## Verification and handoff

- `components/ui/hero-10.tsx` implements the supplied title, description,
  optional proof, CTAs, variants, reduced-motion-aware reveal and three-image
  fan. `components/ui/hero-10-utils/cta.tsx` reuses the existing Button and
  renders valid links; an empty link remains disabled.
- `/hero` is unlisted and noindex. Its GoodGood copy is factual, and it uses the
  three supplied demo image URLs (each returned HTTP 200), labelled as examples.
  `/`, `/create`, workspace navigation and authentication behavior are unchanged.
- `motion` and `react-wrap-balancer` are locked dependencies. Existing
  `components.json`, Tailwind CSS, TypeScript, Button and `cn` needed no setup
  or replacement. `npm ci --dry-run` accepted the lockfile.
- Impeccable's mechanical detector returned no findings. `npm run
  check:local` passed: **583 tests / 560 pass / 23 skip / 0 fail**;
  build/typecheck passed, lint had 0 errors and 110 warnings (109 existing and
  one from the supplied `<img>` implementation). Documentation tests 8/8 and
  `git diff --check` pass. No browser review, real provider request or deployment.

## 下一步

After the local gate, the operator checks `/hero` in the existing 5173 preview
for layout, image loading, reduced motion and CTA destinations. No production
release is part of this task.
