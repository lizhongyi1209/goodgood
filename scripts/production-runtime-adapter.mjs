import { PRODUCTION_INFRASTRUCTURE_PROFILE_ID } from "./production-infrastructure-profile.mjs";

export const PRODUCTION_RUNTIME_ADAPTER_ID =
  "nginx-compose-single-slot-v1";

export const PRODUCTION_RUNTIME_ADAPTER = Object.freeze({
  id: PRODUCTION_RUNTIME_ADAPTER_ID,
  infrastructureProfile: PRODUCTION_INFRASTRUCTURE_PROFILE_ID,
  applicationHost: "single-linux-origin",
  edge: "alibaba-esa",
  proxy: "nginx",
  publicIngress: "nginx-only",
  composeProject: "goodgood-production",
  webPort: 3100,
  workerHealthPort: 3101,
  releaseLockFile: "/run/lock/goodgood-production-release.lock",
  releaseStateDirectory: "/var/lib/goodgood/production",
  stateBoundary: Object.freeze([
    "host-colocated-postgresql",
    "host-colocated-valkey",
    "private-r2",
  ]),
  ingressRouting: "fixed-nginx-upstream",
  maintenance: "root-owned-maintenance-marker-during-in-place-replacement",
  workerHandoff:
    "single-active-worker-drain-stop-replace-start-and-restore-prior-on-failure",
  schemaRollback: "forbidden-forward-fix-only",
});

export const PRODUCTION_RELEASE_STEPS = Object.freeze([
  Object.freeze({
    id: "lock-and-snapshot-active",
    mutation: "host-control-state",
    purpose:
      "Acquire the exclusive release lock and retain the current image, configuration, and prior application state.",
  }),
  Object.freeze({
    id: "enter-maintenance",
    mutation: "production-ingress",
    purpose:
      "Enable the reviewed root-owned maintenance marker before stopping the single application slot.",
  }),
  Object.freeze({
    id: "prepare-single-slot-image",
    mutation: "single-application-slot",
    purpose:
      "Drain and stop the current Web and Worker, pull the exact immutable candidate image, and keep the replacement stopped in the fixed Compose project.",
  }),
  Object.freeze({
    id: "migrate-forward-once",
    mutation: "production-database",
    purpose: "Run the reviewed additive migration exactly once without a downgrade path.",
  }),
  Object.freeze({
    id: "start-and-verify-single-slot-web",
    mutation: "single-application-slot",
    purpose:
      "Start the replaced Web and verify live, ready, database, queue, and credit invariants before starting the Worker.",
  }),
  Object.freeze({
    id: "start-single-worker",
    mutation: "production-worker",
    purpose:
      "Start the only production Worker after the Web checks and restore the prior application image if readiness fails.",
  }),
  Object.freeze({
    id: "verify-public-and-open",
    mutation: "production-ingress",
    purpose:
      "Verify the fixed Nginx upstream and public synthetic behavior, then remove the maintenance marker through the reviewed host procedure.",
  }),
  Object.freeze({
    id: "verify-public-and-invariants",
    mutation: "none",
    purpose:
      "Verify public synthetic requests and queue, database, and credit fingerprints after the replacement.",
  }),
  Object.freeze({
    id: "observe-or-restore-image",
    mutation: "conditional-production",
    purpose:
      "Observe the replaced application or restore the prior image and Worker in the same Compose project without downgrading the schema.",
  }),
]);
