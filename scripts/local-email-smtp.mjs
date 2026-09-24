import assert from "node:assert/strict";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

const REQUIRED_NAMES = Object.freeze([
  "GOODGOOD_EMAIL_FROM",
  "GOODGOOD_EMAIL_SMTP_HOST",
  "GOODGOOD_EMAIL_SMTP_PASSWORD_FILE",
  "GOODGOOD_EMAIL_SMTP_PORT",
  "GOODGOOD_EMAIL_SMTP_SECURE",
  "GOODGOOD_EMAIL_SMTP_USERNAME",
]);
const OPTIONAL_NAMES = Object.freeze(["GOODGOOD_EMAIL_REPLY_TO"]);

async function externalFile(file, repositoryRoot) {
  assert.ok(path.isAbsolute(file) || path.win32.isAbsolute(file),
    "Email SMTP configuration and password need absolute external paths.");
  const resolved = await realpath(file);
  const relative = path.relative(repositoryRoot, resolved);
  assert.ok(path.isAbsolute(relative) || relative === ".." ||
    relative.startsWith(`..${path.sep}`),
    "Email SMTP configuration and password must stay outside the repository.");
  return resolved;
}

export async function loadLocalEmailSmtpEnvironment(file, repositoryRoot) {
  const resolved = await externalFile(file, repositoryRoot);
  const environment = parseEnv(await readFile(resolved, "utf8"));
  const names = Object.keys(environment);
  assert.deepEqual(names.filter((name) => ![...REQUIRED_NAMES, ...OPTIONAL_NAMES].includes(name)), [],
    "Email SMTP environment file contains unsupported settings.");
  for (const name of REQUIRED_NAMES) {
    assert.ok(environment[name]?.trim(), `${name} is required.`);
  }
  assert.equal(environment.GOODGOOD_EMAIL_SMTP_SECURE, "true",
    "Real email SMTP requires implicit TLS.");
  const port = Number(environment.GOODGOOD_EMAIL_SMTP_PORT);
  assert.ok(Number.isSafeInteger(port) && port > 0 && port <= 65535,
    "Email SMTP port must be valid.");
  const host = environment.GOODGOOD_EMAIL_SMTP_HOST.trim().toLowerCase();
  assert.ok(!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) &&
    !/^127(?:\.\d{1,3}){3}$/.test(host),
    "Real email SMTP requires a non-loopback host.");
  environment.GOODGOOD_EMAIL_SMTP_PASSWORD_FILE = await externalFile(
    environment.GOODGOOD_EMAIL_SMTP_PASSWORD_FILE, repositoryRoot);
  assert.ok((await readFile(environment.GOODGOOD_EMAIL_SMTP_PASSWORD_FILE, "utf8")).trim(),
    "Email SMTP password file must not be empty.");
  return Object.freeze({
    ...environment,
    GOODGOOD_EMAIL_SENDING_ENABLED: "true",
    GOODGOOD_EMAIL_SMTP_PASSWORD: "",
  });
}
