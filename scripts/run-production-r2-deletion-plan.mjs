import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { planR2CurrentObjectDeletion } from "../server/generation/r2-inventory-contract.mjs";

export function parseR2DeletionPlanArguments(argumentsList) {
  if (
    argumentsList.length !== 3 ||
    argumentsList[0] !== "plan" ||
    argumentsList[1] !== "--inventory-file" ||
    !argumentsList[2] ||
    argumentsList[2].startsWith("--")
  ) {
    throw new Error(
      "Usage: production:r2-deletion-plan -- plan --inventory-file <path>",
    );
  }
  return Object.freeze({ inventoryFile: path.resolve(argumentsList[2]) });
}

export function planR2DeletionFile(inventoryFile) {
  return planR2CurrentObjectDeletion(
    JSON.parse(readFileSync(inventoryFile, "utf8")),
  );
}

async function main() {
  try {
    const { inventoryFile } = parseR2DeletionPlanArguments(
      process.argv.slice(2),
    );
    process.stdout.write(
      `${JSON.stringify(planR2DeletionFile(inventoryFile), null, 2)}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        error:
          error instanceof Error ? error.message : "R2 deletion planning failed.",
        executed: false,
        executionAvailable: false,
      })}\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
