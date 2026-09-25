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
      detailUrl: "https://storage.invalid/asset-4k",
      previewPosition: "50% 50%",
      previewUrl: "/api/assets/asset-4k/preview",
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
      detailUrl: "https://storage.invalid/asset-1",
      previewPosition: "50% 50%",
      previewUrl: "/api/assets/asset-1/preview",
      width: 1024,
    },
    {
      height: 1024,
      id: "asset-2",
      detailUrl: "https://storage.invalid/asset-2",
      previewPosition: "50% 50%",
      previewUrl: "/api/assets/asset-2/preview",
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
  assert.match(page, /generated=\{generatedAssetCards\}/);
  assert.match(page, /void reloadAssets\(\)/);
  const workspace = await readFile(new URL("../features/assets/asset-workspace.tsx", import.meta.url), "utf8");
  assert.match(workspace, /正在读取资产/);
  assert.match(workspace, /还没有生成记录/);
  assert.match(workspace, /生成历史/);
  // History shows the image alone: no caption, no date headings.
  assert.doesNotMatch(workspace, /styles\.cardCaption/);
  assert.doesNotMatch(workspace, /styles\.dateGroup/);
  assert.match(workspace, /styles\.historyGrid/);
  assert.match(workspace, /styles\.cardOverlay/);
});

test("generated asset deletion is owner scoped and clears organization before the row", async () => {
  const assetId = "20000000-0000-4000-8000-000000000001";
  const objectKey = "generated/owner-a/asset.png";
  let assetRow = { id: assetId, object_key: objectKey, workspace_id: "workspace-a" };
  const statements = [];
  const deletedKeys = [];
  const client = {
    async query(sql, values = []) {
      statements.push([sql, values]);
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rowCount: 0, rows: [] };
      if (/^DELETE FROM asset_organization/.test(sql)) return { rowCount: 1, rows: [] };
      if (/^DELETE FROM assets/.test(sql)) {
        if (!assetRow) return { rowCount: 0, rows: [] };
        assetRow = null;
        return { rowCount: 1, rows: [] };
      }
      throw Error(`Unexpected SQL: ${sql.slice(0, 80)}`);
    },
    release() {},
  };
  const pool = {
    async query(sql, values = []) {
      if (/JOIN workspaces w/.test(sql)) {
        // Only owner-a resolves a workspace, so owner-b is rejected before any
        // asset lookup happens.
        return values[0] === "owner-a"
          ? { rows: [{ kind: "personal", status: "active", workspace_id: "workspace-a" }] }
          : { rows: [] };
      }
      return { rows: assetRow ? [assetRow] : [] };
    },
    async connect() { return client; },
  };
  const storage = {
    async send(command) {
      deletedKeys.push({ name: command.constructor.name, key: command.input?.Key });
      return {};
    },
  };
  const resourcesOverride = {
    config: { objectStorage: { bucket: "disposable-assets" } },
    pool,
    storage,
  };
  const { deleteGeneratedAsset } = await import("../server/assets/api.mjs");

  const removed = await deleteGeneratedAsset({
    assetId,
    ownerContext: { ownerId: "owner-a" },
    resourcesOverride,
  });
  assert.deepEqual(removed, { id: assetId, deleted: true });
  // Organization metadata is cleared before the asset row, in one transaction.
  const organizationDelete = statements.findIndex(([sql]) => /^DELETE FROM asset_organization/.test(sql));
  const assetDelete = statements.findIndex(([sql]) => /^DELETE FROM assets/.test(sql));
  assert.ok(organizationDelete > -1 && assetDelete > organizationDelete);
  assert.equal(statements.filter(([sql]) => sql === "COMMIT").length, 1);
  // Bytes go last so a failed transaction cannot strand a row without an object.
  assert.deepEqual(deletedKeys, [
    { name: "DeleteObjectCommand", key: objectKey },
  ]);

  // An owner with no access to the resolved workspace cannot delete its assets.
  await assert.rejects(
    deleteGeneratedAsset({
      assetId,
      ownerContext: { ownerId: "owner-b" },
      resourcesOverride,
    }),
    (error) => error.code === "WORKSPACE_ACCESS_DENIED",
  );
  // The denied owner is rejected while resolving the workspace, before the
  // transaction opens, so the successful delete above is the only one.
  assert.equal(statements.filter(([sql]) => sql === "BEGIN").length, 1);
  assert.equal(statements.filter(([sql]) => sql === "ROLLBACK").length, 0);
});
