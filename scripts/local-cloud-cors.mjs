import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const [configFile, action = "inspect"] = process.argv.slice(2);
assert.ok(configFile && ["inspect", "append-5173"].includes(action),
  "Usage: node scripts/local-cloud-cors.mjs <external cloud-upload.env> [inspect|append-5173]");
const environment = parseEnv(await readFile(configFile, "utf8"));
assert.equal(environment.GOODGOOD_LOCAL_CLOUD_UPLOAD_BUCKET, "o1key-goodgood");
assert.equal(environment.GOODGOOD_LOCAL_CLOUD_UPLOAD_REGION, "cn-guangzhou");
const credentials = {
  accessKeyId: (await readFile(environment.GOODGOOD_LOCAL_CLOUD_UPLOAD_ACCESS_KEY_ID_FILE, "utf8")).trim(),
  secretAccessKey: (await readFile(environment.GOODGOOD_LOCAL_CLOUD_UPLOAD_SECRET_ACCESS_KEY_FILE, "utf8")).trim(),
};
const client = new S3Client({
  credentials,
  endpoint: environment.GOODGOOD_LOCAL_CLOUD_UPLOAD_ENDPOINT,
  forcePathStyle: false,
  region: environment.GOODGOOD_LOCAL_CLOUD_UPLOAD_REGION,
});
const bucket = environment.GOODGOOD_LOCAL_CLOUD_UPLOAD_BUCKET;
try {
  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  const rules = current.CORSRules ?? [];
  const productionOrigin = "https://goodgood.o1key.com";
  assert.ok(rules.some((rule) => rule.AllowedOrigins?.includes(productionOrigin)),
    "The existing production CORS origin was not found; refusing to replace rules.");
  console.log(JSON.stringify({ event: "cloud_cors.inspected", rules: rules.map((rule) => ({
    origins: rule.AllowedOrigins, methods: rule.AllowedMethods,
  })) }));
  if (action === "append-5173") {
    const origin = "http://127.0.0.1:5173";
    if (!rules.some((rule) => rule.AllowedOrigins?.includes(origin) &&
        rule.AllowedMethods?.includes("PUT") &&
        rule.AllowedHeaders?.some((header) => ["*", "content-type"].includes(header.toLowerCase())))) {
      await client.send(new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [...rules, {
            AllowedHeaders: ["content-type"],
            AllowedMethods: ["PUT"],
            AllowedOrigins: [origin],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 600,
          }],
        },
      }));
    }
    console.log(JSON.stringify({ event: "cloud_cors.appended", origin }));
  }
} catch (error) {
  console.error(JSON.stringify({ event: "cloud_cors.failed",
    code: error?.name ?? "UnknownError", status: error?.$metadata?.httpStatusCode ?? null }));
  process.exitCode = 1;
} finally {
  client.destroy();
}
