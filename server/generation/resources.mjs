import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import pg from "pg";
import { createClient } from "redis";
import { loadGenerationConfig } from "./config.mjs";
import { isOssObjectKey } from "./object-storage-routing.mjs";

const { Pool } = pg;
let resourcesPromise;
const storagePreparation = new WeakMap();

function createS3Client(storage, endpoint, options = {}) {
  return new S3Client({
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey,
    },
    endpoint,
    forcePathStyle: storage.forcePathStyle,
    region: storage.region,
    ...options,
  });
}

export function routeStorageByKey(primary, ossData, ossBucketEndpoint, legacy, legacyBucket) {
  return {
    send(command) {
      const key = command.input?.Key;
      if (key && !isOssObjectKey(key)) {
        // R2 is retained for historical objects. New keys must carry oss/.
        if (command instanceof PutObjectCommand) {
          throw new Error("New objects cannot be written to legacy R2.");
        }
        return legacy.send(new command.constructor({
          ...command.input,
          Bucket: legacyBucket,
        }));
      }
      if (key) {
        // New-object data APIs use the OSS-bound CNAME. Mainland default
        // public endpoints can reject data APIs for newer OSS accounts.
        return ossData.send(new command.constructor({
          ...command.input,
          Bucket: ossBucketEndpoint,
        }));
      }
      return primary.send(command);
    },
    destroy() {
      primary.destroy();
      ossData.destroy();
      legacy.destroy();
    },
  };
}

export async function ensureObjectStorageBucket(client, bucket) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status !== 404 && error?.name !== "NotFound" && error?.name !== "NoSuchBucket") {
      throw error;
    }
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export function prepareObjectStorage(resources) {
  let pending = storagePreparation.get(resources);
  if (!pending) {
    pending = (async () => {
      const { bucket, provisioningMode, uploadAllowedOrigins } =
        resources.config.objectStorage;
      if (provisioningMode === "verify") {
        await resources.storage.send(new HeadBucketCommand({ Bucket: bucket }));
        return;
      }
      if (resources.config.objectStorage.providerKind === "oss") {
        throw new Error("OSS bucket provisioning and CORS are console-managed.");
      }
      await ensureObjectStorageBucket(resources.storage, bucket);
      await resources.storage.send(
        new PutBucketCorsCommand({
          Bucket: bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ["content-type", "x-amz-*"],
                AllowedMethods: ["GET", "HEAD", "PUT"],
                AllowedOrigins: uploadAllowedOrigins,
                ExposeHeaders: ["etag"],
                MaxAgeSeconds: 300,
              },
            ],
          },
        }),
      );
    })().catch((error) => {
      storagePreparation.delete(resources);
      throw error;
    });
    storagePreparation.set(resources, pending);
  }
  return pending;
}

async function createResources(environment) {
  const config = loadGenerationConfig(environment);
  const pool = new Pool({ connectionString: config.databaseUrl, max: 10 });
  pool.on("error", (error) => {
    console.error(
      JSON.stringify({ event: "postgres.pool_error", message: error.message }),
    );
  });
  const redis = createClient({ url: config.redisUrl });
  redis.on("error", (error) => {
    console.error(
      JSON.stringify({ event: "redis.error", message: error.message }),
    );
  });
  const primaryStorage = createS3Client(
    config.objectStorage, config.objectStorage.endpoint,
  );
  const legacyStorage = config.legacyR2
    ? createS3Client({ ...config.legacyR2, forcePathStyle: true }, config.legacyR2.endpoint)
    : null;
  const ossDataStorage = legacyStorage
    ? createS3Client(config.objectStorage, config.objectStorage.publicEndpoint,
        { bucketEndpoint: true, forcePathStyle: false })
    : null;
  const storage = legacyStorage
    ? routeStorageByKey(primaryStorage, ossDataStorage,
        config.objectStorage.publicEndpoint, legacyStorage, config.legacyR2.bucket)
    : primaryStorage;
  const publicStorage = createS3Client(
    config.objectStorage,
    config.objectStorage.publicEndpoint,
    config.objectStorage.providerKind === "oss"
      ? { bucketEndpoint: true, forcePathStyle: false }
      : {},
  );
  if (config.objectStorage.providerKind === "oss") {
    // S3 bucketEndpoint treats Bucket as the full CNAME URL when presigning PUT.
    Object.defineProperties(publicStorage, {
      uploadBucket: { value: config.objectStorage.publicEndpoint },
      readRoute: {
        value: {
          legacyBucket: config.legacyR2.bucket,
          legacyClient: legacyStorage,
          origin: config.objectStorage.assetReadOrigin,
          secret: config.objectStorage.assetReadSecret,
        },
      },
    });
  }

  return { config, pool, publicStorage, redis, storage };
}

export async function connectGenerationQueue(resources) {
  if (!resources.redis.isOpen) await resources.redis.connect();
}

export function getGenerationResources(environment = process.env) {
  resourcesPromise ??= createResources(environment).catch((error) => {
    resourcesPromise = undefined;
    throw error;
  });
  return resourcesPromise;
}

export async function closeGenerationResources() {
  if (!resourcesPromise) return;
  const current = await resourcesPromise;
  resourcesPromise = undefined;
  await Promise.allSettled([
    current.redis.isOpen ? current.redis.quit() : Promise.resolve(),
    current.pool.end(),
    current.storage.destroy(),
    current.publicStorage.destroy(),
  ]);
}

async function probeGenerationProvider(provider) {
  if (provider.kind === "mock") {
    const response = await fetch(`${provider.baseUrl}/health/ready`, {
      headers: { authorization: `Bearer ${provider.apiKey}` },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      throw new Error(`Generation provider returned ${response.status}.`);
    }
    return;
  }

  const response = await fetch(
    `${provider.baseUrl}/async/v1/tasks/goodgood-readiness-probe-not-a-task`,
    {
      headers: { authorization: `Bearer ${provider.apiKey}` },
      signal: AbortSignal.timeout(3_000),
    },
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`Generation provider returned ${response.status}.`);
  }
}

export async function probeGenerationResources(resources) {
  await connectGenerationQueue(resources);
  await Promise.all([
    resources.pool.query("SELECT 1"),
    resources.redis.ping(),
    resources.storage.send(
      new HeadBucketCommand({ Bucket: resources.config.objectStorage.bucket }),
    ),
    probeGenerationProvider(resources.config.provider),
  ]);
  return {
    database: "ok",
    objectStorage: "ok",
    provider: "ok",
    queue: "ok",
  };
}
