# ADR 0004: Separate control and generation planes

- Status: Accepted
- Date: 2026-08-28

## Context

Most customers are expected in China while the existing 32 GB generation server
is in the United States. Peak generation work is asynchronous, roughly 50–80
concurrent tasks. The web application needs responsive domestic access without
moving GPU/model execution into the app node.

## Decision

Use Alibaba ESA at the edge, a Hong Kong application/control plane, the existing
US OVH generation service, and direct object-storage transfer for large image
bytes. Start with a small app node only if builds run in CI and state is durable.

## Consequences

- Job orchestration and provider execution have separate failure domains.
- Browser never receives provider credentials.
- Image bandwidth should not consume the application server allowance.
- Scaling the app node and scaling generation capacity are independent.
