import { pathToFileURL } from "node:url";
import {
  PRODUCTION_WORK_PACKAGE_SCHEMA_VERSION,
  inspectProductionWorkPackage,
} from "./production-work-package-contract.mjs";

export function parseProductionWorkPackageArguments(argumentsList) {
  if (argumentsList.length !== 1 || argumentsList[0] !== "rehearse") {
    throw new Error("Usage: production:work-package -- rehearse");
  }
  return Object.freeze({ action: "rehearse" });
}

async function main() {
  try {
    parseProductionWorkPackageArguments(process.argv.slice(2));
    process.stdout.write(
      `${JSON.stringify(inspectProductionWorkPackage(), null, 2)}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify(
        {
          error:
            error instanceof Error
              ? error.message
              : "Production work-package rehearsal failed.",
          executed: false,
          executionAvailable: false,
          ok: false,
          schemaVersion: PRODUCTION_WORK_PACKAGE_SCHEMA_VERSION,
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
