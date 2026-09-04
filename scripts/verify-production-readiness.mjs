import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  readProductionEvidence,
  runProductionReadinessGate,
} from "./production-readiness-contract.mjs";

export function parseProductionReadinessArguments(argumentsList) {
  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== "--evidence-file" ||
    !argumentsList[1] ||
    argumentsList[1].startsWith("--")
  ) {
    throw new Error("Usage: production:gate -- --evidence-file <path>");
  }
  return Object.freeze({ evidenceFile: path.resolve(argumentsList[1]) });
}

export function verifyProductionReadinessFile({ evidenceFile, now }) {
  return runProductionReadinessGate(readProductionEvidence(evidenceFile), {
    now,
  });
}

async function main() {
  try {
    const report = verifyProductionReadinessFile(
      parseProductionReadinessArguments(process.argv.slice(2)),
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
              : "Production readiness verification failed.",
          ok: false,
          schemaVersion: 1,
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
