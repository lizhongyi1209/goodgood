import { applyMigrations } from "../persistence/migrate.mjs";

const applied = await applyMigrations({ databaseUrl: process.env.DATABASE_URL });
console.log(
  JSON.stringify({
    count: applied.length,
    event: "migration.complete",
    revision: process.env.GOODGOOD_REVISION ?? "development",
  }),
);
