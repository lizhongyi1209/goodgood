import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  readProductionEvidence,
  runProductionReadinessGate,
} from "./production-readiness-contract.mjs";
import {
  PRODUCTION_RELEASE_STEPS,
  PRODUCTION_RUNTIME_ADAPTER,
} from "./production-runtime-adapter.mjs";

export const PRODUCTION_RELEASE_PLAN_SCHEMA_VERSION = 2;

export function parseProductionReleaseArguments(argumentsList) {
  if (
    argumentsList.length !== 3 ||
    argumentsList[0] !== "plan" ||
    argumentsList[1] !== "--evidence-file" ||
    !argumentsList[2] ||
    argumentsList[2].startsWith("--")
  ) {
    throw new Error(
      "Usage: production:release-plan -- plan --evidence-file <path>",
    );
  }
  return Object.freeze({
    action: "plan",
    evidenceFile: path.resolve(argumentsList[2]),
  });
}

export function createProductionReleasePlan({ checkedAt, release }) {
  return Object.freeze({
    action: "production-release-dry-run",
    adapter: PRODUCTION_RUNTIME_ADAPTER,
    candidate: release,
    checkedAt,
    executionAvailable: false,
    steps: PRODUCTION_RELEASE_STEPS,
  });
}

export function planProductionRelease({
  evidenceDocument,
  now = () => Date.now(),
}) {
  const nowMs = now();
  if (!Number.isFinite(nowMs)) throw new Error("now must return epoch milliseconds.");
  const gate = runProductionReadinessGate(evidenceDocument, { now: () => nowMs });
  const plan = gate.ok
    ? createProductionReleasePlan({
        checkedAt: new Date(nowMs).toISOString(),
        release: gate.release,
      })
    : null;
  return Object.freeze({
    executed: false,
    executionAvailable: false,
    gate,
    ok: gate.ok,
    plan,
    schemaVersion: PRODUCTION_RELEASE_PLAN_SCHEMA_VERSION,
  });
}

export function planProductionReleaseFile({ evidenceFile, now }) {
  return planProductionRelease({
    evidenceDocument: readProductionEvidence(evidenceFile),
    now,
  });
}

async function main() {
  try {
    const result = planProductionReleaseFile(
      parseProductionReleaseArguments(process.argv.slice(2)),
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify(
        {
          error:
            error instanceof Error
              ? error.message
              : "Production release planning failed.",
          executed: false,
          executionAvailable: false,
          ok: false,
          plan: null,
          schemaVersion: PRODUCTION_RELEASE_PLAN_SCHEMA_VERSION,
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
