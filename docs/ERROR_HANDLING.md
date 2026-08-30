# Error handling and recovery

## Principles

- Tell the user what failed, what was preserved, and the next useful action.
- Place persistent failure beside the task/result it belongs to.
- Never expose raw provider payloads, stack traces, credentials, bucket keys, or
  internal hostnames to the user.
- Every server error has a normalized code and request/job ID for support.

## Error categories

| Category | Example code | UI placement | Default recovery |
| --- | --- | --- | --- |
| Input | `INVALID_PROMPT` | Composer field/toast | Focus and correct |
| Reference upload | `UPLOAD_TYPE_INVALID` | Reference tray item | Remove/replace |
| Quota | `INSUFFICIENT_POINTS` | Submission action | Explain and manage plan |
| Provider timeout | `MODEL_TIMEOUT` | Failed batch in stream | Retry |
| Provider rejected | `MODEL_REJECTED` | Failed batch in stream | Edit prompt/settings |
| Rate/capacity | `CAPACITY_BUSY` | Failed/pending batch | Backoff retry |
| Persistence | `SAVE_FAILED` | Affected asset/project | Retry without clearing |
| Authentication | `SESSION_EXPIRED` | Global blocking state | Sign in, restore draft |
| Unknown | `INTERNAL_ERROR` | Affected operation | Retry + request ID |

## Generation failure contract

The failed batch remains visible in the active result region as a compact inline
status strip. It does not enter or redistribute the completed-image masonry.
The strip contains:

- Short title, useful explanation, requested/failed count, normalized error
  code, and job ID.
- `重新生成` using the preserved immutable input snapshot rather than the
  current composer draft.
- `修改设置` restoring a mutable copy of that snapshot before returning to the
  parameter drawer.

For a full-batch failure, show one strip rather than one repeated error per
requested output. If results are partial, successful assets remain available
and the strip summarizes completed versus failed outputs.

A toast may announce a transient validation problem, but must not replace this
panel for asynchronous generation failure.

The M3 mock contract maps a provider rejection to `MODEL_REJECTED`, a bounded
poll deadline to `MODEL_TIMEOUT`, provider reachability/capacity to
`CAPACITY_BUSY`, and malformed provider results to `INTERNAL_ERROR`. Database,
queue, and object-storage diagnostics remain server-side. Queue dispatch failure
leaves the committed outbox row pending; an object-storage failure leaves the
non-terminal job and attempt evidence recoverable for worker reconciliation.

## API error envelope

Target response shape:

```json
{
  "error": {
    "code": "MODEL_TIMEOUT",
    "message": "本次生成未完成，请重试。",
    "retryable": true,
    "requestId": "req_...",
    "jobId": "job_..."
  }
}
```

Log the internal cause server-side with the same request/job IDs. Keep user copy
stable even if provider wording changes.

## Idempotency and retries

- Submission carries an idempotency key so network retry does not create a
  duplicate paid job.
- Automatic retries are bounded, exponential, and limited to retryable failures.
- User retry creates a visible new attempt linked to the previous failure.
- Asset and project save operations are idempotent.

In the current M3 implementation, user retry is represented by a new durable
job linked with `retry_of_job_id`; the backend copies the failed snapshot rather
than trusting a browser-resubmitted replacement. Provider fallback within one
job is deferred to the real gateway milestone.
