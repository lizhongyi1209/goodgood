# GG-114 — Reusable private image delivery

- Status: local code and gate verified; runtime checkpoint pending; not deployed.
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
- Runtime checkpoint switch pending; GG-113 services remain running until GG-114
  is built and verified.

## 下一步

Complete the common API, run the local gate, update the exact checkpoint, and
verify that 5173 and 32131 serve it while keeping the real-provider Worker off.
