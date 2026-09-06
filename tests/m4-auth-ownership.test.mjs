import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import test from "node:test";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { createRequestAuthenticator } from "../server/auth/request-authenticator.mjs";
import { GenerationRequestError } from "../server/generation/api.mjs";
import { createGenerationNodeApiHandler } from "../server/generation/node-api.mjs";

const LOCAL_AUTH_ENVIRONMENT = Object.freeze({
  GOODGOOD_ALLOW_LOCAL_AUTH: "true",
  GOODGOOD_AUTH_ISSUER: "goodgood-local",
  GOODGOOD_AUTH_MODE: "local",
  GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN: "goodgood-local-user-a-token",
  GOODGOOD_LOCAL_AUTH_TOKENS:
    "goodgood-local-user-a-token=local-user-a,goodgood-local-user-b-token=local-user-b",
});

test("local authentication requires an explicit local-only opt-in", () => {
  const unsafeEnvironment = { ...LOCAL_AUTH_ENVIRONMENT };
  delete unsafeEnvironment.GOODGOOD_ALLOW_LOCAL_AUTH;

  assert.throws(
    () => loadAuthenticationConfig(unsafeEnvironment),
    /GOODGOOD_AUTH_MODE=local requires GOODGOOD_ALLOW_LOCAL_AUTH=true/,
  );
});

const OWNER_BY_SUBJECT = Object.freeze({
  "local-user-a": "00000000-0000-4000-8000-000000000001",
  "local-user-b": "00000000-0000-4000-8000-000000000002",
});

function authenticationPool(statusBySubject = {}) {
  return {
    async query(_sql, values) {
      const subject = values[1];
      const ownerId = OWNER_BY_SUBJECT[subject];
      return {
        rows: ownerId
          ? [
              {
                locale: "zh-CN",
                owner_id: ownerId,
                status: statusBySubject[subject] ?? "active",
              },
            ]
          : [],
      };
    },
  };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("local authentication maps bearer and HttpOnly-cookie credentials to internal owners", async () => {
  const config = loadAuthenticationConfig(LOCAL_AUTH_ENVIRONMENT);
  const authenticate = createRequestAuthenticator({
    config,
    getPool: async () => authenticationPool(),
  });

  const ownerA = await authenticate({
    headers: new Headers({
      authorization: "Bearer goodgood-local-user-a-token",
    }),
  });
  const ownerB = await authenticate({
    headers: new Headers({
      cookie: "goodgood_local_session=goodgood-local-user-b-token",
    }),
  });
  assert.equal(ownerA.ownerId, OWNER_BY_SUBJECT["local-user-a"]);
  assert.equal(ownerB.ownerId, OWNER_BY_SUBJECT["local-user-b"]);
  assert.deepEqual(ownerA.identity, {
    issuer: "goodgood-local",
    subject: "local-user-a",
  });

  await assert.rejects(
    authenticate({ headers: new Headers() }),
    (error) => error.code === "SESSION_EXPIRED" && error.status === 401,
  );
  await assert.rejects(
    authenticate({
      headers: new Headers({ authorization: "Bearer invalid-local-token" }),
    }),
    (error) => error.code === "SESSION_EXPIRED" && error.status === 401,
  );

  const authenticateSuspended = createRequestAuthenticator({
    config,
    getPool: async () =>
      authenticationPool({ "local-user-a": "suspended" }),
  });
  await assert.rejects(
    authenticateSuspended({
      headers: new Headers({
        authorization: "Bearer goodgood-local-user-a-token",
      }),
    }),
    (error) => error.code === "ACCOUNT_SUSPENDED" && error.status === 403,
  );
});

test("generation HTTP reads and writes require and preserve the authenticated owner context", async (context) => {
  const config = loadAuthenticationConfig(LOCAL_AUTH_ENVIRONMENT);
  const authenticate = createRequestAuthenticator({
    config,
    getPool: async () => authenticationPool(),
  });
  const jobs = new Map();
  const operations = {
    async submitGeneration({ idempotencyKey, ownerContext }) {
      const scopedKey = `${ownerContext.ownerId}:${idempotencyKey}`;
      const existing = jobs.get(scopedKey);
      if (existing) return { created: false, job: existing };
      const job = {
        id: `job-${jobs.size + 1}`,
        ownerId: ownerContext.ownerId,
        previewUrl: `https://assets.invalid/${ownerContext.ownerId}/signed`,
      };
      jobs.set(scopedKey, job);
      return { created: true, job };
    },
    async readGeneration({ jobId, ownerContext }) {
      const job = [...jobs.values()].find(
        (candidate) =>
          candidate.id === jobId && candidate.ownerId === ownerContext.ownerId,
      );
      if (!job) {
        throw new GenerationRequestError(
          "GENERATION_NOT_FOUND",
          "未找到该生成任务。",
          404,
        );
      }
      return job;
    },
    async retryGeneration({ jobId, ownerContext }) {
      const source = await this.readGeneration({ jobId, ownerContext });
      return {
        created: true,
        job: { ...source, id: `${source.id}-retry` },
      };
    },
  };
  const handler = createGenerationNodeApiHandler({ authenticate, operations });
  const server = createHttpServer((request, response) => {
    void handler(request, response);
  });
  const origin = await listen(server);
  context.after(() => close(server));

  const input = {
    aspectRatio: "4:5",
    count: 1,
    modelId: "nano-banana-2",
    prompt: "owner isolation",
    references: [],
    resolution: "2K",
  };
  const submit = (token) =>
    fetch(`${origin}/api/generations`, {
      body: JSON.stringify(input),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "idempotency-key": "same-owner-scoped-key",
      },
      method: "POST",
    });

  const unauthorized = await fetch(`${origin}/api/generations`, {
    body: JSON.stringify(input),
    headers: {
      "content-type": "application/json",
      "idempotency-key": "missing-session-key",
    },
    method: "POST",
  });
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).error.code, "SESSION_EXPIRED");

  const ownerAResponse = await submit("goodgood-local-user-a-token");
  const ownerBResponse = await submit("goodgood-local-user-b-token");
  assert.equal(ownerAResponse.status, 202);
  assert.equal(ownerBResponse.status, 202);
  const ownerAJob = await ownerAResponse.json();
  const ownerBJob = await ownerBResponse.json();
  assert.notEqual(ownerAJob.id, ownerBJob.id);
  assert.notEqual(ownerAJob.previewUrl, ownerBJob.previewUrl);

  const crossOwnerRead = await fetch(
    `${origin}/api/generations/${ownerAJob.id}`,
    {
      headers: {
        authorization: "Bearer goodgood-local-user-b-token",
      },
    },
  );
  assert.equal(crossOwnerRead.status, 404);
  assert.equal((await crossOwnerRead.json()).error.code, "GENERATION_NOT_FOUND");

  const crossOwnerRetry = await fetch(
    `${origin}/api/generations/${ownerAJob.id}/retry`,
    {
      headers: {
        authorization: "Bearer goodgood-local-user-b-token",
        "idempotency-key": "owner-b-cross-retry",
      },
      method: "POST",
    },
  );
  assert.equal(crossOwnerRetry.status, 404);

  const ownerRead = await fetch(
    `${origin}/api/generations/${ownerAJob.id}`,
    {
      headers: {
        authorization: "Bearer goodgood-local-user-a-token",
      },
    },
  );
  assert.equal(ownerRead.status, 200);
  assert.equal((await ownerRead.json()).id, ownerAJob.id);
});

test("M4 migration separates external identities and internal GoodGood owners", async () => {
  const [migration, localSeeder, schema] = await Promise.all([
    readFile(
      new URL("../migrations/0002_m4_authenticated_owners.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../server/persistence/seed-local-fixtures.mjs", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_identities/);
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS auth_identities_issuer_subject_unique/);
  assert.match(migration, /REFERENCES users\(id\) ON DELETE RESTRICT/);
  assert.match(localSeeder, /local-user-a/);
  assert.match(localSeeder, /local-user-b/);
  assert.match(schema, /export const authIdentities = pgTable/);
});
