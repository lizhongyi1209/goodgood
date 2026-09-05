import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deriveReleaseMetadata } from "./release-metadata.mjs";
import { runProductionPreflight } from "./production-preflight-contract.mjs";
import { readEnvironmentFile } from "./staging-contract.mjs";

const execFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function parseProductionPreflightArguments(argumentsList) {
  const options = {};
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    const optionNames = {
      "--evidence-reference": "evidenceReference",
      "--release-file": "releaseFile",
      "--runtime-env-file": "runtimeFile",
    };
    const name = optionNames[argument];
    if (!name) throw new Error("Unknown production preflight argument.");
    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value.`);
    }
    if (options[name]) throw new Error(`${argument} may be supplied only once.`);
    options[name] = name.endsWith("File") ? path.resolve(value) : value;
    index += 1;
  }
  if (!options.releaseFile || !options.runtimeFile || !options.evidenceReference) {
    throw new Error(
      "--release-file, --runtime-env-file, and --evidence-reference are required.",
    );
  }
  return Object.freeze(options);
}

async function defaultRepositoryEvidence(root = repositoryRoot) {
  let revision;
  let status;
  try {
    ({ stdout: revision } = await execFile(
      "git",
      ["rev-parse", "--verify", "HEAD"],
      { cwd: root, encoding: "utf8", windowsHide: true },
    ));
    ({ stdout: status } = await execFile(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      { cwd: root, encoding: "utf8", windowsHide: true },
    ));
  } catch {
    throw new Error("The production preflight repository could not be inspected.");
  }
  const metadata = await deriveReleaseMetadata({
    repository: "lizhongyi1209/goodgood",
    root,
  });
  return Object.freeze({
    clean: status.trim() === "",
    imageName: metadata.imageName,
    migrationVersion: metadata.migrationVersion,
    revision: revision.trim(),
    runtimeConfigVersion: metadata.runtimeConfigVersion,
  });
}

async function defaultImageLabels(image) {
  let stdout;
  try {
    ({ stdout } = await execFile(
      "docker",
      ["image", "inspect", "--format", "{{json .Config.Labels}}", image],
      {
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
    ));
  } catch {
    throw new Error("The exact candidate image must be present and inspectable.");
  }
  try {
    const labels = JSON.parse(stdout.trim());
    if (!labels || typeof labels !== "object" || Array.isArray(labels)) {
      throw new Error("invalid labels");
    }
    return labels;
  } catch {
    throw new Error("The candidate image labels are missing or malformed.");
  }
}

export async function verifyProductionPreflightFiles({
  evidenceReference,
  fetchImpl = fetch,
  imageLabelsFor = defaultImageLabels,
  lstatImpl,
  platform,
  productionRoot,
  releaseFile,
  repositoryEvidenceFor = defaultRepositoryEvidence,
  runtimeFile,
}) {
  const releaseEnvironment = readEnvironmentFile(releaseFile);
  const runtimeEnvironment = readEnvironmentFile(runtimeFile);
  const repositoryEvidence = await repositoryEvidenceFor(repositoryRoot);
  const releaseImage = releaseEnvironment.GOODGOOD_RELEASE_IMAGE ?? "";
  const imageLabels =
    /^ghcr\.io\/lizhongyi1209\/goodgood@sha256:[a-f0-9]{64}$/.test(
      releaseImage,
    )
      ? await imageLabelsFor(releaseImage)
      : null;
  return runProductionPreflight({
    evidenceReference,
    fetchImpl,
    imageLabels,
    ...(lstatImpl ? { lstatImpl } : {}),
    ...(platform ? { platform } : {}),
    ...(productionRoot ? { productionRoot } : {}),
    releaseEnvironment,
    releaseFilePath: releaseFile,
    repositoryEvidence,
    runtimeEnvironment,
    runtimeFilePath: runtimeFile,
  });
}

async function main() {
  try {
    const report = await verifyProductionPreflightFiles(
      parseProductionPreflightArguments(process.argv.slice(2)),
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } catch {
    process.stderr.write(
      `${JSON.stringify(
        {
          checks: [
            {
              detail:
                "Production preflight could not read or inspect the required candidate inputs.",
              id: "execution",
              status: "fail",
            },
          ],
          evidence: null,
          ok: false,
          release: null,
          schemaVersion: 1,
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
