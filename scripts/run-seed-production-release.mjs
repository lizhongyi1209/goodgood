import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  readProductionEvidence,
  runSeedProductionReadinessGate,
} from "./production-readiness-contract.mjs";
import {
  createSeedProductionReleasePlan,
  PRODUCTION_RELEASE_PLAN_SCHEMA_VERSION,
} from "./run-production-release.mjs";

export function parseSeedProductionReleaseArguments(argumentsList) {
  if (
    argumentsList.length !== 3 ||
    argumentsList[0] !== "plan" ||
    argumentsList[1] !== "--evidence-file" ||
    !argumentsList[2] ||
    argumentsList[2].startsWith("--")
  ) {
    throw new Error(
      "Usage: production:seed-release-plan -- plan --evidence-file <path>",
    );
  }
  return Object.freeze({
    action: "plan",
    evidenceFile: path.resolve(argumentsList[2]),
  });
}

export function planSeedProductionRelease({
  evidenceDocument,
  now = () => Date.now(),
}) {
  const nowMs = now();
  if (!Number.isFinite(nowMs)) throw new Error("now must return epoch milliseconds.");
  const gate = runSeedProductionReadinessGate(evidenceDocument, {
    now: () => nowMs,
  });
  const plan = gate.ok
    ? createSeedProductionReleasePlan({
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

export function planSeedProductionReleaseFile({ evidenceFile, now }) {
  return planSeedProductionRelease({
    evidenceDocument: readProductionEvidence(evidenceFile),
    now,
  });
}

async function main() {
  try {
    const result = planSeedProductionReleaseFile(
      parseSeedProductionReleaseArguments(process.argv.slice(2)),
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
              : "Seed production release planning failed.",
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
