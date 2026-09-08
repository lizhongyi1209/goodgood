import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  PRODUCTION_EVIDENCE_SCHEMA_VERSION,
  readProductionEvidence,
  runControlledAlphaReadinessGate,
} from "./production-readiness-contract.mjs";

export function parseControlledAlphaReadinessArguments(argumentsList) {
  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== "--evidence-file" ||
    !argumentsList[1] ||
    argumentsList[1].startsWith("--")
  ) {
    throw new Error("Usage: production:alpha-gate -- --evidence-file <path>");
  }
  return Object.freeze({ evidenceFile: path.resolve(argumentsList[1]) });
}

export function verifyControlledAlphaReadinessFile({ evidenceFile, now }) {
  return runControlledAlphaReadinessGate(readProductionEvidence(evidenceFile), {
    now,
  });
}

async function main() {
  try {
    const report = verifyControlledAlphaReadinessFile(
      parseControlledAlphaReadinessArguments(process.argv.slice(2)),
    );
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          error:
            error instanceof Error
              ? error.message
              : "Controlled-alpha readiness verification failed.",
          ok: false,
          schemaVersion: PRODUCTION_EVIDENCE_SCHEMA_VERSION,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
