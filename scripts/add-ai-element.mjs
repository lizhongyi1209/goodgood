import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const components = process.argv.slice(2);
if (components.length === 0 || components.some((name) => !/^[a-z][a-z0-9-]*$/.test(name))) {
  console.error("Usage: npm run ui:ai:add -- <component-name> [component-name...]");
  process.exit(1);
}

const cli = fileURLToPath(new URL("../node_modules/ai-elements/index.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, "add", ...components], { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
