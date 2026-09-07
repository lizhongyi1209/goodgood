# GoodGood repository instructions

Read `/AGENTS.md` before proposing or editing code. Follow its document routing
table and product invariants. Treat `docs/` as product memory and update the
relevant document or ADR when a confirmed decision changes.

Restore context through `docs/CURRENT_STATE.md`, `docs/WORKFLOW.md`,
`docs/IMPLEMENTATION_PLAN.md`, `docs/BACKLOG.md`, and the active task card.
Inspect Git status and the actual worktree before editing. Update the task's
verification and next step before handoff; do not rely on conversation memory.

Production is a real, owner-reviewed controlled alpha. Local changes and parked
C6 work are not automatically deployed. Never place provider credentials or
production data in client code, examples, tests, or commits. Live actions need
the task's appropriate approval; old chat or branch names do not grant it.
