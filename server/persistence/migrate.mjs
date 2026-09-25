import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

/**
 * Line endings are not semantic in SQL, but hashing the file's raw bytes made
 * every recorded checksum depend on how the file happened to land on disk. With
 * `core.autocrlf=true` on Windows the same unchanged migration can hash
 * differently from one checkout to the next, which made `db:migrate` refuse a
 * database that was in fact fully up to date. Normalize before hashing so the
 * checksum identifies the migration's content, not its checkout encoding.
 */
export function migrationChecksum(sql) {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
}

/**
 * Rows written before checksums were normalized hold a hash of whatever
 * line-ending mixture was on disk at the time. Accept those legacy forms so an
 * untouched migration is not reported as edited, while a real content change
 * still fails: only byte-identical content under a different line-ending
 * encoding can match.
 */
export function matchesRecordedChecksum(recorded, sql) {
  if (recorded === migrationChecksum(sql)) return true;
  const legacy = [
    sql,
    sql.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"),
  ];
  return legacy.some(
    (variant) => createHash("sha256").update(variant).digest("hex") === recorded,
  );
}

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
      const checksum = migrationChecksum(sql);
      const existing = await pool.query(
        "SELECT checksum FROM goodgood_schema_migrations WHERE version = $1",
        [version],
      );
      if (existing.rowCount) {
        if (!matchesRecordedChecksum(existing.rows[0].checksum, sql)) {
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
