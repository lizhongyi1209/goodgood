import { pathToFileURL } from "node:url";
import {
  PRODUCTION_CONVERSION_SCHEMA_VERSION,
  parseProductionConversionArguments,
  planProductionConversion,
  readProductionConversionManifest,
} from "./production-conversion-contract.mjs";

async function main() {
  try {
    const { manifestFile } = parseProductionConversionArguments(
      process.argv.slice(2),
    );
    const result = planProductionConversion(
      readProductionConversionManifest(manifestFile),
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.readyForSeparateLiveActionReview ? 0 : 1;
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify(
        {
          error:
            error instanceof Error
              ? error.message
              : "Production conversion planning failed.",
          executed: false,
          executionAvailable: false,
          ok: false,
          schemaVersion: PRODUCTION_CONVERSION_SCHEMA_VERSION,
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
