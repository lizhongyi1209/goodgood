import { readFileSync } from "node:fs";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { createR2InventoryDocument } from "../generation/r2-inventory-contract.mjs";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function mountedSecret(name) {
  const directName = name.replace(/_FILE$/, "");
  if (process.env[directName]) {
    throw new Error(`${directName} is forbidden for production R2 inventory.`);
  }
  const file = required(name);
  const value = readFileSync(file, "utf8").trim();
  if (!value) throw new Error(`${name} is empty.`);
  return value;
}

async function main() {
  if (required("OBJECT_STORAGE_BUCKET") !== "goodgood") {
    throw new Error("OBJECT_STORAGE_BUCKET must be goodgood.");
  }
  if (required("OBJECT_STORAGE_REGION") !== "auto") {
    throw new Error("OBJECT_STORAGE_REGION must be auto.");
  }
  if (required("OBJECT_STORAGE_PROVISIONING_MODE") !== "verify") {
    throw new Error("OBJECT_STORAGE_PROVISIONING_MODE must be verify.");
  }

  const client = new S3Client({
    credentials: {
      accessKeyId: mountedSecret("OBJECT_STORAGE_ACCESS_KEY_ID_FILE"),
      secretAccessKey: mountedSecret("OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE"),
    },
    endpoint: required("OBJECT_STORAGE_ENDPOINT"),
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false",
    region: "auto",
  });
  const objects = [];
  let continuationToken;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: "goodgood",
        ContinuationToken: continuationToken,
      }),
    );
    for (const item of page.Contents ?? []) {
      if (
        typeof item.Key !== "string" ||
        !Number.isSafeInteger(item.Size) ||
        !(item.LastModified instanceof Date) ||
        typeof item.ETag !== "string"
      ) {
        throw new Error("R2 returned incomplete object metadata.");
      }
      objects.push({
        etag: item.ETag,
        key: item.Key,
        lastModified: item.LastModified.toISOString(),
        size: item.Size,
      });
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
    if (page.IsTruncated && !continuationToken) {
      throw new Error("R2 returned a truncated page without a continuation token.");
    }
  } while (continuationToken);

  process.stdout.write(
    `${JSON.stringify(
      createR2InventoryDocument({
        capturedAt: new Date().toISOString(),
        objects,
      }),
      null,
      2,
    )}\n`,
  );
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      error: error instanceof Error ? error.message : "R2 inventory failed.",
      executed: false,
      operation: "list-current-object-metadata-only",
    })}\n`,
  );
  process.exitCode = 1;
}
