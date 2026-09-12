# ADR 0054 — Remove composer batch summary

- Status: Accepted
- Date: 2026-09-13
- Task: GG-041

The owner removes the additional batch-prompt summary from both image and video
composers because the existing credit position already communicates the total.
This supersedes only ADR 0053's summary row; delimiter parsing, count product,
concurrency, quote arithmetic, validation and recovery remain unchanged.
Do not introduce video pricing or replacement batch copy in this change.
