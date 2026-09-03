import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { loadGenerationConfig } from "../server/generation/config.mjs";
import { downloadProviderOutput } from "../server/generation/provider.mjs";
import { createGenerationProvider } from "../server/generation/provider-router.mjs";
import { markProviderSubmissionStarted } from "../server/generation/repository.mjs";
import { prepareObjectStorage } from "../server/generation/resources.mjs";
import {
  parseArguments as parseO1KeyArguments,
  runtimeEnvironment as o1keyRuntimeEnvironment,
} from "../scripts/run-o1key-local.mjs";

const API_KEY = "m5-worker-fake-key";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function createFakeO1Key() {
  const requests = [];
  let polls = 0;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    assert.equal(request.headers.authorization, `Bearer ${API_KEY}`);
    if (request.method === "POST" && url.pathname === "/v1/o1key/uploads") {
      requests.push({ body: await readBody(request), operation: "upload" });
      sendJson(response, 200, {
        content_type: "image/png",
        expires_at: 1_900_000_000,
        filename: "reference.png",
        size: 68,
        url: "https://temporary.o1key.invalid/reference.png",
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/async/v1/generateImage") {
      requests.push({
        body: JSON.parse((await readBody(request)).toString("utf8")),
        operation: "submit",
      });
      sendJson(response, 200, { status: "SUBMITTED", task_id: "task-worker" });
      return;
    }
    if (request.method === "GET" && url.pathname === "/async/v1/tasks/task-worker") {
      polls += 1;
      if (polls === 1) {
        sendJson(response, 200, {
          progress: "60%",
          status: "IN_PROGRESS",
          task_id: "task-worker",
        });
        return;
      }
      sendJson(response, 200, {
        data: {
          images: [
            {
              mime_type: "image/png",
              url: "https://assetcache.o1key.invalid/result.png",
            },
          ],
        },
        progress: "100%",
        status: "SUCCESS",
        task_id: "task-worker",
      });
      return;
    }
    sendJson(response, 404, { error: "not_found" });
  });

  return {
    address: () => server.address(),
    close: () => new Promise((resolve) => server.close(resolve)),
    listen: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          server.off("error", reject);
          resolve();
        });
      }),
    requests,
  };
}

function baseEnvironment() {
  return {
    DATABASE_URL: "postgres://goodgood:test@127.0.0.1/goodgood",
    GENERATION_API_BASE_URL: "http://mock-generation:3002",
    GENERATION_API_KEY: "local-mock-key",
    GENERATION_PROVIDER_KIND: "mock",
    OBJECT_STORAGE_ACCESS_KEY_ID: "local-access",
    OBJECT_STORAGE_BUCKET: "goodgood-private",
    OBJECT_STORAGE_ENDPOINT: "http://127.0.0.1:9000",
    OBJECT_STORAGE_REGION: "us-east-1",
    OBJECT_STORAGE_SECRET_ACCESS_KEY: "local-secret",
    OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: "http://127.0.0.1:3000",
    REDIS_URL: "redis://127.0.0.1:6379",
  };
}

test("O1Key worker route reads private reference bytes, uploads, and resumes polling", async (context) => {
  const fake = createFakeO1Key();
  await fake.listen();
  context.after(() => fake.close());
  const address = fake.address();
  assert.ok(address && typeof address === "object");
  const storedBytes = Buffer.from("decoded-reference-bytes");
  const storageReads = [];
  const storage = {
    async send(command) {
      storageReads.push(command.input);
      return {
        Body: {
          async transformToByteArray() {
            return storedBytes;
          },
        },
        ContentType: "image/png",
        ContentLength: storedBytes.length,
      };
    },
  };
  const provider = createGenerationProvider({
    config: {
      objectStorage: { bucket: "goodgood-private" },
      provider: {
        allowInsecureLoopback: true,
        apiKey: API_KEY,
        baseUrl: `http://127.0.0.1:${address.port}`,
        kind: "o1key",
        pollIntervalMs: 1,
        requestTimeoutMs: 1_000,
        timeoutMs: 100,
      },
    },
    publicStorage: null,
    storage,
  });

  assert.deepEqual(provider.route, {
    aspectRatio: "1:1",
    outputCount: 1,
    productModelId: "nano-banana-2",
    provider: "o1key",
    providerModel: "gemini-3.1-flash-image-c-sp",
    resolution: "1K",
    routeVersion: "o1key-gemini-3.1-flash-image-c-sp-v1",
  });
  const attempt = {
    provider: "o1key",
    provider_model: provider.route.providerModel,
    route_version: provider.route.routeVersion,
  };
  provider.assertAttempt(attempt);
  assert.throws(
    () => provider.assertAttempt({ ...attempt, provider: "goodgood-mock" }),
    /does not match/,
  );

  let submissionStartCount = 0;
  const taskId = await provider.createTask({
    attempt,
    job: {
      aspect_ratio: "1:1",
      model_id: "nano-banana-2",
      prompt: "keep the subject and simplify the background",
      reference_snapshot: [
        {
          name: "reference.png",
          objectKey: "references/owner/reference/original",
          ordinal: 1,
        },
      ],
      requested_count: 1,
      resolution: "1K",
    },
    onSubmissionStart: async () => {
      submissionStartCount += 1;
      assert.deepEqual(
        fake.requests.map((request) => request.operation),
        ["upload"],
      );
    },
  });
  assert.equal(taskId, "task-worker");
  assert.equal(submissionStartCount, 1);
  assert.deepEqual(storageReads, [
    { Bucket: "goodgood-private", Key: "references/owner/reference/original" },
  ]);
  assert.deepEqual(
    fake.requests.map((request) => request.operation),
    ["upload", "submit"],
  );
  assert.deepEqual(fake.requests[1].body.images, [
    {
      fileData: {
        fileUri: "https://temporary.o1key.invalid/reference.png",
        mimeType: "image/png",
      },
    },
  ]);

  let refiningCount = 0;
  const output = await provider.pollTask({
    onRefining: async () => {
      refiningCount += 1;
    },
    taskId,
  });
  assert.equal(refiningCount, 1);
  assert.equal(output.url, "https://assetcache.o1key.invalid/result.png");
});

test("downloaded provider output is fully decoded instead of trusting metadata", async () => {
  const bytes = await readFile(
    new URL("../public/nano-fashion.png", import.meta.url),
  );
  const downloaded = await downloadProviderOutput({
    mimeType: "image/png",
    url: `data:image/png;base64,${bytes.toString("base64")}`,
  });
  assert.equal(downloaded.contentType, "image/png");
  assert.ok(downloaded.width > 0);
  assert.ok(downloaded.height > 0);
  assert.deepEqual(downloaded.bytes, bytes);
});

test("O1Key-style output delivery can retry a transient unavailable response", async () => {
  const bytes = await readFile(
    new URL("../public/nano-fashion.png", import.meta.url),
  );
  let attempts = 0;
  let sleeps = 0;
  const downloaded = await downloadProviderOutput(
    {
      mimeType: "image/png",
      url: "https://assetcache.o1key.invalid/eventual-result.png",
    },
    {
      fetchImplementation: async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response("not ready", { status: 404 });
        }
        return new Response(bytes, {
          headers: { "content-type": "image/png" },
          status: 200,
        });
      },
      maxAttempts: 3,
      retryDelayMs: 1,
      sleep: async () => {
        sleeps += 1;
      },
    },
  );

  assert.equal(attempts, 2);
  assert.equal(sleeps, 1);
  assert.equal(downloaded.contentType, "image/png");
  assert.deepEqual(downloaded.bytes, bytes);
});

test("generation configuration accepts one secret source and explicit provider kind", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "goodgood-m5-provider-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const keyFile = path.join(directory, "o1key-api-key");
  const storageAccessKeyFile = path.join(directory, "storage-access-key");
  const storageSecretKeyFile = path.join(directory, "storage-secret-key");
  await Promise.all([
    writeFile(keyFile, "file-only-test-key\n", { mode: 0o600 }),
    writeFile(storageAccessKeyFile, "file-only-storage-access\n", {
      mode: 0o600,
    }),
    writeFile(storageSecretKeyFile, "file-only-storage-secret\n", {
      mode: 0o600,
    }),
  ]);

  const environment = {
    ...baseEnvironment(),
    GENERATION_API_BASE_URL: "https://cf-api.o1key.com",
    GENERATION_API_KEY: undefined,
    GENERATION_API_KEY_FILE: keyFile,
    GENERATION_PROVIDER_KIND: "o1key",
    OBJECT_STORAGE_ACCESS_KEY_ID: undefined,
    OBJECT_STORAGE_ACCESS_KEY_ID_FILE: storageAccessKeyFile,
    OBJECT_STORAGE_SECRET_ACCESS_KEY: undefined,
    OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE: storageSecretKeyFile,
  };
  const config = loadGenerationConfig(environment);
  assert.equal(config.provider.apiKey, "file-only-test-key");
  assert.equal(config.objectStorage.provisioningMode, "manage");
  assert.equal(config.provider.kind, "o1key");
  assert.equal(config.objectStorage.accessKeyId, "file-only-storage-access");
  assert.equal(config.objectStorage.secretAccessKey, "file-only-storage-secret");
  assert.throws(
    () => loadGenerationConfig({ ...environment, GENERATION_API_KEY: "duplicate" }),
    /mutually exclusive/,
  );
  assert.throws(
    () => loadGenerationConfig({ ...environment, GENERATION_PROVIDER_KIND: "unknown" }),
    /must be mock or o1key/,
  );
  assert.throws(
    () =>
      loadGenerationConfig({
        ...environment,
        OBJECT_STORAGE_ACCESS_KEY_ID: "duplicate",
      }),
    /OBJECT_STORAGE_ACCESS_KEY_ID and OBJECT_STORAGE_ACCESS_KEY_ID_FILE are mutually exclusive/,
  );
  assert.throws(
    () =>
      loadGenerationConfig({
        ...environment,
        OBJECT_STORAGE_PROVISIONING_MODE: "create-if-convenient",
      }),
    /OBJECT_STORAGE_PROVISIONING_MODE must be manage or verify/,
  );
});

test("object-storage provisioning is mutable locally and verification-only in staging", async () => {
  const commands = [];
  const managed = {
    config: {
      objectStorage: {
        bucket: "goodgood-private",
        provisioningMode: "manage",
        uploadAllowedOrigins: ["http://127.0.0.1:3000"],
      },
    },
    storage: {
      async send(command) {
        commands.push(command.constructor.name);
      },
    },
  };
  await prepareObjectStorage(managed);
  assert.deepEqual(commands, ["HeadBucketCommand", "PutBucketCorsCommand"]);

  let attempts = 0;
  const verified = {
    config: {
      objectStorage: {
        bucket: "goodgood",
        provisioningMode: "verify",
        uploadAllowedOrigins: ["https://goodgood.o1key.com"],
      },
    },
    storage: {
      async send(command) {
        attempts += 1;
        assert.equal(command.constructor.name, "HeadBucketCommand");
        if (attempts === 1) throw new Error("temporary R2 failure");
      },
    },
  };
  await assert.rejects(prepareObjectStorage(verified), /temporary R2 failure/);
  await prepareObjectStorage(verified);
  assert.equal(attempts, 2);
});

test("worker persists the selected provider route and exposes charged-retry recovery", async () => {
  const [repository, worker, workspace, contract] = await Promise.all([
    readFile(new URL("../server/generation/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/generation/worker-service.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../shared/contracts/generation.ts", import.meta.url), "utf8"),
  ]);
  assert.match(repository, /attemptRoute\.routeVersion/);
  assert.match(repository, /attemptRoute\.providerModel/);
  assert.doesNotMatch(repository, /VALUES \(\$1, \$2, \$3, 'm3-mock-v1'/);
  assert.match(worker, /attemptRoute: provider\.route/);
  assert.match(worker, /provider\.assertAttempt\(attempt\)/);
  assert.match(worker, /attempt\.state !== "created"/);
  assert.match(worker, /markProviderSubmissionStarted/);
  assert.match(worker, /SUBMISSION_UNKNOWN/);
  assert.match(contract, /"SUBMISSION_UNKNOWN"/);
  assert.match(workspace, /再次提交（将再次计费）/);
});

test("provider submission guard is a one-way persisted transition", async () => {
  const queries = [];
  const pool = {
    async query(sql, parameters) {
      queries.push({ parameters, sql });
      return { rowCount: queries.length === 1 ? 1 : 0 };
    },
  };

  assert.equal(
    await markProviderSubmissionStarted(pool, { attemptId: "attempt-1" }),
    true,
  );
  assert.equal(
    await markProviderSubmissionStarted(pool, { attemptId: "attempt-1" }),
    false,
  );
  assert.match(queries[0].sql, /state = 'submitted'/);
  assert.match(queries[0].sql, /state = 'created'/);
  assert.match(queries[0].sql, /provider_task_id IS NULL/);
  assert.deepEqual(queries[0].parameters, ["attempt-1"]);
});

test("O1Key local runner mounts an invisible temporary key into only the worker", async () => {
  assert.deepEqual(parseO1KeyArguments(["--web-port", "3200"]), {
    help: false,
    webPort: "3200",
  });
  assert.throws(() => parseO1KeyArguments(["--web-port", "0"]), /1 to 65535/);
  const environment = o1keyRuntimeEnvironment({
    secretFile: "C:\\temp\\o1key-api-key",
    webPort: "3200",
  });
  assert.equal(environment.GOODGOOD_O1KEY_API_KEY_FILE, "C:\\temp\\o1key-api-key");
  assert.equal(environment.GOODGOOD_WEB_PORT, "3200");
  assert.equal(environment.GENERATION_API_KEY, process.env.GENERATION_API_KEY);

  const [composeOverride, launcher, packageJson] = await Promise.all([
    readFile(new URL("../compose.o1key-local.yaml", import.meta.url), "utf8"),
    readFile(new URL("../scripts/run-o1key-local.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(composeOverride, /GENERATION_PROVIDER_KIND: o1key/);
  assert.match(composeOverride, /GENERATION_API_KEY: ""/);
  assert.match(composeOverride, /GENERATION_API_KEY_FILE: \/run\/secrets\/goodgood_o1key_api_key/);
  assert.doesNotMatch(composeOverride, /web:[\s\S]*goodgood_o1key_api_key/);
  assert.match(launcher, /goodgood-o1key-local/);
  assert.match(launcher, /mode: 0o600/);
  assert.match(packageJson, /"stack:o1key-local"/);
});
