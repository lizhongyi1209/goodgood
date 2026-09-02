import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { sessionExpiredError } from "../server/auth/errors.mjs";
import { createAssetNodeApiHandler } from "../server/assets/node-api.mjs";
import { findOwnerAssetGenerationJobs } from "../server/generation/repository.mjs";

function requestFor({ headers = {}, method = "GET", url }) {
  const request = Readable.from([]);
  request.headers = headers;
  request.method = method;
  request.url = url;
  return request;
}

function responseRecorder() {
  return {
    body: "",
    headers: {},
    statusCode: 0,
    end(chunk = "") {
      this.body += chunk;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
  };
}

test("asset repository lists only accepted successful records for one owner newest-first", async () => {
  const expectedRows = [{ id: "job-new" }, { id: "job-old" }];
  let query;
  const pool = {
    async query(sql, values) {
      query = { sql, values };
      return { rows: expectedRows };
    },
  };

  assert.equal(
    await findOwnerAssetGenerationJobs(pool, { ownerId: "owner-a" }),
    expectedRows,
  );
  assert.deepEqual(query.values, ["owner-a"]);
  assert.match(query.sql, /j\.owner_id = \$1/);
  assert.match(query.sql, /b\.owner_id = \$1/);
  assert.match(query.sql, /a\.owner_id = \$1/);
  assert.match(query.sql, /j\.state = 'succeeded'/);
  assert.match(query.sql, /a\.moderation_state = 'accepted'/);
  assert.match(query.sql, /ORDER BY j\.submitted_at DESC, j\.id DESC/);
});

test("asset HTTP route authenticates and preserves the owner context", async () => {
  const calls = [];
  const handler = createAssetNodeApiHandler({
    authenticate: async (request) => {
      const ownerId = request.headers["x-owner"];
      if (!ownerId) throw sessionExpiredError();
      return { ownerId };
    },
    operations: {
      async listAssets(input) {
        calls.push(input);
        return {
          batches:
            input.ownerContext.ownerId === "owner-a" ? [{ id: "job-a" }] : [],
        };
      },
    },
  });

  const ownerResponse = responseRecorder();
  assert.equal(
    await handler(
      requestFor({ headers: { "x-owner": "owner-a" }, url: "/api/assets" }),
      ownerResponse,
    ),
    true,
  );
  assert.equal(ownerResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(ownerResponse.body), {
    batches: [{ id: "job-a" }],
  });
  assert.equal(calls[0].ownerContext.ownerId, "owner-a");
  assert.equal(ownerResponse.headers["cache-control"], "no-store");

  const otherOwnerResponse = responseRecorder();
  await handler(
    requestFor({ headers: { "x-owner": "owner-b" }, url: "/api/assets" }),
    otherOwnerResponse,
  );
  assert.deepEqual(JSON.parse(otherOwnerResponse.body), { batches: [] });

  const unauthorizedResponse = responseRecorder();
  await handler(requestFor({ url: "/api/assets" }), unauthorizedResponse);
  assert.equal(unauthorizedResponse.statusCode, 401);
  assert.equal(
    JSON.parse(unauthorizedResponse.body).error.code,
    "SESSION_EXPIRED",
  );

  const methodResponse = responseRecorder();
  await handler(
    requestFor({
      headers: { "x-owner": "owner-a" },
      method: "POST",
      url: "/api/assets",
    }),
    methodResponse,
  );
  assert.equal(methodResponse.statusCode, 405);
  assert.equal(methodResponse.headers.allow, "GET");

  assert.equal(
    await handler(requestFor({ url: "/api/unrelated" }), responseRecorder()),
    false,
  );
});

test("asset list is wired into both runtimes and exposes loading, empty, and failure recovery", async () => {
  const [route, runtime, page, boundary] = await Promise.all([
    readFile(new URL("../app/api/assets/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/runtime/web.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../features/assets/http-asset-boundary.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(route, /await listAssets/);
  assert.match(runtime, /createAssetNodeApiHandler/);
  assert.match(runtime, /handleAssetNodeApi/);
  assert.match(boundary, /goodGoodApiFetch\("\/api\/assets"/);
  assert.match(page, /assetsLoading/);
  assert.match(page, /assetsError/);
  assert.match(page, /assetBatches\.length === 0/);
  assert.match(page, /void reloadAssets\(\)/);
  assert.match(page, /正在读取资产/);
  assert.match(page, /资产库还是空的/);
});
