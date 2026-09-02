import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readEnvironmentFile } from "./staging-contract.mjs";
import {
  parseStagingArguments,
  verifyStagingFiles,
} from "./verify-staging.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const stagingComposeFile = path.resolve(repositoryRoot, "compose.staging.yaml");

function renderCommand(command, argumentsList) {
  return [command, ...argumentsList]
    .map((value) =>
      /^[A-Za-z0-9_./:=@-]+$/.test(value)
        ? value
        : JSON.stringify(value),
    )
    .join(" ");
}

function dockerComposeArguments(releaseFile, ...argumentsList) {
  return [
    "compose",
    "--env-file",
    releaseFile,
    "--file",
    stagingComposeFile,
    "--profile",
    "release",
    ...argumentsList,
  ];
}

export function parseReleaseArguments(argumentsList) {
  const [action, ...remainder] = argumentsList;
  if (action !== "deploy" && action !== "rollback") {
    throw new Error("The first argument must be deploy or rollback.");
  }
  const execute = remainder.includes("--execute");
  const filtered = remainder.filter((argument) => argument !== "--execute");
  if (remainder.length - filtered.length > 1) {
    throw new Error("--execute may be supplied only once.");
  }
  const staging = parseStagingArguments(filtered);
  if (staging.network) {
    throw new Error("--network is automatic during --execute and is not accepted here.");
  }
  return Object.freeze({ action, execute, ...staging });
}

export function createReleasePlan({ action, releaseFile, runtimeFile }) {
  const release = readEnvironmentFile(releaseFile);
  const common = (argumentsList) =>
    Object.freeze({
      arguments: Object.freeze(argumentsList),
      command: "docker",
      display: renderCommand("docker", argumentsList),
    });
  const commands = [
    common(dockerComposeArguments(releaseFile, "config", "--quiet")),
    common(
      dockerComposeArguments(
        releaseFile,
        "pull",
        ...(action === "deploy" ? ["web", "worker", "migrate"] : ["web", "worker"]),
      ),
    ),
  ];
  if (action === "deploy") {
    commands.push(
      common(
        dockerComposeArguments(releaseFile, "run", "--rm", "migrate"),
      ),
    );
  }
  commands.push(
    common(
      dockerComposeArguments(
        releaseFile,
        "up",
        "--detach",
        "--wait",
        "web",
        "worker",
      ),
    ),
  );
  return Object.freeze({
    action,
    image: release.GOODGOOD_RELEASE_IMAGE,
    migrationMode:
      action === "deploy" ? "forward-migrate-before-start" : "no-schema-rollback",
    releaseFile,
    runtimeFile,
    steps: Object.freeze(commands),
  });
}

export function verifyReleaseImageLabels(labels, release) {
  const expected = {
    "com.goodgood.migration.version": release.GOODGOOD_RELEASE_MIGRATION,
    "com.goodgood.runtime-config.version":
      release.GOODGOOD_RUNTIME_CONFIG_VERSION,
    "org.opencontainers.image.revision": release.GOODGOOD_RELEASE_REVISION,
  };
  const mismatches = Object.entries(expected).filter(
    ([name, value]) => labels?.[name] !== value,
  );
  if (mismatches.length > 0) {
    throw new Error(
      `Pulled image labels do not match the release file: ${mismatches
        .map(([name]) => name)
        .join(", ")}.`,
    );
  }
  return true;
}

function run(command, argumentsList, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      cwd: repositoryRoot,
      env: process.env,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    });
    let output = "";
    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
    }
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(output);
        return;
      }
      reject(
        new Error(
          `${command} exited ${signal ? `from ${signal}` : `with code ${code}`}.`,
        ),
      );
    });
  });
}

async function inspectAndVerifyImage(release) {
  const output = await run(
    "docker",
    [
      "image",
      "inspect",
      release.GOODGOOD_RELEASE_IMAGE,
      "--format",
      "{{json .Config.Labels}}",
    ],
    { capture: true },
  );
  let labels;
  try {
    labels = JSON.parse(output.trim());
  } catch {
    throw new Error("Docker returned unreadable image-label metadata.");
  }
  verifyReleaseImageLabels(labels, release);
}

export async function executeRelease(options) {
  const localReport = await verifyStagingFiles(options);
  if (!localReport.ok) return localReport;

  const plan = createReleasePlan(options);
  if (!options.execute) {
    return Object.freeze({ executed: false, ok: true, plan, preflight: localReport });
  }

  const executionPreflight =
    options.action === "deploy"
      ? await verifyStagingFiles({ ...options, network: true })
      : localReport;
  if (!executionPreflight.ok) {
    return Object.freeze({
      executed: false,
      ok: false,
      plan,
      preflight: executionPreflight,
    });
  }

  const release = readEnvironmentFile(options.releaseFile);
  for (const [index, step] of plan.steps.entries()) {
    process.stdout.write(
      `${JSON.stringify({
        event: "staging.release_step",
        number: index + 1,
        total: plan.steps.length,
      })}\n`,
    );
    await run(step.command, step.arguments);
    if (index === 1) await inspectAndVerifyImage(release);
  }
  return Object.freeze({ executed: true, ok: true, plan });
}

async function main() {
  let options;
  try {
    options = parseReleaseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
    return;
  }

  try {
    const result = await executeRelease(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        code: "STAGING_RELEASE_FAILED",
        event: "staging.release_failed",
        message: error instanceof Error ? error.message : String(error),
      })}\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
