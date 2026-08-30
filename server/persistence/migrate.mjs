import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

export async function applyMigrations({
  databaseUrl,
  migrationsDirectory = path.resolve(process.cwd(), "migrations"),
  logger = console,
}) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required to run migrations.");

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS goodgood_schema_migrations (
        version text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const version of migrationFiles) {
      const sql = await readFile(path.join(migrationsDirectory, version), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await pool.query(
        "SELECT checksum FROM goodgood_schema_migrations WHERE version = $1",
        [version],
      );
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) {
          throw new Error(`Applied migration ${version} has a different checksum.`);
        }
        continue;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO goodgood_schema_migrations (version, checksum) VALUES ($1, $2)",
          [version, checksum],
        );
        await client.query("COMMIT");
        logger.log(JSON.stringify({ event: "migration.applied", version }));
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    return migrationFiles;
  } finally {
    await pool.end();
  }
}
