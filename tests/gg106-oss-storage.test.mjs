import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";
import {
  isOssObjectKey,
  newObjectKey,
  signOssAssetRead,
} from "../server/generation/object-storage-routing.mjs";
import { signAssetRead } from "../server/generation/storage.mjs";
import { routeStorageByKey } from "../server/generation/resources.mjs";
import { signReferenceUpload } from "../server/references/storage.mjs";

const credentials = {
  accessKeyId: "fixture-access-key",
  secretAccessKey: "fixture-secret-key",
};

test("new OSS keys are distinct from historical R2 keys", () => {
  assert.equal(newObjectKey("references/a/original", { providerKind: "oss" }),
    "oss/references/a/original");
  assert.equal(newObjectKey("references/a/original", { providerKind: "r2" }),
    "references/a/original");
  assert.equal(newObjectKey("references/a/original", {
    providerKind: "oss", emergencyR2Writes: true,
  }), "references/a/original");
  assert.equal(isOssObjectKey("oss/references/a/original"), true);
  assert.equal(isOssObjectKey("references/a/original"), false);
});

test("ESA read URL signs the encoded key and expires after 15 minutes", () => {
  const secret = "fixture-asset-read-secret-with-more-than-32-characters";
  const url = new URL(signOssAssetRead({
    key: "oss/generated/a b.png",
    origin: "https://oss-goodgood.o1key.cn",
    secret,
    now: 1_790_200_000_000,
  }));
  assert.equal(url.origin, "https://oss-goodgood.o1key.cn");
  assert.equal(url.pathname, "/oss/generated/a%20b.png");
  assert.equal(url.searchParams.get("gg_exp"), "1790200900");
  assert.equal(url.searchParams.get("gg_sig"), createHmac("sha256", secret)
    .update(`${url.pathname}\n1790200900`).digest("hex"));
  assert.throws(() => signOssAssetRead({
    key: "generated/old.png",
    origin: url.origin,
    secret,
  }));
});

test("OSS upload uses the direct CNAME and historical reads stay on R2", async () => {
  const legacyClient = new S3Client({
    credentials,
    endpoint: "https://account.r2.cloudflarestorage.com",
    forcePathStyle: true,
    region: "auto",
  });
  const uploadClient = new S3Client({
    bucketEndpoint: true,
    credentials,
    endpoint: "https://upload-goodgood.o1key.cn",
    forcePathStyle: false,
    region: "cn-guangzhou",
  });
  Object.defineProperties(uploadClient, {
    uploadBucket: { value: "https://upload-goodgood.o1key.cn" },
    readRoute: { value: {
      legacyBucket: "goodgood",
      legacyClient,
      origin: "https://oss-goodgood.o1key.cn",
      secret: "fixture-asset-read-secret-with-more-than-32-characters",
    } },
  });
  try {
    const upload = new URL(await signReferenceUpload({
      bucket: "o1key-goodgood",
      contentType: "image/png",
      key: "oss/references/a/original",
      publicStorage: uploadClient,
    }));
    assert.equal(upload.origin, "https://upload-goodgood.o1key.cn");
    assert.equal(upload.pathname, "/oss/references/a/original");
    const emergencyUpload = new URL(await signReferenceUpload({
      bucket: "o1key-goodgood",
      contentType: "image/png",
      key: "references/a/original",
      publicStorage: uploadClient,
    }));
    assert.equal(emergencyUpload.host, "account.r2.cloudflarestorage.com");
    assert.equal(emergencyUpload.pathname, "/goodgood/references/a/original");
    const oldRead = new URL(await signAssetRead({
      bucket: "o1key-goodgood",
      key: "generated/old.png",
      publicStorage: uploadClient,
    }));
    assert.equal(oldRead.host, "account.r2.cloudflarestorage.com");
    assert.equal(oldRead.pathname, "/goodgood/generated/old.png");
    const newRead = new URL(await signAssetRead({
      bucket: "o1key-goodgood",
      key: "oss/generated/new.png",
      publicStorage: uploadClient,
    }));
    assert.equal(newRead.host, "oss-goodgood.o1key.cn");
    assert.equal(newRead.pathname, "/oss/generated/new.png");
  } finally {
    uploadClient.destroy();
    legacyClient.destroy();
  }
});

test("object operations route by key and reject new writes to R2", async () => {
  const calls = [];
  const client = (name) => ({
    send: async (command) => {
      calls.push({ name, bucket: command.input.Bucket, key: command.input.Key });
      return {};
    },
    destroy() {},
  });
  const route = routeStorageByKey(client("primary"), client("oss"),
    "https://upload-goodgood.o1key.cn", client("r2"), "goodgood");
  await route.send(new GetObjectCommand({ Bucket: "o1key-goodgood", Key: "oss/generated/new" }));
  await route.send(new GetObjectCommand({ Bucket: "o1key-goodgood", Key: "generated/old" }));
  assert.throws(() => route.send(new PutObjectCommand({
    Bucket: "o1key-goodgood", Key: "generated/unprefixed", Body: "x",
  })), /cannot be written to legacy R2/);
  assert.deepEqual(calls, [
    { name: "oss", bucket: "https://upload-goodgood.o1key.cn", key: "oss/generated/new" },
    { name: "r2", bucket: "goodgood", key: "generated/old" },
  ]);
  const emergencyRoute = routeStorageByKey(client("primary"), client("oss"),
    "https://upload-goodgood.o1key.cn", client("r2"), "goodgood",
    { allowLegacyWrites: true });
  await emergencyRoute.send(new PutObjectCommand({
    Bucket: "o1key-goodgood", Key: "generated/emergency", Body: "x",
  }));
  assert.deepEqual(calls.at(-1), {
    name: "r2", bucket: "goodgood", key: "generated/emergency",
  });
  await emergencyRoute.send(new HeadBucketCommand({ Bucket: "o1key-goodgood" }));
  assert.deepEqual(calls.at(-1), {
    name: "r2", bucket: "goodgood", key: undefined,
  });
});

test("ESA bypass guard accepts only matching unexpired read tokens", async () => {
  const source = await readFile(new URL("../infra/esa/goodgood-asset-read-guard.mjs", import.meta.url), "utf8");
  const injected = source.replace('import { env } from "alibaba:workers";',
    "const env = globalThis.__gg106EdgeEnv;");
  const previousEnv = globalThis.__gg106EdgeEnv;
  const previousBypass = globalThis.ResponseBypass;
  const secret = "fixture-asset-read-secret-with-more-than-32-characters";
  globalThis.__gg106EdgeEnv = { GOODGOOD_ASSET_READ_SECRET: secret };
  globalThis.ResponseBypass = class {
    constructor(allowed, options = {}) { this.allowed = allowed; this.status = options.status; }
  };
  try {
    const guard = (await import(`data:text/javascript;base64,${Buffer.from(injected).toString("base64")}`)).default;
    const valid = signOssAssetRead({
      key: "oss/generated/probe.png", origin: "https://oss-goodgood.o1key.cn", secret,
    });
    const check = (url, method = "GET", headers) => guard.bypass(new Request(url, { method, headers }));
    assert.equal((await check(valid)).allowed, true);
    assert.equal((await check(valid, "HEAD")).allowed, true);
    assert.equal((await check(valid, "POST")).status, 403);
    assert.equal((await check(`${valid}&response-content-type=text/plain`)).status, 403);
    assert.equal((await check(valid.replace("probe.png", "other.png"))).status, 403);
    assert.equal((await check(valid.replace("gg_sig=", "gg_sig=0"))).status, 403);
    const expired = signOssAssetRead({
      key: "oss/generated/probe.png", origin: "https://oss-goodgood.o1key.cn",
      secret, now: Date.now() - 20 * 60_000,
    });
    assert.equal((await check(expired)).status, 403);
    const probe = signOssAssetRead({
      key: "oss/gg106-probe/Probe.txt", origin: "https://oss-goodgood.o1key.cn", secret,
    });
    assert.equal((await check(probe)).allowed, true);
    globalThis.__gg106EdgeEnv.GOODGOOD_ASSET_READ_SECRET = undefined;
    assert.equal((await check(probe)).status, 403);
    globalThis.__gg106EdgeEnv.GOODGOOD_ASSET_READ_SECRET = `${secret}-wrong`;
    assert.equal((await check(probe)).status, 403);
    assert.equal((await check(probe.replace("oss-goodgood.o1key.cn", "elsewhere.example"))).status, 403);
    const ping = { "x-gg106-diag": "ping" };
    const stage = { "x-gg106-diag": "stage" };
    assert.equal((await check(probe, "GET", ping)).status, 403);
    assert.equal((await check(probe.replace("oss-goodgood.o1key.cn", "elsewhere.example"), "GET", stage)).status, 403);
    assert.equal((await check(probe, "GET", stage)).status, 403);
    globalThis.__gg106EdgeEnv.GOODGOOD_ASSET_READ_SECRET = undefined;
    assert.equal((await check(probe, "GET", stage)).status, 403);
    globalThis.__gg106EdgeEnv.GOODGOOD_ASSET_READ_SECRET = secret;
    assert.equal((await check(probe, "GET", stage)).allowed, true);
  } finally {
    globalThis.__gg106EdgeEnv = previousEnv;
    globalThis.ResponseBypass = previousBypass;
  }
});
