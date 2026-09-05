import pg from "pg";
import { pathToFileURL } from "node:url";
import {
  bootstrapSiteOwner,
  previewSiteOwnerBootstrap,
} from "../admin/bootstrap-site-owner.mjs";

const { Pool } = pg;

export function parseSiteOwnerBootstrapArguments(arguments_) {
  const values = new Map();
  let execute = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--execute") {
      if (execute) throw new Error("--execute may be supplied only once.");
      execute = true;
      continue;
    }
    if (!["--email", "--operator", "--reference"].includes(argument)) {
      throw new Error(`Unknown site-owner bootstrap argument: ${argument}`);
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
  for (const required of ["--email", "--operator", "--reference"]) {
    if (!values.has(required)) throw new Error(`${required} is required.`);
  }
  return {
    execute,
    input: {
      email: values.get("--email"),
      operatorId: values.get("--operator"),
      reference: values.get("--reference"),
    },
  };
}

export async function runSiteOwnerBootstrapCommand({
  arguments_ = process.argv.slice(2),
  databaseUrl = process.env.DATABASE_URL,
  logger = console,
} = {}) {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Use the maintenance command documented in docs/DEPLOYMENT.md.",
    );
  }
  const command = parseSiteOwnerBootstrapArguments(arguments_);
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const result = command.execute
      ? await bootstrapSiteOwner(pool, command.input)
      : await previewSiteOwnerBootstrap(pool, command.input);
    logger.log(
      JSON.stringify({
        event: command.execute
          ? "administration.site_owner_bootstrapped"
          : "administration.site_owner_bootstrap_preview",
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
    await runSiteOwnerBootstrapCommand();
  } catch (error) {
    console.error(
      JSON.stringify({
        code: error?.code ?? "SITE_OWNER_BOOTSTRAP_FAILED",
        event: "administration.site_owner_bootstrap_failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  }
}
