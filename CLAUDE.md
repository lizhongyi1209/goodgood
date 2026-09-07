# GoodGood / Claude entry

Read `AGENTS.md` completely before taking action. It is the stable, canonical
agent contract for this repository.

Then read `docs/CURRENT_STATE.md`, `docs/WORKFLOW.md`,
`docs/IMPLEMENTATION_PLAN.md`, `docs/BACKLOG.md`, and the active task card.
Inspect Git before editing. Load topic documents only as needed. Keep detailed
progress in the task card so a new window can resume without this chat.

For substantial work:

1. Describe the affected product invariant and current implementation.
2. Separate confirmed behavior from proposals.
3. Update or add an ADR when changing a confirmed decision.
4. Implement the smallest coherent change.
5. Run `npm run check:local` and report exact failures.

Actual production identity and deferred work are recorded in CURRENT_STATE.
Never infer that a local change is deployed or restore historical C6 work
without an explicit task. Follow the root contract's local/live authority split.
