import pg from "pg";
import { pathToFileURL } from "node:url";
import { readEmailAuthenticationOperations } from "../auth/email-maintenance.mjs";

const { Pool } = pg;

export function parseEmailAuthenticationStatusArguments(arguments_) {
  const values = new Map();
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!["--hours", "--request-id"].includes(argument)) {
      throw new Error(`Unknown email authentication status argument: ${argument}`);
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
  const hours = values.has("--hours") ? Number(values.get("--hours")) : 24;
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
    throw new Error("--hours must be an integer between 1 and 720.");
  }
  const requestId = values.get("--request-id") ?? null;
  if (
    requestId !== null &&
    (requestId.length > 200 || /[\u0000-\u001f\u007f]/.test(requestId))
  ) {
    throw new Error("--request-id is invalid.");
  }
  return Object.freeze({ hours, requestId });
}

export async function runEmailAuthenticationStatusCommand({
  arguments_ = process.argv.slice(2),
  databaseUrl = process.env.DATABASE_URL,
  logger = console,
  now = new Date(),
  poolFactory = (connectionString) => new Pool({ connectionString, max: 2 }),
} = {}) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const command = parseEmailAuthenticationStatusArguments(arguments_);
  const pool = poolFactory(databaseUrl);
  try {
    const report = await readEmailAuthenticationOperations(pool, {
      hours: command.hours,
      now,
      requestId: command.requestId,
    });
    logger.log(
      JSON.stringify({
        event: report.alerts.length
          ? "email_auth.operations_attention"
          : "email_auth.operations_healthy",
        ...report,
      }),
    );
    return report;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runEmailAuthenticationStatusCommand();
  } catch {
    console.error(
      JSON.stringify({
        code: "EMAIL_AUTH_STATUS_FAILED",
        event: "email_auth.operations_failed",
      }),
    );
    process.exitCode = 1;
  }
}
