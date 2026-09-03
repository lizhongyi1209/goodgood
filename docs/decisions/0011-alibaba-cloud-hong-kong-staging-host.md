# ADR 0011: Alibaba Cloud Hong Kong host for M7 staging

- Status: Accepted
- Date: 2026-09-03

## Context

M7 requires a month-to-month Hong Kong staging control plane before paid
production. The earlier deployment direction named AWS Lightsail as the
initial candidate, but Lightsail does not publish a fixed per-bundle network
throughput commitment. The operator instead purchased an Alibaba Cloud Simple
Application Server in Hong Kong with a fixed public IPv4 address and an
explicit 200 Mbps peak public-bandwidth specification.

The purchased host is a general-purpose Linux instance with 2 vCPUs, 4 GiB of
memory, a 50 GiB ESSD system disk, BGP public networking, and Ubuntu 24.04 LTS.
It remains a staging resource: its peak bandwidth and Hong Kong BGP path are
not evidence of sustained mainland-carrier quality or paid-production
capacity.

## Decision

Use the purchased Alibaba Cloud Hong Kong Simple Application Server as the M7
staging application/control-plane host. Keep Alibaba Cloud ESA at the edge,
the existing O1Key/US generation route, immutable GHCR digest promotion, and
direct private object transfer unchanged.

Builds remain in CI. The host pulls the verified application image and may run
isolated test-data PostgreSQL, Valkey, and S3-compatible storage on the same
machine for M7 evidence. This all-in-one staging allowance does not approve the
same durability topology for paid production.

Harden the host before deployment: use key-only SSH through a non-root sudo
account, keep only SSH/HTTP/HTTPS ingress at the cloud firewall, keep runtime
ports loopback-only, store secrets outside the checkout, and take manual
snapshots around material host changes. Do not record the public IP, private
key, passwords, or live endpoint credentials in the repository.

## Consequences

- M7 cloud evidence covers Alibaba Cloud account access, lightweight-server
  firewall behavior, snapshots, and recovery instead of AWS IAM and Lightsail
  operations.
- The explicit 200 Mbps value is a peak, not a sustained service guarantee;
  China Telecom, China Unicom, and China Mobile measurements remain mandatory.
- A 2 vCPU / 4 GiB / 50 GiB host needs container memory limits, disk/log
  monitoring, and bounded staging assets.
- Production object storage, database durability, and any higher-availability
  host topology remain release decisions backed by M7 measurements.
