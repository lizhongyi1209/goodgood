import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { loadGenerationConfig } from "../server/generation/config.mjs";
import { signAssetRead } from "../server/generation/storage.mjs";
import { isLocalCloudReference, newLocalCloudReferenceKey,
  routeLocalCloudReferences } from "../server/generation/local-cloud-reference.mjs";
import { signReferenceUpload } from "../server/references/storage.mjs";

test("local cloud upload configuration requires isolated state and external credentials", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "goodgood-gg111-"));
  try {
    const keyId = path.join(directory, "key-id");
    const secret = path.join(directory, "secret");
    await writeFile(keyId, "test-id");
    await writeFile(secret, "test-secret");
    const environment = {
      DATABASE_URL: "postgres://test@127.0.0.1:54449/goodgood",
      REDIS_URL: "redis://127.0.0.1:56449/0",
      OBJECT_STORAGE_ENDPOINT: "http://127.0.0.1:58049",
      OBJECT_STORAGE_PUBLIC_ENDPOINT: "http://127.0.0.1:58049",
      OBJECT_STORAGE_BUCKET: "goodgood-gg052-local",
      OBJECT_STORAGE_REGION: "us-east-1",
      OBJECT_STORAGE_ACCESS_KEY_ID: "local-id",
      OBJECT_STORAGE_SECRET_ACCESS_KEY: "local-secret",
      OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: "http://127.0.0.1:5173",
      GENERATION_API_BASE_URL: "https://cf-api.o1key.com",
      GENERATION_API_KEY: "test-provider-token",
      GENERATION_PROVIDER_KIND: "o1key",
      GOODGOOD_LOCAL_DEVELOPMENT_RUNTIME: "true",
      GOODGOOD_LOCAL_CLOUD_UPLOAD_BUCKET: "goodgood-dev-only",
      GOODGOOD_LOCAL_CLOUD_UPLOAD_REGION: "cn-guangzhou",
      GOODGOOD_LOCAL_CLOUD_UPLOAD_ENDPOINT: "https://oss-cn-guangzhou.aliyuncs.com",
      GOODGOOD_LOCAL_CLOUD_UPLOAD_PUBLIC_ENDPOINT: "https://upload-dev.example.cn",
      GOODGOOD_LOCAL_CLOUD_UPLOAD_ACCESS_KEY_ID_FILE: keyId,
      GOODGOOD_LOCAL_CLOUD_UPLOAD_SECRET_ACCESS_KEY_FILE: secret,
    };
    assert.equal(loadGenerationConfig(environment).cloudReference.bucket, "goodgood-dev-only");
    assert.equal(loadGenerationConfig({ ...environment,
      GOODGOOD_LOCAL_CLOUD_UPLOAD_BUCKET: "o1key-goodgood" }).cloudReference.bucket,
      "o1key-goodgood");
    assert.throws(() => loadGenerationConfig({ ...environment,
      DATABASE_URL: "postgres://test@db.example.com/goodgood" }), /isolated local database/);
    assert.throws(() => loadGenerationConfig({ ...environment,
      GOODGOOD_LOCAL_CLOUD_UPLOAD_PUBLIC_ENDPOINT: "http://upload-dev.example.cn" }), /HTTPS origin/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("new reference keys select cloud while prior keys stay on local storage", async () => {
  const calls = [];
  const local = { send(command) { calls.push(["local", command.input]); }, destroy() {} };
  const cloud = { send(command) { calls.push(["cloud", command.input]); }, destroy() {} };
  const routed = routeLocalCloudReferences(local, cloud, "https://upload-dev.example.cn");
  const cloudKey = newLocalCloudReferenceKey("references/a/original", {});
  assert.equal(isLocalCloudReference(cloudKey), true);
  assert.equal(cloudKey, "local-dev/references/a/original");
  assert.equal(newLocalCloudReferenceKey("references/a/original", null), "references/a/original");
  await routed.send(new GetObjectCommand({ Bucket: "local-bucket", Key: "references/old/original" }));
  await routed.send(new GetObjectCommand({ Bucket: "local-bucket", Key: cloudKey }));
  assert.deepEqual(calls.map(([kind, input]) => [kind, input.Bucket]), [
    ["local", "local-bucket"], ["cloud", "https://upload-dev.example.cn"],
  ]);
  assert.throws(() => routeLocalCloudReferences(local, null, null).send(
    new GetObjectCommand({ Bucket: "local-bucket", Key: cloudKey })), /needs the local cloud/);
});

test("reference PUT and signed read target the private cloud development host", async () => {
  const cloud = new S3Client({
    credentials: { accessKeyId: "test-id", secretAccessKey: "test-secret" },
    endpoint: "https://upload-dev.example.cn",
    bucketEndpoint: true,
    forcePathStyle: false,
    region: "cn-guangzhou",
  });
  const publicStorage = {
    cloudReferenceClient: cloud,
    cloudReferenceBucketEndpoint: "https://upload-dev.example.cn",
  };
  try {
    const key = "local-dev/references/a/original";
    const put = new URL(await signReferenceUpload({
      bucket: "goodgood-gg052-local", contentType: "image/png", key, publicStorage,
    }));
    const get = new URL(await signAssetRead({
      bucket: "goodgood-gg052-local", key, publicStorage,
    }));
    for (const url of [put, get]) {
      assert.equal(url.origin, "https://upload-dev.example.cn");
      assert.equal(url.pathname, `/${key}`);
      assert.equal(url.searchParams.get("X-Amz-Credential")?.includes("test-id"), true);
    }
  } finally {
    cloud.destroy();
  }
});
