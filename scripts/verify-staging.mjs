import path from "node:path";
import { pathToFileURL } from "node:url";
import { runAuthenticationPreflight } from "../server/auth/preflight.mjs";
import {
  readEnvironmentFile,
  runStagingPreflight,
  runtimeEnvironmentForHost,
} from "./staging-contract.mjs";

export function parseStagingArguments(argumentsList) {
  const options = { network: false };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--network") {
      options.network = true;
      continue;
    }
    if (argument === "--release-file" || argument === "--runtime-env-file") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      const name =
        argument === "--release-file" ? "releaseFile" : "runtimeFile";
      if (options[name]) throw new Error(`${argument} may be supplied only once.`);
      options[name] = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown staging preflight argument: ${argument}`);
  }
  if (!options.releaseFile || !options.runtimeFile) {
    throw new Error("--release-file and --runtime-env-file are required.");
  }
  return Object.freeze(options);
}

export async function verifyStagingFiles({
  network = false,
  releaseFile,
  runtimeFile,
  fetchImpl = fetch,
}) {
  const releaseEnvironment = readEnvironmentFile(releaseFile);
  const runtimeEnvironment = readEnvironmentFile(runtimeFile);
  const contract = runStagingPreflight({
    releaseEnvironment,
    runtimeEnvironment,
    runtimeFilePath: runtimeFile,
  });
  let authentication = null;
  if (contract.ok && network) {
    authentication = await runAuthenticationPreflight({
      environment: runtimeEnvironmentForHost(
        releaseEnvironment,
        runtimeEnvironment,
      ),
      fetchImpl,
    });
  }
  return Object.freeze({
    authentication,
    contract,
    ok: contract.ok && (!network || authentication?.ok === true),
    schemaVersion: 1,
  });
}

async function main() {
  let options;
  try {
    options = parseStagingArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
    return;
  }

  try {
    const report = await verifyStagingFiles(options);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Staging preflight failed."}\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
