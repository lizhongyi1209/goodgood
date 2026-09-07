import { createHash } from "node:crypto";

export const ACCOUNT_DELETION_INVENTORY_VERSION = 1;

function appendInventoryRows(hash, kind, rows, column = "id") {
  const canonicalRows = rows
    .map((row) => JSON.stringify([kind, row[column]]))
    .sort();
  for (const canonicalRow of canonicalRows) {
    hash.update(`${canonicalRow}\n`, "utf8");
  }
}

export function createAccountDeletionInventoryEvidence({
  assets,
  drafts,
  generationBatches,
  generationJobs,
  privateObjects,
  projects,
  references,
}) {
  const hash = createHash("sha256");
  hash.update(
    `goodgood-account-deletion-inventory:v${ACCOUNT_DELETION_INVENTORY_VERSION}\n`,
    "utf8",
  );
  appendInventoryRows(hash, "project", projects);
  appendInventoryRows(hash, "generation_batch", generationBatches);
  appendInventoryRows(hash, "generation_job", generationJobs);
  appendInventoryRows(hash, "asset", assets);
  appendInventoryRows(hash, "creation_draft", drafts, "owner_id");
  appendInventoryRows(hash, "reference", references);
  appendInventoryRows(hash, "private_object", privateObjects, "object_key");

  return {
    counts: {
      assets: assets.length,
      drafts: drafts.length,
      generationJobs: generationJobs.length,
      privateObjects: privateObjects.length,
      projects: projects.length,
      references: references.length,
    },
    inventorySha256: hash.digest("hex"),
    inventoryVersion: ACCOUNT_DELETION_INVENTORY_VERSION,
  };
}
