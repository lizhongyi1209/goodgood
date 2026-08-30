import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;

export function getDatabasePool(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for PostgreSQL persistence.");
  }
  pool ??= new Pool({ connectionString: databaseUrl, max: 10 });
  return pool;
}

export function getDb(databaseUrl = process.env.DATABASE_URL) {
  return drizzle(getDatabasePool(databaseUrl), { schema });
}

export async function closeDb() {
  if (!pool) return;
  const currentPool = pool;
  pool = undefined;
  await currentPool.end();
}
