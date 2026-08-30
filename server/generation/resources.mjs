import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import pg from "pg";
import { createClient } from "redis";
import { loadGenerationConfig } from "./config.mjs";

const { Pool } = pg;
let resourcesPromise;

function createS3Client(storage, endpoint) {
  return new S3Client({
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey,
    },
    endpoint,
    forcePathStyle: storage.forcePathStyle,
    region: storage.region,
  });
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

async function createResources(environment) {
  const config = loadGenerationConfig(environment);
  const pool = new Pool({ connectionString: config.databaseUrl, max: 10 });
  const redis = createClient({ url: config.redisUrl });
  redis.on("error", (error) => {
    console.error(
      JSON.stringify({ event: "redis.error", message: error.message }),
    );
  });
  const storage = createS3Client(config.objectStorage, config.objectStorage.endpoint);
  const publicStorage = createS3Client(
    config.objectStorage,
    config.objectStorage.publicEndpoint,
  );

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

export async function probeGenerationResources(resources) {
  await connectGenerationQueue(resources);
  await Promise.all([
    resources.pool.query("SELECT 1"),
    resources.redis.ping(),
    resources.storage.send(
      new HeadBucketCommand({ Bucket: resources.config.objectStorage.bucket }),
    ),
    fetch(`${resources.config.provider.baseUrl}/health/ready`, {
      headers: { authorization: `Bearer ${resources.config.provider.apiKey}` },
      signal: AbortSignal.timeout(3_000),
    }).then((response) => {
      if (!response.ok) throw new Error(`Generation provider returned ${response.status}.`);
    }),
  ]);
  return {
    database: "ok",
    objectStorage: "ok",
    provider: "ok",
    queue: "ok",
  };
}
