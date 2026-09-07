import {
  readAccountDeletionInventory,
} from "./inventory-repository.mjs";

const DEFAULT_REPOSITORY = Object.freeze({ readAccountDeletionInventory });
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COUNT_NAMES = Object.freeze([
  "assets",
  "drafts",
  "generationJobs",
  "privateObjects",
  "projects",
  "references",
]);

function requireInventoryCount(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Account deletion inventory ${name} must be a non-negative integer.`);
  }
  return value;
}

function safeInventoryPreview(inventory) {
  if (
    inventory?.inventoryVersion !== 1 ||
    typeof inventory.inventorySha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(inventory.inventorySha256)
  ) {
    throw new Error("Account deletion inventory evidence is invalid.");
  }
  const counts = {};
  for (const name of COUNT_NAMES) {
    counts[name] = requireInventoryCount(inventory.counts?.[name], name);
  }
  return {
    counts,
    inventorySha256: inventory.inventorySha256,
    inventoryVersion: 1,
  };
}

export async function previewAccountDeletionInventory(
  pool,
  { repository = DEFAULT_REPOSITORY, requestId } = {},
) {
  if (typeof requestId !== "string" || !UUID_PATTERN.test(requestId)) {
    throw new Error("requestId must be a UUID.");
  }
  const inventory = await repository.readAccountDeletionInventory(pool, {
    requestId,
  });
  return safeInventoryPreview(inventory);
}
