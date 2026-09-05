export const PRODUCTION_INFRASTRUCTURE_PROFILE_ID =
  "alibaba-managed-state-v1";

export const PRODUCTION_INFRASTRUCTURE_PROFILE = Object.freeze({
  id: PRODUCTION_INFRASTRUCTURE_PROFILE_ID,
  status: "selected-not-provisioned",
  provider: "alibaba-cloud",
  region: Object.freeze({
    status: "blocked-on-icp-domain-placement",
    stagingRegion: "china-hong-kong",
    productionRegion: null,
    rule:
      "application-rds-and-tair-share-one-selected-region-and-vpc-after-icp-review",
  }),
  applicationHost: Object.freeze({
    service: "ecs",
    architecture: "linux-amd64",
    operatingSystem: "ubuntu-24.04-lts",
    billing: "pay-as-you-go-through-rehearsal",
    instanceClass: "current-generation-x86-general-purpose",
    minimumVcpu: 4,
    minimumMemoryGiB: 16,
    minimumSystemDiskGiB: 100,
    systemDiskClass: "essd",
  }),
  postgresql: Object.freeze({
    service: "apsaradb-rds-for-postgresql",
    engineVersion: "17",
    edition: "high-availability",
    topology: "primary-standby-prefer-multi-zone",
    minimumVcpu: 2,
    minimumMemoryGiB: 4,
    minimumStorageGiB: 50,
    storageClass: "essd",
    privateEndpointOnly: true,
    nativeBackupIsSoleRecoveryCopy: false,
    requiredRpoMinutes: 60,
    requiredRtoMinutes: 240,
  }),
  queue: Object.freeze({
    service: "tair-redis-oss-compatible",
    architecture: "standard-master-replica",
    minimumMemoryGiB: 1,
    privateEndpointOnly: true,
    authoritativeState: false,
  }),
  network: Object.freeze({
    databasePublicEndpoint: false,
    queuePublicEndpoint: false,
    originIngress: "nginx-only",
    stateAccess: "application-security-group-over-private-vpc-only",
  }),
  authorization: Object.freeze({
    purchaseAuthorized: false,
    productionDeploymentAuthorized: false,
    executableReleaseAdapterAuthorized: false,
  }),
});
