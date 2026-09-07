# ADR 0026: Repository-owned session continuity and isolated feature work

- Status: Accepted
- Date: 2026-09-07
- Refines: ADR 0005 and ADR 0021 delivery workflow, not runtime topology

## Context

The operator will request frequent improvements in new conversation windows.
Chat history and compression are unreliable project memory. The 2,881-line
implementation log, stale prototype entry points, and 118 deferred C6 working
changes obscured the deployed baseline and could contaminate future releases.
The operator approved organizing the repository and distilling unused history.

## Decision

- Keep stable constraints in root `AGENTS.md`; all agent entry adapters point
  there. Keep observed deployment facts in `docs/CURRENT_STATE.md`, process in
  `docs/WORKFLOW.md`, and one concise delivery checkpoint in the implementation
  plan. A short backlog indexes task cards; do not duplicate detailed status.
- A natural-language request is sufficient. The agent restores repository and
  Git context, allocates a task ID, records acceptance criteria, and implements
  on an isolated branch. Do not require the operator to prepare handoff essays.
- Record consequential user decisions, evidence, unresolved failures, and the
  exact next step during work and before a pause/compaction. Never depend on
  the final chat reply being available to the next session.
- `main` is the reviewed integration baseline. It may be ahead of production;
  only the recorded immutable release identity plus host evidence identifies
  production. Commit, merge, CI success, image publication, and live deployment
  are distinct events. No standing live authority is inferred from old chats.
- Preserve deferred work on a named archive branch and separate worktree.
  Resuming requires a new explicit task; do not merge it with unrelated work.
- Archive the full historical log unchanged behind a lazy-read index. Retain
  operational runbooks, decision rationale, tests, and recoverable source.
  Do not delete user data, secrets, backups, or ignored working directories.
- Keep existing local-first validation and exact-digest promotion. Improve the
  repeatable release tooling separately if the clean baseline is missing a
  reviewed operator tool; never substitute a full-readiness claim for alpha.

## Consequences

- New sessions can load a small, versioned context set and verify it against
  source/Git facts. This reduces mistakes; it is not a guarantee that every
  model or a conversation outside this repository automatically has context.
- Per-task notes make interrupted and parallel work resumable without turning
  the main plan into another chronological transcript.
- Documentation checks protect discoverability and size, not factual truth.
  Agents must still inspect code and refresh live evidence when relevant.
- This task changes documentation/continuity verification only. It authorizes
  no production deployment, migration, generation, or account mutation.
