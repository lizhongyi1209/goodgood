import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const COMPOSE_ARGUMENTS = Object.freeze([
  "compose",
  "--project-name",
  "goodgood-o1key-local",
  "-f",
  "compose.yaml",
  "-f",
  "compose.o1key-local.yaml",
]);

function validatePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("--web-port must be an integer from 1 to 65535.");
  }
  return String(port);
}

export function parseArguments(argumentsList) {
  let help = false;
  let webPort = process.env.GOODGOOD_WEB_PORT || "3000";
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--web-port") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--web-port requires a value.");
      }
      webPort = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return Object.freeze({ help, webPort: validatePort(webPort) });
}

export function runtimeEnvironment({ secretFile, webPort }) {
  return {
    ...process.env,
    GOODGOOD_O1KEY_API_KEY_FILE: secretFile,
    GOODGOOD_WEB_PORT: webPort,
  };
}

function readHiddenLine(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new Error("This command requires an interactive terminal.");
  }
  process.stdout.write(prompt);
  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (result, error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(result);
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(null, new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= " ") value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

function runCommand(argumentsList, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", argumentsList, {
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

function usage() {
  return [
    "Usage:",
    "  npm run stack:o1key-local -- [--web-port 3000]",
    "",
    "The O1Key API key is requested invisibly and mounted only into the worker.",
  ].join("\n");
}

export async function main(argumentsList = process.argv.slice(2)) {
  const options = parseArguments(argumentsList);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const apiKey = (await readHiddenLine(
    "粘贴 O1Key API Key（输入不可见），然后按 Enter：",
  )).trim();
  if (!apiKey) throw new Error("O1Key API key must not be empty.");

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "goodgood-o1key-"));
  const secretFile = path.join(temporaryDirectory, "api-key");
  const environment = runtimeEnvironment({ ...options, secretFile });
  let stackAttempted = false;
  try {
    await writeFile(secretFile, `${apiKey}\n`, { flag: "wx", mode: 0o600 });
    process.stdout.write("正在启动 GoodGood O1Key 本地联调栈…\n");
    stackAttempted = true;
    await runCommand(
      [...COMPOSE_ARGUMENTS, "up", "--build", "--detach", "--wait"],
      environment,
    );
    process.stdout.write(
      `\n已启动：http://127.0.0.1:${options.webPort}/\n` +
        "完成 1:1 / 1K 测试后回到这里，直接按 Enter 停止容器并清除临时密钥。\n",
    );
    await readHiddenLine("");
  } finally {
    if (stackAttempted) {
      process.stdout.write("正在停止联调栈（保留本地数据卷）…\n");
      try {
        await runCommand([...COMPOSE_ARGUMENTS, "down"], environment);
      } catch (error) {
        process.stderr.write(`停止联调栈失败：${error.message}\n`);
      }
    }
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
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
