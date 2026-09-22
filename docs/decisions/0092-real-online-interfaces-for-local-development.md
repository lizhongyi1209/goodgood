# ADR 0092: Real online interfaces for local development

- Status: Accepted
- Date: 2026-09-23
- Task: GG-101

## Context

GoodGood had two conflicting local paths: the preserved checkpoint launcher
used O1Key by default for its Worker, while the ordinary Compose development
stack used a mock provider. A feature could therefore pass against a local
protocol substitute and still encounter provider transport, authentication, or
response differences only during production promotion.

The goal is to minimize that promotion gap without copying production state or
allowing deterministic tests to incur external cost.

## Decision

Every runnable local development environment uses the real online interface for
each production-bound integration that is enabled in the product. For the
current image-generation path this means:

- Web and Worker use the real O1Key endpoint;
- credentials are dedicated development credentials, stored outside the Git
  checkout and mounted from a file;
- startup fails closed when the credential is absent, invalidly located, empty,
  or multiline; there is no development-runtime fallback to mock;
- PostgreSQL, Valkey, RustFS, queues, identities, and user assets remain local
  and isolated; production credentials, production databases, R2 data, queues,
  and user records are forbidden locally;
- real generation calls are billable and use the development account/budget.

Mock interfaces remain available only in explicitly named isolated automated
test stacks with separate Compose projects and volumes. Those stacks use synthetic data and must not share a database or
queue with a real-provider Worker. `check:local`, fixtures, and deterministic
failure/retry tests never call a billable provider.

UI-only rendering and unit tests are not runnable integration environments and
do not require external credentials. This decision also does not enable an
unfinished product integration: Seedance durable jobs, billing, and assets stay
disconnected until a separate product decision authorizes them.

## Consequences

- Local integration exercises the same provider transport and authentication
  boundary as production, reducing release-only surprises.
- Developers need a dedicated online-development credential before starting a
  durable local runtime, and real generations have real cost.
- Deterministic test commands are visibly separate from development commands;
  using a mock is evidence for code behavior, not evidence for online-provider
  compatibility.
- Production data isolation remains unchanged and cannot be relaxed in the name
  of environment parity.
