# ADR 0018: Alibaba Cloud managed production state baseline

- Status: Accepted
- Date: 2026-09-05
- Superseded in part by: ADR 0019 for the selected Hong Kong
  `productionRegion` and invitation-only launch sequence
- Superseded in part by: ADR 0021 for the initial unpaid seed-production
  topology; this managed profile remains the future scale-out target

## Context

ADR 0017 fixes the production application release mechanics but deliberately
leaves the host capacity, region, PostgreSQL, and Redis-compatible service
unselected. An executable release adapter cannot be reviewed until those
boundaries are explicit. The M7 Hong Kong Simple Application Server remains a
test-data staging host; its colocated PostgreSQL and Valkey topology is not a
paid-production durability design.

The current CI workflow publishes one image without a multi-platform build, so
the repository has no evidence that its immutable candidate supports ARM. The
blue/green adapter can temporarily run two Web processes, one Worker, Nginx,
Docker, and the delegated telemetry collector on one application host. Its
database pool currently permits ten connections per Web or Worker process.

Alibaba Cloud documents that a regular website ICP filing requires a server in
mainland China, while the existing accepted control-plane direction is Hong
Kong. A Hong Kong purchase therefore cannot itself satisfy the production
domain's filing prerequisite. Choosing Hong Kong production or moving the
production control plane to mainland China would change the domain/network
assumptions and must not be inferred from this infrastructure selection.

Relevant vendor facts were checked on 2026-09-05:

- [Alibaba Cloud ICP filing requirements](https://www.alibabacloud.com/help/en/icp-filing/basic-icp-service/product-overview/icp-filing-requirements-for-a-regular-website)
- [ECS general-purpose x86 instance families](https://www.alibabacloud.com/help/en/ecs/user-guide/general-purpose-instance-families)
- [RDS PostgreSQL product editions](https://www.alibabacloud.com/help/en/rds/apsaradb-rds-for-postgresql/product-editions)
- [RDS PostgreSQL instance specifications](https://www.alibabacloud.com/help/en/rds/apsaradb-rds-for-postgresql/primary-apsaradb-rds-for-postgresql-instance-types)
- [Tair standard master-replica architecture](https://www.alibabacloud.com/help/en/redis/product-overview/standard-master-replica-instances)
- [Tair private and public endpoints](https://www.alibabacloud.com/help/en/redis/user-guide/view-endpoints)

## Decision

Select infrastructure profile `alibaba-managed-state-v1` for initial paid
production, without provisioning it:

- run ADR 0017's Nginx/Compose application slots on one Alibaba Cloud ECS
  x86_64 Linux host with Ubuntu 24.04 LTS, at least 4 vCPUs, 16 GiB memory, and
  a 100 GiB ESSD system disk. Use a current-generation general-purpose x86
  family and pay-as-you-go billing through rehearsal; check regional inventory
  and price again before purchase;
- use ApsaraDB RDS for PostgreSQL 17 High-availability Edition with a
  primary/standby topology, preferably split across zones, at least 2 vCPUs,
  4 GiB memory, and 50 GiB ESSD. Basic Edition is not an allowed production
  fallback;
- use a 1 GiB minimum Tair Redis OSS-compatible standard master-replica
  instance for queue delivery and coordination. PostgreSQL remains
  authoritative, and the queue must remain reconstructable from its outbox;
- place ECS, RDS, and Tair in the same selected region and VPC. RDS and Tair use
  private endpoints only and accept traffic only from the application security
  group. Do not request public database or queue endpoints;
- enable RDS data/log backup and point-in-time recovery at a cadence that can
  meet the one-hour RPO. Native same-service backups are not the sole recovery
  copy: ADR 0015 still requires a separately encrypted, off-host recovery
  repository, a four-hour restore objective, and the full retention set;
- retain private Cloudflare R2 for image bytes. Neither application slots nor
  the ECS system disk own durable user state;
- leave `productionRegion` unset until the ICP-filed domain and access topology
  are reviewed. Hong Kong remains the accepted staging/control-plane direction.
  Moving paid production to mainland China requires a new ADR and repeated
  network, callback, security, and release evidence.

The checked-in profile is declarative and non-executable. It explicitly grants
no purchase, production deployment, or executable-adapter authority.

## Consequences

- M8 now has a concrete host floor and managed PostgreSQL/queue boundary for
  capacity estimates, firewall review, and release rehearsal design.
- The application host remains a single availability boundary. RDS and Tair
  failover improve state availability but do not make the Web origin
  multi-host.
- Exact region, zone pair, SKU code, price, quota, VPC identifiers, and
  credentials remain operator-time facts outside Git and must be revalidated
  immediately before purchase.
- If the selected region cannot supply an equivalent x86 host, RDS HA, Tair
  master-replica, or private connectivity, provisioning stops; it does not
  silently choose ARM, RDS Basic Edition, a single-node queue, or public state
  endpoints.
- ADR 0017 remains non-executable until a later change supplies and rehearses
  the reviewed Compose/Nginx/locking implementation against provisioned
  no-customer infrastructure.
