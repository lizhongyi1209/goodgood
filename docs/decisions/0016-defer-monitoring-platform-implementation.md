# ADR 0016: Defer monitoring-platform implementation

- Status: Accepted
- Date: 2026-09-04
- Supersedes: ADR 0015 only for the selected observability vendor, collector,
  notification transport, and their implementation order

## Context

ADR 0015 selected Grafana Cloud, Alloy, and a WeCom contact point as the first
monitoring implementation. The operator has assigned data monitoring to a
separate agent and asked the GoodGood delivery path to continue with the later
M8 security/compliance and production-release work instead.

The already implemented server-owned request/support ID and redacted structured
Web/Worker events are useful independent of a monitoring vendor. Production
must still fail closed when monitoring ownership or evidence is missing, even
though this repository slice will not provision or configure the monitoring
platform.

## Decision

Defer Grafana Cloud, Alloy, WeCom, and all monitoring-platform configuration to
the separately assigned monitoring agent. Do not add another alert transport,
SMTP path, collector, dashboard, or vendor credential in the current GoodGood
implementation.

Keep ADR 0015's request/support correlation, telemetry data exclusions,
production recovery objectives, and exact-digest release gate. Make the
production gate vendor-neutral: it requires a current `monitoring-handoff`
evidence item that identifies an accountable owner and confirms external
availability, required signal coverage, retention, alert delivery, and incident
recovery evidence. The gate does not accept a vendor name, configuration file,
or locally visible journal as a substitute for that evidence.

Continue M8 with the security/compliance evidence contract and fail-closed
paid-production gate. ICP/domain and domestic Alipay prerequisites remain
external blockers for checkout, not reasons to weaken or bypass the gate.

## Consequences

- GoodGood application work can continue without choosing or installing a
  monitoring platform in this slice.
- The external monitoring agent can consume the stable request, owner, job,
  provider task, latency, and credit correlation already emitted by GoodGood.
- Paid production remains blocked until monitoring handoff evidence passes;
  delegation is not equivalent to verification.
- If the external agent later selects a materially different data boundary or
  changes what GoodGood logs, that change requires another reviewed ADR and
  matching tests before application changes.
