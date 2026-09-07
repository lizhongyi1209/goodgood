import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

const { Pool } = pg;

function requireRuntimeConfig(config) {
  if (!config?.databaseUrl) throw new Error("databaseUrl is required.");
  if (!config?.objectStorage?.bucket) {
    throw new Error("objectStorage.bucket is required.");
  }
  return config;
}

function requireLogger(logger) {
  if (!logger || typeof logger.error !== "function") {
    throw new Error("logger must provide an error function.");
  }
  return logger;
}

export function createAccountDeletionRuntimeResources(
  config,
  {
    PoolClass = Pool,
    StorageClientClass = S3Client,
    logger = console,
  } = {},
) {
  const runtimeConfig = requireRuntimeConfig(config);
  const runtimeLogger = requireLogger(logger);
  const pool = new PoolClass({
    connectionString: runtimeConfig.databaseUrl,
    max: 2,
  });
  pool.on?.("error", () => {
    runtimeLogger.error(
      JSON.stringify({
        alertCode: "ACCOUNT_DELETION_DATABASE_POOL_FAILED",
        event: "account_deletion.runtime_alert",
      }),
    );
  });
  const storage = new StorageClientClass({
    credentials: {
      accessKeyId: runtimeConfig.objectStorage.accessKeyId,
      secretAccessKey: runtimeConfig.objectStorage.secretAccessKey,
    },
    endpoint: runtimeConfig.objectStorage.endpoint,
    forcePathStyle: runtimeConfig.objectStorage.forcePathStyle,
    region: runtimeConfig.objectStorage.region,
  });

  let closed = false;
  return Object.freeze({
    async close() {
      if (closed) return;
      closed = true;
      const outcomes = await Promise.allSettled([
        pool.end(),
        Promise.resolve().then(() => storage.destroy()),
      ]);
      if (outcomes.some(({ status }) => status === "rejected")) {
        throw new Error("Account deletion resources could not close cleanly.");
      }
    },
    resources: Object.freeze({
      config: Object.freeze({
        objectStorage: Object.freeze({
          bucket: runtimeConfig.objectStorage.bucket,
        }),
      }),
      pool,
      storage,
    }),
    async verify() {
      await Promise.all([
        pool.query("SELECT 1"),
        storage.send(
          new HeadBucketCommand({ Bucket: runtimeConfig.objectStorage.bucket }),
        ),
      ]);
    },
  });
}
