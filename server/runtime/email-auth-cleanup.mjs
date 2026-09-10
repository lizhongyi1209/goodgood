import pg from "pg";
import {
  cleanupEmailAuthentication,
  previewEmailAuthenticationCleanup,
} from "../auth/email-maintenance.mjs";

const { Pool } = pg;
const arguments_ = process.argv.slice(2);
const unknown = arguments_.filter((argument) => argument !== "--execute");
if (unknown.length) throw new Error(`Unknown email authentication cleanup argument: ${unknown[0]}`);
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const execute = arguments_.includes("--execute");
const pool = new Pool({ connectionString: databaseUrl, max: 1 });

try {
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
} finally {
  await pool.end();
}
