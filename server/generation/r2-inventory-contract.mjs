import { createHash } from "node:crypto";

export const R2_INVENTORY_SCHEMA_VERSION = 1;

function safeObject(item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`objects[${index}] must be an object.`);
  }
  if (typeof item.key !== "string" || !item.key || item.key.includes("\0")) {
    throw new Error(`objects[${index}].key is invalid.`);
  }
  if (!Number.isSafeInteger(item.size) || item.size < 0) {
    throw new Error(`objects[${index}].size is invalid.`);
  }
  if (typeof item.etag !== "string" || !item.etag) {
    throw new Error(`objects[${index}].etag is invalid.`);
  }
  if (!Number.isFinite(Date.parse(item.lastModified))) {
    throw new Error(`objects[${index}].lastModified is invalid.`);
  }
  return Object.freeze({
    etag: item.etag,
    key: item.key,
    lastModified: new Date(item.lastModified).toISOString(),
    size: item.size,
  });
}

export function inventoryFingerprint(objects) {
  const hash = createHash("sha256");
  for (const item of objects) {
    hash.update(item.key);
    hash.update("\0");
    hash.update(String(item.size));
    hash.update("\0");
    hash.update(item.etag);
    hash.update("\0");
    hash.update(item.lastModified);
    hash.update("\n");
  }
  return hash.digest("hex");
}

export function createR2InventoryDocument({ capturedAt, objects }) {
  if (!Number.isFinite(Date.parse(capturedAt))) {
    throw new Error("capturedAt must be an ISO timestamp.");
  }
  if (!Array.isArray(objects)) throw new Error("objects must be an array.");
  const normalized = objects
    .map(safeObject)
    .sort((left, right) => left.key.localeCompare(right.key));
  const keys = new Set(normalized.map(({ key }) => key));
  if (keys.size !== normalized.length) {
    throw new Error("R2 inventory contains duplicate object keys.");
  }
  const totalBytes = normalized.reduce((total, { size }) => total + size, 0);
  return Object.freeze({
    bucket: "goodgood",
    capturedAt: new Date(capturedAt).toISOString(),
    inventorySha256: inventoryFingerprint(normalized),
    objectCount: normalized.length,
    objects: Object.freeze(normalized),
    schemaVersion: R2_INVENTORY_SCHEMA_VERSION,
    scope: "current-object-versions",
    totalBytes,
  });
}

export function validateR2InventoryDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("R2 inventory must be an object.");
  }
  if (document.schemaVersion !== R2_INVENTORY_SCHEMA_VERSION) {
    throw new Error(`schemaVersion must be ${R2_INVENTORY_SCHEMA_VERSION}.`);
  }
  if (document.bucket !== "goodgood") {
    throw new Error("R2 inventory bucket must be goodgood.");
  }
  if (document.scope !== "current-object-versions") {
    throw new Error("R2 inventory scope is unsupported.");
  }
  const normalized = createR2InventoryDocument({
    capturedAt: document.capturedAt,
    objects: document.objects,
  });
  if (
    document.objectCount !== normalized.objectCount ||
    document.totalBytes !== normalized.totalBytes ||
    document.inventorySha256 !== normalized.inventorySha256
  ) {
    throw new Error("R2 inventory summary or fingerprint does not match its objects.");
  }
  return normalized;
}

export function planR2CurrentObjectDeletion(document) {
  const inventory = validateR2InventoryDocument(document);
  return Object.freeze({
    action: "r2-current-object-deletion-dry-run",
    approvalBinding: `r2-goodgood-current:${inventory.inventorySha256}`,
    bucket: inventory.bucket,
    executed: false,
    executionAvailable: false,
    inventoryCapturedAt: inventory.capturedAt,
    inventorySha256: inventory.inventorySha256,
    objectCount: inventory.objectCount,
    requiresExactTargetApproval: true,
    requiresPostDeletionEmptyVerification: true,
    scope: inventory.scope,
    targets: inventory.objects,
    totalBytes: inventory.totalBytes,
  });
}
