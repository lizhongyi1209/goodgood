# ADR 0033: Add Nano Banana 2 thinking and Google Search controls

- Status: Accepted
- Date: 2026-09-08
- Refines: ADR 0003, ADR 0004, ADR 0025, and ADR 0032
- Related task: GG-012

## Context

Nano Banana 2 currently requests only the image response modality and has no
product control for the provider's thinking level or Google Search grounding.
The creator requested two model-specific controls while keeping the fast path
quiet by default. These values affect reproducibility, so they must belong to
the immutable generation snapshot rather than exist only as transient UI state.

## Decision

- Nano Banana 2 requests `response_modalities: ["TEXT", "IMAGE"]` for every
  upstream task, including each task in a multi-output GoodGood batch.
- Its product thinking domain is `low | high`, presented as `低 / 高`. `low` is
  the default and omits the provider field. `high` sends the top-level provider
  field `thinking_level: "high"`.
- Its Google Search domain is boolean, presented as a `关闭 / 开启` segmented
  control that defaults to off. False
  omits the provider field; true sends top-level `google_search: true`.
- The controls render only for Nano Banana 2. GPT IMAGE 2 rejects enabled or
  non-default Banana-only settings and never forwards them upstream.
- Generation batches, projects, and the authenticated root draft persist the
  model-independent domain values so a restored session and retry reproduce the
  submitted choice. Existing rows migrate to `low` and false.
- Provider-returned text is not an Asset and is not exposed in this slice. The
  existing success contract continues to require the expected image count.

## Consequences

- Default Nano requests change only their response modality list; thinking and
  search remain provider-default/off because absent fields are not serialized.
- High thinking or search grounding is an explicit frozen choice and may change
  provider latency or behavior without changing GoodGood credit pricing.
- Future models must define their own capability and provider mapping instead of
  inheriting these Nano-specific fields from Chinese UI labels.
- This ADR authorizes local implementation and verification only. Production
  deployment and real billable validation remain separate approvals.
