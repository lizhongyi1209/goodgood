# GoodGood / Claude entry

Read `AGENTS.md` completely before taking action. It is the stable, canonical
agent contract for this repository.

Then read only the task-specific documents routed from `AGENTS.md`. Do not
duplicate those rules here and do not treat older chat context or screenshots
as more authoritative than the repository.

For substantial work:

1. Describe the affected product invariant and current implementation.
2. Separate confirmed behavior from proposals.
3. Update or add an ADR when changing a confirmed decision.
4. Implement the smallest coherent change.
5. Run `npm run check:local` and report exact failures.

The current app is a frontend prototype. Do not invent a production API,
database schema migration, billing path, or authentication behavior without an
explicit approved task and the matching architecture documentation update.
