import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const COMPOSE_ARGUMENTS = Object.freeze([
  "compose",
  "-f",
  "compose.yaml",
  "-f",
  "compose.authing-local.yaml",
]);

function requiredValue(argument, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${argument} requires a value.`);
  }
  return value;
}

function validateIssuer(value) {
  let issuer;
  try {
    issuer = new URL(value);
  } catch {
    throw new Error("--issuer must be an absolute HTTPS URL.");
  }
  if (
    issuer.protocol !== "https:" ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash
  ) {
    throw new Error(
      "--issuer must be an HTTPS URL without credentials, query, or fragment.",
    );
  }
  issuer.pathname = issuer.pathname.replace(/\/$/, "");
  return issuer.toString().replace(/\/$/, "");
}

function validatePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("--web-port must be an integer from 1 to 65535.");
  }
  return String(port);
}

export function parseArguments(argumentsList) {
  const result = {
    clientId: null,
    help: false,
    issuer: null,
    webPort: process.env.GOODGOOD_WEB_PORT || "3000",
  };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help" || argument === "-h") {
      result.help = true;
      continue;
    }
    if (argument === "--issuer") {
      result.issuer = requiredValue(argument, argumentsList[index + 1]);
      index += 1;
      continue;
    }
    if (argument === "--client-id") {
      result.clientId = requiredValue(argument, argumentsList[index + 1]);
      index += 1;
      continue;
    }
    if (argument === "--web-port") {
      result.webPort = requiredValue(argument, argumentsList[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (result.help) return Object.freeze(result);
  if (!result.issuer) throw new Error("--issuer is required.");
  if (!result.clientId?.trim()) throw new Error("--client-id is required.");
  if (result.clientId.length > 255) throw new Error("--client-id is too long.");
  return Object.freeze({
    ...result,
    clientId: result.clientId.trim(),
    issuer: validateIssuer(result.issuer),
    webPort: validatePort(result.webPort),
  });
}

export function runtimeEnvironment({ clientId, issuer, secretFile, webPort }) {
  return {
    ...process.env,
    GOODGOOD_ALLOW_LOCAL_AUTH: "false",
    GOODGOOD_AUTH_CLIENT_ID: clientId,
    GOODGOOD_AUTH_CLIENT_SECRET: "",
    GOODGOOD_AUTH_CLIENT_SECRET_FILE: secretFile,
    GOODGOOD_AUTH_COOKIE_NAME: "goodgood_oidc_session",
    GOODGOOD_AUTH_COOKIE_SECURE: "false",
    GOODGOOD_AUTH_ISSUER: issuer,
    GOODGOOD_AUTH_MODE: "oidc",
    GOODGOOD_AUTH_REDIRECT_URI: `http://127.0.0.1:${webPort}/api/auth/callback`,
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

function runCommand(command, argumentsList, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      env: options.environment ?? process.env,
      stdio: "inherit",
      windowsHide: true,
    });
    options.onSpawn?.(child);
    child.once("error", (error) => {
      options.onExit?.(child);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      options.onExit?.(child);
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `${command} exited ${signal ? `after ${signal}` : `with code ${code}`}.`,
          ),
        );
      }
    });
  });
}

function usage() {
  return [
    "Usage:",
    "  npm run stack:authing-local -- --issuer <https://tenant.authing.cn/oidc> --client-id <app-id> [--web-port 3000]",
    "",
    "The Authing application secret is requested invisibly after startup.",
  ].join("\n");
}

export async function main(argumentsList = process.argv.slice(2)) {
  const options = parseArguments(argumentsList);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const secret = (await readHiddenLine(
    "粘贴 Authing 应用密钥（输入不可见），然后按 Enter：",
  )).trim();
  if (!secret) throw new Error("Authing application secret must not be empty.");

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "goodgood-authing-"));
  const secretFile = path.join(temporaryDirectory, "client-secret");
  let activeChild = null;
  let environment = null;
  let interrupted = false;
  let stackAttempted = false;
  const commandOptions = (environment) => ({
    environment,
    onExit(child) {
      if (activeChild === child) activeChild = null;
    },
    onSpawn(child) {
      activeChild = child;
    },
  });
  const interrupt = () => {
    interrupted = true;
    if (activeChild && !activeChild.killed) activeChild.kill("SIGTERM");
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  try {
    await writeFile(secretFile, `${secret}\n`, { flag: "wx", mode: 0o600 });
    if (interrupted) throw new Error("Cancelled.");
    environment = runtimeEnvironment({
      ...options,
      secretFile,
    });

    process.stdout.write("正在验证 Authing OIDC 配置……\n");
    await runCommand(
      process.execPath,
      ["scripts/verify-authentication.mjs", "--allow-loopback"],
      commandOptions({ ...environment, NODE_ENV: "development" }),
    );
    if (interrupted) throw new Error("Cancelled.");

    process.stdout.write("正在启动 GoodGood 本机 Authing 联调栈……\n");
    stackAttempted = true;
    await runCommand("docker", [...COMPOSE_ARGUMENTS, "up", "--build", "--detach", "--wait"], {
      ...commandOptions(environment),
    });
    if (interrupted) throw new Error("Cancelled.");
    process.stdout.write(
      `\n已启动：http://127.0.0.1:${options.webPort}/\n` +
        "完成登录测试后回到这里，直接按 Enter 停止容器并清除临时密钥。\n",
    );
    await readHiddenLine("");
  } catch (error) {
    if (interrupted) throw new Error("Cancelled.");
    throw error;
  } finally {
    if (stackAttempted) {
      process.stdout.write("正在停止联调栈（保留本地数据卷）……\n");
      try {
        await runCommand(
          "docker",
          [...COMPOSE_ARGUMENTS, "down"],
          commandOptions(environment),
        );
      } catch (error) {
        process.stderr.write(`停止联调栈失败：${error.message}\n`);
      }
    }
    await rm(temporaryDirectory, { force: true, recursive: true });
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
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
