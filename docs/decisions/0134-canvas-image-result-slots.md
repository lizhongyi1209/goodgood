# ADR 0134: Stable canvas image result slots and individual retries

- Status: Accepted for GG-321 source implementation
- Date: 2026-10-03
- Task: GG-321

The owner requires every requested image to retain a visible, individually
controllable position, including partial concurrency failures. A request for four
images expands to four slots: successful images remain usable; failed slots show
a centered retry action. Completion order, failure and manual retry never compact
or reorder siblings. Prompt-group order and requested-image order are stable.

For newly submitted canvas batches, use independent durable single-image jobs per
requested position, preserving frozen prompt/reference/settings and existing
authoritative single-image pricing, reservations and failed-job releases. The
composer displays the aggregate quote for the actual requests. This supersedes
ADR0131's single multi-image job per prompt segment for new canvas submissions;
other creation surfaces and upstream routing/retry policies are unchanged.
Seedream native layer outputs retain their existing model semantics and do not
create additional billed slot requests. No new batch/concurrency limit is added.

Failed/unknown submissions also retain their positions. Only an explicit click
retries the chosen slot; accepted active jobs resume without resubmission. Reuse
existing idempotency where available, and keep uncertainty visible when a POST
may have been accepted. Never automatically repeat an uncertain paid request.
Each retry uses its frozen input with count1 and an authoritative single-image
quote; successful siblings and output identity remain unchanged.

Persist slot order and accepted job/output association through the existing canvas
JSON document, with bounded validation and owner/workspace resource checks. Keep
legacy jobId/jobIds and multi-image snapshots readable. Unaccepted local IDs never
become trusted durable IDs. Preserve failures through local/cloud restore where
applicable, and surface any cloud write requirement on old Web explicitly.
Image detail, crop, references and connection results use the owning job/output,
never a compacted success index. No SQL schema or synthetic aggregate job.

This is code-only delivery. New validation, if needed, requires a separately
authorized Web activation. No builds/checks, tests, browser acceptance, provider
requests, runtime changes or production deployment run in this task.
