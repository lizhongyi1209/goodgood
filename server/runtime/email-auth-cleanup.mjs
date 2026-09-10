import pg from "pg";
import {
  cleanupEmailAuthentication,
  previewEmailAuthenticationCleanup,
} from "../auth/email-maintenance.mjs";

const { Pool } = pg;
let pool = null;

try {
  const arguments_ = process.argv.slice(2);
  const unknown = arguments_.filter((argument) => argument !== "--execute");
  if (unknown.length) {
    throw new Error(`Unknown email authentication cleanup argument: ${unknown[0]}`);
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const execute = arguments_.includes("--execute");
  pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const result = execute
    ? await cleanupEmailAuthentication(pool)
    : await previewEmailAuthenticationCleanup(pool);
  console.log(
    JSON.stringify({
      event: execute ? "email_auth.cleanup_complete" : "email_auth.cleanup_preview",
      mode: execute ? "execute" : "dry-run",
      ...result,
    }),
  );
} catch {
  console.error(
    JSON.stringify({
      code: "EMAIL_AUTH_CLEANUP_FAILED",
      event: "email_auth.cleanup_failed",
    }),
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
