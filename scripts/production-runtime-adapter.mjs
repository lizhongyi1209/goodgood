import { PRODUCTION_INFRASTRUCTURE_PROFILE_ID } from "./production-infrastructure-profile.mjs";

export const PRODUCTION_RUNTIME_ADAPTER_ID =
  "nginx-compose-blue-green-v1";

const SLOT_BLUE = Object.freeze({
  id: "blue",
  composeProject: "goodgood-production-blue",
  webPort: 3100,
  workerHealthPort: 3101,
});

const SLOT_GREEN = Object.freeze({
  id: "green",
  composeProject: "goodgood-production-green",
  webPort: 3200,
  workerHealthPort: 3201,
});

export const PRODUCTION_RUNTIME_ADAPTER = Object.freeze({
  id: PRODUCTION_RUNTIME_ADAPTER_ID,
  infrastructureProfile: PRODUCTION_INFRASTRUCTURE_PROFILE_ID,
  applicationHost: "single-linux-origin",
  edge: "alibaba-esa",
  proxy: "nginx",
  publicIngress: "nginx-only",
  releaseLockFile: "/run/lock/goodgood-production-release.lock",
  releaseStateDirectory: "/var/lib/goodgood/production",
  slots: Object.freeze([SLOT_BLUE, SLOT_GREEN]),
  stateBoundary: Object.freeze([
    "external-postgresql",
    "external-valkey",
    "private-r2",
  ]),
  trafficSwitch:
    "same-filesystem-atomic-nginx-upstream-replace-config-test-and-reload",
  workerHandoff:
    "single-active-worker-stop-active-start-candidate-restore-prior-on-failure",
  schemaRollback: "forbidden-forward-fix-only",
});

export const PRODUCTION_RELEASE_STEPS = Object.freeze([
  Object.freeze({
    id: "lock-and-snapshot-active",
    mutation: "host-control-state",
    purpose:
      "Acquire the exclusive release lock and retain the active slot, digest, configuration, and prior upstream bytes.",
  }),
  Object.freeze({
    id: "stage-inactive-web",
    mutation: "inactive-application-slot",
    purpose:
      "Start the exact candidate web process on the inactive loopback slot while its worker remains stopped.",
  }),
  Object.freeze({
    id: "migrate-forward-once",
    mutation: "production-database",
    purpose: "Run the reviewed additive migration exactly once without a downgrade path.",
  }),
  Object.freeze({
    id: "verify-isolated-candidate",
    mutation: "none",
    purpose:
      "Recheck candidate live, ready, synthetic, queue, database, and credit invariants before worker or traffic handoff.",
  }),
  Object.freeze({
    id: "handoff-single-worker",
    mutation: "production-worker",
    purpose:
      "Stop the active worker with bounded grace, start the candidate worker, and restore the prior worker if readiness fails.",
  }),
  Object.freeze({
    id: "switch-nginx-upstream",
    mutation: "production-traffic",
    purpose:
      "Atomically replace the root-owned Nginx upstream, validate configuration, and reload only after every prior check passes.",
  }),
  Object.freeze({
    id: "verify-public-and-invariants",
    mutation: "none",
    purpose:
      "Verify public synthetic requests and queue, database, and credit fingerprints after the traffic switch.",
  }),
  Object.freeze({
    id: "observe-or-revert-slot",
    mutation: "conditional-production",
    purpose:
      "Observe the promoted slot or restore the retained upstream and prior worker without downgrading the schema.",
  }),
]);
