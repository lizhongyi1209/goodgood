# GG-114 — Reusable private image delivery

- Status: local code, gate, and runtime HTTP verified; not deployed.
- Baseline: GG-113 `1ecbc1c`; branch `feature/GG-114-reusable-image-delivery`;
  worktree `F:/goodgood-worktrees/GG-114`.
- Decision: [ADR 0101](../decisions/0101-private-card-image-previews.md) remains in force.

## Scope and acceptance

Make the GG-113 private thumbnail behavior reusable for future image surfaces,
including a free canvas. Provide one stable URL helper shared by browser and
server, and one server preview method for the currently approved 512 px WebP
card preset. Asset and reference routes retain their own owner/workspace and
visibility checks, then call the common method. Both routes support transformed
bytes and short-lived signed OSS redirects. Full image editing/detail continues
through an explicit content URL. No canvas, new image sizes, storage writes,
database changes, paid generation, or production deployment are in scope.

Document the reusable entry points and a design review rule: before new feature
work, inspect adjacent flows for stable shared behavior; extract a small common
boundary when at least two concrete callers use it. Use classes only for real
state or lifecycle, not to wrap stateless helpers.

## Verification and handoff

- URL, Sharp, signed OSS transform, owner route, and presentation tests pass.
  `npm run check:local`: 590 tests, 564 passed, 26 isolated skips, 0 failed;
  lint has 16 existing warnings and no errors. The first parallel gate had a
  transient timeout in an unchanged O1Key polling test; that test passed alone
  and the complete gate passed on repeat.
- First GG-114 runtime checkpoint `4e55a36` built and verified. 32131 Web and
  5173 Vite run from this worktree; `/create`, readiness, and proxied version
  return 200, with the Web revision matching the verified build. Anonymous
  asset/reference preview GETs return 401. Local cloud and real SMTP config
  remain attached; 32142 real-provider Worker remains stopped. Any later
  documentation commit requires a new build and Web restart at that exact HEAD.

## 下一步

Keep 5173 and 32131 open for the operator to check image card transfer sizes,
picker selection, and focused original details. A future free canvas should
use the shared URL helper and owner-checked preview first; define a new named
size only after its zoom and detail needs are known.
