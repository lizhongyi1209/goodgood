import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getExampleD1Db() {
  if (!env.DB) throw new Error("The example D1 binding is unavailable.");
  return drizzle(env.DB, { schema });
}
