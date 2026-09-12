import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_NAME = "goodgood-email-smtp-local";
const COMPOSE_ARGUMENTS = Object.freeze([
  "compose",
  "--project-name",
  PROJECT_NAME,
  "-f",
  "compose.yaml",
  "-f",
  "compose.email-otp-smtp-local.yaml",
]);
const PUBLIC_ORIGIN_HOST = "127.0.0.1";
const SMTP_FROM = "GoodGood <no-reply@mail.goodgood.o1key.com>";
const SMTP_HOST = "smtpdm-ap-southeast-1.aliyuncs.com";
const SMTP_USERNAME = "no-reply@mail.goodgood.o1key.com";

function validatePort(value, option) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${option} must be an integer from 1 to 65535.`);
  }
  return String(port);
}

export function parseArguments(argumentsList) {
  const result = {
    help: false,
    webPort: process.env.GOODGOOD_WEB_PORT || "31029",
  };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help" || argument === "-h") {
      result.help = true;
      continue;
    }
    if (argument === "--web-port") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--web-port requires a value.");
      }
      result.webPort = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return Object.freeze({
    help: result.help,
    webPort: validatePort(result.webPort, "--web-port"),
  });
}

export function runtimeEnvironment({ secretFile, webPort }) {
  return {
    ...process.env,
    GOODGOOD_ALLOW_LOCAL_AUTH: "false",
    GOODGOOD_AUTH_COOKIE_NAME: "goodgood_email_session",
    GOODGOOD_AUTH_COOKIE_SECURE: "false",
    GOODGOOD_AUTH_MODE: "email_otp",
    GOODGOOD_AUTH_PUBLIC_ORIGIN: `http://${PUBLIC_ORIGIN_HOST}:${webPort}`,
    GOODGOOD_AUTH_TRUSTED_PROXY_ADDRESSES: "",
    GOODGOOD_EMAIL_FROM: SMTP_FROM,
    GOODGOOD_EMAIL_OTP_SECRET:
      "goodgood-email-otp-public-smtp-local-only-secret",
    GOODGOOD_EMAIL_REGISTRATION_ENABLED: "true",
    GOODGOOD_EMAIL_SENDING_ENABLED: "true",
    GOODGOOD_EMAIL_SMTP_HOST: SMTP_HOST,
    GOODGOOD_EMAIL_SMTP_PASSWORD: "",
    GOODGOOD_EMAIL_SMTP_PASSWORD_FILE: secretFile,
    GOODGOOD_EMAIL_SMTP_PASSWORD_SOURCE_FILE: secretFile,
    GOODGOOD_EMAIL_SMTP_PORT: "465",
    GOODGOOD_EMAIL_SMTP_SECURE: "true",
    GOODGOOD_EMAIL_SMTP_USERNAME: SMTP_USERNAME,
    GOODGOOD_MAILPIT_PORT: process.env.GOODGOOD_MAILPIT_PORT ?? "58029",
    GOODGOOD_MOCK_GENERATION_PORT:
      process.env.GOODGOOD_MOCK_GENERATION_PORT ?? "31031",
    GOODGOOD_OBJECT_STORAGE_CONSOLE_PORT:
      process.env.GOODGOOD_OBJECT_STORAGE_CONSOLE_PORT ?? "59030",
    GOODGOOD_OBJECT_STORAGE_PORT:
      process.env.GOODGOOD_OBJECT_STORAGE_PORT ?? "59029",
    GOODGOOD_POSTGRES_PORT: process.env.GOODGOOD_POSTGRES_PORT ?? "55429",
    GOODGOOD_VALKEY_PORT: process.env.GOODGOOD_VALKEY_PORT ?? "57029",
    GOODGOOD_WEB_PORT: webPort,
    GOODGOOD_WORKER_HEALTH_PORT:
      process.env.GOODGOOD_WORKER_HEALTH_PORT ?? "31030",
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

function runCommand(command, argumentsList, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
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
    "  npm run stack:email-smtp-local -- [--web-port 31029]",
    "",
    "The SMTP password is requested invisibly, mounted only into Web, and deleted on exit.",
    "The disposable database and its test mailbox data are also removed on exit.",
  ].join("\n");
}

export async function main(argumentsList = process.argv.slice(2)) {
  const options = parseArguments(argumentsList);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const password = (await readHiddenLine(
    "粘贴阿里云 Direct Mail SMTP 密码（输入不可见），然后按 Enter：",
  )).trim();
  if (!password) throw new Error("SMTP password must not be empty.");

  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "goodgood-email-smtp-"),
  );
  const secretFile = path.join(temporaryDirectory, "smtp-password");
  const environment = runtimeEnvironment({ ...options, secretFile });
  let stackAttempted = false;
  try {
    await writeFile(secretFile, `${password}\n`, { flag: "wx", mode: 0o600 });
    process.stdout.write("正在验证阿里云 SMTP TLS 与账号认证（不会发送邮件）……\n");
    await runCommand(
      process.execPath,
      ["scripts/verify-authentication.mjs", "--allow-loopback"],
      { ...environment, NODE_ENV: "development" },
    );
    process.stdout.write("正在启动一次性 GoodGood 公网邮件联调栈……\n");
    stackAttempted = true;
    await runCommand("docker", [...COMPOSE_ARGUMENTS, "down", "--volumes"], environment);
    await runCommand(
      "docker",
      [...COMPOSE_ARGUMENTS, "up", "--build", "--detach", "--wait"],
      environment,
    );
    process.stdout.write(
      `\n已启动：http://${PUBLIC_ORIGIN_HOST}:${options.webPort}/\n` +
        "仅向本次明确授权的测试邮箱发送验证码。完成登录后回到这里按 Enter，停止容器并清除临时密码与测试数据。\n",
    );
    await readHiddenLine("");
  } finally {
    if (stackAttempted) {
      process.stdout.write("正在停止联调栈并删除一次性测试数据……\n");
      try {
        await runCommand(
          "docker",
          [...COMPOSE_ARGUMENTS, "down", "--volumes"],
          environment,
        );
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
