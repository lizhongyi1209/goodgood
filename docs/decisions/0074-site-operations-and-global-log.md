# ADR 0074: Site-owner operations dashboard and global log

- Status: Accepted
- Date: 2026-09-14
- Task: GG-071

The owner requests daily operating visibility and cross-user charge lookup.
Extend ADR 0067's same-shell management functions with `/admin/operations` and
`/admin/logs`. Keep account audit separate. This does not resume GG-901 monitoring.

Read authoritative persisted generation jobs and both personal and organization
credit ledgers. Dashboard covers Shanghai calendar dates, submitted jobs/users,
terminal outcomes by completion date, new users and actual settlement/refund
events. Settlement is counted once, never reserve plus settle. Historical
`credit` amounts convert by two; `credit-cny-cent` is 100 credits/CNY. Credit
equivalents are not cash revenue. Current video preview has no durable job or
ledger and is explicitly excluded; do not fabricate token or video usage.

Global log has task and ledger tabs, email/task/batch ID, calendar range, state
or event filtering, bounded keyset pages and same-page detail Sheet. Task detail
links the immutable submitted parameters and reserve/settle/release/refund
timeline. Enterprise task consumption belongs to its actual creator; grants
without a member belong to the enterprise fund. No raw provider errors, prompts,
private URLs, credentials, payment references or arbitrary metadata are returned.

Three same-origin POST read endpoints reuse session/site-owner and CSRF gates.
Search stays in bodies, never URLs. No migration, billing writes, paid requests,
exports, deployment or infrastructure monitoring are included.
