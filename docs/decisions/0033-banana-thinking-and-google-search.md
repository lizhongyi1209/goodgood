# ADR 0033: Configure Nano Banana 2 thinking and Google Search

- Status: Accepted
- Date: 2026-09-08
- Refines: ADR 0003, ADR 0004, ADR 0025, and ADR 0032
- Related tasks: GG-012, GG-016
- Amended: 2026-09-08 by GG-016

## Context

Nano Banana 2 currently requests only the image response modality and has no
product control for the provider's thinking level or Google Search grounding.
The original GG-012 decision exposed both provider settings as model-specific
controls. GG-016 removes thinking level as a creator choice and makes high
thinking the server-owned default, while retaining Google Search as an explicit
creator setting. Persisted request values still belong to immutable generation
snapshots so historical jobs and retries remain reproducible.

## Decision

- Nano Banana 2 requests `response_modalities: ["TEXT", "IMAGE"]` for every
  upstream task, including each task in a multi-output GoodGood batch.
- New Nano Banana 2 composer state and requests use internal thinking value
  `high`, which sends the top-level provider field `thinking_level: "high"`.
  Thinking level is not shown in creation settings or image detail and is not a
  creator-selectable parameter.
- Its Google Search domain is boolean, presented as a `关闭 / 开启` segmented
  control that defaults to off. False
  omits the provider field; true sends top-level `google_search: true`.
- The Google Search control renders only for Nano Banana 2. GPT IMAGE 2 rejects
  enabled or non-default Banana-only settings and never forwards them upstream.
- Generation records retain the model-independent domain value so historical
  jobs remain reproducible; low historical retries continue to omit the provider
  field. Existing project/draft columns remain compatible, while restoring an
  active Nano composer normalizes it to the new internal `high` default.
- Provider-returned text is not an Asset and is not exposed in this slice. The
  existing success contract continues to require the expected image count.

## Consequences

- New default Nano requests explicitly use high thinking; Google Search remains
  off until the creator enables it.
- High thinking is an internal frozen request value and may change provider
  latency or behavior without changing GoodGood credit pricing.
- Future models must define their own capability and provider mapping instead of
  inheriting these Nano-specific fields from Chinese UI labels.
- This ADR authorizes local implementation and verification only. Production
  deployment and real billable validation remain separate approvals.
