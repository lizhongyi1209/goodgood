# ADR 0008: Accept O1Key at-most-once submission recovery for the MVP

- Status: Accepted
- Date: 2026-09-02

## Context

GoodGood's M5 image route submits paid asynchronous work to O1Key
`POST /async/v1/generateImage`. O1Key confirmed that this endpoint does not
support `Idempotency-Key`, `client_request_id`, lookup by a client-owned request
identifier, or a callback that can recover a task whose submission response was
lost. Repeating the same request creates a new `task_id` and a separately
charged task. `X-Oneapi-Request-Id` is trace evidence only and cannot retrieve
the task. A returned `task_id` remains queryable, but successful or failed
result data and temporary files are retained for 24 hours by default.

The operator accepts this duplicate-cost limitation for the narrow MVP. New
API's usage record is the operational source for whether each upstream request
was charged or refunded; GoodGood's own versioned prices and credit ledger are
still deferred to M6.

## Decision

Keep GoodGood's owner-scoped browser/API idempotency, but do not claim
end-to-end exactly-once execution for the O1Key route. Each explicit user
submission or retry is a new upstream request and may create a new charge.

For O1Key only, persist the active `GenerationAttempt` as `submitted`
immediately before the billable generation POST. If a worker later reclaims an
attempt that is `submitted` but has no durable provider task ID, it must not
send another generation POST. It fails the job as `SUBMISSION_UNKNOWN` and
explains that the original request may have been accepted. The visible retry
action states that retrying creates another billable task. Reference uploads
complete before this guard because they are transfer preparation, not the
generation submission.

Once a valid `task_id` is durable, polling and worker restart recovery may
continue without creating another task. GoodGood must download and persist a
successful output within the provider's result-retention window. It must not
infer a refund from a failed or unknown generation state; charge/refund
reconciliation uses the New API usage record until the M6 ledger exists.

The mock route retains its provider idempotency behavior. GoodGood does not send
undocumented O1Key fields and does not treat `X-Oneapi-Request-Id` as a recovery
identifier.

## Consequences

- Background recovery cannot silently create a second paid O1Key task when the
  first submission outcome is unknown.
- A crash after the persisted guard but before an upstream request can produce
  a conservative false-positive `SUBMISSION_UNKNOWN`; explicit retry remains
  available and is a new billable submission.
- A request accepted upstream whose response is lost cannot be recovered and
  may remain charged without a GoodGood asset. This is an accepted MVP risk,
  not a refundable outcome inferred by GoodGood.
- End-to-end exactly-once submission remains impossible until O1Key provides a
  client idempotency or lookup contract. That limitation no longer blocks M5,
  but it remains a production cost and support constraint.
- ADR 0006 remains authoritative for GoodGood-owned pricing and ledger design;
  this decision records the narrower O1Key transport exception before M6.
