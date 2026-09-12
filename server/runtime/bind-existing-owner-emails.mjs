import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import pg from "pg";
import {
  bindExistingOwnerEmails,
  previewExistingOwnerEmailBindings,
} from "../auth/email-binding-maintenance.mjs";

const { Pool } = pg;

export function parseEmailBindingArguments(arguments_) {
  const values = new Map();
  let execute = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--execute") {
      if (execute) throw new Error("--execute may be supplied only once.");
      execute = true;
      continue;
    }
    if (!["--manifest", "--sha256", "--operator", "--reference"].includes(argument)) {
      throw new Error("Unknown email binding argument.");
    }
    if (values.has(argument)) {
      throw new Error(`${argument} may be supplied only once.`);
    }
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value.`);
    }
    values.set(argument, value);
    index += 1;
  }
  for (const required of ["--manifest", "--sha256", "--operator", "--reference"]) {
    if (!values.has(required)) throw new Error(`${required} is required.`);
  }
  return Object.freeze({
    execute,
    manifestPath: values.get("--manifest"),
    manifestSha256: values.get("--sha256"),
    operatorId: values.get("--operator"),
    reference: values.get("--reference"),
  });
}

export async function runEmailBindingCommand({
  arguments_ = process.argv.slice(2),
  databaseUrl = process.env.DATABASE_URL,
  lstat_ = lstat,
  logger = console,
  readFile_ = readFile,
} = {}) {
  if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required.");
  const command = parseEmailBindingArguments(arguments_);
  const manifestStat = await lstat_(command.manifestPath);
  if (
    manifestStat.isSymbolicLink() ||
    !manifestStat.isFile() ||
    manifestStat.size < 2 ||
    manifestStat.size > 64 * 1024
  ) {
    throw new Error("The email binding manifest must be a bounded regular file.");
  }
  const rawManifest = await readFile_(command.manifestPath);
  const actualDigest = createHash("sha256").update(rawManifest).digest("hex");
  if (actualDigest !== command.manifestSha256.toLowerCase()) {
    throw new Error("The manifest SHA-256 does not match the reviewed file.");
  }
  let manifest;
  try {
    manifest = JSON.parse(rawManifest.toString("utf8"));
  } catch {
    throw new Error("The email binding manifest is not valid JSON.");
  }
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const input = { ...command, manifest };
    const result = command.execute
      ? await bindExistingOwnerEmails(pool, input)
      : await previewExistingOwnerEmailBindings(pool, input);
    logger.log(
      JSON.stringify({
        event: command.execute
          ? "email_auth.owner_binding_complete"
          : "email_auth.owner_binding_preview",
        mode: command.execute ? "execute" : "dry-run",
        ...result,
      }),
    );
    return result;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runEmailBindingCommand();
  } catch (error) {
    const code =
      typeof error?.code === "string" && error.code.startsWith("EMAIL_BINDING_")
        ? error.code
        : "EMAIL_BINDING_FAILED";
    console.error(
      JSON.stringify({
        code,
        event: "email_auth.owner_binding_failed",
      }),
    );
    process.exitCode = 1;
  }
}
