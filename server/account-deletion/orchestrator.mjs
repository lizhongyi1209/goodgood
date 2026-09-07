import { randomUUID } from "node:crypto";
import { runAccountDeletionCompletionPass } from "./completion-service.mjs";
import { runAccountDeletionCreativePass } from "./creative-service.mjs";
import { requireIdentityDeletionAdapter } from "./identity-adapter.mjs";
import { runAccountDeletionIdentityPass } from "./identity-service.mjs";
import {
  previewAccountDeletionLifecycle,
  runAccountDeletionWaitPass,
} from "./lifecycle-service.mjs";
import { runAccountDeletionObjectPass } from "./object-service.mjs";

const DEFAULT_RUNNERS = Object.freeze({
  completion: runAccountDeletionCompletionPass,
  creative: runAccountDeletionCreativePass,
  identities: runAccountDeletionIdentityPass,
  objects: runAccountDeletionObjectPass,
  preview: previewAccountDeletionLifecycle,
  wait: runAccountDeletionWaitPass,
});

const PHASES = Object.freeze([
  "waitForSubmittedJobs",
  "deletePrivateObjects",
  "deleteCreativeRecords",
  "deleteExternalIdentities",
  "anonymizeGoodGoodAccount",
]);

const PASS_COUNT_FIELDS = Object.freeze({
  anonymizeGoodGoodAccount: Object.freeze([
    "claimed",
    "completed",
    "deferred",
    "deletedIdentities",
    "deletedSessions",
    "failed",
    "lostLease",
  ]),
  deleteCreativeRecords: Object.freeze([
    "claimed",
    "completed",
    "deferred",
    "deletedRecords",
    "failed",
    "lostLease",
  ]),
  deleteExternalIdentities: Object.freeze([
    "claimed",
    "completed",
    "deferred",
    "deleted",
    "disabled",
    "failed",
    "identitiesClaimed",
    "lostLease",
  ]),
  deletePrivateObjects: Object.freeze([
    "claimed",
    "completed",
    "deferred",
    "deleted",
    "failed",
    "lostLease",
    "objectsClaimed",
  ]),
  waitForSubmittedJobs: Object.freeze([
    "claimed",
    "completed",
    "deferred",
    "failed",
    "lostLease",
  ]),
});

function requirePositiveInteger(value, name, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

function requireOptionalDate(value) {
  if (value !== null && (!(value instanceof Date) || Number.isNaN(value.getTime()))) {
    throw new Error("now must be null or a valid Date");
  }
  return value;
}

function requireResources(resources) {
  if (!resources?.pool) throw new Error("A PostgreSQL pool is required");
  if (!resources?.storage) throw new Error("Private object storage is required");
  if (!resources?.config?.objectStorage?.bucket) {
    throw new Error("Private object storage bucket is required");
  }
  return resources;
}

function requireLogger(logger) {
  if (!logger || typeof logger.error !== "function" || typeof logger.info !== "function") {
    throw new Error("logger must provide error and info functions");
  }
  return logger;
}

function requireRunners(runners) {
  for (const name of [
    "completion",
    "creative",
    "identities",
    "objects",
    "preview",
    "wait",
  ]) {
    if (typeof runners?.[name] !== "function") {
      throw new Error(`runners.${name} must be a function`);
    }
  }
  return runners;
}

function addAlert(alertCodes, code) {
  if (!alertCodes.includes(code)) alertCodes.push(code);
}

function emitAlert(logger, alertCode, phase = null) {
  logger.error(
    JSON.stringify({
      alertCode,
      event: "account_deletion.cycle_alert",
      ...(phase ? { phase } : {}),
    }),
  );
}

function requireAggregateCount(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function requireCreditCount(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error("expiredCredits must be a non-negative integer string");
  }
  return value;
}

function publicPass(phase, value) {
  if (!value || typeof value !== "object") {
    throw new Error(`${phase} must return aggregate counts`);
  }
  const result = {};
  for (const field of PASS_COUNT_FIELDS[phase]) {
    result[field] = requireAggregateCount(value[field], `${phase}.${field}`);
  }
  if (phase === "anonymizeGoodGoodAccount") {
    result.expiredCredits = requireCreditCount(value.expiredCredits);
  }
  return Object.freeze(result);
}

function aggregatePasses(passes) {
  const totals = {
    claimed: 0,
    completed: 0,
    deferred: 0,
    failed: 0,
    lostLease: 0,
  };
  for (const pass of Object.values(passes)) {
    if (!pass) continue;
    for (const key of Object.keys(totals)) {
      totals[key] += Number(pass[key] ?? 0);
    }
  }
  return totals;
}

function publicLifecycle(value) {
  if (!value || typeof value !== "object") {
    throw new Error("lifecycle preview must return aggregate counts");
  }
  return Object.freeze({
    overdue: requireAggregateCount(value.overdue, "lifecycle.overdue"),
    processing: requireAggregateCount(value.processing, "lifecycle.processing"),
    waitCompleted: requireAggregateCount(
      value.waitCompleted,
      "lifecycle.waitCompleted",
    ),
    waitDue: requireAggregateCount(value.waitDue, "lifecycle.waitDue"),
    waitLeased: requireAggregateCount(
      value.waitLeased,
      "lifecycle.waitLeased",
    ),
  });
}

function runnerOptions({
  batchSize,
  clock,
  identityAdapter,
  identityBatchSize,
  leaseMilliseconds,
  logger,
  now,
  objectBatchSize,
  repositories,
  requestId,
  retryMilliseconds,
  workerId,
}) {
  return {
    common: {
      batchSize,
      clock,
      leaseMilliseconds,
      logger,
      now,
      requestId,
      retryMilliseconds,
    },
    completion: {
      repository: repositories.completion,
      workerId: `${workerId}-completion`,
    },
    creative: {
      repository: repositories.creative,
      workerId: `${workerId}-creative`,
    },
    identities: {
      identityAdapter,
      identityBatchSize,
      repository: repositories.identities,
      workerId: `${workerId}-identities`,
    },
    objects: {
      objectBatchSize,
      repository: repositories.objects,
      workerId: `${workerId}-objects`,
    },
    wait: {
      repository: repositories.wait,
      workerId: `${workerId}-wait`,
    },
  };
}

export async function runAccountDeletionCycle(
  resources,
  {
    batchSize = 10,
    clock = () => new Date(),
    deleteObject,
    identityAdapter,
    identityBatchSize = 100,
    leaseMilliseconds = 60_000,
    logger = console,
    now = null,
    objectBatchSize = 100,
    repositories = {},
    requestId = null,
    retryMilliseconds = 60_000,
    runners = DEFAULT_RUNNERS,
  } = {},
) {
  requireResources(resources);
  requireIdentityDeletionAdapter(identityAdapter);
  requireLogger(logger);
  requireRunners(runners);
  requirePositiveInteger(batchSize, "batchSize", 100);
  requirePositiveInteger(identityBatchSize, "identityBatchSize", 100);
  requirePositiveInteger(leaseMilliseconds, "leaseMilliseconds", 300_000);
  requirePositiveInteger(objectBatchSize, "objectBatchSize", 100);
  requirePositiveInteger(retryMilliseconds, "retryMilliseconds", 86_400_000);
  requireOptionalDate(now);
  if (typeof clock !== "function") throw new Error("clock must be a function");

  const workerId = `account-deletion-cycle-${randomUUID()}`;
  const alertCodes = [];
  const passes = {
    anonymizeGoodGoodAccount: null,
    deleteCreativeRecords: null,
    deleteExternalIdentities: null,
    deletePrivateObjects: null,
    waitForSubmittedJobs: null,
  };
  const options = runnerOptions({
    batchSize,
    clock,
    identityAdapter,
    identityBatchSize,
    leaseMilliseconds,
    logger,
    now,
    objectBatchSize,
    repositories,
    requestId,
    retryMilliseconds,
    workerId,
  });

  let lifecycleBefore = null;
  let lifecycleAfter = null;
  let abortedPhase = null;

  try {
    lifecycleBefore = publicLifecycle(
      await runners.preview(resources.pool, {
        now: now ?? clock(),
        repository: repositories.wait,
        requestId,
      }),
    );
  } catch {
    addAlert(alertCodes, "ACCOUNT_DELETION_OBSERVATION_FAILED");
    abortedPhase = "lifecyclePreview";
    emitAlert(logger, "ACCOUNT_DELETION_OBSERVATION_FAILED", abortedPhase);
  }

  const executions = [
    {
      invoke: () => runners.wait(resources.pool, { ...options.common, ...options.wait }),
      phase: PHASES[0],
    },
    {
      invoke: () =>
        runners.objects(resources, {
          ...options.common,
          ...options.objects,
          deleteObject,
        }),
      phase: PHASES[1],
    },
    {
      invoke: () =>
        runners.creative(resources.pool, { ...options.common, ...options.creative }),
      phase: PHASES[2],
    },
    {
      invoke: () =>
        runners.identities(resources.pool, {
          ...options.common,
          ...options.identities,
        }),
      phase: PHASES[3],
    },
    {
      invoke: () =>
        runners.completion(resources.pool, {
          ...options.common,
          ...options.completion,
        }),
      phase: PHASES[4],
    },
  ];

  if (!abortedPhase) {
    for (const execution of executions) {
      try {
        passes[execution.phase] = publicPass(
          execution.phase,
          await execution.invoke(),
        );
      } catch {
        abortedPhase = execution.phase;
        addAlert(alertCodes, "ACCOUNT_DELETION_CYCLE_ABORTED");
        emitAlert(logger, "ACCOUNT_DELETION_CYCLE_ABORTED", execution.phase);
        break;
      }
    }

    try {
      lifecycleAfter = publicLifecycle(
        await runners.preview(resources.pool, {
          now: now ?? clock(),
          repository: repositories.wait,
          requestId,
        }),
      );
    } catch {
      addAlert(alertCodes, "ACCOUNT_DELETION_OBSERVATION_FAILED");
      emitAlert(logger, "ACCOUNT_DELETION_OBSERVATION_FAILED", "lifecyclePreview");
    }
  }

  const totals = Object.freeze(aggregatePasses(passes));
  if (totals.failed > 0) addAlert(alertCodes, "ACCOUNT_DELETION_PASS_FAILED");
  if (totals.lostLease > 0) addAlert(alertCodes, "ACCOUNT_DELETION_LEASE_LOST");
  if ((lifecycleBefore?.overdue ?? 0) > 0 || (lifecycleAfter?.overdue ?? 0) > 0) {
    addAlert(alertCodes, "ACCOUNT_DELETION_DEADLINE_OVERDUE");
  }

  for (const alertCode of alertCodes) {
    if (
      alertCode !== "ACCOUNT_DELETION_CYCLE_ABORTED" &&
      alertCode !== "ACCOUNT_DELETION_OBSERVATION_FAILED"
    ) {
      emitAlert(logger, alertCode);
    }
  }

  const status = abortedPhase
    ? "aborted"
    : alertCodes.length > 0
      ? "attention"
      : "ok";
  const result = Object.freeze({
    abortedPhase,
    alertCodes: Object.freeze([...alertCodes]),
    lifecycleAfter,
    lifecycleBefore,
    passes: Object.freeze(passes),
    status,
    totals,
  });

  logger.info(
    JSON.stringify({
      alertCodes: result.alertCodes,
      event: "account_deletion.cycle_completed",
      lifecycle: {
        after: result.lifecycleAfter,
        before: result.lifecycleBefore,
      },
      status: result.status,
      totals: result.totals,
    }),
  );
  return result;
}
