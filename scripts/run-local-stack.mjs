import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveLocalProviderTokenFile } from "./local-provider-secret.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const BASE_ARGUMENTS = Object.freeze([
  "compose",
  "--project-name",
  "goodgood",
  "-f",
  "compose.yaml",
]);
const REAL_PROVIDER_ARGUMENTS = Object.freeze([
  ...BASE_ARGUMENTS,
  "-f",
  "compose.o1key-local.yaml",
]);

export function parseCommand(argumentsList) {
  if (argumentsList.length !== 1 || !["config", "up", "down"].includes(argumentsList[0])) {
    throw new Error("Expected exactly one command: config, up, or down.");
  }
  return argumentsList[0];
}

function runDocker(argumentsList, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", argumentsList, {
      cwd: root,
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `docker exited ${signal ? `after ${signal}` : `with code ${code}`}.`,
          ),
        );
      }
    });
  });
}

export async function main(argumentsList = process.argv.slice(2)) {
  const command = parseCommand(argumentsList);
  if (command === "down") {
    await runDocker([...BASE_ARGUMENTS, "down"], process.env);
    return;
  }

  const secretFile = await resolveLocalProviderTokenFile({
    repositoryRoot: root,
  });
  const environment = {
    ...process.env,
    GOODGOOD_O1KEY_API_KEY_FILE: secretFile,
  };
  if (command === "config") {
    await runDocker([...REAL_PROVIDER_ARGUMENTS, "config", "--quiet"], environment);
    return;
  }

  process.stdout.write(
    "正在启动真实 O1Key 本地开发栈；生成请求会产生真实费用。\n",
  );
  await runDocker(
    [...REAL_PROVIDER_ARGUMENTS, "up", "--build", "--detach", "--wait"],
    environment,
  );
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
