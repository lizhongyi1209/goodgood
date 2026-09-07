import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
  AuthingIdentityAdapterError,
  createAuthingIdentityDeletionAdapter,
} from "../server/account-deletion/authing-identity-adapter.mjs";

const EXPECTED_ISSUER = "https://goodgood-test.authing.cn/oidc";
const FAKE_ACCESS_KEY_ID = "fake-user-pool-id";
const FAKE_ACCESS_KEY_SECRET = "fake-user-pool-secret";

function sendJson(response, value) {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

async function requestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function startFakeAuthing({
  deleteSucceeds = true,
  lookupUserId = null,
  updateSucceeds = true,
} = {}) {
  const directory = new Map([
    ["authing-user-1", { status: "Activated", userId: "authing-user-1" }],
  ]);
  const requests = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const record = {
      authorization: request.headers.authorization ?? null,
      body: null,
      method: request.method,
      pathname: url.pathname,
      search: Object.fromEntries(url.searchParams),
    };
    if (request.method === "POST") record.body = await requestBody(request);
    requests.push(record);

    if (request.method === "GET" && url.pathname === "/api/v3/get-user") {
      const subject = url.searchParams.get("userId");
      const user = directory.get(subject);
      if (!user) {
        sendJson(response, {
          apiCode: 2004,
          data: null,
          message: "not found",
          statusCode: 499,
        });
        return;
      }
      sendJson(response, {
        data: { ...user, userId: lookupUserId ?? user.userId },
        message: "ok",
        statusCode: 200,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v3/update-user") {
      const user = directory.get(record.body.userId);
      if (!user || !updateSucceeds) {
        sendJson(response, {
          apiCode: 2004,
          data: null,
          message: "failed",
          statusCode: 499,
        });
        return;
      }
      user.status = record.body.status;
      sendJson(response, { data: { ...user }, message: "ok", statusCode: 200 });
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/v3/delete-users-batch"
    ) {
      if (deleteSucceeds) {
        for (const userId of record.body.userIds) directory.delete(userId);
      }
      sendJson(response, {
        data: { success: deleteSucceeds },
        message: deleteSucceeds ? "ok" : "failed",
        statusCode: deleteSucceeds ? 200 : 499,
      });
      return;
    }

    sendJson(response, { data: null, message: "unexpected", statusCode: 404 });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
    directory,
    host: `http://127.0.0.1:${address.port}`,
    requests,
  };
}

function adapterFor(fake) {
  return createAuthingIdentityDeletionAdapter({
    accessKeyId: FAKE_ACCESS_KEY_ID,
    accessKeySecret: FAKE_ACCESS_KEY_SECRET,
    allowInsecureLoopback: true,
    expectedIssuer: EXPECTED_ISSUER,
    host: fake.host,
    timeoutMilliseconds: 2_000,
  });
}

test("Authing adapter disables then deletes one user through the official SDK", async () => {
  const fake = await startFakeAuthing();
  try {
    const adapter = adapterFor(fake);
    const target = { issuer: EXPECTED_ISSUER, subject: "authing-user-1" };

    await adapter.disableIdentity(target);
    assert.equal(fake.directory.get(target.subject).status, "Suspended");
    await adapter.deleteIdentity(target);
    assert.equal(fake.directory.has(target.subject), false);

    assert.deepEqual(
      fake.requests.map(({ method, pathname }) => `${method} ${pathname}`),
      [
        "GET /api/v3/get-user",
        "POST /api/v3/update-user",
        "GET /api/v3/get-user",
        "POST /api/v3/delete-users-batch",
      ],
    );
    assert.equal(fake.requests[0].search.userId, target.subject);
    assert.equal(fake.requests[0].search.userIdType, "user_id");
    assert.deepEqual(fake.requests[1].body, {
      options: { userIdType: "user_id" },
      status: "Suspended",
      userId: target.subject,
    });
    assert.deepEqual(fake.requests[3].body, {
      options: { userIdType: "user_id" },
      userIds: [target.subject],
    });
    for (const request of fake.requests) {
      assert.equal(typeof request.authorization, "string");
      assert.doesNotMatch(JSON.stringify(request), /fake-user-pool-secret/);
    }
  } finally {
    await fake.close();
  }
});

test("Authing adapter treats an already missing user as an idempotent success", async () => {
  const fake = await startFakeAuthing();
  try {
    const adapter = adapterFor(fake);
    const target = { issuer: EXPECTED_ISSUER, subject: "missing-user" };

    await adapter.disableIdentity(target);
    await adapter.deleteIdentity(target);

    assert.deepEqual(
      fake.requests.map(({ method, pathname }) => `${method} ${pathname}`),
      ["GET /api/v3/get-user", "GET /api/v3/get-user"],
    );
  } finally {
    await fake.close();
  }
});

test("Authing adapter fails closed on issuer and provider response mismatches", async () => {
  const fake = await startFakeAuthing({ lookupUserId: "different-user" });
  try {
    const adapter = adapterFor(fake);
    await assert.rejects(
      adapter.disableIdentity({
        issuer: "https://other-pool.authing.cn/oidc",
        subject: "authing-user-1",
      }),
      (error) =>
        error instanceof AuthingIdentityAdapterError &&
        error.code === "AUTHING_IDENTITY_ISSUER_MISMATCH",
    );
    assert.equal(fake.requests.length, 0);

    await assert.rejects(
      adapter.disableIdentity({
        issuer: EXPECTED_ISSUER,
        subject: "authing-user-1",
      }),
      (error) =>
        error instanceof AuthingIdentityAdapterError &&
        error.code === "AUTHING_IDENTITY_LOOKUP_INVALID" &&
        !error.message.includes("authing-user-1") &&
        !error.message.includes(EXPECTED_ISSUER),
    );
    assert.equal(fake.requests.length, 1);
  } finally {
    await fake.close();
  }
});

test("Authing adapter rejects failed update and delete responses without identifiers", async () => {
  const updateFake = await startFakeAuthing({ updateSucceeds: false });
  try {
    const adapter = adapterFor(updateFake);
    await assert.rejects(
      adapter.disableIdentity({ issuer: EXPECTED_ISSUER, subject: "authing-user-1" }),
      (error) =>
        error.code === "AUTHING_IDENTITY_DISABLE_FAILED" &&
        !error.message.includes("authing-user-1"),
    );
  } finally {
    await updateFake.close();
  }

  const deleteFake = await startFakeAuthing({ deleteSucceeds: false });
  try {
    const adapter = adapterFor(deleteFake);
    await assert.rejects(
      adapter.deleteIdentity({ issuer: EXPECTED_ISSUER, subject: "authing-user-1" }),
      (error) =>
        error.code === "AUTHING_IDENTITY_DELETE_FAILED" &&
        !error.message.includes("authing-user-1"),
    );
  } finally {
    await deleteFake.close();
  }
});

test("Authing adapter validates secure configuration and injectable client shape", () => {
  assert.throws(
    () => createAuthingIdentityDeletionAdapter(),
    /expectedIssuer must contain/,
  );
  assert.throws(
    () => createAuthingIdentityDeletionAdapter({
      accessKeyId: FAKE_ACCESS_KEY_ID,
      accessKeySecret: FAKE_ACCESS_KEY_SECRET,
      expectedIssuer: EXPECTED_ISSUER,
      host: "http://authing.example.com",
    }),
    /HTTPS origin/,
  );
  assert.throws(
    () => createAuthingIdentityDeletionAdapter({
      expectedIssuer: EXPECTED_ISSUER,
      managementClient: {},
    }),
    /must provide getUser, updateUser, and deleteUsersBatch/,
  );
});
