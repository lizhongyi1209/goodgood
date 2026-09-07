import { pathToFileURL } from "node:url";
import { createAuthingIdentityDeletionAdapter } from "../account-deletion/authing-identity-adapter.mjs";
import { runAccountDeletionCycle } from "../account-deletion/orchestrator.mjs";
import { loadAccountDeletionRuntimeConfig } from "../account-deletion/runtime-config.mjs";
import { createAccountDeletionRuntimeResources } from "../account-deletion/runtime-resources.mjs";

const EXIT_CODES = Object.freeze({
  aborted: 3,
  attention: 2,
  ok: 0,
});

const CYCLE_LIMITS = Object.freeze({
  batchSize: 10,
  identityBatchSize: 100,
  leaseMilliseconds: 60_000,
  objectBatchSize: 100,
  retryMilliseconds: 60_000,
});

function publicCount(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer.`);
  }
  return value;
}

function publicLifecycle(value, name) {
  if (value === null) return null;
  if (!value || typeof value !== "object") {
    throw new Error(`${name} must contain aggregate lifecycle counts.`);
  }
  return Object.freeze({
    overdue: publicCount(value.overdue, `${name}.overdue`),
    processing: publicCount(value.processing, `${name}.processing`),
    waitCompleted: publicCount(value.waitCompleted, `${name}.waitCompleted`),
    waitDue: publicCount(value.waitDue, `${name}.waitDue`),
    waitLeased: publicCount(value.waitLeased, `${name}.waitLeased`),
  });
}

function publicResult(result) {
  if (!result || !Object.hasOwn(EXIT_CODES, result.status)) {
    throw new Error("The deletion cycle returned an invalid status.");
  }
  if (!Array.isArray(result.alertCodes)) {
    throw new Error("The deletion cycle must return alert codes.");
  }
  const alertCodes = result.alertCodes.map((code) => {
    if (typeof code !== "string" || !/^ACCOUNT_DELETION_[A-Z_]+$/.test(code)) {
      throw new Error("The deletion cycle returned an invalid alert code.");
    }
    return code;
  });
  const totals = result.totals;
  if (!totals || typeof totals !== "object") {
    throw new Error("The deletion cycle must return aggregate totals.");
  }
  return Object.freeze({
    alertCodes: Object.freeze(alertCodes),
    event: "account_deletion.runtime_completed",
    lifecycle: Object.freeze({
      after: publicLifecycle(result.lifecycleAfter, "lifecycle.after"),
      before: publicLifecycle(result.lifecycleBefore, "lifecycle.before"),
    }),
    status: result.status,
    totals: Object.freeze({
      claimed: publicCount(totals.claimed, "totals.claimed"),
      completed: publicCount(totals.completed, "totals.completed"),
      deferred: publicCount(totals.deferred, "totals.deferred"),
      failed: publicCount(totals.failed, "totals.failed"),
      lostLease: publicCount(totals.lostLease, "totals.lostLease"),
    }),
  });
}

function requireRuntimeResources(value) {
  if (
    !value?.resources ||
    typeof value.verify !== "function" ||
    typeof value.close !== "function"
  ) {
    throw new Error("The deletion runtime resource factory is invalid.");
  }
  return value;
}

export async function executeAccountDeletionRuntime({
  adapterFactory = createAuthingIdentityDeletionAdapter,
  configLoader = loadAccountDeletionRuntimeConfig,
  cycleRunner = runAccountDeletionCycle,
  environment = process.env,
  logger = console,
  resourcesFactory = createAccountDeletionRuntimeResources,
} = {}) {
  const config = configLoader(environment);
  let runtimeResources;
  try {
    runtimeResources = requireRuntimeResources(
      resourcesFactory(config, { logger }),
    );
    await runtimeResources.verify();
    const identityAdapter = adapterFactory({
      accessKeyId: config.identity.accessKeyId,
      accessKeySecret: config.identity.accessKeySecret,
      expectedIssuer: config.identity.expectedIssuer,
    });
    const result = publicResult(
      await cycleRunner(runtimeResources.resources, {
        ...CYCLE_LIMITS,
        identityAdapter,
        logger,
        requestId: null,
      }),
    );
    return Object.freeze({ exitCode: EXIT_CODES[result.status], result });
  } finally {
    await runtimeResources?.close();
  }
}

export async function runAccountDeletionRuntimeMain({
  environment = process.env,
  errorWriter = (line) => process.stderr.write(line),
  outputWriter = (line) => process.stdout.write(line),
  ...dependencies
} = {}) {
  try {
    const outcome = await executeAccountDeletionRuntime({
      ...dependencies,
      environment,
    });
    outputWriter(`${JSON.stringify(outcome.result)}\n`);
    return outcome.exitCode;
  } catch {
    errorWriter(
      `${JSON.stringify({
        alertCode: "ACCOUNT_DELETION_RUNTIME_FAILED",
        event: "account_deletion.runtime_alert",
      })}\n`,
    );
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runAccountDeletionRuntimeMain();
}

export const ACCOUNT_DELETION_CYCLE_LIMITS = CYCLE_LIMITS;
export const ACCOUNT_DELETION_RUNTIME_EXIT_CODES = EXIT_CODES;
