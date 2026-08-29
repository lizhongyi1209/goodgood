# ADR 0005: Local-first container delivery and staged promotion

- Status: Accepted
- Date: 2026-08-29

## Context

GoodGood is moving from a Windows-developed interactive prototype to a paid
service deployed in Hong Kong. Delaying all environment verification until a
production server exists would make Linux, networking, secrets, persistence,
and rollback failures appear too late. Building separately on each environment
would also make staging an unreliable predictor of production.

## Decision

Develop local-first with Docker Desktop's Linux runtime and Docker Compose for
production-shaped dependencies. Introduce container verification during the
first backend milestones, not after feature completion.

Initially build one application image and run web/API and job-worker processes
from that image with different commands. PostgreSQL, Redis-compatible job
coordination, object storage, secrets, logs, and user data remain outside the
image.

CI builds and verifies one immutable Linux image. The exact image is promoted
to an isolated Hong Kong staging environment and only then to production.
Production servers pull artifacts; they do not build from source. Kubernetes
and speculative microservice decomposition are out of scope until measured
scale or reliability needs justify them.

## Consequences

- Local development can prove most business and failure behavior without
  purchasing permanent production infrastructure.
- A small paid staging environment is still required for public networking,
  cross-border, cloud-permission, callback, storage, payment, and recovery
  verification.
- The application and worker can scale independently later without splitting
  the repository or duplicating images now.
- Local Compose services are conveniences, not production data stores or
  backups.
- Release automation must record the image revision, migration version, and
  runtime configuration version.
