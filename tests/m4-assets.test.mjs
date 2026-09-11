import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { sessionExpiredError } from "../server/auth/errors.mjs";
import { AssetRequestError } from "../server/assets/api.mjs";
import { createAssetNodeApiHandler } from "../server/assets/node-api.mjs";
import {
  findOwnerAsset,
  findOwnerAssetGenerationJobs,
  publicGenerationJob,
} from "../server/generation/repository.mjs";

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
      if (/JOIN workspaces w/.test(sql)) {
        return {
          rows: [{
            kind: "personal",
            name: "个人工作区",
            status: "active",
            workspace_id: "workspace-a",
          }],
        };
      }
      query = { sql, values };
      return { rows: expectedRows };
    },
  };

  assert.equal(
    await findOwnerAssetGenerationJobs(pool, { ownerId: "owner-a" }),
    expectedRows,
  );
  assert.deepEqual(query.values, ["owner-a", "workspace-a"]);
  assert.match(query.sql, /j\.owner_id = \$1/);
  assert.match(query.sql, /b\.owner_id = \$1/);
  assert.match(query.sql, /a\.owner_id = \$1/);
  assert.match(query.sql, /j\.workspace_id = \$2/);
  assert.match(query.sql, /j\.state = 'succeeded'/);
  assert.match(query.sql, /a\.moderation_state = 'accepted'/);
  assert.match(query.sql, /ORDER BY j\.submitted_at DESC, j\.id DESC/);
});

test("asset presentation exposes decoded pixel dimensions", () => {
  const row = {
    aspect_ratio: "3:4",
    assets: [
      {
        id: "asset-4k",
        ordinal: 1,
        pixel_height: 4800,
        pixel_width: 3584,
      },
    ],
    error_code: null,
    id: "job-4k",
    model_id: "nano-banana-2",
    project_id: null,
    prompt: "实际尺寸",
    reference_snapshot: [],
    requested_count: 1,
    resolution: "4K",
    state: "succeeded",
    submitted_at: "2026-09-07T00:00:00.000Z",
    updated_at: "2026-09-07T00:01:00.000Z",
  };
  const job = publicGenerationJob(
    row,
    new Map([["asset-4k", "https://storage.invalid/asset-4k"]]),
  );

  assert.deepEqual(job.outputs, [
    {
      height: 4800,
      id: "asset-4k",
      previewPosition: "50% 50%",
      previewUrl: "https://storage.invalid/asset-4k",
      width: 3584,
    },
  ]);
});

test("asset repository resolves one accepted successful Asset for its owner", async () => {
  const expected = { id: "asset-a", object_key: "generated/owner-a/asset.jpg" };
  let query;
  const pool = {
    async query(sql, values) {
      if (/JOIN workspaces w/.test(sql)) {
        return {
          rows: [{
            kind: "personal",
            name: "个人工作区",
            status: "active",
            workspace_id: "workspace-a",
          }],
        };
      }
      query = { sql, values };
      return { rows: [expected] };
    },
  };

  assert.equal(
    await findOwnerAsset(pool, { assetId: "asset-a", ownerId: "owner-a" }),
    expected,
  );
  assert.deepEqual(query.values, ["asset-a", "owner-a", "workspace-a"]);
  assert.match(query.sql, /a\.owner_id = \$2/);
  assert.match(query.sql, /j\.owner_id = \$2/);
  assert.match(query.sql, /b\.owner_id = \$2/);
  assert.match(query.sql, /a\.workspace_id = \$3/);
  assert.match(query.sql, /j\.state = 'succeeded'/);
  assert.match(query.sql, /a\.moderation_state = 'accepted'/);
});

test("generation presentation preserves every accepted Asset in ordinal order", () => {
  const row = {
    aspect_ratio: "1:1",
    assets: [
      { id: "asset-1", ordinal: 1, pixel_height: 1024, pixel_width: 1024 },
      { id: "asset-2", ordinal: 2, pixel_height: 1024, pixel_width: 1024 },
    ],
    error_code: null,
    id: "job-multi",
    model_id: "gpt-image-2",
    project_id: null,
    prompt: "two images",
    reference_snapshot: [],
    requested_count: 2,
    resolution: "1K",
    state: "succeeded",
    submitted_at: "2026-09-08T00:00:00.000Z",
    updated_at: "2026-09-08T00:01:00.000Z",
  };
  const job = publicGenerationJob(
    row,
    new Map([
      ["asset-1", "https://storage.invalid/asset-1"],
      ["asset-2", "https://storage.invalid/asset-2"],
    ]),
  );
  assert.deepEqual(job.outputs, [
    {
      height: 1024,
      id: "asset-1",
      previewPosition: "50% 50%",
      previewUrl: "https://storage.invalid/asset-1",
      width: 1024,
    },
    {
      height: 1024,
      id: "asset-2",
      previewPosition: "50% 50%",
      previewUrl: "https://storage.invalid/asset-2",
      width: 1024,
    },
  ]);
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
      async getAssetDownloadUrl(input) {
        calls.push(input);
        if (input.ownerContext.ownerId !== "owner-a") {
          throw new AssetRequestError(
            "ASSET_NOT_FOUND",
            "未找到这张图片。",
            404,
          );
        }
        return { url: "https://storage.invalid/fresh-download" };
      },
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

  const downloadResponse = responseRecorder();
  await handler(
    requestFor({
      headers: { "x-owner": "owner-a" },
      url: "/api/assets/50000000-0000-4000-8000-000000000001/download-url",
    }),
    downloadResponse,
  );
  assert.equal(downloadResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(downloadResponse.body), {
    url: "https://storage.invalid/fresh-download",
  });
  assert.deepEqual(calls[1], {
    assetId: "50000000-0000-4000-8000-000000000001",
    ownerContext: { ownerId: "owner-a" },
    workspaceId: null,
  });

  const otherOwnerResponse = responseRecorder();
  await handler(
    requestFor({ headers: { "x-owner": "owner-b" }, url: "/api/assets" }),
    otherOwnerResponse,
  );
  assert.deepEqual(JSON.parse(otherOwnerResponse.body), { batches: [] });

  const crossOwnerDownload = responseRecorder();
  await handler(
    requestFor({
      headers: { "x-owner": "owner-b" },
      url: "/api/assets/50000000-0000-4000-8000-000000000001/download-url",
    }),
    crossOwnerDownload,
  );
  assert.equal(crossOwnerDownload.statusCode, 404);
  assert.equal(
    JSON.parse(crossOwnerDownload.body).error.code,
    "ASSET_NOT_FOUND",
  );

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

test("asset list and fresh download URL are wired into both runtimes", async () => {
  const [route, downloadRoute, runtime, page, boundary] = await Promise.all([
    readFile(new URL("../app/api/assets/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../app/api/assets/[assetId]/download-url/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../server/runtime/web.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../features/assets/http-asset-boundary.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(route, /await listAssets/);
  assert.match(downloadRoute, /await getAssetDownloadUrl/);
  assert.match(runtime, /createAssetNodeApiHandler/);
  assert.match(runtime, /handleAssetNodeApi/);
  assert.match(boundary, /goodGoodApiFetch\("\/api\/assets"/);
  assert.match(boundary, /\/api\/assets\/\$\{encodeURIComponent\(assetId\)\}\/download-url/);
  assert.match(page, /assetsLoading/);
  assert.match(page, /assetsError/);
  assert.match(page, /assetBatches\.length === 0/);
  assert.match(page, /void reloadAssets\(\)/);
  assert.match(page, /正在读取资产/);
  assert.match(page, /资产库还是空的/);
});
