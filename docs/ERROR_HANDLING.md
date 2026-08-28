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

The failed result slot remains visible with:

- Short title, useful explanation, normalized error code, and job ID.
- `重新生成` using the preserved immutable input snapshot.
- `修改设置` returning to the parameter drawer without clearing state.

A toast may announce a transient validation problem, but must not replace this
panel for asynchronous generation failure.

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
