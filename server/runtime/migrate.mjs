import { applyMigrations } from "../persistence/migrate.mjs";
import { seedLocalFixtures } from "../persistence/seed-local-fixtures.mjs";

const applied = await applyMigrations({ databaseUrl: process.env.DATABASE_URL });
const localFixturesEnabled = process.env.GOODGOOD_ALLOW_LOCAL_AUTH === "true";
if (localFixturesEnabled) {
  await seedLocalFixtures({ databaseUrl: process.env.DATABASE_URL });
}
console.log(
  JSON.stringify({
    count: applied.length,
    event: "migration.complete",
    localFixturesEnabled,
    revision: process.env.GOODGOOD_REVISION ?? "development",
  }),
);
